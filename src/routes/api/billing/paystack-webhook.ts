import { createFileRoute } from "@tanstack/react-router";
import { handleWebhookEvent } from "@/lib/server/checkout";
import { verifyWebhookSignature } from "@/lib/server/paystack";

/** Paystack → ADUF. Set this URL as the webhook in your Paystack dashboard
 *  (Settings → API Keys & Webhooks): https://YOUR-APP/api/billing/paystack-webhook
 *  Every call is rejected unless its HMAC-SHA512 signature matches your secret key. */
export const Route = createFileRoute("/api/billing/paystack-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text(); // the signature covers the exact raw bytes
        if (!(await verifyWebhookSignature(raw, request.headers.get("x-paystack-signature")))) {
          return new Response("Invalid signature", { status: 401 });
        }
        let event: { event: string; data: Record<string, unknown> };
        try {
          event = JSON.parse(raw);
        } catch {
          return new Response("Bad JSON", { status: 400 });
        }
        try {
          const outcome = await handleWebhookEvent(
            event as Parameters<typeof handleWebhookEvent>[0],
          );
          return Response.json({ ok: true, outcome });
        } catch (e) {
          // A non-200 makes Paystack retry later — right for a transient failure on our side.
          console.error(
            "[paystack-webhook] failed",
            event.event,
            e instanceof Error ? e.message : e,
          );
          return new Response("Error", { status: 500 });
        }
      },
    },
  },
});
