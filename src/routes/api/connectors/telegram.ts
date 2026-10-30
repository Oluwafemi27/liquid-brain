import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { json, requireAdmin } from "@/lib/server/require-admin";
import {
  clearBusinessData,
  enableBusinessUpdates,
  getBusinessState,
  saveBusinessSettings,
} from "@/lib/server/telegram-business";
import {
  connectTelegram,
  disconnectTelegram,
  getTelegramStatus,
  resetPairing,
} from "@/lib/server/telegram";

const postSchema = z.union([
  z.object({ botToken: z.string().min(20).max(200) }),
  z.object({ action: z.literal("reset_pairing") }),
  z.object({ action: z.literal("enable_business") }),
  z.object({
    action: z.literal("save_business_settings"),
    settings: z.object({
      autoReplyEnabled: z.boolean().optional(),
      discloseAi: z.boolean().optional(),
      pauseHours: z.number().int().min(1).max(168).optional(),
      maxRepliesPerHour: z.number().int().min(1).max(60).optional(),
      businessInfo: z.string().max(4000).optional(),
    }),
  }),
]);

/** Settings > Connections > Telegram. GET = status (incl. pairing code),
 *  POST = verify + connect a bot token, or reset pairing; DELETE = disconnect.
 *  The bot token is never echoed back. */
export const Route = createFileRoute("/api/connectors/telegram")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const admin = await requireAdmin(request, "manage Telegram");
        if (!admin.ok) return admin.response;
        return json({ ...(await getTelegramStatus()), business: await getBusinessState() });
      },
      POST: async ({ request }) => {
        const admin = await requireAdmin(request, "manage Telegram");
        if (!admin.ok) return admin.response;
        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return json({ error: "Invalid JSON body" }, 400);
        }
        const parsed = postSchema.safeParse(raw);
        if (!parsed.success) return json({ error: "Enter your bot token." }, 400);

        const origin = (process.env["APP_URL"] || new URL(request.url).origin).replace(/\/+$/, "");
        const fail = (error: unknown, fallback: string) =>
          json({ error: error instanceof Error ? error.message : fallback }, 500);

        if ("action" in parsed.data) {
          const body = parsed.data;
          try {
            if (body.action === "reset_pairing") {
              await resetPairing();
              return json({ ok: true });
            }
            if (body.action === "enable_business") {
              const result = await enableBusinessUpdates(origin);
              return result.ok ? json({ ok: true }) : json({ error: result.error }, 400);
            }
            await saveBusinessSettings(body.settings);
            return json({ ok: true });
          } catch (error) {
            return fail(error, "Request failed");
          }
        }

        const result = await connectTelegram(parsed.data.botToken, origin, admin.userId);
        if (!result.ok) return json({ error: result.error }, 400);
        return json({ ok: true, botUsername: result.botUsername });
      },
      DELETE: async ({ request }) => {
        const admin = await requireAdmin(request, "manage Telegram");
        if (!admin.ok) return admin.response;
        try {
          await disconnectTelegram();
          await clearBusinessData();
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
