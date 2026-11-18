import "@tanstack/react-start/server-only";
import { resolveModelKey } from "./model-keys";
import { MODEL_PROVIDERS, callProviderChat } from "./model-providers";
import { resilientFetch } from "@/lib/server/resilient-fetch";

// Speech to text. Uses whichever keys the owner has already connected in Settings, best first:
// Whisper on Groq (fast, free tier), Whisper on OpenAI, then Gemini, which can listen to audio directly.

export class NoTranscriptionKeyError extends Error {
  constructor() {
    super(
      "Turning speech into text needs a Groq, OpenAI or Gemini key. Add one in Settings, then try again.",
    );
    this.name = "NoTranscriptionKeyError";
  }
}

// Most accurate first; if one is busy or rate-limited the next takes over, so a transcript still arrives.
const ENGINES = [
  {
    id: "groq-large",
    keyId: "groq",
    url: "https://api.groq.com/openai/v1/audio/transcriptions",
    model: "whisper-large-v3",
  },
  {
    id: "groq-turbo",
    keyId: "groq",
    url: "https://api.groq.com/openai/v1/audio/transcriptions",
    model: "whisper-large-v3-turbo",
  },
  {
    id: "openai",
    keyId: "openai",
    url: "https://api.openai.com/v1/audio/transcriptions",
    model: "whisper-1",
  },
] as const;

// Whisper invents stock phrases on silence or noise; these are dropped when they are the whole result.
const PHANTOMS =
  /^(thanks? for watching[.!]*|thank you[.!]*|please subscribe[.!]*|bye[.!]*|you[.!]*|\.+|subtitles? by .*|transcribed by .*)$/i;

interface WhisperSegment {
  text?: string;
  no_speech_prob?: number;
  avg_logprob?: number;
  compression_ratio?: number;
}

/** Joins the segments the model is confident are speech, dropping silence hallucinations and loops. */
export function cleanTranscript(data: { text?: string; segments?: WhisperSegment[] }): string {
  const segs = data.segments;
  let text: string;
  if (Array.isArray(segs) && segs.length > 0) {
    text = segs
      .filter((g) => {
        const noSpeech = g.no_speech_prob ?? 0;
        const logprob = g.avg_logprob ?? 0;
        const looped = (g.compression_ratio ?? 0) > 2.6;
        return !(noSpeech > 0.6 && logprob < -0.8) && !looped && logprob > -1.6;
      })
      .map((g) => (g.text ?? "").trim())
      .filter(Boolean)
      .join(" ");
  } else {
    text = (data.text ?? "").trim();
  }
  text = text.replace(/\s+/g, " ").trim();
  return PHANTOMS.test(text) ? "" : text;
}

const GEMINI_MAX_BYTES = 15 * 1024 * 1024; // inline audio limit
/** Gemini names a few audio types differently. */
const geminiMime = (mime: string): string =>
  mime.includes("mp4") || mime.includes("m4a")
    ? "audio/mp4"
    : mime.includes("mpeg")
      ? "audio/mp3"
      : mime || "audio/wav";

export const MAX_TRANSCRIBE_BYTES = 24 * 1024 * 1024;

export async function transcriptionAvailable(userId: string): Promise<boolean> {
  for (const e of ENGINES) if (await resolveModelKey(userId, e.keyId)) return true;
  return Boolean(await resolveModelKey(userId, "gemini"));
}

/** Transcribes one audio file or chunk (wav, mp3, m4a, webm, ogg, mp4...). Returns plain text. */
export async function transcribeAudio(
  userId: string,
  bytes: Uint8Array,
  filename: string,
  mime: string,
): Promise<{ text: string; engine: string }> {
  if (bytes.byteLength > MAX_TRANSCRIBE_BYTES)
    throw new Error("That audio is too large to transcribe (24MB max).");
  let lastError: Error | null = null;
  for (const engine of ENGINES) {
    const key = await resolveModelKey(userId, engine.keyId);
    if (!key) continue;
    const form = new FormData();
    form.append(
      "file",
      new Blob([bytes as BlobPart], { type: mime || "audio/webm" }),
      filename || "audio.webm",
    );
    form.append("model", engine.model);
    form.append("response_format", "verbose_json");
    form.append("temperature", "0");
    try {
      const res = await resilientFetch(engine.url, {
        method: "POST",
        headers: { authorization: `Bearer ${key}` },
        body: form,
        signal: AbortSignal.timeout(90_000),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`${engine.id} transcription failed (${res.status}): ${body.slice(0, 200)}`);
      }
      const data = (await res.json()) as { text?: string; segments?: WhisperSegment[] };
      return { text: cleanTranscript(data), engine: engine.id };
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
    }
  }
  // Last resort: the owner's Gemini key. Gemini takes audio as input, so no extra service is needed.
  const geminiKey = await resolveModelKey(userId, "gemini");
  const gemini = MODEL_PROVIDERS["gemini"];
  if (geminiKey && gemini && bytes.byteLength <= GEMINI_MAX_BYTES) {
    try {
      const { text } = await callProviderChat(gemini, geminiKey, {
        system:
          "You are a precise speech-to-text engine. You never add commentary and never invent words that were not said.",
        messages: [
          {
            role: "user",
            content:
              "Transcribe this audio word for word in the language spoken. Keep numbers, names and currencies exactly as said. " +
              "Output only the spoken words as plain text, with no timestamps, labels or notes. " +
              "If there is no speech, output exactly: [NO_SPEECH]",
            media: [{ mimeType: geminiMime(mime), base64: Buffer.from(bytes).toString("base64") }],
          },
        ],
      });
      const cleaned = text.trim();
      return {
        text: /^\[?NO_SPEECH\]?\.?$/i.test(cleaned) ? "" : cleanTranscript({ text: cleaned }),
        engine: "gemini",
      };
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
    }
  }
  if (lastError) throw lastError;
  throw new NoTranscriptionKeyError();
}
