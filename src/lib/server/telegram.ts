import "@tanstack/react-start/server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { DEFAULT_WORKSPACE_ID, getSupabaseAdmin } from "./supabase";

const TG_API = "https://api.telegram.org";
/** Bot tokens look like 123456789:AAH... (numeric id, colon, 35ish url-safe chars). */
const TOKEN_RE = /^\d{5,15}:[A-Za-z0-9_-]{30,}$/;

export interface TelegramPairedChat {
  chatId: number;
  name: string | null;
}

export interface TelegramStatus {
  connected: boolean;
  botUsername: string | null;
  botName: string | null;
  lastError: string | null;
  /** One-time-ish code the owner sends as "/start CODE" to pair a chat.
   *  Only ever returned to a verified admin (see the route's requireAdmin). */
  pairingCode: string | null;
  pairedChats: TelegramPairedChat[];
}

const EMPTY_STATUS: TelegramStatus = {
  connected: false,
  botUsername: null,
  botName: null,
  lastError: null,
  pairingCode: null,
  pairedChats: [],
};

interface TgResponse<T> {
  ok: boolean;
  result?: T;
  description?: string;
}

export async function tgCall<T>(token: string, method: string, body?: Record<string, unknown>) {
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

/** 8 chars from an alphabet without look-alikes (no 0/O, 1/I/L). */
function newPairingCode(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(8);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

export const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

/** Connection status only — never the bot token. Safe to send to the client. */
export async function getTelegramStatus(): Promise<TelegramStatus> {
  const db = getSupabaseAdmin();
  if (!db) return EMPTY_STATUS;
  const { data } = await db
    .from("telegram_connections")
    .select("bot_username, bot_name, connected, last_error, pairing_code")
    .eq("workspace_id", DEFAULT_WORKSPACE_ID)
    .maybeSingle();
  if (!data) return EMPTY_STATUS;
  const { data: chats } = await db
    .from("telegram_paired_chats")
    .select("chat_id, display_name")
    .eq("workspace_id", DEFAULT_WORKSPACE_ID)
    .order("paired_at", { ascending: true });
  return {
    connected: Boolean(data["connected"]),
    botUsername: (data["bot_username"] as string | null) ?? null,
    botName: (data["bot_name"] as string | null) ?? null,
    lastError: (data["last_error"] as string | null) ?? null,
    pairingCode: (data["pairing_code"] as string | null) ?? null,
    pairedChats: (chats ?? []).map((c) => ({
      chatId: c["chat_id"] as number,
      name: (c["display_name"] as string | null) ?? null,
    })),
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
  ownerUserId: string,
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
      // business_* updates are how Telegram delivers the owner's own customer
      // DMs once the bot is added under Telegram → Settings → Business → Chatbots.
      allowed_updates: ["message", "channel_post", "business_connection", "business_message"],
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

  // A fresh bot starts with nobody paired: drop chats from any previous bot.
  await db.from("telegram_paired_chats").delete().eq("workspace_id", DEFAULT_WORKSPACE_ID);
  await db
    .from("telegram_connections")
    .update({ pairing_code: newPairingCode(), owner_user_id: ownerUserId })
    .eq("workspace_id", DEFAULT_WORKSPACE_ID);

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

export interface TgMessage {
  message_id?: number;
  /** Set on messages that arrive through a Telegram Business connection. */
  business_connection_id?: string;
  chat: { id: number; type?: string; first_name?: string; username?: string; title?: string };
  from?: { id: number; first_name?: string; username?: string; is_bot?: boolean };
  text?: string;
  caption?: string;
}
export interface TgBusinessConnection {
  id: string;
  user: { id: number; first_name?: string; username?: string };
  user_chat_id: number;
  is_enabled: boolean;
  /** Bot API 9.0+: granted rights. Older: `can_reply`. */
  rights?: { can_reply?: boolean };
  can_reply?: boolean;
}
export interface TgUpdate {
  update_id: number;
  message?: TgMessage;
  channel_post?: TgMessage;
  business_connection?: TgBusinessConnection;
  business_message?: TgMessage;
}

/** Stores an inbound message. Returns true only if this update_id was new —
 *  Telegram retries slow webhooks, and the caller must not answer twice. */
export async function recordInboundUpdate(update: TgUpdate): Promise<boolean> {
  const db = getSupabaseAdmin();
  const msg = update.message ?? update.channel_post;
  if (!db || !msg) return false;
  const { data, error } = await db
    .from("telegram_messages")
    .upsert(
      {
        workspace_id: DEFAULT_WORKSPACE_ID,
        update_id: update.update_id,
        direction: "in",
        chat_id: msg.chat.id,
        chat_type: msg.chat.type ?? null,
        from_id: msg.from?.id ?? null,
        from_name: msg.from?.username ?? msg.from?.first_name ?? null,
        text: (msg.text ?? msg.caption ?? "").slice(0, 4096) || null,
      },
      { onConflict: "workspace_id,update_id", ignoreDuplicates: true },
    )
    .select("id");
  if (error) {
    console.error("[telegram] failed to store update", error);
    return false;
  }
  return (data?.length ?? 0) > 0;
}

/** Last few turns of one chat, oldest first, excluding the update being
 *  answered right now. Fed to the agent as conversation history. */
export async function fetchChatTurns(
  chatId: number,
  excludeUpdateId: number,
  limit = 12,
): Promise<Array<{ role: "user" | "aduf"; text: string }>> {
  const db = getSupabaseAdmin();
  if (!db) return [];
  const { data } = await db
    .from("telegram_messages")
    .select("direction, text, update_id")
    .eq("workspace_id", DEFAULT_WORKSPACE_ID)
    .eq("chat_id", chatId)
    .order("received_at", { ascending: false })
    .limit(limit + 1);
  return (data ?? [])
    .filter((r) => r["update_id"] !== excludeUpdateId && r["text"])
    .reverse()
    .slice(-limit)
    .map((r) => ({
      role: r["direction"] === "out" ? ("aduf" as const) : ("user" as const),
      text: r["text"] as string,
    }));
}

// --- Pairing ---------------------------------------------------------------

export async function isChatPaired(chatId: number): Promise<boolean> {
  const db = getSupabaseAdmin();
  if (!db) return false;
  const { data } = await db
    .from("telegram_paired_chats")
    .select("chat_id")
    .eq("workspace_id", DEFAULT_WORKSPACE_ID)
    .eq("chat_id", chatId)
    .maybeSingle();
  return Boolean(data);
}

/** Pairs a chat if `code` matches the current pairing code. */
export async function tryPairChat(
  chatId: number,
  displayName: string | null,
  code: string,
): Promise<boolean> {
  const db = getSupabaseAdmin();
  if (!db) return false;
  const { data } = await db
    .from("telegram_connections")
    .select("pairing_code")
    .eq("workspace_id", DEFAULT_WORKSPACE_ID)
    .maybeSingle();
  const expected = (data?.["pairing_code"] as string | null) ?? "";
  const given = code.trim().toUpperCase();
  const a = Buffer.from(expected);
  const b = Buffer.from(given);
  if (!expected || a.length !== b.length || !timingSafeEqual(a, b)) return false;
  const { error } = await db
    .from("telegram_paired_chats")
    .upsert(
      { workspace_id: DEFAULT_WORKSPACE_ID, chat_id: chatId, display_name: displayName },
      { onConflict: "workspace_id,chat_id" },
    );
  return !error;
}

/** New code + unpair every chat. Use if the code leaked or a device is lost. */
export async function resetPairing(): Promise<void> {
  const db = getSupabaseAdmin();
  if (!db) throw new Error("No backend configured.");
  await db.from("telegram_paired_chats").delete().eq("workspace_id", DEFAULT_WORKSPACE_ID);
  const { error } = await db
    .from("telegram_connections")
    .update({ pairing_code: newPairingCode(), updated_at: new Date().toISOString() })
    .eq("workspace_id", DEFAULT_WORKSPACE_ID);
  if (error) throw new Error(`Failed to reset pairing: ${error.message}`);
}

export async function getOwnerUserId(): Promise<string | null> {
  const db = getSupabaseAdmin();
  if (!db) return null;
  const { data } = await db
    .from("telegram_connections")
    .select("owner_user_id")
    .eq("workspace_id", DEFAULT_WORKSPACE_ID)
    .maybeSingle();
  return (data?.["owner_user_id"] as string | null) ?? null;
}

// --- Sending ---------------------------------------------------------------

const escapeHtml = (t: string) =>
  t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** The agent writes light markdown. Telegram's HTML mode is the most forgiving
 *  way to show it: escape everything, then map **bold**, `code` and # headings. */
export function markdownToTelegramHtml(md: string): string {
  return escapeHtml(md)
    .replace(/^#{1,6}\s+(.+)$/gm, "<b>$1</b>")
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
    .replace(/`([^`\n]+)`/g, "<code>$1</code>");
}

function chunkText(text: string, max = 3800): string[] {
  const chunks: string[] = [];
  let rest = text.trim();
  while (rest.length > max) {
    let cut = rest.lastIndexOf("\n\n", max);
    if (cut < max / 2) cut = rest.lastIndexOf("\n", max);
    if (cut < max / 2) cut = max;
    chunks.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) chunks.push(rest);
  return chunks.length ? chunks : [""];
}

async function logOutbound(chatId: number, text: string) {
  const db = getSupabaseAdmin();
  if (!db) return;
  const { error } = await db.from("telegram_messages").insert({
    workspace_id: DEFAULT_WORKSPACE_ID,
    direction: "out",
    chat_id: chatId,
    chat_type: "private",
    text: text.slice(0, 4096),
  });
  if (error) console.error("[telegram] failed to log outbound message", error);
}

/** Send a message as the connected bot (agent replies, automations). Renders
 *  markdown as Telegram HTML, falls back to plain text if Telegram rejects
 *  the formatting, splits long text, and logs the reply as chat history. */
export async function sendTelegramMessage(
  chatId: number,
  text: string,
  opts: { log?: boolean } = {},
): Promise<void> {
  const token = await resolveTelegramToken();
  if (!token) throw new Error("Telegram isn't connected.");
  for (const chunk of chunkText(text)) {
    try {
      await tgCall(token, "sendMessage", {
        chat_id: chatId,
        text: markdownToTelegramHtml(chunk),
        parse_mode: "HTML",
        link_preview_options: { is_disabled: true },
      });
    } catch {
      await tgCall(token, "sendMessage", { chat_id: chatId, text: chunk });
    }
  }
  if (opts.log !== false) await logOutbound(chatId, text);
}

export async function sendTypingAction(chatId: number): Promise<void> {
  const token = await resolveTelegramToken();
  if (!token) return;
  await tgCall(token, "sendChatAction", { chat_id: chatId, action: "typing" }).catch(
    () => undefined,
  );
}
