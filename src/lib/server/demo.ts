import "@tanstack/react-start/server-only";
import { createHash, randomBytes } from "node:crypto";
import { getKv } from "./kv";
import { getSupabaseAdmin } from "./supabase";

// "Continue as demo": one button, no sign-up. Everyone who presses it gets the same demo setup (the Demo
// plan, the owner's model key, no connectors) — but each visitor gets their OWN throwaway account. That way
// two visitors can never see each other's chats, and the account plus everything it made is deleted when
// the visit ends. Three layers enforce the end: an expired demo token is refused immediately
// (verifyAccessToken), every new demo start clears what has expired, and an hourly job sweeps the rest.

export interface DemoSettings {
  enabled: boolean;
  keyOwnerEmail: string;
  sessionHours: number;
  /** Credits ALL demo visitors together may use per day — the cap on what the shared key can cost. */
  dailyCreditCap: number;
  /** New demo sessions one network address may start per hour. */
  perIpHour: number;
}

export const DEMO_BLOCKED_MESSAGE =
  "This isn't available in the demo. Sign in with Google to use it.";

export class DemoRestrictedError extends Error {
  constructor(message = DEMO_BLOCKED_MESSAGE) {
    super(message);
    this.name = "DemoRestrictedError";
  }
}

const DEFAULTS: DemoSettings = {
  enabled: true,
  keyOwnerEmail: "oluseyioke39@gmail.com",
  sessionHours: 24,
  dailyCreditCap: 200,
  perIpHour: 3,
};

const MAX_LIVE = Math.max(1, Number(process.env["DEMO_MAX_LIVE"]) || 300);

let settingsCache: { at: number; value: DemoSettings } | null = null;
export const invalidateDemoSettings = () => {
  settingsCache = null;
};

export async function getDemoSettings(): Promise<DemoSettings> {
  if (settingsCache && Date.now() - settingsCache.at < 30_000) return settingsCache.value;
  const db = getSupabaseAdmin();
  let value = DEFAULTS;
  if (db) {
    const { data } = await db.from("billing_settings").select("*").eq("id", 1).maybeSingle();
    if (data) {
      value = {
        enabled: data["demo_enabled"] !== false,
        keyOwnerEmail: String(data["demo_key_owner_email"] || DEFAULTS.keyOwnerEmail)
          .trim()
          .toLowerCase(),
        sessionHours: Number(data["demo_session_hours"]) || DEFAULTS.sessionHours,
        dailyCreditCap: Number.isFinite(Number(data["demo_daily_credit_cap"]))
          ? Number(data["demo_daily_credit_cap"])
          : DEFAULTS.dailyCreditCap,
        perIpHour: Number(data["demo_per_ip_hour"]) || DEFAULTS.perIpHour,
      };
    }
  }
  settingsCache = { at: Date.now(), value };
  return value;
}

/** Admin edit of the demo's settings. Only known fields, each checked, so a bad value can't reach the table. */
export async function updateDemoSettings(patch: Partial<DemoSettings>): Promise<void> {
  const db = getSupabaseAdmin();
  if (!db) throw new Error("Not configured.");
  const row: Record<string, unknown> = {};
  if (typeof patch.enabled === "boolean") row["demo_enabled"] = patch.enabled;
  if (typeof patch.keyOwnerEmail === "string") {
    const email = patch.keyOwnerEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      throw new Error("That isn't a valid email address.");
    row["demo_key_owner_email"] = email;
  }
  const int = (v: unknown, min: number, max: number, label: string) => {
    const n = Math.round(Number(v));
    if (!Number.isFinite(n) || n < min || n > max)
      throw new Error(`${label} must be ${min} to ${max}.`);
    return n;
  };
  if (patch.sessionHours !== undefined)
    row["demo_session_hours"] = int(patch.sessionHours, 1, 168, "Session length (hours)");
  if (patch.dailyCreditCap !== undefined)
    row["demo_daily_credit_cap"] = int(patch.dailyCreditCap, 0, 1_000_000, "Daily credit cap");
  if (patch.perIpHour !== undefined)
    row["demo_per_ip_hour"] = int(patch.perIpHour, 1, 100, "Starts per address per hour");
  if (!Object.keys(row).length) return;
  const { error } = await db.from("billing_settings").update(row).eq("id", 1);
  if (error) throw new Error(error.message);
  invalidateDemoSettings();
}

