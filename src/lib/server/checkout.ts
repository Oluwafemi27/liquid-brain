import "@tanstack/react-start/server-only";
import { z } from "zod";
import type { BillingInterval, PaymentView, Plan, PlanLimits } from "@/lib/billing-types";
import { logEvent } from "./activity";
import {
  PAST_DUE_GRACE_MS,
  WALLET_PERIOD_DAYS,
  getEntitlements,
  getPlan,
  invalidatePlanCache,
  listPacks,
  listPlans,
} from "./billing";
import {
  PaystackError,
  createPaystackPlan,
  disablePaystackSubscription,
  enablePaystackSubscription,
  initializeTransaction,
  paystackConfigured,
  verifyTransaction,
} from "./paystack";
import { PromoError, findUsablePromo } from "./promos";
import { getSupabaseAdmin } from "./supabase";

type Row = Record<string, unknown>;
const DAY = 86_400_000;

export class BillingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BillingError";
  }
}

function requireDb() {
  const db = getSupabaseAdmin();
  if (!db) throw new BillingError("The backend isn't configured.");
  return db;
}

// ------------------------------------------------------------- pure helpers

export function addInterval(from: Date, interval: BillingInterval): Date {
  // Clamp to the last day of the target month (Jan 31 + 1 month = Feb 28, not Mar 3).
  const d = new Date(from);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  if (interval === "month") d.setUTCMonth(d.getUTCMonth() + 1);
  else d.setUTCFullYear(d.getUTCFullYear() + 1);
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return d;
}

export const planPriceNgn = (p: Plan, interval: BillingInterval): number =>
  interval === "month" ? p.priceNgnMonth : p.priceNgnYear;

/** Kobo to charge after an optional percentage discount. Never negative. */
export function priceInKobo(
  amountNgn: number,
  percentOff = 0,
): { amountKobo: number; discountKobo: number; finalKobo: number } {
  const amountKobo = Math.round(amountNgn * 100);
  const discountKobo = Math.min(amountKobo, Math.round((amountKobo * percentOff) / 100));
  return { amountKobo, discountKobo, finalKobo: amountKobo - discountKobo };
}

/** Renewals extend from the old end date (no lost days); anything else starts now. */
export function nextPeriodEnd(opts: {
  now: Date;
  currentEnd: string | null;
  extend: boolean;
  interval: BillingInterval;
}): Date {
  const start =
    opts.extend && opts.currentEnd && new Date(opts.currentEnd) > opts.now
      ? new Date(opts.currentEnd)
      : opts.now;
  return addInterval(start, opts.interval);
}

// ------------------------------------------------------------------ applying

async function resetWallet(userId: string, plan: Plan, note: string): Promise<void> {
  const db = requireDb();
  const now = new Date();
  await db
    .from("token_wallets")
    .update({
      plan_tokens_used: 0,
      period_start: now.toISOString(),
      period_end: new Date(now.getTime() + WALLET_PERIOD_DAYS * DAY).toISOString(),
      updated_at: now.toISOString(),
    })
    .eq("user_id", userId);
  await db
    .from("token_ledger")
    .insert({ user_id: userId, delta: plan.monthlyTokens, kind: "purchase", note });
}

/** Marks a pending payment successful and delivers what was bought. Idempotent: the conditional
 *  update means the webhook and the browser callback can both arrive and only one applies it. */
