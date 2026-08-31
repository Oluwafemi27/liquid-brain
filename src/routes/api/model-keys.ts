import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
  deleteModelKey,
  listModelKeyStatuses,
  setDefaultModelKey,
  storeModelKey,
} from "@/lib/server/model-keys";
import { MODEL_PROVIDERS } from "@/lib/server/model-providers";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const postSchema = z.object({
  providerId: z.enum(Object.keys(MODEL_PROVIDERS) as [string, ...string[]]),
  apiKey: z.string().min(8).max(500),
  label: z.string().max(100).optional(),
  makeDefault: z.boolean().optional(),
});

const deleteSchema = z.object({
  providerId: z.enum(Object.keys(MODEL_PROVIDERS) as [string, ...string[]]),
});

export const Route = createFileRoute("/api/model-keys")({
  server: {
    handlers: {
      GET: async () => {
        const statuses = await listModelKeyStatuses();
        return json({ providers: statuses });
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

        try {
          await storeModelKey(
            parsed.data.providerId,
            parsed.data.apiKey,
            parsed.data.label,
            parsed.data.makeDefault,
          );
          return json({ ok: true });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Failed to store key";
          return json({ error: message }, 500);
        }
      },
      DELETE: async ({ request }) => {
        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return json({ error: "Invalid JSON body" }, 400);
        }
        const parsed = deleteSchema.safeParse(raw);
        if (!parsed.success) return json({ error: "Invalid request" }, 400);

        try {
          await deleteModelKey(parsed.data.providerId);
          return json({ ok: true });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Failed to delete key";
          return json({ error: message }, 500);
        }
      },
      PATCH: async ({ request }) => {
        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return json({ error: "Invalid JSON body" }, 400);
        }
        const parsed = deleteSchema.safeParse(raw);
        if (!parsed.success) return json({ error: "Invalid request" }, 400);

        try {
          await setDefaultModelKey(parsed.data.providerId);
          return json({ ok: true });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Failed to set default";
          return json({ error: message }, 500);
        }
      },
    },
  },
});
