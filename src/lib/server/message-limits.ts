import "@tanstack/react-start/server-only";
import { logEvent } from "./activity";
import { getOwnerSettings } from "./owner-settings";
import { DEFAULT_WORKSPACE_ID, getSupabaseAdmin } from "./supabase";

/** True when ADUF has already sent the owner's daily cap of customer messages (rolling 24h).
 *  Records a single warning per hour so the log shows why auto-replies went quiet. */
export async function dailyMessageCapReached(ownerUserId: string): Promise<boolean> {
  const db = getSupabaseAdmin();
  if (!db) return false;
  const { dailyMessageCap } = await getOwnerSettings(ownerUserId);
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const { count } = await db
    .from("telegram_messages")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", DEFAULT_WORKSPACE_ID)
    .eq("direction", "out")
    .gte("created_at", since);
  if ((count ?? 0) < dailyMessageCap) return false;

  const hourAgo = new Date(Date.now() - 3_600_000).toISOString();
  const { count: recent } = await db
    .from("platform_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", ownerUserId)
    .eq("platform", "telegram")
    .eq("kind", "message")
    .eq("status", "warn")
    .gte("created_at", hourAgo);
  if (!recent) {
    await logEvent(ownerUserId, {
      platform: "telegram",
      kind: "message",
      title: "Auto-replies paused: daily message limit reached",
      detail: `ADUF has sent ${count} messages in 24 hours — your limit is ${dailyMessageCap}. Raise it in Settings → Safety limits if that's too low.`,
      status: "warn",
    });
  }
  return true;
}

export async function logAutoReply(ownerUserId: string, handoff: boolean): Promise<void> {
  await logEvent(ownerUserId, {
    platform: "telegram",
    kind: "message",
    title: handoff ? "Auto-replied, then handed a customer to you" : "Auto-replied to a customer",
    status: "ok",
  });
}
