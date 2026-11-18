import { requireFeature } from "./billing";
import { appBaseUrl } from "@/lib/server/app-url";
import "@tanstack/react-start/server-only";
import type { DailyVerdict, VerdictItem } from "@/lib/aduf-types";
import { logEvent } from "./activity";
import { createInsight } from "./insights";
import { sendEmailToOwner, sendTelegramToOwner, type DeliveryResult } from "./notify";
import { getOwnerSettings, isQuietNow } from "./owner-settings";
import { getSupabaseAdmin } from "./supabase";
import { computeVerdict, loadVerdictInput } from "./verdict";

const APP_URL = () => appBaseUrl();

/** Only things the owner agreed to hear about: broken/slow connections, failed runs, sales drops. */
const alertWorthy = (i: VerdictItem) =>
  i.level !== "ok" && (i.id.startsWith("health:") || i.id === "runs" || i.id === "sales");

export function digestText(v: DailyVerdict): string {
  const lines = [`ADUF daily summary — ${v.headline}`, v.subline];
  const todo = v.items.filter((i) => i.level !== "ok").slice(0, 5);
  if (todo.length) {
    lines.push("", "Worth a look:");
    for (const i of todo)
      lines.push(`• ${i.text} ${i.why}${i.suggestion ? ` → ${i.suggestion}` : ""}`);
  }
  lines.push("", `Confidence: ${v.confidence}. ${v.confidenceNote}`);
  if (APP_URL()) lines.push(`Open ADUF: ${APP_URL()}`);
  return lines.join("\n");
}

async function deliver(
  userId: string,
  channel: "email" | "telegram",
  subject: string,
  text: string,
): Promise<DeliveryResult> {
  return channel === "telegram"
    ? sendTelegramToOwner(userId, text)
    : sendEmailToOwner(userId, subject, text);
}

/** Creates in-app alerts for crossed thresholds (once per day each) and, outside quiet hours,
 *  pushes them. Alerts held back by quiet hours are still in-app and land in the next digest. */
export async function runAlertCycle(
  userId: string,
  opts: { push: boolean; now?: Date } = { push: false },
): Promise<{ created: number; pushed: boolean }> {
  const db = getSupabaseAdmin();
  if (!db) return { created: 0, pushed: false };
  const now = opts.now ?? new Date();
  const settings = await getOwnerSettings(userId);
  if (!settings.alertsEnabled) return { created: 0, pushed: false };

  const verdict = computeVerdict(await loadVerdictInput(userId));
  const since = new Date(now.getTime() - 86_400_000).toISOString();
  const fresh: VerdictItem[] = [];
  for (const item of verdict.items.filter(alertWorthy)) {
    const { count } = await db
      .from("insights")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("title", item.text)
      .gte("created_at", since);
    if (count) continue; // already told them today
    await createInsight(userId, {
      title: item.text,
      body: `What happened: ${item.text}\nWhy it matters: ${item.why}${item.suggestion ? `\nSuggested action: ${item.suggestion}` : ""}`,
      severity: "warning",
      source: item.sources[0]?.label ?? "ADUF",
    });
    await logEvent(userId, {
      platform: "aduf",
      kind: "alert",
      title: `Alert: ${item.text}`,
      detail: item.why,
      status: item.level === "act" ? "error" : "warn",
    });
    fresh.push(item);
  }

  let pushed = false;
  const canPush = await requireFeature(userId, "digest").then(
    () => true,
    () => false,
  );
  if (opts.push && canPush && fresh.length > 0 && !isQuietNow(settings, now)) {
    const text = [
      "ADUF alert",
      ...fresh.map(
        (i) => `• ${i.text}\n  Why: ${i.why}${i.suggestion ? `\n  Do: ${i.suggestion}` : ""}`,
      ),
    ].join("\n");
    pushed = (await deliver(userId, settings.digestChannel, "ADUF alert", text)).ok;
  }
  return { created: fresh.length, pushed };
}

export async function sendDigest(userId: string): Promise<DeliveryResult> {
  try {
    await requireFeature(userId, "digest");
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Daily summaries aren't in your plan.",
    };
  }
  const settings = await getOwnerSettings(userId);
  const verdict = computeVerdict(await loadVerdictInput(userId));
  const res = await deliver(
    userId,
    settings.digestChannel,
    `ADUF: ${verdict.headline}`,
    digestText(verdict),
  );
  await logEvent(userId, {
    platform: "aduf",
    kind: "system",
    title: res.ok
      ? `Sent your daily summary (${settings.digestChannel})`
      : "Couldn't send your daily summary",
    detail: res.message,
    status: res.ok ? "ok" : "error",
  });
  return res;
}
