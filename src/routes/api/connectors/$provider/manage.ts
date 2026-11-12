import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { disconnectConnector, saveConnectorKeys } from "@/lib/server/connector-keys";
import { getProvider } from "@/lib/server/oauth-providers";
import { json, requireUser } from "@/lib/server/require-admin";

const bodySchema = z.record(z.string().max(2000));

/** Settings → Integrations.
 *  POST   = save pasted credentials for a key-based connector (Semrush, Jumia, Paystack).
 *  DELETE = disconnect any connector (key-based or OAuth) and wipe its stored credentials.
 *  Admin-only; credentials are never echoed back. Telegram has its own route. */
export const Route = createFileRoute("/api/connectors/$provider/manage")({
  server: {
    handlers: {
      // Pasting keys for built-in connectors is retired: connect apps through Composio instead.
      POST: async () =>
        Response.json(
          { error: "Built-in connectors are retired. Connect this app from the Connectors page." },
          { status: 410 },
        ),
      DELETE: async ({ request, params }) => {
        const admin = await requireUser(request);
        if (!admin.ok) return admin.response;
        if (params.provider === "telegram") return json({ error: "Use the Telegram panel." }, 400);
        if (!getProvider(params.provider)) return json({ error: "Unknown integration." }, 404);
        try {
          await disconnectConnector(admin.userId, params.provider);
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