// ---- who is a live demo visitor ---------------------------------------------------------------
const sessionCache = new Map<string, { expiresAt: number | null; until: number }>();
const SESSION_CACHE_MAX = 10_000;

function remember(userId: string, expiresAt: number | null, ttlMs: number) {
  if (sessionCache.size >= SESSION_CACHE_MAX)
    sessionCache.delete(sessionCache.keys().next().value as string);
  sessionCache.set(userId, { expiresAt, until: Date.now() + ttlMs });
}

/** When this account's demo ends (ms since epoch), or null if it isn't a live demo account. */
export async function demoExpiry(userId: string): Promise<number | null> {
  const hit = sessionCache.get(userId);
  if (hit && hit.until > Date.now()) {
    if (hit.expiresAt !== null && hit.expiresAt <= Date.now()) return null;
    return hit.expiresAt;
  }
  const db = getSupabaseAdmin();
  if (!db) return null;
  const { data } = await db
    .from("demo_sessions")
    .select("expires_at")
    .eq("user_id", userId)
    .maybeSingle();
  const exp = data ? new Date(data["expires_at"] as string).getTime() : null;
  const live = exp !== null && exp > Date.now() ? exp : null;
  // Real accounts are remembered as "not demo" for a minute so the check costs nothing per request.
  remember(userId, live, live ? 30_000 : 60_000);
  return live;
}

export async function isDemoUser(userId: string): Promise<boolean> {
  return (await demoExpiry(userId)) !== null;
}

/** Throws for demo visitors: use at the top of anything that connects outside accounts, spends the
 *  owner's money, stores keys or takes payments. */
export async function assertNotDemo(userId: string): Promise<void> {
  if (await isDemoUser(userId)) throw new DemoRestrictedError();
}

// ---- the owner's model key ---------------------------------------------------------------------
let ownerCache: { at: number; email: string; id: string | null } | null = null;

/** The account whose model key every demo visitor borrows. Null if that account doesn't exist. */
export async function demoKeyOwnerId(): Promise<string | null> {
  const { keyOwnerEmail } = await getDemoSettings();
  if (ownerCache && ownerCache.email === keyOwnerEmail && Date.now() - ownerCache.at < 300_000)
    return ownerCache.id;
  const db = getSupabaseAdmin();
  if (!db) return null;
  const { data } = await db.rpc("user_id_by_email", { p_email: keyOwnerEmail });
  const id = typeof data === "string" ? data : null;
  ownerCache = { at: Date.now(), email: keyOwnerEmail, id };
  return id;
}

// ---- daily spend cap -----------------------------------------------------------------------------
const today = () => new Date().toISOString().slice(0, 10);

export interface DemoStats {
  sessionsToday: number;
  creditsToday: number;
  live: number;
}

export async function getDemoStats(): Promise<DemoStats> {
  const db = getSupabaseAdmin();
  if (!db) return { sessionsToday: 0, creditsToday: 0, live: 0 };
  const [{ data: row }, { count }] = await Promise.all([
    db.from("demo_stats").select("sessions, credits").eq("day", today()).maybeSingle(),
    db
      .from("demo_sessions")
      .select("user_id", { count: "exact", head: true })
      .gt("expires_at", new Date().toISOString()),
  ]);
  return {
    sessionsToday: Number(row?.["sessions"] ?? 0),
    creditsToday: Number(row?.["credits"] ?? 0),
    live: count ?? 0,
  };
}

let capCache: { at: number; full: boolean } | null = null;
/** True once all demo visitors together have used today's credit allowance. */
export async function demoCapReached(): Promise<boolean> {
  if (capCache && Date.now() - capCache.at < 15_000) return capCache.full;
  const [{ dailyCreditCap }, stats] = await Promise.all([getDemoSettings(), getDemoStats()]);
  const full = dailyCreditCap > 0 && stats.creditsToday >= dailyCreditCap;
  capCache = { at: Date.now(), full };
  return full;
}

export async function countDemoCredits(credits: number): Promise<void> {
  const db = getSupabaseAdmin();
  if (!db || credits <= 0) return;
  capCache = null;
  await db.rpc("demo_bump", { p_sessions: 0, p_credits: Math.round(credits) });
}

// ---- starting and ending sessions -----------------------------------------------------------------
export class DemoStartError extends Error {
  constructor(
    message: string,
    readonly status: 403 | 429 | 503,
    readonly retryAfter?: number,
  ) {
    super(message);
    this.name = "DemoStartError";
  }
}

