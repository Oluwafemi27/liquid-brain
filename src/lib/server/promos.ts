import "@tanstack/react-start/server-only";
import {
  formatTokens,
  normalizePromoCode,
  planRank,
  type PromoCodeRow,
  type PromoPreview,
} from "@/lib/billing-types";
import { logEvent } from "./activity";
import { getEntitlements, getPlan, WALLET_PERIOD_DAYS } from "./billing";
import { getSupabaseAdmin } from "./supabase";

type Row = Record<string, unknown>;

export class PromoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PromoError";
  }
}

// 32 symbols (no 0/O/1/I/L lookalikes). 256 % 32 === 0, so random bytes map to symbols with no bias.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** e.g. ADUF-7K3Q-9XPM-4TWD — 12 random symbols ≈ 60 bits, infeasible to guess. */
export function generatePromoCode(prefix = "ADUF", groups = 3, size = 4): string {
  const bytes = crypto.getRandomValues(new Uint8Array(groups * size));
  const chars = [...bytes].map((b) => ALPHABET[b % 32]!);
  const parts: string[] = [];
  for (let g = 0; g < groups; g++) parts.push(chars.slice(g * size, (g + 1) * size).join(""));
  const clean = prefix
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 12);
  return [clean, ...parts].filter(Boolean).join("-");
}

const rowToPromo = (r: Row): PromoCodeRow => ({
  id: r["id"] as string,
  code: r["code"] as string,
  kind: r["kind"] as PromoCodeRow["kind"],
  percent: r["percent"] === null ? null : Number(r["percent"]),
  planId: (r["plan_id"] as string | null) ?? null,
  durationDays: r["duration_days"] === null ? null : Number(r["duration_days"]),
  tokens: r["tokens"] === null ? null : Number(r["tokens"]),
  appliesTo: r["applies_to"] as PromoCodeRow["appliesTo"],
  maxRedemptions: r["max_redemptions"] === null ? null : Number(r["max_redemptions"]),
  redeemedCount: Number(r["redeemed_count"]),
  expiresAt: (r["expires_at"] as string | null) ?? null,
  active: Boolean(r["active"]),
  note: (r["note"] as string) ?? "",
  createdAt: r["created_at"] as string,
});

export interface CreatePromoInput {
  kind: "percent_off" | "free_plan" | "bonus_tokens";
  percent?: number | undefined;
  planId?: string | undefined;
  durationDays?: number | undefined;
  tokens?: number | undefined;
  appliesTo?: "any" | "subscription" | "topup" | undefined;
  maxRedemptions?: number | undefined;
  expiresAt?: string | undefined;
  note?: string | undefined;
  prefix?: string | undefined;
  customCode?: string | undefined;
  quantity?: number | undefined;
}

/** ADMIN ONLY — the server function that calls this verifies the caller is an admin. */
export async function createPromoCodes(
  adminId: string,
  input: CreatePromoInput,
): Promise<PromoCodeRow[]> {
  const db = getSupabaseAdmin();
  if (!db) throw new PromoError("The backend isn't configured.");
  if (input.kind === "free_plan") {
    const plan = input.planId ? await getPlan(input.planId) : null;
    if (!plan || plan.id === "free") throw new PromoError("Pick a paid plan to grant.");
  }
  const custom = input.customCode ? normalizePromoCode(input.customCode) : "";
  if (input.customCode && custom.length < 4)
    throw new PromoError("Custom codes need at least 4 letters or numbers.");
  const quantity = custom ? 1 : Math.min(Math.max(input.quantity ?? 1, 1), 200);

  const base = {
    kind: input.kind,
    percent: input.kind === "percent_off" ? (input.percent ?? null) : null,
    plan_id: input.kind === "free_plan" ? (input.planId ?? null) : null,
    duration_days: input.kind === "free_plan" ? (input.durationDays ?? null) : null,
    tokens: input.kind === "bonus_tokens" ? (input.tokens ?? null) : null,
    applies_to: input.kind === "percent_off" ? (input.appliesTo ?? "any") : "any",
    // Bulk codes are single-use by default so one leaked code can't be shared around.
    max_redemptions: input.maxRedemptions ?? (quantity > 1 ? 1 : null),
    expires_at: input.expiresAt ?? null,
    note: (input.note ?? "").slice(0, 200),
    created_by: adminId,
  };
  const made: PromoCodeRow[] = [];
  for (let i = 0; i < quantity; i++) {
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = custom || generatePromoCode(input.prefix ?? "ADUF");
      const { data, error } = await db
        .from("promo_codes")
        .insert({ ...base, code })
        .select("*")
        .single();
      if (!error && data) {
        made.push(rowToPromo(data as Row));
        break;
      }
      if (error?.code === "23505") {
        if (custom) throw new PromoError(`The code ${custom} already exists.`);
        continue; // astronomically unlikely random collision — draw again
      }
      throw new PromoError(`Couldn't create the code: ${error?.message}`);
    }
  }
  return made;
}