export async function applyPayment(
  paymentId: string,
  ctx: { customerCode?: string | null; paidAt?: string | null } = {},
): Promise<boolean> {
  const db = requireDb();
  const { data: claimed } = await db
    .from("payments")
    .update({ status: "success", paid_at: ctx.paidAt ?? new Date().toISOString() })
    .eq("id", paymentId)
    .eq("status", "pending")
    .select("*")
    .maybeSingle();
  if (!claimed) return false;
  const p = claimed as Row;
  const userId = p["user_id"] as string;
  const reference = p["paystack_reference"] as string;

  if (p["kind"] === "topup") {
    const tokens = Number(p["tokens"]);
    await getEntitlements(userId);
    await db.rpc("grant_bonus_tokens", {
      p_user: userId,
      p_amount: tokens,
      p_kind: "topup",
      p_note: "Token top-up",
      p_ref: reference,
    });
    await logEvent(userId, {
      platform: "aduf",
      kind: "system",
      title: `Added ${tokens.toLocaleString()} tokens`,
      detail: "Top-up payment received",
      status: "ok",
    });
  } else {
    const plan = (await getPlan(p["plan_id"] as string))!;
    const interval = p["billing_interval"] as BillingInterval;
    await getEntitlements(userId);
    const { data: sub } = await db.from("subscriptions").select("*").eq("user_id", userId).single();
    const s = sub as Row;
    const sameActive =
      s["plan_id"] === plan.id && s["source"] === "paystack" && s["status"] !== "trialing";
    const end = nextPeriodEnd({
      now: new Date(),
      currentEnd: (s["current_period_end"] as string | null) ?? null,
      extend: sameActive,
      interval,
    });
    await db.from("subscriptions").upsert(
      {
        user_id: userId,
        plan_id: plan.id,
        status: "active",
        source: "paystack",
        billing_interval: interval,
        current_period_end: end.toISOString(),
        cancel_at_period_end: false,
        grace_until: null,
        paystack_customer_code:
          ctx.customerCode ?? (s["paystack_customer_code"] as string | null) ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (!sameActive) await resetWallet(userId, plan, `${plan.name} plan started`);
    await logEvent(userId, {
      platform: "aduf",
      kind: "system",
      title: sameActive ? `${plan.name} plan renewed` : `Upgraded to ${plan.name}`,
      detail: `Active until ${end.toDateString()}`,
      status: "ok",
    });
  }

  if (p["promo_code_id"]) {
    // A discount code is "used" only once the payment actually succeeded.
    await db.rpc("redeem_promo", {
      p_code_id: p["promo_code_id"],
      p_user: userId,
      p_effect: { payment: paymentId },
      p_enforce_limit: false,
    });
  }
  return true;
}

// ------------------------------------------------------------------ checkout

export interface CheckoutInput {
  planId?: string | undefined;
  packId?: string | undefined;
  interval?: BillingInterval | undefined;
  promoCode?: string | undefined;
  autoRenew?: boolean | undefined;
  origin?: string | undefined;
}

export async function startCheckout(
  user: { id: string; email: string | null },
  input: CheckoutInput,
): Promise<{ url: string | null; reference: string; applied: boolean }> {
  const db = requireDb();
  if (!user.email) throw new BillingError("Your account needs an email address to pay.");
  await getEntitlements(user.id);

  let kind: "subscription" | "topup";
  let amountNgn: number;
  let plan: Plan | null = null;
  let tokens: number | null = null;
  let interval: BillingInterval | null = null;
  let label: string;

  if (input.packId) {
    const pack = (await listPacks()).find((x) => x.id === input.packId);
    if (!pack) throw new BillingError("That token pack isn't available.");
    kind = "topup";
    amountNgn = pack.priceNgn;
    tokens = pack.tokens;
    label = pack.name;
  } else {
    plan = input.planId ? await getPlan(input.planId) : null;
    if (!plan || !plan.active || plan.id === "free")
      throw new BillingError("That plan isn't available.");
    interval = input.interval === "year" ? "year" : "month";
    kind = "subscription";
    amountNgn = planPriceNgn(plan, interval);
    if (amountNgn <= 0) throw new BillingError("That plan has no price set yet.");
    label = `${plan.name} (${interval === "year" ? "yearly" : "monthly"})`;
  }

  let promoId: string | null = null;
  let percent = 0;
  if (input.promoCode?.trim()) {
    const promo = await findUsablePromo(user.id, input.promoCode);
    if (promo.kind !== "percent_off")
      throw new PromoError(
        "That code grants a plan or tokens directly — use “Redeem” instead of checkout.",
      );
    if (promo.appliesTo !== "any" && promo.appliesTo !== kind)
      throw new PromoError(
        `That code only applies to a ${promo.appliesTo === "topup" ? "token top-up" : "plan purchase"}.`,
      );
    promoId = promo.id;
    percent = promo.percent ?? 0;
  }

  const { discountKobo, finalKobo } = priceInKobo(amountNgn, percent);
  if (finalKobo > 0 && finalKobo < 5000)
    throw new BillingError("That amount is below Paystack's ₦50 minimum.");
  const reference = `adf_${crypto.randomUUID().replace(/-/g, "")}`;

  // Recurring only when nothing alters the price (a discounted first charge can't ride a fixed Paystack plan).
  let planCode: string | undefined;
  if (kind === "subscription" && plan && interval && input.autoRenew !== false && !promoId) {
    const { data } = await db
      .from("plans")
      .select("paystack_plan_month, paystack_plan_year")
      .eq("id", plan.id)
      .single();
    planCode =
      ((interval === "month" ? data?.["paystack_plan_month"] : data?.["paystack_plan_year"]) as
        string | null) ?? undefined;
  }

  const { data: row, error } = await db
    .from("payments")
    .insert({
      user_id: user.id,
      kind,
      plan_id: plan?.id ?? null,
      billing_interval: interval,
      pack_id: input.packId ?? null,
      amount_minor: finalKobo,
      currency: "NGN",
      discount_minor: discountKobo,
      promo_code_id: promoId,
      paystack_reference: reference,
      recurring: Boolean(planCode),
      tokens,
    })
    .select("id")
    .single();
  if (error || !row) throw new BillingError(`Couldn't start the payment: ${error?.message}`);

  if (finalKobo === 0) {
    // 100%-off code: nothing to charge, deliver straight away.
    await applyPayment(row["id"] as string);
    return { url: null, reference, applied: true };
  }

  if (!paystackConfigured()) {
    await db.from("payments").update({ status: "failed" }).eq("id", row["id"]);
    throw new BillingError(
      "Payments aren't set up on this server yet. Ask the admin to add PAYSTACK_SECRET_KEY.",
    );
  }
  const base = process.env["APP_URL"] || input.origin || "";
  if (!/^https?:\/\//.test(base))
    throw new BillingError(
      "The app URL isn't configured (APP_URL), so Paystack can't send you back.",
    );
  try {
    const tx = await initializeTransaction({
      email: user.email,
      amountKobo: finalKobo,
      reference,
      callbackUrl: `${base.replace(/\/$/, "")}/billing`,
      metadata: { user_id: user.id, payment_id: row["id"], kind, label },
      plan: planCode,
    });
    return { url: tx.authorization_url, reference, applied: false };
  } catch (e) {
    await db.from("payments").update({ status: "failed" }).eq("id", row["id"]);
    throw new BillingError(
      e instanceof PaystackError ? `Paystack: ${e.message}` : "Couldn't reach Paystack.",
    );
  }
}

/** The browser came back from Paystack: confirm with Paystack itself, then deliver. */
export async function verifyByReference(
  userId: string,
  reference: string,
): Promise<{ status: "success" | "failed" | "pending"; message: string }> {
  const db = requireDb();
  const { data } = await db
    .from("payments")
    .select("*")
    .eq("paystack_reference", reference)
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) throw new BillingError("We couldn't find that payment.");
  const p = data as Row;
  if (p["status"] === "success")
    return { status: "success", message: "Payment received — thank you." };
  const tx = await verifyTransaction(reference).catch(() => null);
  if (!tx)
    return {
      status: "pending",
      message: "We couldn't confirm the payment yet. If you were charged it will appear shortly.",
    };
  if (tx.status === "success") {
    if (tx.currency !== "NGN" || tx.amount < Number(p["amount_minor"])) {
      await db
        .from("payments")
        .update({ status: "failed" })
        .eq("id", p["id"])
        .eq("status", "pending");
      throw new BillingError(
        "The amount paid didn't match the price, so nothing was applied. Contact support with your reference.",
      );
    }
    await applyPayment(p["id"] as string, {
      customerCode: tx.customer?.customer_code ?? null,
      paidAt: tx.paid_at ?? null,
    });
    return { status: "success", message: "Payment received — thank you." };
  }
  if (tx.status === "failed" || tx.status === "abandoned") {
    await db
      .from("payments")
      .update({ status: tx.status === "failed" ? "failed" : "abandoned" })
      .eq("id", p["id"])
      .eq("status", "pending");
    return { status: "failed", message: "The payment wasn't completed. You haven't been charged." };
  }
  return { status: "pending", message: "Waiting for Paystack to confirm the payment…" };
}

// ------------------------------------------------------------------ webhook

async function findUserIdByEmail(email: string): Promise<string | null> {
  const db = requireDb();
  // Workspace-sized lookup: scans up to 1,000 accounts. Only used when metadata is missing (renewals).
  for (let page = 1; page <= 5; page++) {
    const { data } = await db.auth.admin.listUsers({ page, perPage: 200 });
    const hit = data?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (hit) return hit.id;
    if (!data || data.users.length < 200) break;
  }
  return null;
}

async function resolveUser(customerCode?: string, email?: string): Promise<string | null> {
  const db = requireDb();
  if (customerCode) {
    const { data } = await db
      .from("subscriptions")
      .select("user_id")
      .eq("paystack_customer_code", customerCode)
      .maybeSingle();
    if (data) return data["user_id"] as string;
  }
  return email ? findUserIdByEmail(email) : null;
}

async function planForCode(
  code: string,
): Promise<{ plan: Plan; interval: BillingInterval } | null> {
  const { data } = await requireDb()
    .from("plans")
    .select("id, paystack_plan_month, paystack_plan_year")
    .or(`paystack_plan_month.eq.${code},paystack_plan_year.eq.${code}`)
    .maybeSingle();
  if (!data) return null;
  const plan = await getPlan(data["id"] as string);
  return plan ? { plan, interval: data["paystack_plan_month"] === code ? "month" : "year" } : null;
}

interface WebhookData {
  reference?: string;
  amount?: number;
  currency?: string;
  status?: string;
  paid_at?: string;
  customer?: { customer_code?: string; email?: string };
  plan?: { plan_code?: string } | null;
  subscription_code?: string;
  email_token?: string;
  subscription?: { subscription_code?: string; email_token?: string };
}

/** Handles a Paystack event (signature already verified by the route). Safe to receive twice. */
export async function handleWebhookEvent(event: {
  event: string;
  data: WebhookData;
}): Promise<string> {
  const db = requireDb();
  const d = event.data;
  const customerCode = d.customer?.customer_code;
  const email = d.customer?.email;

  switch (event.event) {
    case "charge.success": {
      const ref = d.reference;
      if (!ref) return "no reference";
      const { data: existing } = await db
        .from("payments")
        .select("*")
        .eq("paystack_reference", ref)
        .maybeSingle();
      if (existing) {
        const p = existing as Row;
        if (p["status"] !== "pending") return "already processed";
        if (d.currency !== "NGN" || (d.amount ?? 0) < Number(p["amount_minor"]))
          return "amount mismatch — not applied";
        await applyPayment(p["id"] as string, {
          customerCode: customerCode ?? null,
          paidAt: d.paid_at ?? null,
        });
        return "applied";
      }
      // A renewal Paystack charged on its own: find the person and the plan from the plan code.
      const code = d.plan && typeof d.plan === "object" ? d.plan.plan_code : undefined;
      if (!code) return "unknown reference";
      const [userId, match] = await Promise.all([
        resolveUser(customerCode, email),
        planForCode(code),
      ]);
      if (!userId || !match) return "renewal could not be matched";
      const { data: ins, error } = await db
        .from("payments")
        .insert({
          user_id: userId,
          kind: "subscription",
          plan_id: match.plan.id,
          billing_interval: match.interval,
          amount_minor: d.amount ?? 0,
          currency: d.currency ?? "NGN",
          paystack_reference: ref,
          recurring: true,
        })
        .select("id")
        .single();
      if (error || !ins) return "renewal already recorded";
      await applyPayment(ins["id"] as string, {
        customerCode: customerCode ?? null,
        paidAt: d.paid_at ?? null,
      });
      return "renewal applied";
    }
    case "subscription.create": {
      const userId = await resolveUser(customerCode, email);
      if (!userId) return "no matching user";
      await db
        .from("subscriptions")
        .update({
          paystack_subscription_code: d.subscription_code ?? null,
          paystack_email_token: d.email_token ?? null,
          paystack_customer_code: customerCode ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
      return "subscription linked";
    }
    case "invoice.payment_failed": {
      const userId = await resolveUser(customerCode, email);
      if (!userId) return "no matching user";
      await db
        .from("subscriptions")
        .update({
          status: "past_due",
          grace_until: new Date(Date.now() + PAST_DUE_GRACE_MS).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
      await logEvent(userId, {
        platform: "aduf",
        kind: "alert",
        title: "Your plan renewal payment failed",
        detail: "Update your card in Billing within 3 days to keep your plan.",
        status: "error",
      });
      return "marked past due";
    }
    case "subscription.not_renew":
    case "subscription.disable": {
      const userId = await resolveUser(customerCode, email);
      if (!userId) return "no matching user";
      await db
        .from("subscriptions")
        .update({ cancel_at_period_end: true, updated_at: new Date().toISOString() })
        .eq("user_id", userId);
      return "will not renew";
    }
    default:
      return "ignored";
  }
}

// -------------------------------------------------------- cancel / resume

export async function cancelSubscription(userId: string): Promise<string> {
  const db = requireDb();
  const { data } = await db.from("subscriptions").select("*").eq("user_id", userId).single();
  const s = data as Row;
  if (s["plan_id"] === "free" || s["source"] === "free")
    throw new BillingError("You're on the Free plan — there's nothing to cancel.");
  if (s["paystack_subscription_code"] && s["paystack_email_token"]) {
    await disablePaystackSubscription(
      s["paystack_subscription_code"] as string,
      s["paystack_email_token"] as string,
    ).catch((e) => {
      throw new BillingError(
        `Paystack couldn't cancel it: ${e instanceof Error ? e.message : "unknown error"}`,
      );
    });
  }
  await db
    .from("subscriptions")
    .update({ cancel_at_period_end: true, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
  return "Your plan won't renew. You keep everything until the end of the current period.";
}

export async function resumeSubscription(userId: string): Promise<string> {
  const db = requireDb();
  const { data } = await db.from("subscriptions").select("*").eq("user_id", userId).single();
  const s = data as Row;
  if (!s["cancel_at_period_end"]) return "Your plan is already set to renew.";
  if (s["paystack_subscription_code"] && s["paystack_email_token"]) {
    await enablePaystackSubscription(
      s["paystack_subscription_code"] as string,
      s["paystack_email_token"] as string,
    ).catch(() => {
      throw new BillingError(
        "Paystack couldn't switch auto-renew back on. Choose your plan again to restart it.",
      );
    });
  }
  await db
    .from("subscriptions")
    .update({ cancel_at_period_end: false, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
  return s["paystack_subscription_code"]
    ? "Auto-renew is back on."
    : "Cancellation removed. Renew before the period ends to keep your plan.";
}

export async function listPayments(userId: string, limit = 20): Promise<PaymentView[]> {
  const db = requireDb();
  const [{ data }, plans, packs] = await Promise.all([
    db
      .from("payments")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit),
    listPlans({ includeInactive: true }),
    listPacks({ includeInactive: true }),
  ]);
  return (data ?? []).map((p) => ({
    id: p["id"] as string,
    kind: p["kind"] as "subscription" | "topup",
    label:
      p["kind"] === "topup"
        ? (packs.find((x) => x.id === p["pack_id"])?.name ?? "Token top-up")
        : `${plans.find((x) => x.id === p["plan_id"])?.name ?? "Plan"} (${p["billing_interval"] === "year" ? "yearly" : "monthly"})`,
    amountNgn: Number(p["amount_minor"]) / 100,
    discountNgn: Number(p["discount_minor"]) / 100,
    status: p["status"] as PaymentView["status"],
    reference: p["paystack_reference"] as string,
    at: (p["paid_at"] as string | null) ?? (p["created_at"] as string),
  }));
}

// -------------------------------------------------------------------- admin

export const planPatchSchema = z
  .object({
    name: z.string().min(1).max(40),
    tagline: z.string().max(120),
    active: z.boolean(),
    highlighted: z.boolean(),
    priceNgnMonth: z.number().min(0).max(100_000_000),
    priceNgnYear: z.number().min(0).max(1_000_000_000),
    priceUsdMonth: z.number().min(0).max(100_000),
    priceUsdYear: z.number().min(0).max(1_000_000),
    monthlyTokens: z.number().int().min(0).max(10_000_000_000),
    limits: z.object({
      automations: z.number().int().min(0).max(100000),
      dataSources: z.number().int().min(0).max(100000),
      n8n: z.boolean(),
      sandbox: z.boolean(),
      digest: z.boolean(),
    }),
    features: z.array(z.string().max(120)).max(10),
  })
  .partial();

export async function updatePlan(id: string, patch: unknown): Promise<void> {
  const db = requireDb();
  const p = planPatchSchema.parse(patch);
  const current = await getPlan(id);
  if (!current) throw new BillingError("Unknown plan.");
  if (id === "free" && (p.priceNgnMonth || p.priceNgnYear))
    throw new BillingError("The Free plan can't have a price.");
  const priceChanged =
    (p.priceNgnMonth !== undefined && p.priceNgnMonth !== current.priceNgnMonth) ||
    (p.priceNgnYear !== undefined && p.priceNgnYear !== current.priceNgnYear);
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const map: Record<string, string> = {
    name: "name",
    tagline: "tagline",
    active: "active",
    highlighted: "highlighted",
    priceNgnMonth: "price_ngn_month",
    priceNgnYear: "price_ngn_year",
    priceUsdMonth: "price_usd_month",
    priceUsdYear: "price_usd_year",
    monthlyTokens: "monthly_tokens",
    limits: "limits",
    features: "features",
  };
  for (const [k, v] of Object.entries(p)) if (v !== undefined) row[map[k]!] = v;
  // A changed price means the old Paystack plan would bill the wrong amount: switch auto-renew off until re-synced.
  if (priceChanged) Object.assign(row, { paystack_plan_month: null, paystack_plan_year: null });
  const { error } = await db.from("plans").update(row).eq("id", id);
  if (error) throw new BillingError(error.message);
  invalidatePlanCache();
}

/** Creates the Paystack plans (monthly + yearly) that enable auto-renewal at today's prices. */
export async function syncPaystackPlans(id: string): Promise<string> {
  if (!paystackConfigured()) throw new BillingError("Set PAYSTACK_SECRET_KEY first.");
  const plan = await getPlan(id);
  if (!plan || id === "free") throw new BillingError("Pick a paid plan.");
  const patch: Record<string, unknown> = {};
  if (plan.priceNgnMonth > 0)
    patch["paystack_plan_month"] = (
      await createPaystackPlan({
        name: `ADUF ${plan.name} monthly`,
        amountKobo: Math.round(plan.priceNgnMonth * 100),
        interval: "monthly",
      })
    ).plan_code;
  if (plan.priceNgnYear > 0)
    patch["paystack_plan_year"] = (
      await createPaystackPlan({
        name: `ADUF ${plan.name} yearly`,
        amountKobo: Math.round(plan.priceNgnYear * 100),
        interval: "annually",
      })
    ).plan_code;
  await requireDb().from("plans").update(patch).eq("id", id);
  invalidatePlanCache();
  return `Auto-renew enabled for ${plan.name}.`;
}

export async function updatePack(
  id: string,
  patch: { name?: string; tokens?: number; priceNgn?: number; priceUsd?: number; active?: boolean },
): Promise<void> {
  const row: Record<string, unknown> = {};
  if (patch.name !== undefined) row["name"] = patch.name.slice(0, 40);
  if (patch.tokens !== undefined) row["tokens"] = Math.max(1, Math.round(patch.tokens));
  if (patch.priceNgn !== undefined) row["price_ngn"] = Math.max(0, patch.priceNgn);
  if (patch.priceUsd !== undefined) row["price_usd"] = Math.max(0, patch.priceUsd);
  if (patch.active !== undefined) row["active"] = patch.active;
  const { error } = await requireDb().from("token_packs").update(row).eq("id", id);
  if (error) throw new BillingError(error.message);
}

export async function adminGrantPlan(userId: string, planId: string, days: number): Promise<void> {
  const db = requireDb();
  const plan = await getPlan(planId);
  if (!plan) throw new BillingError("Unknown plan.");
  await getEntitlements(userId);
  const end =
    planId === "free"
      ? null
      : new Date(Date.now() + Math.min(Math.max(days, 1), 3650) * DAY).toISOString();
  await db.from("subscriptions").upsert(
    {
      user_id: userId,
      plan_id: planId,
      status: "active",
      source: planId === "free" ? "free" : "admin",
      billing_interval: null,
      current_period_end: end,
      cancel_at_period_end: false,
      grace_until: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  await resetWallet(userId, plan, `Admin set plan to ${plan.name}`);
}

export async function adminGrantTokens(
  userId: string,
  tokens: number,
  note: string,
): Promise<void> {
  await getEntitlements(userId);
  const { error } = await requireDb().rpc("grant_bonus_tokens", {
    p_user: userId,
    p_amount: Math.round(tokens),
    p_kind: "admin",
    p_note: note.slice(0, 120) || "Admin grant",
    p_ref: null,
  });
  if (error) throw new BillingError(error.message);
}

export interface BillingOverview {
  paidSubscribers: number;
  trialing: number;
  mrrNgn: number;
  revenue30dNgn: number;
  tokensUsed30d: number;
  byPlan: { planId: string; name: string; users: number }[];
  subscribers: {
    userId: string;
    email: string;
    planId: string;
    status: string;
    source: string;
    periodEnd: string | null;
    tokensUsed: number;
    bonus: number;
  }[];
}

export async function adminBillingOverview(): Promise<BillingOverview> {
  const db = requireDb();
  const since = new Date(Date.now() - 30 * DAY).toISOString();
  const [subs, wallets, pays, usage, plans, users] = await Promise.all([
    db.from("subscriptions").select("*").limit(1000),
    db.from("token_wallets").select("user_id, plan_tokens_used, bonus_tokens").limit(1000),
    db
      .from("payments")
      .select("amount_minor")
      .eq("status", "success")
      .gte("paid_at", since)
      .limit(5000),
    db
      .from("token_ledger")
      .select("delta")
      .eq("kind", "usage")
      .gte("created_at", since)
      .limit(50_000),
    listPlans({ includeInactive: true }),
    db.auth.admin.listUsers({ perPage: 200 }),
  ]);
  const email = new Map((users.data?.users ?? []).map((u) => [u.id, u.email ?? "unknown"]));
  const wallet = new Map((wallets.data ?? []).map((w) => [w["user_id"] as string, w]));
  let mrr = 0,
    paid = 0,
    trialing = 0;
  const count = new Map<string, number>();
  const subscribers: BillingOverview["subscribers"] = [];
  for (const s of subs.data ?? []) {
    const plan = plans.find((p) => p.id === s["plan_id"]);
    count.set(s["plan_id"] as string, (count.get(s["plan_id"] as string) ?? 0) + 1);
    if (s["status"] === "trialing") trialing++;
    if (s["source"] === "paystack" && plan) {
      paid++;
      mrr += s["billing_interval"] === "year" ? plan.priceNgnYear / 12 : plan.priceNgnMonth;
    }
    const w = wallet.get(s["user_id"] as string);
    subscribers.push({
      userId: s["user_id"] as string,
      email: email.get(s["user_id"] as string) ?? "unknown",
      planId: s["plan_id"] as string,
      status: s["status"] as string,
      source: s["source"] as string,
      periodEnd: (s["current_period_end"] as string | null) ?? null,
      tokensUsed: Number(w?.["plan_tokens_used"] ?? 0),
      bonus: Number(w?.["bonus_tokens"] ?? 0),
    });
  }
  return {
    paidSubscribers: paid,
    trialing,
    mrrNgn: Math.round(mrr),
    revenue30dNgn: (pays.data ?? []).reduce((n, p) => n + Number(p["amount_minor"]), 0) / 100,
    tokensUsed30d: (usage.data ?? []).reduce((n, r) => n - Number(r["delta"]), 0),
    byPlan: plans.map((p) => ({ planId: p.id, name: p.name, users: count.get(p.id) ?? 0 })),
    subscribers,
  };
}

export async function updateBillingSettings(patch: {
  trialEnabled?: boolean;
  trialDays?: number;
  trialPlan?: string;
}): Promise<void> {
  const row: Record<string, unknown> = {};
  if (patch.trialEnabled !== undefined) row["trial_enabled"] = patch.trialEnabled;
  if (patch.trialDays !== undefined)
    row["trial_days"] = Math.min(Math.max(Math.round(patch.trialDays), 1), 90);
  if (patch.trialPlan !== undefined) {
    const plan = await getPlan(patch.trialPlan);
    if (!plan || plan.id === "free") throw new BillingError("The trial plan must be a paid plan.");
    row["trial_plan"] = plan.id;
  }
  const { error } = await requireDb().from("billing_settings").update(row).eq("id", 1);
  if (error) throw new BillingError(error.message);
}
