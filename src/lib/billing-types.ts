// Client-safe billing types and helpers (no secrets, no server imports).

export interface PlanLimits {
  automations: number;
  dataSources: number;
  n8n: boolean;
  sandbox: boolean;
  digest: boolean;
}

export const DEFAULT_LIMITS: PlanLimits = {
  automations: 3,
  dataSources: 1,
  n8n: false,
  sandbox: false,
  digest: false,
};

export interface Plan {
  id: string;
  name: string;
  tagline: string;
  sortOrder: number;
  active: boolean;
  highlighted: boolean;
  priceNgnMonth: number;
  priceNgnYear: number;
  priceUsdMonth: number;
  priceUsdYear: number;
  monthlyTokens: number;
  limits: PlanLimits;
  features: string[];
  /** Paystack plan codes — when set, checkout can auto-renew. Never shown to users. */
  autoRenewMonth: boolean;
  autoRenewYear: boolean;
}

export interface TokenPack {
  id: string;
  name: string;
  /** Credits the pack gives. */
  tokens: number;
  /** Extra credits given on top as a bonus (shown on the pack). */
  bonusTokens: number;
  priceNgn: number;
  priceUsd: number;
  active: boolean;
  sortOrder: number;
}

export type SubStatus = "active" | "trialing" | "past_due";
export type SubSource = "free" | "trial" | "paystack" | "promo" | "admin";
export type BillingInterval = "month" | "year";

export interface SubscriptionView {
  planId: string;
  status: SubStatus;
  source: SubSource;
  interval: BillingInterval | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  autoRenews: boolean;
}

export interface WalletView {
  planTokens: number;
  planUsed: number;
  planRemaining: number;
  bonus: number;
  total: number;
  periodEnd: string;
}

export interface Entitlements {
  plan: Plan;
  subscription: SubscriptionView;
  wallet: WalletView;
}

export interface PaymentView {
  id: string;
  kind: "subscription" | "topup";
  label: string;
  amountNgn: number;
  discountNgn: number;
  status: "pending" | "success" | "failed" | "abandoned";
  reference: string;
  at: string;
}

export interface UsageByFeature {
  feature: string;
  tokens: number;
}

export interface PromoPreview {
  code: string;
  kind: "percent_off" | "free_plan" | "bonus_tokens";
  description: string;
  percent?: number;
  appliesTo?: "any" | "subscription" | "topup";
}

export interface PromoCodeRow {
  id: string;
  code: string;
  kind: "percent_off" | "free_plan" | "bonus_tokens";
  percent: number | null;
  planId: string | null;
  durationDays: number | null;
  tokens: number | null;
  appliesTo: "any" | "subscription" | "topup";
  maxRedemptions: number | null;
  redeemedCount: number;
  expiresAt: string | null;
  active: boolean;
  note: string;
  createdAt: string;
}

export const PLAN_RANK: Record<string, number> = { free: 0, starter: 1, growth: 2, scale: 3 };
export const planRank = (id: string) => PLAN_RANK[id] ?? 1;

export const formatNgn = (n: number) => `₦${Math.round(n).toLocaleString("en-NG")}`;
export const formatUsd = (n: number) => `$${Number.isInteger(n) ? n : n.toFixed(2)}`;
/** Credits are small whole numbers (20, 40, 80, 160), so show them as they are. */
export function formatTokens(n: number): string {
  return Math.max(0, Math.round(n)).toLocaleString("en-US");
}

/** Upper-cases and strips spaces/dashes-noise so "aduf-ab12 cd34" and "ADUF-AB12-CD34" match. */
export const normalizePromoCode = (raw: string): string =>
  raw
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9-]/g, "");

export const FEATURE_LABEL: Record<string, string> = {
  chat: "Brain chat",
  plan: "Goal planning",
  subagent: "Sub-agents",
  skills: "Reply drafting",
  telegram: "Telegram replies",
  n8n: "Workflow builder",
  other: "Other",
};