export async function listPromoCodes(): Promise<PromoCodeRow[]> {
  const db = getSupabaseAdmin();
  if (!db) return [];
  const { data } = await db
    .from("promo_codes")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);
  return (data ?? []).map((r) => rowToPromo(r as Row));
}

export async function setPromoActive(id: string, active: boolean): Promise<void> {
  const db = getSupabaseAdmin();
  if (!db) throw new PromoError("The backend isn't configured.");
  const { error } = await db.from("promo_codes").update({ active }).eq("id", id);
  if (error) throw new PromoError(error.message);
}

// ------------------------------------------------------------ user-facing

const REJECT_TITLE = "Promo code rejected";
const MAX_REJECTS = 8;

/** Brute-force guard on top of the 60-bit codes: too many wrong guesses pauses attempts for 15 min. */
async function assertNotThrottled(userId: string): Promise<void> {
  const db = getSupabaseAdmin();
  if (!db) return;
  const since = new Date(Date.now() - 15 * 60_000).toISOString();
  const { count } = await db
    .from("platform_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("platform", "aduf")
    .eq("title", REJECT_TITLE)
    .gte("created_at", since);
  if ((count ?? 0) >= MAX_REJECTS)
    throw new PromoError("Too many invalid attempts. Wait 15 minutes and try again.");
}

async function reject(userId: string, message: string): Promise<never> {
  await logEvent(userId, {
    platform: "aduf",
    kind: "system",
    title: REJECT_TITLE,
    detail: "",
    status: "warn",
  });
  throw new PromoError(message);
}

export const describePromo = (p: PromoCodeRow, planName?: string): string =>
  p.kind === "percent_off"
    ? `${p.percent}% off ${p.appliesTo === "topup" ? "a token top-up" : p.appliesTo === "subscription" ? "a plan purchase" : "your next purchase"}`
    : p.kind === "free_plan"
      ? `Free ${planName ?? p.planId} plan for ${p.durationDays} days`
      : `${formatTokens(p.tokens ?? 0)} bonus tokens`;

/** Looks a code up for this user and returns it only if it can be used right now. */
export async function findUsablePromo(userId: string, rawCode: string): Promise<PromoCodeRow> {
  const db = getSupabaseAdmin();
  if (!db) throw new PromoError("The backend isn't configured.");
  await assertNotThrottled(userId);
  const code = normalizePromoCode(rawCode);
  if (code.length < 4) return reject(userId, "That code isn't valid.");
  const { data } = await db.from("promo_codes").select("*").eq("code", code).maybeSingle();
  if (!data) return reject(userId, "That code isn't valid.");
  const promo = rowToPromo(data as Row);
  if (!promo.active) return reject(userId, "That code is no longer active.");
  if (promo.expiresAt && new Date(promo.expiresAt).getTime() < Date.now())
    return reject(userId, "That code has expired.");
  if (promo.maxRedemptions !== null && promo.redeemedCount >= promo.maxRedemptions)
    return reject(userId, "That code has been fully redeemed.");
  const { data: used } = await db
    .from("promo_redemptions")
    .select("id")
    .eq("code_id", promo.id)
    .eq("user_id", userId)
    .maybeSingle();
  if (used) throw new PromoError("You've already used that code.");
  return promo;
}

export async function previewPromo(userId: string, rawCode: string): Promise<PromoPreview> {
  const promo = await findUsablePromo(userId, rawCode);
  const plan = promo.planId ? await getPlan(promo.planId) : null;
  return {
    code: promo.code,
    kind: promo.kind,
    description: describePromo(promo, plan?.name),
    ...(promo.percent ? { percent: promo.percent } : {}),
    appliesTo: promo.appliesTo,
  };
}

/** Redeems a code that grants something outright (free plan time, bonus tokens). */
export async function redeemGrantPromo(
  userId: string,
  rawCode: string,
): Promise<{ message: string }> {
  const db = getSupabaseAdmin();
  if (!db) throw new PromoError("The backend isn't configured.");
  const promo = await findUsablePromo(userId, rawCode);
  if (promo.kind === "percent_off") {
    throw new PromoError(
      "That's a discount code — it's applied when you check out. Pick a plan or top-up and it will be used.",
    );
  }
  const ent = await getEntitlements(userId); // creates the account/wallet if this is their first visit

  if (promo.kind === "free_plan") {
    const target = (await getPlan(promo.planId!))!;
    const paidNow = ent.subscription.source === "paystack" && ent.subscription.planId !== "free";
    if (
      planRank(ent.subscription.planId) >= planRank(target.id) &&
      (paidNow || ent.subscription.source === "admin")
    ) {
      throw new PromoError(
        `You already have the ${ent.plan.name} plan, which is as good or better.`,
      );
    }
  }

  const claim = await db.rpc("redeem_promo", {
    p_code_id: promo.id,
    p_user: userId,
    p_effect: { kind: promo.kind },
    p_enforce_limit: true,
  });
  const outcome = claim.data as string | null;
  if (claim.error || outcome !== "ok") {
    throw new PromoError(
      outcome === "exhausted"
        ? "That code has been fully redeemed."
        : outcome === "already"
          ? "You've already used that code."
          : outcome === "expired"
            ? "That code has expired."
            : "That code can't be used.",
    );
  }

  try {
    if (promo.kind === "bonus_tokens") {
      const { error } = await db.rpc("grant_bonus_tokens", {
        p_user: userId,
        p_amount: promo.tokens,
        p_kind: "promo",
        p_note: `Promo ${promo.code}`,
        p_ref: promo.id,
      });
      if (error) throw new Error(error.message);
      return { message: `Added ${formatTokens(promo.tokens!)} bonus tokens to your balance.` };
    }
    const target = (await getPlan(promo.planId!))!;
    const end = new Date(Date.now() + promo.durationDays! * 86_400_000).toISOString();
    const { error } = await db.from("subscriptions").upsert(
      {
        user_id: userId,
        plan_id: target.id,
        status: "active",
        source: "promo",
        billing_interval: null,
        current_period_end: end,
        cancel_at_period_end: false,
        grace_until: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (error) throw new Error(error.message);
    await db
      .from("token_wallets")
      .update({
        plan_tokens_used: 0,
        period_start: new Date().toISOString(),
        period_end: new Date(Date.now() + WALLET_PERIOD_DAYS * 86_400_000).toISOString(),
      })
      .eq("user_id", userId);
    await db.from("token_ledger").insert({
      user_id: userId,
      delta: target.monthlyTokens,
      kind: "promo",
      note: `Promo ${promo.code}: ${target.name} for ${promo.durationDays} days`,
    });
    return { message: `You now have the ${target.name} plan for ${promo.durationDays} days.` };
  } catch (e) {
    // Give the code back if we couldn't apply it, so the person isn't punished for our failure.
    await db.from("promo_redemptions").delete().eq("code_id", promo.id).eq("user_id", userId);
    await db
      .from("promo_codes")
      .update({ redeemed_count: Math.max(promo.redeemedCount, 0) })
      .eq("id", promo.id);
    throw new PromoError(
      `Couldn't apply that code (${e instanceof Error ? e.message : "unknown error"}). It hasn't been used up — try again.`,
    );
  }
}
