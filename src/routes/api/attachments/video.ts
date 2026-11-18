import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
  EntitlementError,
  QuotaExceededError,
  assertTokensAvailable,
  withBilling,
} from "@/lib/server/billing";
import { json, requireUser } from "@/lib/server/require-admin";
import { saveVideoAnalysis } from "@/lib/server/attachments";
import { LIMITS, withRateLimit } from "@/lib/server/rate-limit";

const body = z.object({
  sessionId: z.string().min(1).max(200).default("default"),
  filename: z.string().min(1).max(200),
  mimeType: z.string().max(200).default("video/mp4"),
  sizeBytes: z.number().int().min(0),
  durationSec: z
    .number()
    .min(0)
    .max(24 * 3600),
  frames: z
    .array(z.object({ t: z.number().min(0), base64: z.string().min(100).max(600_000) }))
    .max(12),
  transcript: z.string().max(200_000).default(""),
  audioNote: z.string().max(300).nullable().optional(),
  thumbnail: z.string().max(40_000).nullable().optional(),
});

/** Videos are cut into frames + audio in the browser; this analyses them and saves the result. */
export const Route = createFileRoute("/api/attachments/video")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await requireUser(request);
        if (!auth.ok) return auth.response;
        return withRateLimit(`video:${auth.userId}`, LIMITS.video, async () => {
          const parsed = body.safeParse(await request.json().catch(() => null));
          if (!parsed.success) return json({ error: "Invalid request" }, 400);
          try {
            await assertTokensAvailable(auth.userId);
            const attachment = await withBilling(
              { userId: auth.userId, feature: "attachments" },
              () => saveVideoAnalysis(auth.userId, parsed.data),
            );
            return json({ attachment });
          } catch (e) {
            if (e instanceof QuotaExceededError || e instanceof EntitlementError)
              return json({ error: e.message }, 402);
            console.error("[attachments/video]", e);
            return json(
              { error: e instanceof Error ? e.message : "Couldn't read that video." },
              422,
            );
          }
        });
      },
    },
  },
});
