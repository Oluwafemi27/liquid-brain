import "@tanstack/react-start/server-only";
import { z } from "zod";
import type { OwnerSettings } from "@/lib/aduf-types";
import { getSupabaseAdmin } from "./supabase";

export const DEFAULT_SETTINGS: OwnerSettings = {
  adChangeCapUsd: 25,
  dailyMessageCap: 50,
  alertsEnabled: true,
  salesDropPct: 20,
  failedRunsThreshold: 3,
  quietStart: "22:00",
  quietEnd: "07:00",
  timezone: "Africa/Lagos",
  digestEnabled: false,
  digestChannel: "email",
};

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM");
const validZone = (tz: string) => {
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

export const settingsPatchSchema = z
  .object({
    adChangeCapUsd: z.number().min(0).max(1_000_000),
    dailyMessageCap: z.number().int().min(0).max(100_000),
    alertsEnabled: z.boolean(),
    salesDropPct: z.number().int().min(1).max(100),
    failedRunsThreshold: z.number().int().min(1).max(100),
    quietStart: hhmm,
    quietEnd: hhmm,
    timezone: z.string().max(64).refine(validZone, "Unknown time zone"),
    digestEnabled: z.boolean(),
    digestChannel: z.enum(["email", "telegram"]),
  })
  .partial();

type Row = Record<string, unknown>;
const fromRow = (r: Row): OwnerSettings => ({
  adChangeCapUsd: Number(r["ad_change_cap_usd"]),
  dailyMessageCap: Number(r["daily_message_cap"]),
  alertsEnabled: Boolean(r["alerts_enabled"]),
  salesDropPct: Number(r["sales_drop_pct"]),
  failedRunsThreshold: Number(r["failed_runs_threshold"]),
  quietStart: String(r["quiet_start"]),
  quietEnd: String(r["quiet_end"]),
  timezone: String(r["timezone"]),
  digestEnabled: Boolean(r["digest_enabled"]),
  digestChannel: r["digest_channel"] === "telegram" ? "telegram" : "email",
});

export async function getOwnerSettings(userId: string): Promise<OwnerSettings> {
  const db = getSupabaseAdmin();
  if (!db) return DEFAULT_SETTINGS;
  const { data, error } = await db
    .from("owner_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) console.error("[owner-settings] read failed", error.message);
  return data ? fromRow(data as Row) : DEFAULT_SETTINGS;
}

export async function saveOwnerSettings(userId: string, patch: unknown): Promise<OwnerSettings> {
  const db = getSupabaseAdmin();
  if (!db) throw new Error("No backend configured.");
  const parsed = settingsPatchSchema.parse(patch);
  const clean = Object.fromEntries(
    Object.entries(parsed).filter(([, v]) => v !== undefined),
  ) as Partial<OwnerSettings>;
  const next: OwnerSettings = { ...(await getOwnerSettings(userId)), ...clean };
  const { error } = await db.from("owner_settings").upsert(
    {
      user_id: userId,
      ad_change_cap_usd: next.adChangeCapUsd,
      daily_message_cap: next.dailyMessageCap,
      alerts_enabled: next.alertsEnabled,
      sales_drop_pct: next.salesDropPct,
      failed_runs_threshold: next.failedRunsThreshold,
      quiet_start: next.quietStart,
      quiet_end: next.quietEnd,
      timezone: next.timezone,
      digest_enabled: next.digestEnabled,
      digest_channel: next.digestChannel,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) throw new Error(`Couldn't save settings: ${error.message}`);
  return next;
}

/** True when `now` falls inside the owner's quiet hours (handles overnight windows). */
export function isQuietNow(
  s: Pick<OwnerSettings, "quietStart" | "quietEnd" | "timezone">,
  now: Date,
): boolean {
  if (s.quietStart === s.quietEnd) return false;
  let local: string;
  try {
    local = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: s.timezone,
    }).format(now);
  } catch {
    return false;
  }
  const t = local.replace(/^24:/, "00:");
  return s.quietStart < s.quietEnd
    ? t >= s.quietStart && t < s.quietEnd
    : t >= s.quietStart || t < s.quietEnd;
}
