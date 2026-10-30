import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { disconnectConnector, saveConnectorKeys } from "@/lib/server/connector-keys";
import { getProvider } from "@/lib/server/oauth-providers";
import { json, requireAdmin } from "@/lib/server/require-admin";

const bodySchema = z.record(z.string().max(2000));

/** Settings → Integrations.
 *  POST   = save pasted credentials for a key-based connector (Semrush, Jumia, Paystack).
 *  DELETE = disconnect any connector (key-based or OAuth) and wipe its stored credentials.
 *  Admin-only; credentials are never echoed back. Telegram has its own route. */
export const Route = createFileRoute("/api/connectors/$provider/manage")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const admin = await requireAdmin(request);
        if (!admin.ok) return admin.response;
        if (params.provider === "telegram") return json({ error: "Use the Telegram panel." }, 400);
        if (!getProvider(params.provider)) return json({ error: "Unknown integration." }, 404);

        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return json({ error: "Invalid JSON body" }, 400);
        }
        const parsed = bodySchema.safeParse(raw);
        if (!parsed.success) return json({ error: "Fill in every field." }, 400);

        const result = await saveConnectorKeys(params.provider, parsed.data);
        if (!result.ok) return json({ error: result.error }, 400);
        return json({ ok: true });
      },
      DELETE: async ({ request, params }) => {
        const admin = await requireAdmin(request);
        if (!admin.ok) return admin.response;
        if (params.provider === "telegram") return json({ error: "Use the Telegram panel." }, 400);
        if (!getProvider(params.provider)) return json({ error: "Unknown integration." }, 404);
        try {
          await disconnectConnector(params.provider);
          return json({ ok: true });
        } catch (error) {
          return json(
            { error: error instanceof Error ? error.message : "Failed to disconnect" },
            500,
          );
        }
      },
    },
  },
});
