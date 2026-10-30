import "@tanstack/react-start/server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { DEFAULT_WORKSPACE_ID, getSupabaseAdmin } from "./supabase";

const TG_API = "https://api.telegram.org";
/** Bot tokens look like 123456789:AAH... (numeric id, colon, 35ish url-safe chars). */
const TOKEN_RE = /^\d{5,15}:[A-Za-z0-9_-]{30,}$/;

export interface TelegramStatus {
  connected: boolean;
  botUsername: string | null;
  botName: string | null;
  lastError: string | null;
}

const EMPTY_STATUS: TelegramStatus = {
  connected: false,
  botUsername: null,
  botName: null,
  lastError: null,
};

interface TgResponse<T> {
  ok: boolean;
  result?: T;
  description?: string;
}

async function tgCall<T>(token: string, method: string, body?: Record<string, unknown>) {
  const res = await fetch(`${TG_API}/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const json = (await res.json().catch(() => ({}))) as TgResponse<T>;
  if (!res.ok || !json.ok) {
    throw new Error(json.description ?? `Telegram ${method} failed (${res.status})`);
  }
  return json.result as T;
}

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

/** Connection status only — never the bot token. Safe to send to the client. */
export async function getTelegramStatus(): Promise<TelegramStatus> {
  const db = getSupabaseAdmin();
  if (!db) return EMPTY_STATUS;
  const { data } = await db
    .from("telegram_connections")
    .select("bot_username, bot_name, connected, last_error")
    .eq("workspace_id", DEFAULT_WORKSPACE_ID)
    .maybeSingle();
  if (!data) return EMPTY_STATUS;
  return {
    connected: Boolean(data["connected"]),
    botUsername: (data["bot_username"] as string | null) ?? null,
    botName: (data["bot_name"] as string | null) ?? null,
    lastError: (data["last_error"] as string | null) ?? null,
  };
}

async function setConnectorRow(connected: boolean, botUsername?: string | null) {
  const db = getSupabaseAdmin();
  if (!db) return;
  // Mirrors the Settings tile's "Connected" badge (see connectors.ts). The
  // token itself lives in Vault — this row never holds it.
  await db.from("connectors").upsert(
    {
      id: "telegram",
      workspace_id: DEFAULT_WORKSPACE_ID,
      connected,
      access_token: null,
      refresh_token: null,
      metadata: botUsername ? { bot_username: botUsername } : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "workspace_id,id" },
  );
}

/** Verifies the token with Telegram (getMe), registers our webhook with a
 *  fresh secret, then stores the token encrypted in Vault. Order matters:
 *  nothing is saved unless Telegram accepted both calls. */
export async function connectTelegram(
  rawToken: string,
  origin: string,
): Promise<{ ok: true; botUsername: string | null } | { ok: false; error: string }> {
  const token = rawToken.trim();
  if (!TOKEN_RE.test(token)) {
    return {
      ok: false,
      error: "That doesn't look like a Telegram bot token (expected 123456:ABC…).",
    };
  }
  if (!origin.startsWith("https://")) {
    return {
      ok: false,
      error:
        "Telegram only delivers webhooks to public https URLs. Connect from your deployed app (or a tunnel), not localhost.",
    };
  }
  const db = getSupabaseAdmin();
  if (!db) {
    return {
      ok: false,
      error: "No backend configured — set SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY first.",
    };
  }

  let me: { id: number; username?: string; first_name?: string };
  try {
    me = await tgCall(token, "getMe");
  } catch (e) {
    return {
      ok: false,
      error: `Telegram rejected that token: ${e instanceof Error ? e.message : "unknown error"}`,
    };
  }

  const secret = randomBytes(32).toString("hex"); // hex ⊂ [A-Za-z0-9_-], as Telegram requires
  try {
    await tgCall(token, "setWebhook", {
      url: `${origin}/api/connectors/telegram/webhook`,
      secret_token: secret,
      allowed_updates: ["message", "channel_post"],
      drop_pending_updates: true,
    });
  } catch (e) {
    return {
      ok: false,
      error: `Couldn't register the webhook: ${e instanceof Error ? e.message : "unknown error"}`,
    };
  }

  const { error } = await db.rpc("store_telegram_connection", {
    p_workspace_id: DEFAULT_WORKSPACE_ID,
    p_bot_token: token,
    p_bot_id: me.id,
    p_bot_username: me.username ?? null,
    p_bot_name: me.first_name ?? null,
    p_webhook_secret_hash: sha256(secret),
  });
  if (error) {
    // Don't leave a live webhook pointing at an app that can't verify it.
    await tgCall(token, "deleteWebhook").catch(() => undefined);
    return { ok: false, error: `Failed to store connection: ${error.message}` };
  }

  await setConnectorRow(true, me.username ?? null);
  return { ok: true, botUsername: me.username ?? null };
}

