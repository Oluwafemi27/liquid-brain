import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { runRelay, verifyRelayToken } from "@/lib/server/n8n-relay";
import { checkRateLimit, tooManyRequests } from "@/lib/server/rate-limit";

const body = z.object({
  tool: z.string().min(3).max(120),
  toolkit: z.string().max(60).optional(),
  connectedAccountId: z.string().max(80).optional(),
  arguments: z.record(z.unknown()).default({}),
});

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });

/** Called by HTTP Request nodes inside generated n8n workflows. Auth is the signed token in the header. */
export const Route = createFileRoute("/api/n8n-relay")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
        const claims = verifyRelayToken(token);
        if (!claims) return json({ error: "Invalid or expired workflow token." }, 401);

        const limit = checkRateLimit(`n8n-relay:${claims.u}`, {
          limit: 120,
          windowMs: 60_000,
          maxConcurrent: 6,
        });
        if (!limit.ok)
          return tooManyRequests(limit.retryAfter, "This workflow is running too fast.");
        try {
          const parsed = body.safeParse(await request.json().catch(() => null));
          if (!parsed.success) return json({ error: "Bad request." }, 400);
          const res = await runRelay(claims, parsed.data);
          return res.ok
            ? json({ successful: true, data: res.data })
            : json({ error: res.error }, res.status);
        } finally {
          limit.release();
        }
      },
    },
  },
});
