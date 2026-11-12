import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
  EntitlementError,
  QuotaExceededError,
  assertTokensAvailable,
  withBilling,
} from "@/lib/server/billing";
import { json, requireUser } from "@/lib/server/require-admin";
import { finishUpload } from "@/lib/server/attachments";
import { LIMITS, withRateLimit } from "@/lib/server/rate-limit";

const body = z.object({
  id: z.string().uuid(),
  thumbnail: z.string().max(40_000).nullable().optional(),
});

/** Step 2: the browser has uploaded the file. Read it (parse, describe or transcribe) and return the chat attachment. */
export const Route = createFileRoute("/api/attachments/finish")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await requireUser(request);
        if (!auth.ok) return auth.response;
        return withRateLimit(`read:${auth.userId}`, LIMITS.read, async () => {
          const parsed = body.safeParse(await request.json().catch(() => null));
          if (!parsed.success) return json({ error: "Invalid request" }, 400);
          try {
            await assertTokensAvailable(auth.userId);
            const attachment = await withBilling(
              { userId: auth.userId, feature: "attachments" },
              () => finishUpload(auth.userId, parsed.data.id, parsed.data.thumbnail),
            );
            return json({ attachment });
          } catch (e) {
            if (e instanceof QuotaExceededError || e instanceof EntitlementError)
              return json({ error: e.message }, 402);
            console.error("[attachments/finish]", e);
            return json(
              { error: e instanceof Error ? e.message : "Couldn't read that file." },
              422,
            );
          }
        });
      },
    },
  },
});
