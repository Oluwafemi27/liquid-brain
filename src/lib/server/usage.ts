import "@tanstack/react-start/server-only";
import { WALLET_PERIOD_DAYS, HitLimitError, getEntitlements } from "./billing";
import { demoCapReached, demoExpiry, getDemoSettings, isDemoUser } from "./demo";
import { getKv } from "./kv";
import { getSupabaseAdmin } from "./supabase";
import type { HitWindow, Plan, UsageSnapshot } from "@/lib/billing-types";
import { untilText } from "@/lib/usage-notices";

// Measures what each person has used in their term (month, or the visit for a demo) and enforces the
// per-hour / per-day caps on AI actions that admins set per plan. Counters live in the shared store
// (Redis when set), so the cap holds across every server, not per server.

const HOUR = 3_600_000;
const DAY = 86_400_000;

const planMemo = new Map<string, { plan: Plan; until: number }>();
async function planFor(userId: string): Promise<Plan> {
  const hit = planMemo.get(userId);
  if (hit && hit.until > Date.now()) return hit.plan;
  const { plan } = await getEntitlements(userId);
  if (planMemo.size > 10_000) planMemo.delete(planMemo.keys().next().value as string);
  planMemo.set(userId, { plan, until: Date.now() + 20_000 });
  return plan;
}
/** Forget a person's cached plan (after they buy or an admin changes it). */
export const forgetPlan = (userId: string) => planMemo.delete(userId);

const key = (scope: "h" | "d", userId: string, bucket: number) =>
  `hit:${scope}:${userId}:${bucket}`;

/** Counts one AI action against the person's hourly and daily caps, and refuses it when a cap is full.
 *  Throws HitLimitError (a quota error, so existing handlers cover it). 0 = no cap. */
export async function enforceHitLimit(userId: string, now = Date.now()): Promise<void> {
  // If the plan can't be looked up (database unreachable / not configured) the hit caps can't be applied;
  // the credit check in withBilling still decides whether the action may run.
  const plan = await planFor(userId).catch(() => null);
  if (!plan) return;

  if (plan.id === "demo" && (await demoCapReached())) {
    throw new HitLimitError(
      "The demo has reached its daily limit. Sign in with Google to keep going, or come back tomorrow.",
      "demo-capacity",
      0,
      new Date((Math.floor(now / DAY) + 1) * DAY).toISOString(),
    );
  }

  const kv = await getKv();
  const hourly = plan.limits.hitsPerHour;
  const daily = plan.limits.hitsPerDay;

  if (hourly > 0) {
    const bucket = Math.floor(now / HOUR);
    if ((await kv.incr(key("h", userId, bucket), 3600)) > hourly) {
      const resetsAt = new Date((bucket + 1) * HOUR).toISOString();
      throw new HitLimitError(
        `You've used all ${hourly} AI replies the ${plan.name} plan allows each hour. You can send another in ${untilText(resetsAt, now)}.`,
        "hour",
        hourly,
        resetsAt,
      );
    }
  }
  if (daily > 0) {
    const bucket = Math.floor(now / DAY);
    if ((await kv.incr(key("d", userId, bucket), 86_400)) > daily) {
      const resetsAt = new Date((bucket + 1) * DAY).toISOString();
      throw new HitLimitError(
        `You've used all ${daily} AI replies the ${plan.name} plan allows each day. You can send another in ${untilText(resetsAt, now)}.`,
        "day",
        daily,
        resetsAt,
      );
    }
  }
}

async function window(
  scope: "h" | "d",
  userId: string,
  limit: number,
  now: number,
): Promise<HitWindow> {
  const size = scope === "h" ? HOUR : DAY;
  const bucket = Math.floor(now / size);
  const used =
    limit > 0 ? ((await (await getKv()).get<number>(key(scope, userId, bucket))) ?? 0) : 0;
  return {
    used: Math.min(Number(used) || 0, limit),
    limit,
    resetsAt: new Date((bucket + 1) * size).toISOString(),
  };
}

/** Everything the usage meter, billing page and warnings need, for one person. */
export async function getUsageSnapshot(userId: string): Promise<UsageSnapshot> {
  const now = Date.now();
  const e = await getEntitlements(userId);
  const demoEnd = await demoExpiry(userId);
  const end = new Date(e.wallet.periodEnd).getTime();
  const demo = demoEnd !== null || (await isDemoUser(userId));
  const start = demo
    ? end - (await getDemoSettings()).sessionHours * HOUR
    : end - WALLET_PERIOD_DAYS * DAY;

  let hits = 0;
  let sessions = 0;
  const db = getSupabaseAdmin();
  if (db) {
    const { data } = await db.rpc("term_usage", {
      p_user: userId,
      p_since: new Date(start).toISOString(),
    });
    const row = (Array.isArray(data) ? data[0] : data) as
      { hits?: number; sessions?: number } | null | undefined;
    hits = Number(row?.hits ?? 0);
    sessions = Number(row?.sessions ?? 0);
  }

  const [hour, day] = await Promise.all([
    window("h", userId, e.plan.limits.hitsPerHour, now),
    window("d", userId, e.plan.limits.hitsPerDay, now),
  ]);

  return {
    planId: e.plan.id,
    planName: e.plan.name,
    credits: {
      used: e.wallet.planUsed,
      limit: e.wallet.planTokens,
      bonus: e.wallet.bonus,
      remaining: e.wallet.planRemaining,
    },
    term: {
      start: new Date(start).toISOString(),
      end: new Date(end).toISOString(),
      daysLeft: Math.max(0, Math.ceil((end - now) / DAY)),
      kind: demo ? "demo" : "month",
    },
    hour,
    day,
    hitsThisTerm: hits,
    sessionsThisTerm: sessions,
  };
}