export interface DemoStart {
  /** One-time sign-in token: the browser swaps it for a normal session. */
  tokenHash: string;
  expiresAt: string;
}

let lastPurge = 0;
/** Deletes expired demo accounts and everything they own. Cheap when there's nothing to do. */
export async function purgeExpiredDemo(limit = 200): Promise<number> {
  const db = getSupabaseAdmin();
  if (!db) return 0;
  const { data, error } = await db.rpc("purge_expired_demo_users", { p_limit: limit });
  if (error) {
    console.error("[demo] purge failed", error.message);
    return 0;
  }
  lastPurge = Date.now();
  return Number(data ?? 0);
}

export const hashIp = (ip: string) =>
  createHash("sha256").update(`demo:${ip}`).digest("hex").slice(0, 32);

export function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  return (
    (fwd ? fwd.split(",")[0]!.trim() : "") ||
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

export async function startDemoSession(ip: string): Promise<DemoStart> {
  const db = getSupabaseAdmin();
  if (!db) throw new DemoStartError("The demo isn't available right now.", 503);
  const settings = await getDemoSettings();
  if (!settings.enabled) throw new DemoStartError("The demo is switched off right now.", 403);

  // 1. One address can't mint unlimited accounts.
  const ipHash = hashIp(ip);
  const kv = await getKv();
  const hourBucket = Math.floor(Date.now() / 3_600_000);
  const started = await kv.incr(`demo:ip:${ipHash}:${hourBucket}`, 3600);
  if (started > settings.perIpHour) {
    throw new DemoStartError(
      "You've started a few demos already. Try again in an hour, or sign in with Google.",
      429,
      3600 - Math.floor((Date.now() / 1000) % 3600),
    );
  }

  // 2. Housekeeping first, so expired visitors never count against the live cap.
  if (Date.now() - lastPurge > 60_000) await purgeExpiredDemo();

  // 3. Spend and size limits for the shared key.
  if (await demoCapReached())
    throw new DemoStartError(
      "The demo has reached its daily limit. Try again tomorrow, or sign in with Google.",
      503,
    );
  const stats = await getDemoStats();
  if (stats.live >= MAX_LIVE)
    throw new DemoStartError("The demo is full right now. Try again in a little while.", 503, 300);

  // 4. A fresh, isolated account for this visit.
  const id = randomBytes(6).toString("hex");
  const email = `demo+${id}@aduf.me`;
  const expires = new Date(Date.now() + settings.sessionHours * 3_600_000);
  const created = await db.auth.admin.createUser({
    email,
    email_confirm: true,
    password: randomBytes(24).toString("base64url"),
    user_metadata: { full_name: "Demo visitor", demo: true },
    app_metadata: { demo: true },
  });
  const userId = created.data.user?.id;
  if (created.error || !userId) {
    console.error("[demo] couldn't create demo user", created.error?.message);
    throw new DemoStartError("Couldn't start the demo. Try again in a moment.", 503);
  }

  try {
    const owner = { user_id: userId };
    const [s, w, d] = await Promise.all([
      db.from("subscriptions").upsert(
        {
          ...owner,
          plan_id: "demo",
          status: "active",
          source: "admin",
          current_period_end: expires.toISOString(),
        },
        { onConflict: "user_id" },
      ),
      db.from("token_wallets").upsert(
        {
          ...owner,
          period_start: new Date().toISOString(),
          period_end: expires.toISOString(),
          plan_tokens_used: 0,
          bonus_tokens: 0,
        },
        { onConflict: "user_id" },
      ),
      db.from("demo_sessions").insert({
        user_id: userId,
        expires_at: expires.toISOString(),
        ip_hash: ipHash,
      }),
    ]);
    const err = s.error ?? w.error ?? d.error;
    if (err) throw new Error(err.message);

    const link = await db.auth.admin.generateLink({ type: "magiclink", email });
    const tokenHash = link.data.properties?.hashed_token;
    if (link.error || !tokenHash) throw new Error(link.error?.message ?? "no sign-in token");

    remember(userId, expires.getTime(), 30_000);
    await db.rpc("demo_bump", { p_sessions: 1, p_credits: 0 });
    return { tokenHash, expiresAt: expires.toISOString() };
  } catch (e) {
    console.error("[demo] session setup failed, rolling back", e);
    await db.auth.admin.deleteUser(userId).catch(() => {});
    await db.from("demo_sessions").delete().eq("user_id", userId);
    throw new DemoStartError("Couldn't start the demo. Try again in a moment.", 503);
  }
}
