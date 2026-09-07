import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
  deleteN8nConnection,
  getN8nConnectionStatus,
  storeN8nConnection,
} from "@/lib/server/n8n-connection";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const postSchema = z.object({
  instanceUrl: z.string().url().max(300),
  apiKey: z.string().min(8).max(1000),
  label: z.string().max(100).optional(),
});

/** Me > Connections > Connect n8n. Same shape as /api/model-keys — GET for
 *  status, POST to store (encrypted in Supabase Vault, verified against the
 *  owner's own instance first), DELETE to disconnect. The API key is never
 *  echoed back; GET only ever returns connection metadata. */
export const Route = createFileRoute("/api/n8n-connection")({
  server: {
    handlers: {
      GET: async () => {
        const status = await getN8nConnectionStatus();
        return json(status);
      },
      POST: async ({ request }) => {
        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return json({ error: "Invalid JSON body" }, 400);
        }
        const parsed = postSchema.safeParse(raw);
        if (!parsed.success)
          return json({ error: "Invalid request", details: parsed.error.flatten() }, 400);

        const result = await storeN8nConnection(
          parsed.data.instanceUrl,
          parsed.data.apiKey,
          parsed.data.label,
        );
        if (!result.ok) return json({ error: result.error }, 400);
        return json({ ok: true });
      },
      DELETE: async () => {
        try {
          await deleteN8nConnection();
          return json({ ok: true });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Failed to disconnect";
          return json({ error: message }, 500);
        }
      },
    },
  },
});