export async function disconnectTelegram(): Promise<void> {
  const db = getSupabaseAdmin();
  if (!db) throw new Error("No backend configured.");
  const token = await resolveTelegramToken();
  if (token) await tgCall(token, "deleteWebhook").catch(() => undefined);
  const { error } = await db.rpc("delete_telegram_connection", {
    p_workspace_id: DEFAULT_WORKSPACE_ID,
  });
  if (error) throw new Error(`Failed to disconnect: ${error.message}`);
  await setConnectorRow(false);
}

/** Decrypted bot token, server-side only. Null if not connected. */
export async function resolveTelegramToken(): Promise<string | null> {
  const db = getSupabaseAdmin();
  if (!db) return null;
  const { data, error } = await db.rpc("get_decrypted_telegram_token", {
    p_workspace_id: DEFAULT_WORKSPACE_ID,
  });
  if (error || typeof data !== "string" || !data) return null;
  return data;
}

/** For agents/automations: send a message as the connected bot. */
export async function sendTelegramMessage(chatId: number | string, text: string): Promise<void> {
  const token = await resolveTelegramToken();
  if (!token) throw new Error("Telegram isn't connected.");
  await tgCall(token, "sendMessage", { chat_id: chatId, text: text.slice(0, 4096) });
}

/** Constant-time check of the X-Telegram-Bot-Api-Secret-Token header against
 *  the stored hash. */
export async function verifyTelegramWebhookSecret(header: string | null): Promise<boolean> {
  if (!header) return false;
  const db = getSupabaseAdmin();
  if (!db) return false;
  const { data } = await db
    .from("telegram_connections")
    .select("webhook_secret_hash, connected")
    .eq("workspace_id", DEFAULT_WORKSPACE_ID)
    .maybeSingle();
  if (!data || !data["connected"]) return false;
  const expected = Buffer.from(data["webhook_secret_hash"] as string, "hex");
  const actual = Buffer.from(sha256(header), "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

interface TgMessage {
  chat: { id: number; type?: string };
  from?: { id: number; first_name?: string; username?: string };
  text?: string;
  caption?: string;
}
export interface TgUpdate {
  update_id: number;
  message?: TgMessage;
  channel_post?: TgMessage;
}

/** Stores an inbound message. Idempotent on update_id, so Telegram's retries
 *  don't create duplicates. */
export async function recordTelegramUpdate(update: TgUpdate): Promise<void> {
  const db = getSupabaseAdmin();
  const msg = update.message ?? update.channel_post;
  if (!db || !msg) return;
  const { error } = await db.from("telegram_messages").upsert(
    {
      workspace_id: DEFAULT_WORKSPACE_ID,
      update_id: update.update_id,
      chat_id: msg.chat.id,
      chat_type: msg.chat.type ?? null,
      from_id: msg.from?.id ?? null,
      from_name: msg.from?.username ?? msg.from?.first_name ?? null,
      text: (msg.text ?? msg.caption ?? "").slice(0, 4096) || null,
    },
    { onConflict: "workspace_id,update_id", ignoreDuplicates: true },
  );
  if (error) console.error("[telegram] failed to store update", error);
}
