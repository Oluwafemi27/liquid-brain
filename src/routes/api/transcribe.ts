import { createFileRoute } from "@tanstack/react-router";
import { json, requireUser } from "@/lib/server/require-admin";
import { scanMediaPiece } from "@/lib/server/file-scan";
import {
  MAX_TRANSCRIBE_BYTES,
  NoTranscriptionKeyError,
  transcribeAudio,
} from "@/lib/server/transcribe";
import { LIMITS, withRateLimit } from "@/lib/server/rate-limit";

/** Speech to text for one audio chunk (voice input fallback, and video audio). The body is the raw audio. */
export const Route = createFileRoute("/api/transcribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await requireUser(request);
        if (!auth.ok) return auth.response;
        return withRateLimit(`transcribe:${auth.userId}`, LIMITS.transcribe, async () => {
          const mime =
            (request.headers.get("content-type") ?? "audio/webm").split(";")[0] ?? "audio/webm";
          if (!mime.startsWith("audio/") && !mime.startsWith("video/"))
            return json({ error: "Send audio." }, 400);
          const bytes = new Uint8Array(await request.arrayBuffer());
          if (bytes.byteLength === 0) return json({ error: "No audio received." }, 400);
          if (bytes.byteLength > MAX_TRANSCRIBE_BYTES)
            return json({ error: "That audio chunk is too large." }, 413);
          const unsafe = scanMediaPiece("audio", bytes);
          if (unsafe) return json({ error: `Blocked for safety: ${unsafe}.` }, 400);
          const ext = mime.includes("wav")
            ? "wav"
            : mime.includes("mp4")
              ? "mp4"
              : mime.includes("ogg")
                ? "ogg"
                : mime.includes("mpeg")
                  ? "mp3"
                  : "webm";
          try {
            const { text } = await transcribeAudio(auth.userId, bytes, `audio.${ext}`, mime);
            return json({ text });
          } catch (e) {
            if (e instanceof NoTranscriptionKeyError) return json({ error: e.message }, 422);
            console.error("[transcribe]", e);
            return json({ error: "Couldn't transcribe that audio. Try again." }, 502);
          }
        });
      },
    },
  },
});
