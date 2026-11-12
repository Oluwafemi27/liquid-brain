import "@tanstack/react-start/server-only";
import { openToken } from "@/lib/server/crypto-tokens";
import { billingContext } from "@/lib/server/billing";
import { getSupabaseAdmin } from "@/lib/server/supabase";

// Meta Marketing API over plain REST (the same API facebook-python-business-sdk wraps). READ-ONLY on purpose:
// the connector is granted only the "ads_read" scope and ADUF's trust layer says it can't change ad accounts.
// Token: the signed-in person's own connected Meta login.

const version = () => process.env["META_GRAPH_VERSION"] || "v21.0"; // same version the repo's OAuth uses

export async function metaToken(): Promise<string> {
  // Each person's own Meta login. A server-wide token is deliberately NOT used: it would give every
  // account access to one person's ad account.
  const userId = billingContext()?.userId;
  if (!userId) throw new Error("Sign in to use Meta Ads.");
  const db = getSupabaseAdmin();
  if (!db) throw new Error("No backend configured.");
  const { data, error } = await db
    .from("connectors")
    .select("connected, access_token")
    .eq("workspace_id", userId)
    .eq("id", "meta")
    .maybeSingle();
  if (error) throw new Error(`Couldn't read the Meta connection: ${error.message}`);
  if (!data?.["connected"] || !data["access_token"])
    throw new Error("Meta Ads isn't connected. Connect it in Settings first.");
  const t = await openToken(data["access_token"] as string);
  if (!t) throw new Error("Meta Ads' saved login can't be read. Reconnect it in Settings.");
  return t;
}

async function get<T>(path: string, params: Record<string, string>): Promise<T> {
  const token = await metaToken();
  const url = new URL(`https://graph.facebook.com/${version()}/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  // Token in the header, never in the URL, so it can't end up in logs.
  const res = await fetch(url, {
    headers: { authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(30_000),
  });
  const body = (await res.json().catch(() => null)) as
    (T & { error?: { message?: string; code?: number } }) | null;
  if (!res.ok || !body || body.error) {
    const code = body?.error?.code;
    throw new Error(
      code === 190
        ? "Meta says the login expired. Reconnect Meta Ads in Settings."
        : `Meta Ads request failed (${res.status}${body?.error?.message ? `: ${body.error.message.slice(0, 160)}` : ""}).`,
    );
  }
  return body;
}

export interface AdAccount {
  id: string;
  name: string;
  status: number | null;
  currency: string | null;
}

export async function listAdAccounts(): Promise<AdAccount[]> {
  const r = await get<{
    data?: { id: string; name?: string; account_status?: number; currency?: string }[];
  }>("me/adaccounts", {
    fields: "id,name,account_status,currency",
    limit: "50",
  });
  return (r.data ?? []).map((a) => ({
    id: a.id,
    name: a.name ?? a.id,
    status: a.account_status ?? null,
    currency: a.currency ?? null,
  }));
}

type ActionRow = { action_type: string; value: string };
export interface InsightRow {
  id: string;
  name: string;
  level: "campaign" | "adset" | "ad";
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number | null; // percent
  cpc: number | null;
  frequency: number | null;
  purchases: number;
  revenue: number;
}

const PURCHASE = new Set(["purchase", "omni_purchase", "offsite_conversion.fb_pixel_purchase"]);
const sumActions = (rows: ActionRow[] | undefined): number => {
  // Meta repeats the same purchases under several action_type names; take the largest, never the sum.
  const vals = (rows ?? [])
    .filter((a) => PURCHASE.has(a.action_type))
    .map((a) => Number(a.value) || 0);
  return vals.length ? Math.max(...vals) : 0;
};

export async function insights(
  accountId: string,
  o: { days: number; level: InsightRow["level"]; limit: number },
): Promise<InsightRow[]> {
  const id = accountId.startsWith("act_") ? accountId : `act_${accountId}`;
  if (!/^act_\d+$/.test(id)) throw new Error("That isn't a valid ad account id.");
  const until = new Date();
  const since = new Date(Date.now() - (o.days - 1) * 86_400_000);
  const day = (d: Date) => d.toISOString().slice(0, 10);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Meta returns loosely typed rows
  const r = await get<{ data?: Record<string, any>[] }>(`${id}/insights`, {
    level: o.level,
    fields: `${o.level}_id,${o.level}_name,spend,impressions,clicks,ctr,cpc,frequency,actions,action_values`,
    time_range: JSON.stringify({ since: day(since), until: day(until) }),
    limit: String(o.limit),
  });
  return (r.data ?? []).map((x) => ({
    id: String(x[`${o.level}_id`]),
    name: String(x[`${o.level}_name`] ?? x[`${o.level}_id`]),
    level: o.level,
    spend: Number(x["spend"]) || 0,
    impressions: Number(x["impressions"]) || 0,
    clicks: Number(x["clicks"]) || 0,
    ctr: x["ctr"] === undefined ? null : Number(x["ctr"]),
    cpc: x["cpc"] === undefined ? null : Number(x["cpc"]),
    frequency: x["frequency"] === undefined ? null : Number(x["frequency"]),
    purchases: sumActions(x["actions"]),
    revenue: sumActions(x["action_values"]),
  }));
}

export interface CampaignBudget {
  id: string;
  status: string;
  dailyBudget: number | null;
  lifetimeBudget: number | null;
}

/** Budgets come back in the account currency's smallest unit (cents); converted to major units here. */
export async function campaignBudgets(accountId: string): Promise<CampaignBudget[]> {
  const id = accountId.startsWith("act_") ? accountId : `act_${accountId}`;
  const r = await get<{
    data?: {
      id: string;
      effective_status?: string;
      daily_budget?: string;
      lifetime_budget?: string;
    }[];
  }>(`${id}/campaigns`, {
    fields: "id,effective_status,daily_budget,lifetime_budget",
    limit: "200",
  });
  return (r.data ?? []).map((c) => ({
    id: c.id,
    status: c.effective_status ?? "UNKNOWN",
    dailyBudget: c.daily_budget ? Number(c.daily_budget) / 100 : null,
    lifetimeBudget: c.lifetime_budget ? Number(c.lifetime_budget) / 100 : null,
  }));
}
