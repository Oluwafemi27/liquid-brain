import { planCodeUsable } from "./paystack";
import "@tanstack/react-start/server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import {
  DEFAULT_LIMITS,
  type BillingInterval,
  type Entitlements,
  type Plan,
  type PlanLimits,
  type SubSource,
  type SubStatus,
  type TokenPack,
  type UsageByFeature,
} from "@/lib/billing-types";
import { getSupabaseAdmin } from "./supabase";

type Row = Record<string, unknown>;

export class QuotaExceededError extends Error {
  constructor(
    message = "You've used all your AI tokens. Upgrade your plan or top up to keep going.",
  ) {
    super(message);
    this.name = "QuotaExceededError";
  }
}
export class EntitlementError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EntitlementError";
  }
}

const DAY = 86_400_000;
export const WALLET_PERIOD_DAYS = 30;
/** Paystack renewals arrive by webhook; keep access this long past the period end before downgrading. */
export const RENEWAL_GRACE_MS = 2 * DAY;
export const PAST_DUE_GRACE_MS = 3 * DAY;

function requireDb() {
  const db = getSupabaseAdmin();
  if (!db) throw new Error("The backend isn't configured.");
  return db;
}

// ----------------------------------------------------------------- plans

export const planFromRow = (r: Row): Plan => ({
  id: r["id"] as string,
  name: r["name"] as string,
  tagline: (r["tagline"] as string) ?? "",
  sortOrder: Number(r["sort_order"]),
  active: Boolean(r["active"]),
  highlighted: Boolean(r["highlighted"]),
  priceNgnMonth: Number(r["price_ngn_month"]),
  priceNgnYear: Number(r["price_ngn_year"]),
  priceUsdMonth: Number(r["price_usd_month"]),
  priceUsdYear: Number(r["price_usd_year"]),
  monthlyTokens: Number(r["monthly_tokens"]),
  limits: { ...DEFAULT_LIMITS, ...((r["limits"] as Partial<PlanLimits>) ?? {}) },
  features: (r["features"] as string[]) ?? [],
  autoRenewMonth: Boolean(r["paystack_plan_month"]) && planCodeUsable(r["paystack_plan_mode"]),
  autoRenewYear: Boolean(r["paystack_plan_year"]) && planCodeUsable(r["paystack_plan_mode"]),
});

let planCache: { at: number; plans: Plan[] } | null = null;
export const invalidatePlanCache = () => {
  planCache = null;
};

export async function listPlans(opts: { includeInactive?: boolean } = {}): Promise<Plan[]> {
  if (!planCache || Date.now() - planCache.at > 60_000) {
    const { data, error } = await requireDb().from("plans").select("*").order("sort_order");
    if (error) throw new Error(`Couldn't load plans: ${error.message}`);
    planCache = { at: Date.now(), plans: (data ?? []).map((r) => planFromRow(r as Row)) };
  }
  return opts.includeInactive ? planCache.plans : planCache.plans.filter((p) => p.active);
}

export async function getPlan(id: string): Promise<Plan | null> {
  return (await listPlans({ includeInactive: true })).find((p) => p.id === id) ?? null;
}

export async function listPacks(opts: { includeInactive?: boolean } = {}): Promise<TokenPack[]> {
  const { data } = await requireDb().from("token_packs").select("*").order("sort_order");
  return (data ?? [])
    .map((r) => ({
      id: r["id"] as string,
      name: r["name"] as string,
      tokens: Number(r["tokens"]),
      bonusTokens: Number(r["bonus_tokens"] ?? 0),
      priceNgn: Number(r["price_ngn"]),
      priceUsd: Number(r["price_usd"]),
      active: Boolean(r["active"]),
      sortOrder: Number(r["sort_order"]),
    }))
    .filter((p) => opts.includeInactive || p.active);
}

