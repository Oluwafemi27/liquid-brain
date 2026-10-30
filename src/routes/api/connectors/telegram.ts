import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { isAdminEmail } from "@/lib/server/admin";
import { verifyAccessToken } from "@/lib/server/survey";
import { connectTelegram, disconnectTelegram, getTelegramStatus } from "@/lib/server/telegram";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/** The workspace's Telegram bot is a workspace-level credential, so only a
 *  signed-in admin (server-verified via the Supabase session token + the
 *  `admins` allowlist) may read or change it. */
async function requireAdmin(request: Request): Promise<Response | null> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  const user = await verifyAccessToken(token);
  if (!user) return json({ error: "Sign in first." }, 401);
  if (!(await isAdminEmail(user.email))) {
    return json({ error: "Only the workspace admin can manage Telegram." }, 403);
  }
  return null;
}

const postSchema = z.object({ botToken: z.string().min(20).max(200) });

/** Settings > Connections > Telegram. GET = status, POST = verify + connect,
 *  DELETE = disconnect. The bot token is never echoed back. */
export const Route = createFileRoute("/api/connectors/telegram")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const denied = await requireAdmin(request);
        if (denied) return denied;
        return json(await getTelegramStatus());
      },
      POST: async ({ request }) => {
        const denied = await requireAdmin(request);
        if (denied) return denied;
        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return json({ error: "Invalid JSON body" }, 400);
        }
        const parsed = postSchema.safeParse(raw);
        if (!parsed.success) return json({ error: "Enter your bot token." }, 400);

        const origin = (process.env["APP_URL"] || new URL(request.url).origin).replace(/\/+$/, "");
        const result = await connectTelegram(parsed.data.botToken, origin);
        if (!result.ok) return json({ error: result.error }, 400);
        return json({ ok: true, botUsername: result.botUsername });
      },
      DELETE: async ({ request }) => {
        const denied = await requireAdmin(request);
        if (denied) return denied;
        try {
          await disconnectTelegram();
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
