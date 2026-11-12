import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { json, requireUser } from "@/lib/server/require-admin";
import { signedViewUrl } from "@/lib/server/attachments";
import { LIMITS, withRateLimit } from "@/lib/server/rate-limit";

/** A 10-minute link to open the original file (only for the person who attached it). */
export const Route = createFileRoute("/api/attachments/url")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await requireUser(request);
        if (!auth.ok) return auth.response;
        return withRateLimit(`read:${auth.userId}`, LIMITS.read, async () => {
          const parsed = z
            .object({ id: z.string().uuid() })
            .safeParse(await request.json().catch(() => null));
          if (!parsed.success) return json({ error: "Invalid request" }, 400);
          try {
            return json({ url: await signedViewUrl(auth.userId, parsed.data.id) });
          } catch (e) {
            return json(
              { error: e instanceof Error ? e.message : "Couldn't open that file." },
              404,
            );
          }
        });
      },
    },
  },
});