/** Paystack plan code for a plan + interval (server only — never sent to browsers). */
export async function paystackPlanCode(
  planId: string,
  interval: BillingInterval,
): Promise<string | null> {
  const { data } = await requireDb()
    .from("plans")
    .select("paystack_plan_month, paystack_plan_year, paystack_plan_mode")
    .eq("id", planId)
    .maybeSingle();
  if (!planCodeUsable(data?.["paystack_plan_mode"])) return null;
  return (
    ((interval === "month" ? data?.["paystack_plan_month"] : data?.["paystack_plan_year"]) as
      string | null) ?? null
  );
}

// ------------------------------------------------------ accounts / lifecycle

/** Model tokens that make one credit. Kept in billing_settings so an admin can tune it. */
export const DEFAULT_TOKENS_PER_CREDIT = 12000;

export async function getBillingSettings(): Promise<{
  trialEnabled: boolean;
  trialDays: number;
  trialPlan: string;
  tokensPerCredit: number;
}> {
  const { data } = await requireDb().from("billing_settings").select("*").eq("id", 1).maybeSingle();
  return {
    trialEnabled: data ? Boolean(data["trial_enabled"]) : false,
    trialDays: data ? Number(data["trial_days"]) : 14,
    trialPlan: data ? (data["trial_plan"] as string) : "growth",
    tokensPerCredit: data
      ? Number(data["tokens_per_credit"] ?? DEFAULT_TOKENS_PER_CREDIT)
      : DEFAULT_TOKENS_PER_CREDIT,
  };
}

/** First sight of a user: a free plan or (if the admin enabled it) a trial, plus a token wallet. */
async function ensureAccount(userId: string): Promise<void> {
  const db = requireDb();
  const { data: existing } = await db
    .from("subscriptions")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (existing) {
    // A wallet could be missing if a previous attempt died half-way.
    await db.from("token_wallets").upsert(
      {
        user_id: userId,
        period_end: new Date(Date.now() + WALLET_PERIOD_DAYS * DAY).toISOString(),
      },
      { onConflict: "user_id", ignoreDuplicates: true },
    );
    return;
  }
  const s = await getBillingSettings();
  const trialPlan = s.trialEnabled ? await getPlan(s.trialPlan) : null;
  const now = Date.now();
  await db.from("subscriptions").upsert(
    trialPlan
      ? {
          user_id: userId,
          plan_id: trialPlan.id,
          status: "trialing",
          source: "trial",
          current_period_end: new Date(now + s.trialDays * DAY).toISOString(),
        }
      : { user_id: userId, plan_id: "free", status: "active", source: "free" },
    { onConflict: "user_id", ignoreDuplicates: true },
  );
  await db
    .from("token_wallets")
    .upsert(
      { user_id: userId, period_end: new Date(now + WALLET_PERIOD_DAYS * DAY).toISOString() },
      { onConflict: "user_id", ignoreDuplicates: true },
    );
  if (trialPlan) {
    await db.from("token_ledger").insert({
      user_id: userId,
      delta: 0,
      kind: "trial",
      note: `${s.trialDays}-day ${trialPlan.name} trial started`,
    });
  }
}

