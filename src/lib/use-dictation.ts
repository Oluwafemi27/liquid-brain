import { useCallback, useEffect, useRef, useState } from "react";
import { authHeaders } from "@/lib/auth-headers";
import { appendDictation, mergeSegments } from "@/lib/dictation";

// Voice input for the chat box. Uses the browser's built-in speech recognition where it exists
// (live words as you speak), and records the audio for server-side transcription (Whisper) where it
// doesn't (e.g. Firefox). Text is always rebuilt from the full recognition result list (see
// lib/dictation.ts) so words are never doubled.

interface RecognitionResultLike {
  0: { transcript: string };
  isFinal: boolean;
}
interface RecognitionEventLike {
  results: ArrayLike<RecognitionResultLike>;
}
interface RecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: RecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}
type RecognitionCtor = new () => RecognitionLike;

type Mode = "native" | "recorder" | "none";
const MAX_RECORD_MS = 3 * 60_000;
const FATAL = new Set([
  "not-allowed",
  "service-not-allowed",
  "audio-capture",
  "language-not-supported",
]);

function detectMode(): Mode {
  if (typeof window === "undefined") return "none";
  const w = window as typeof window & {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  if (w.SpeechRecognition || w.webkitSpeechRecognition) return "native";
  if (
    typeof MediaRecorder !== "undefined" &&
    typeof navigator.mediaDevices?.getUserMedia === "function"
  )
    return "recorder";
  return "none";
}

export function useDictation(opts: {
  getText: () => string;
  setText: (text: string) => void;
  onError?: (message: string) => void;
}) {
  const [mode, setMode] = useState<Mode>("none");
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const optsRef = useRef(opts);
  optsRef.current = opts;
  const wantRef = useRef(false);
  const baseRef = useRef("");
  const recRef = useRef<RecognitionLike | null>(null);
  const restartsRef = useRef<number[]>([]);
  const silentRef = useRef(0);
  const recorderRef = useRef<{
    recorder: MediaRecorder;
    stream: MediaStream;
    timer: number;
  } | null>(null);

  useEffect(() => setMode(detectMode()), []);

  const stop = useCallback(() => {
    wantRef.current = false;
    try {
      recRef.current?.stop();
    } catch {
      // already stopped
    }
    const r = recorderRef.current;
    if (r && r.recorder.state !== "inactive") r.recorder.stop();
    setListening(false);
  }, []);

  useEffect(
    () => () => {
      wantRef.current = false;
      try {
        recRef.current?.abort();
      } catch {
        // ignore
      }
      const r = recorderRef.current;
      if (r) {
        window.clearTimeout(r.timer);
        r.stream.getTracks().forEach((t) => t.stop());
      }
    },
    [],
  );

  const startNative = useCallback(() => {
    const w = window as typeof window & {
      SpeechRecognition?: RecognitionCtor;
      webkitSpeechRecognition?: RecognitionCtor;
    };
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SR) return;
    const begin = () => {
      baseRef.current = optsRef.current.getText();
      const rec = new SR();
      rec.lang = navigator.language || "en-US";
      rec.continuous = true;
      rec.interimResults = true;
      rec.onresult = (e) => {
        silentRef.current = 0;
        const segments = Array.from(e.results, (r) => r[0].transcript);
        optsRef.current.setText(appendDictation(baseRef.current, mergeSegments(segments)));
      };
      rec.onerror = (e) => {
        if (e.error && FATAL.has(e.error)) {
          wantRef.current = false;
          optsRef.current.onError?.(
            e.error === "not-allowed" || e.error === "service-not-allowed"
              ? "Microphone access is blocked. Allow it in your browser's site settings."
              : "Couldn't use the microphone.",
          );
        } else if (e.error === "no-speech") {
          silentRef.current += 1;
          if (silentRef.current >= 3) wantRef.current = false; // nobody is talking: stop instead of looping
        }
      };
      rec.onend = () => {
        // Browsers end a session after a pause. If the person hasn't stopped it, carry on from the
        // text that is already in the box (the new session's base), but never in a tight loop.
        const now = Date.now();
        restartsRef.current = restartsRef.current.filter((t) => now - t < 3000);
        if (wantRef.current && restartsRef.current.length < 5) {
          restartsRef.current.push(now);
          window.setTimeout(() => {
            if (!wantRef.current) return setListening(false);
            try {
              begin();
            } catch {
              wantRef.current = false;
              setListening(false);
            }
          }, 120);
        } else {
          wantRef.current = false;
          setListening(false);
        }
      };
      recRef.current = rec;
      rec.start();
    };
    wantRef.current = true;
    restartsRef.current = [];
    silentRef.current = 0;
    try {
      begin();
      setListening(true);
    } catch {
      wantRef.current = false;
      optsRef.current.onError?.("Couldn't start voice input. Try again.");
    }
  }, []);

  const startRecorder = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
      recorder.onstop = async () => {
        const r = recorderRef.current;
        if (r) window.clearTimeout(r.timer);
        stream.getTracks().forEach((t) => t.stop());
        recorderRef.current = null;
        setListening(false);
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        if (blob.size < 1000) return;
        setTranscribing(true);
        try {
          const res = await fetch("/api/transcribe", {
            method: "POST",
            headers: { ...authHeaders(), "content-type": blob.type },
            body: blob,
          });
          const body = (await res.json()) as { text?: string; error?: string };
          if (!res.ok || typeof body.text !== "string")
            throw new Error(body.error ?? "Transcription failed");
          optsRef.current.setText(appendDictation(optsRef.current.getText(), body.text));
        } catch (e) {
          optsRef.current.onError?.(e instanceof Error ? e.message : "Couldn't transcribe that.");
        } finally {
          setTranscribing(false);
        }
      };
      const timer = window.setTimeout(
        () => recorder.state !== "inactive" && recorder.stop(),
        MAX_RECORD_MS,
      );
      recorderRef.current = { recorder, stream, timer };
      recorder.start();
      setListening(true);
    } catch {
      optsRef.current.onError?.(
        "Microphone access is blocked. Allow it in your browser's site settings.",
      );
    }
  }, []);

  const toggle = useCallback(() => {
    if (listening) return stop();
    if (mode === "native") startNative();
    else if (mode === "recorder") void startRecorder();
  }, [listening, mode, startNative, startRecorder, stop]);

  return { supported: mode !== "none", mode, listening, transcribing, toggle, stop };
}
