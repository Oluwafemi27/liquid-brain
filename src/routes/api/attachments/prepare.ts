import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { json, requireUser } from "@/lib/server/require-admin";
import { startUpload } from "@/lib/server/attachments";
import { LIMITS, withRateLimit } from "@/lib/server/rate-limit";

const body = z.object({
  sessionId: z.string().min(1).max(200).default("default"),
  filename: z.string().min(1).max(200),
  mimeType: z.string().max(200).default(""),
  sizeBytes: z.number().int().min(1),
});

/** Step 1 of attaching a file: reserve it and return a one-time upload slot. */
export const Route = createFileRoute("/api/attachments/prepare")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await requireUser(request);
        if (!auth.ok) return auth.response;
        return withRateLimit(`upload:${auth.userId}`, LIMITS.upload, async () => {
          const parsed = body.safeParse(await request.json().catch(() => null));
          if (!parsed.success) return json({ error: "Invalid request" }, 400);
          try {
            return json(await startUpload(auth.userId, parsed.data));
          } catch (e) {
            return json(
              { error: e instanceof Error ? e.message : "Couldn't prepare the upload." },
              400,
            );
          }
        });
      },
    },
  },
});