/** Moves an expired plan back to Free. Conditional update, so concurrent callers can't fight. */
async function downgradeToFree(userId: string, expectedPlan: string): Promise<void> {
  await requireDb()
    .from("subscriptions")
    .update({
      plan_id: "free",
      status: "active",
      source: "free",
      billing_interval: null,
      current_period_end: null,
      cancel_at_period_end: false,
      grace_until: null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("plan_id", expectedPlan);
}

/** Pure: should this subscription be treated as ended right now? */
export function isSubscriptionExpired(
  s: {
    source: SubSource;
    status: SubStatus;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    graceUntil: string | null;
    planId: string;
  },
  now: number,
): boolean {
  if (s.planId === "free" || !s.currentPeriodEnd) return false;
  const end = new Date(s.currentPeriodEnd).getTime();
  if (now <= end) return false;
  if (s.status === "past_due" && s.graceUntil && now < new Date(s.graceUntil).getTime())
    return false;
  // Auto-renewing Paystack subscriptions get a short window for the renewal webhook to land.
  if (s.source === "paystack" && !s.cancelAtPeriodEnd && now < end + RENEWAL_GRACE_MS) return false;
  return true;
}

export async function getEntitlements(userId: string): Promise<Entitlements> {
  const db = requireDb();
  await ensureAccount(userId);
  const [{ data: sub }, { data: wallet }] = await Promise.all([
    db.from("subscriptions").select("*").eq("user_id", userId).single(),
    db.from("token_wallets").select("*").eq("user_id", userId).single(),
  ]);
  let s = sub as Row;
  let planId = s["plan_id"] as string;

  if (
    isSubscriptionExpired(
      {
        source: s["source"] as SubSource,
        status: s["status"] as SubStatus,
        currentPeriodEnd: (s["current_period_end"] as string | null) ?? null,
        cancelAtPeriodEnd: Boolean(s["cancel_at_period_end"]),
        graceUntil: (s["grace_until"] as string | null) ?? null,
        planId,
      },
      Date.now(),
    )
  ) {
    await downgradeToFree(userId, planId);
    s = {
      ...s,
      plan_id: "free",
      status: "active",
      source: "free",
      billing_interval: null,
      current_period_end: null,
      cancel_at_period_end: false,
    };
    planId = "free";
  }

  const plan = (await getPlan(planId)) ?? (await getPlan("free"))!;
  let w = wallet as Row;
  if (new Date(w["period_end"] as string).getTime() <= Date.now()) {
    const start = new Date();
    const { data: renewed } = await db
      .from("token_wallets")
      .update({
        plan_tokens_used: 0,
        period_start: start.toISOString(),
        period_end: new Date(start.getTime() + WALLET_PERIOD_DAYS * DAY).toISOString(),
        updated_at: start.toISOString(),
      })
      .eq("user_id", userId)
      .lte("period_end", start.toISOString())
      .select("*")
      .maybeSingle();
    if (renewed) {
      w = renewed as Row;
      await db.from("token_ledger").insert({
        user_id: userId,
        delta: plan.monthlyTokens,
        kind: "renewal",
        note: `${plan.name} monthly allowance`,
      });
    } else {
      w = (await db.from("token_wallets").select("*").eq("user_id", userId).single()).data as Row;
    }
  }

  const planUsed = Number(w["plan_tokens_used"]);
  const planRemaining = Math.max(plan.monthlyTokens - planUsed, 0);
  const bonus = Number(w["bonus_tokens"]);
  const interval = (s["billing_interval"] as BillingInterval | null) ?? null;
  return {
    plan,
    subscription: {
      planId,
      status: s["status"] as SubStatus,
      source: s["source"] as SubSource,
      interval,
      currentPeriodEnd: (s["current_period_end"] as string | null) ?? null,
      cancelAtPeriodEnd: Boolean(s["cancel_at_period_end"]),
      autoRenews:
        s["source"] === "paystack" &&
        Boolean(s["paystack_subscription_code"]) &&
        !s["cancel_at_period_end"],
    },
    wallet: {
      planTokens: plan.monthlyTokens,
      planUsed,
      planRemaining,
      bonus,
      total: planRemaining + bonus,
      periodEnd: w["period_end"] as string,
    },
  };
}

// --------------------------------------------------------------- metering

export interface BillingContext {
  userId: string;
  feature: string;
  /** Raw model tokens used so far in this action (filled in by every model call inside it). */
  rawTokens?: number;
}
const als = new AsyncLocalStorage<BillingContext>();

let ratioCache: { at: number; value: number } | null = null;
async function tokensPerCredit(): Promise<number> {
  if (ratioCache && Date.now() - ratioCache.at < 60_000) return ratioCache.value;
  const value = await getBillingSettings()
    .then((s) => s.tokensPerCredit)
    .catch(() => DEFAULT_TOKENS_PER_CREDIT);
  ratioCache = { at: Date.now(), value };
  return value;
}
/** Raw tokens to credits: never free (at least 1 if anything ran), and rounded up. */
export const creditsFor = (rawTokens: number, perCredit: number): number =>
  rawTokens > 0 ? Math.max(1, Math.ceil(rawTokens / Math.max(1, perCredit))) : 0;

/** Runs `fn` as ONE billed action: every model call inside it adds to a running total, and the person is
 *  charged once at the end, in credits (so a reply that took three model calls is still one reply). */
export const withBilling = async <T>(ctx: BillingContext, fn: () => Promise<T>): Promise<T> => {
  const scoped: BillingContext = { ...ctx, rawTokens: 0 };
  try {
    return await als.run(scoped, fn);
  } finally {
    const credits = creditsFor(scoped.rawTokens ?? 0, await tokensPerCredit());
    if (credits > 0) await recordUsage(ctx.userId, credits, ctx.feature);
  }
};
export const billingContext = (): BillingContext | undefined => als.getStore();

export async function assertTokensAvailable(userId: string): Promise<void> {
  const e = await getEntitlements(userId);
  if (e.wallet.total <= 0) throw new QuotaExceededError();
}

export async function recordUsage(userId: string, tokens: number, feature: string): Promise<void> {
  if (!Number.isFinite(tokens) || tokens <= 0) return;
  const e = await getEntitlements(userId);
  const { error } = await requireDb().rpc("consume_tokens", {
    p_user: userId,
    p_amount: Math.round(tokens),
    p_plan_limit: e.plan.monthlyTokens,
    p_feature: feature,
  });
  if (error) console.error("[billing] couldn't record token usage", error.message);
}

/** Rough fallback when a provider omits usage: ~4 characters per token. */
export const estimateTokens = (...texts: string[]): number =>
  Math.ceil(texts.reduce((n, t) => n + t.length, 0) / 4);

// ------------------------------------------------------------ entitlements

/** Throws when the plan doesn't include a capability (n8n, sandbox, digest). */
export async function requireFeature(
  userId: string,
  feature: "n8n" | "sandbox" | "digest",
): Promise<void> {
  const e = await getEntitlements(userId);
  if (!e.plan.limits[feature]) {
    throw new EntitlementError(
      `${feature === "n8n" ? "Building n8n workflows" : feature === "sandbox" ? "Running code" : "Daily summaries and pushed alerts"} isn't included in the ${e.plan.name} plan. Upgrade in Billing to use it.`,
    );
  }
}

/** Throws when adding one more would exceed the plan's cap. */
export async function requireRoom(
  userId: string,
  key: "automations" | "dataSources",
  current: number,
): Promise<void> {
  const e = await getEntitlements(userId);
  const cap = e.plan.limits[key];
  if (current >= cap) {
    throw new EntitlementError(
      `Your ${e.plan.name} plan allows ${cap} ${key === "automations" ? "automation" : "data source"}${cap === 1 ? "" : "s"}. Upgrade in Billing to add more.`,
    );
  }
}

export async function usageByFeature(userId: string, days = 30): Promise<UsageByFeature[]> {
  const since = new Date(Date.now() - days * DAY).toISOString();
  const { data } = await requireDb()
    .from("token_ledger")
    .select("feature, delta")
    .eq("user_id", userId)
    .eq("kind", "usage")
    .gte("created_at", since)
    .limit(20_000);
  const by = new Map<string, number>();
  for (const r of data ?? [])
    by.set(
      (r["feature"] as string) || "other",
      (by.get((r["feature"] as string) || "other") ?? 0) - Number(r["delta"]),
    );
  return [...by]
    .map(([feature, tokens]) => ({ feature, tokens }))
    .sort((a, b) => b.tokens - a.tokens);
}
