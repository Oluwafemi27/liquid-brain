import { createFileRoute } from "@tanstack/react-router";
import { verifyTriggerWebhook } from "@/connectors/composio-hub/client";
import { forwardTriggerEvent } from "@/lib/server/n8n-composio";

/** Composio delivers every trigger event for the project here. ADUF checks the signature, finds which
 *  user's workflow asked for that trigger, and forwards the event to that workflow's n8n webhook. */
export const Route = createFileRoute("/api/composio-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const payload = await request.text();
        let event: Record<string, unknown>;
        try {
          event = await verifyTriggerWebhook({
            id: request.headers.get("webhook-id") ?? "",
            signature: request.headers.get("webhook-signature") ?? "",
            timestamp: request.headers.get("webhook-timestamp") ?? "",
            payload,
          });
        } catch {
          return new Response("Unauthorized", { status: 401 });
        }
        await forwardTriggerEvent(event).catch((e) => console.error("[composio-webhook]", e));
        return new Response("ok", { status: 200 });
      },
    },
  },
});
