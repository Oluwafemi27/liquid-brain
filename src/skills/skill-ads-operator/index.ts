import { z } from "zod";
import type { SkillModule } from "../types";
import { campaignBudgets, insights, listAdAccounts } from "../services/meta-ads";
import { unitEconomics } from "../skill-dropship/engine";
import { diagnose, type Economics } from "./rules";

const num = z.number().finite();
const accountId = z.string().regex(/^(act_)?\d{5,20}$/, "Use the numeric ad account id.");

export const adsOperatorSkill: SkillModule = {
  id: "skill-ads-operator",
  title: "Ads Operator",
  description:
    "Reads Meta ad results and judges each campaign against the product's break-even. Read-only: it never changes an ad account.",
  stack: ["Meta Marketing API (same API facebook-python-business-sdk wraps)"],
  requiresEnv: [],
  implemented: true,
  prompt:
    "Ad rules: judge ads against the product's break-even ROAS, not a generic 'good ROAS'. Never call a campaign a winner or a loser on fewer than 3 sales. " +
    "Raise budgets by at most 20% at a time. You cannot change the ad account: record the decision with a change_ad_budget action and the owner makes the change in Meta. " +
    "Always say how much spend and how many sales a conclusion is based on.",
  tools: [
    {
      name: "ads_accounts",
      description:
        "List the Meta ad accounts the owner's connection can read (id, name, status, currency).",
      requiresAnyEnv: ["META_ADS_ACCESS_TOKEN", "META_CLIENT_ID"],
      input: z.object({}),
      risk: "read",
      run: async () => ({ accounts: await listAdAccounts() }),
    },
    {
      name: "ads_report",
      description:
        "Spend, clicks, CTR, CPC, frequency, purchases, revenue and ROAS per campaign (or ad set / ad) for the last N days, with current daily budgets for campaigns.",
      requiresAnyEnv: ["META_ADS_ACCESS_TOKEN", "META_CLIENT_ID"],
      input: z.object({
        accountId,
        days: z.number().int().min(1).max(90).default(7),
        level: z.enum(["campaign", "adset", "ad"]).default("campaign"),
      }),
      risk: "read",
      run: async ({ accountId, days, level }) => {
        const [rows, budgets] = await Promise.all([
          insights(accountId, { days, level, limit: 100 }),
          level === "campaign" ? campaignBudgets(accountId) : Promise.resolve([]),
        ]);
        const b = new Map(budgets.map((x) => [x.id, x]));
        const totals = rows.reduce(
          (t, r) => ({
            spend: t.spend + r.spend,
            purchases: t.purchases + r.purchases,
            revenue: t.revenue + r.revenue,
          }),
          { spend: 0, purchases: 0, revenue: 0 },
        );
        return {
          days,
          level,
          totals: {
            ...totals,
            roas: totals.spend > 0 ? Math.round((totals.revenue / totals.spend) * 100) / 100 : null,
          },
          rows: rows.map((r) => ({
            ...r,
            roas: r.spend > 0 ? Math.round((r.revenue / r.spend) * 100) / 100 : null,
            cpa: r.purchases > 0 ? Math.round((r.spend / r.purchases) * 100) / 100 : null,
            budget: b.get(r.id) ?? null,
          })),
        };
      },
    },
    {
      name: "ads_diagnose",
      description:
        "Judge each campaign (scale / keep / fix / pause / wait) against break-even, with the rule behind each verdict. Pass the product's price and costs (same fields as dropship_unit_economics) so profit can be judged; without them it only reports facts.",
      requiresAnyEnv: ["META_ADS_ACCESS_TOKEN", "META_CLIENT_ID"],
      input: z.object({
        accountId,
        days: z.number().int().min(3).max(90).default(14),
        product: z
          .object({
            price: num.positive(),
            productCost: num.min(0),
            shippingCost: num.min(0),
            otherCostPerOrder: num.min(0).optional(),
            refundRate: num.min(0).max(0.9).optional(),
          })
          .optional(),
      }),
      risk: "read",
      run: async ({ accountId, days, product }) => {
        let eco: Economics | null = null;
        let note: string | null = null;
        if (product) {
          const { price, ...cost } = product;
          const e = unitEconomics(
            price,
            Object.fromEntries(Object.entries(cost).filter(([, v]) => v !== undefined)) as {
              productCost: number;
              shippingCost: number;
            },
          );
          if (e.breakEvenCpa && e.breakEvenRoas)
            eco = { breakEvenCpa: e.breakEvenCpa, breakEvenRoas: e.breakEvenRoas };
          else
            note =
              "This product loses money on every sale before ads, so no ad spend can be profitable.";
        }
        const rows = await insights(accountId, { days, level: "campaign", limit: 100 });
        return { days, basis: eco ? { ...eco } : null, note, campaigns: diagnose(rows, eco) };
      },
    },
  ],
};
