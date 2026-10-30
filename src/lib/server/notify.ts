import "@tanstack/react-start/server-only";
import { getSupabaseAdmin } from "./supabase";
import { sendTelegramMessage } from "./telegram";

export interface DeliveryResult {
  ok: boolean;
  message: string;
}

export const emailConfigured = () => Boolean(process.env["RESEND_API_KEY"]);

async function userEmail(userId: string): Promise<string | null> {
  const db = getSupabaseAdmin();
  const { data } = await db!.auth.admin.getUserById(userId);
  return data.user?.email ?? null;
}

/** Sends to the owner's own sign-in email through Resend (ADUF never touches their mailbox). */
export async function sendEmailToOwner(
  userId: string,
  subject: string,
  text: string,
): Promise<DeliveryResult> {
  const key = process.env["RESEND_API_KEY"];
  if (!key)
    return { ok: false, message: "Email isn't set up on this server yet (RESEND_API_KEY)." };
  const to = await userEmail(userId);
  if (!to) return { ok: false, message: "No email address on your account." };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: process.env["DIGEST_FROM"] ?? "ADUF AI <onboarding@resend.dev>",
      to,
      subject,
      text,
    }),
  });
  return res.ok
    ? { ok: true, message: `Sent to ${to}.` }
    : { ok: false, message: `Email provider refused it (${res.status}).` };
}

export async function sendTelegramToOwner(userId: string, text: string): Promise<DeliveryResult> {
  const db = getSupabaseAdmin();
  try {
    const { data } = await db!
      .from("telegram_connections")
      .select("user_chat_id")
      .eq("user_id", userId)
      .maybeSingle();
    const chat = data?.["user_chat_id"] as number | undefined;
    if (!chat) return { ok: false, message: "Telegram isn't linked to your account." };
    await sendTelegramMessage(chat, text, { log: false });
    return { ok: true, message: "Sent on Telegram." };
  } catch {
    return { ok: false, message: "Telegram isn't set up on this server." };
  }
}
