import { createFileRoute } from "@tanstack/react-router";
import { DEFAULT_WORKSPACE_ID } from "@/lib/server/supabase";
import { handleTelegramUpdate } from "@/lib/server/telegram-agent";
import {
  isValidWorkspaceId,
  verifyTelegramWebhookSecret,
  type TgUpdate,
} from "@/lib/server/telegram";

/** Telegram → ADUF. Telegram includes the secret we gave it in setWebhook as
 *  the X-Telegram-Bot-Api-Secret-Token header; anything without a matching
 *  secret is rejected before the body is even parsed. */
export const Route = createFileRoute("/api/connectors/telegram/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Each account has its own bot and its own address (?w=<account id>); the bare address is the
        // original shared bot. The secret is then checked against that one account only.
        const ws = new URL(request.url).searchParams.get("w") ?? DEFAULT_WORKSPACE_ID;
        if (!isValidWorkspaceId(ws)) return new Response("Unauthorized", { status: 401 });
        const ok = await verifyTelegramWebhookSecret(
          ws,
          request.headers.get("x-telegram-bot-api-secret-token"),
        );
        if (!ok) return new Response("Unauthorized", { status: 401 });

        let update: TgUpdate;
        try {
          update = (await request.json()) as TgUpdate;
        } catch {
          return new Response("Bad request", { status: 400 });
        }
        if (typeof update?.update_id !== "number") {
          return new Response("Bad request", { status: 400 });
        }
        // Answered inline (awaited): the platform may freeze the function as
        // soon as the response is sent. handleTelegramUpdate never throws and
        // dedupes on update_id, so a Telegram retry can't double-reply.
        await handleTelegramUpdate(ws, update);
        // Always 200 for valid updates — non-200 makes Telegram retry.
        return new Response("ok", { status: 200 });
      },
    },
  },
});
