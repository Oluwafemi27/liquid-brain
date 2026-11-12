import { z } from "zod";
import type { SkillModule } from "../types";
import { listOrders, listProducts, medusaConfigured } from "../services/medusa";
import { lateFlags, STATUSES, type SupplierStatus } from "./supplier/state";
import { activeStoreOrderIds, listSupplierOrders } from "./supplier/store";
import { costFromMetadata } from "./costs";
import {
  floorPrice,
  rankProducts,
  type ProductCandidate,
  recommendPrice,
  unitEconomics,
} from "./engine";

const num = z.number().finite();
const costSchema = z.object({
  productCost: num.min(0),
  shippingCost: num.min(0),
  otherCostPerOrder: num.min(0).optional(),
  paymentPct: num.min(0).max(0.2).optional(),
  paymentFixed: num.min(0).optional(),
  refundRate: num.min(0).max(0.9).optional(),
});

// Exact statuses only: "not_fulfilled" and "partially_fulfilled" must NOT count as done.
const DONE_FULFILLMENT = new Set(["fulfilled", "shipped", "delivered", "canceled"]);
const DONE_PAYMENT = new Set(["captured", "paid", "completed", "canceled", "refunded"]);

const strip = <T extends object>(o: T): T =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;

export const dropshipSkill: SkillModule = {
  id: "skill-dropship",
  title: "Dropshipping",
  description:
    "Unit economics, fee-aware pricing, product scoring and Medusa store reporting. Store changes need owner approval.",
  stack: ["medusa", "DropShipping-AI-Agent (pricing + scoring logic, MIT)"],
  requiresEnv: [],
  implemented: true,
  prompt:
    "Dropshipping rules: never recommend a price without its break-even floor; always state contribution margin AFTER fees and refunds; " +
    "a product is only 'go' if margin and demand both hold, and even then recommend a small paid test before scaling. " +
    "Say plainly when inputs (orders, ratings, competitor prices) are missing instead of assuming them. " +
    "Creating products, changing prices, buying from suppliers and recording tracking are proposed as actions (dropship_create_product, dropship_update_price, dropship_place_supplier_order, dropship_update_supplier_order), never done directly. " +
    "Never buy for an order that isn't paid. Tell the owner about late supplier orders without being asked when you see them.",
  tools: [
    {
      name: "dropship_unit_economics",
      description:
        "Profit per order after supplier cost, shipping, payment fees and expected refunds; break-even CPA and ROAS; optional result at a given ad cost (cpa, or cpc + conversionRate).",
      input: z.object({
        price: num.positive(),
        cost: costSchema,
        ads: z
          .object({
            cpa: num.positive().optional(),
            cpc: num.positive().optional(),
            conversionRate: num.positive().max(1).optional(),
          })
          .default({}),
      }),
      risk: "read",
      run: async ({ price, cost, ads }) => unitEconomics(price, strip(cost), strip(ads)),
    },
    {
      name: "dropship_price_recommendation",
      description:
        "Recommend a selling price (cost_plus, competitive, premium, penetration, dynamic or auto) that never goes below the fee-aware break-even floor. Pass competitor prices when known.",
      input: z.object({
        cost: costSchema,
        competitorPrices: z.array(num.positive()).max(50).default([]),
        demandScore: num.min(0).max(1).optional(),
        targetMarkup: num.min(0).max(10).optional(),
        minMarginPct: num.min(0).max(0.8).optional(),
        strategy: z
          .enum(["auto", "cost_plus", "competitive", "premium", "penetration", "dynamic"])
          .default("auto"),
      }),
      risk: "read",
      run: async (i) =>
        recommendPrice({
          cost: strip(i.cost),
          competitorPrices: i.competitorPrices,
          strategy: i.strategy,
          ...(i.demandScore !== undefined ? { demandScore: i.demandScore } : {}),
          ...(i.targetMarkup !== undefined ? { targetMarkup: i.targetMarkup } : {}),
          ...(i.minMarginPct !== undefined ? { minMarginPct: i.minMarginPct } : {}),
        }),
    },
    {
      name: "dropship_score_products",
      description:
        "Rank up to 25 candidate products 0-100 with a go / test / skip verdict, using margin after fees, supplier orders, rating, supplier rating and delivery time. Missing inputs lower confidence, they are not guessed.",
      input: z.object({
        products: z
          .array(
            z.object({
              name: z.string().min(1).max(120),
              cost: costSchema,
              expectedPrice: num.positive(),
              orders: num.min(0).optional(),
              reviews: num.min(0).optional(),
              rating: num.min(0).max(5).optional(),
              supplierRating: num.min(0).max(5).optional(),
              shippingDays: num.min(0).max(120).optional(),
            }),
          )
          .min(1)
          .max(25),
      }),
      risk: "read",
      run: async ({ products }) => ({
        ranked: rankProducts(
          (products as ProductCandidate[]).map((p) => strip({ ...p, cost: strip(p.cost) })),
        ),
      }),
    },
    {
      name: "dropship_supplier_orders",
      description:
        "List supplier orders (what was bought from suppliers for customer orders) with status, tracking and LATE FLAGS (not placed in time, no tracking, past expected delivery, stuck, problem). Worst first. Customer addresses are never included.",
      input: z.object({
        status: z.enum(STATUSES as [string, ...string[]]).optional(),
        onlyProblems: z.boolean().default(false),
        limit: z.number().int().min(1).max(100).default(50),
      }),
      risk: "read",
      run: async ({ status, onlyProblems, limit }, ctx) => {
        if (!ctx.userId) throw new Error("No signed-in user for this request.");
        const rows = await listSupplierOrders(ctx.userId, {
          ...(status ? { status: status as SupplierStatus } : {}),
          limit,
        });
        const withFlags = rows.map((o) => ({ o, flags: lateFlags(o) }));
        const rank = (f: { severity: string }[]) =>
          f.some((x) => x.severity === "urgent") ? 2 : f.length ? 1 : 0;
        const shown = withFlags
          .filter((x) => !onlyProblems || x.flags.length)
          .sort((a, b) => rank(b.flags) - rank(a.flags));
        const counts: Record<string, number> = {};
        for (const { o } of withFlags) counts[o.status] = (counts[o.status] ?? 0) + 1;
        return {
          counts,
          problems: withFlags.filter((x) => x.flags.length).length,
          orders: shown.map(({ o, flags }) => ({
            id: o.id,
            storeOrder: o.storeOrderDisplay ?? o.storeOrderId,
            supplier: o.supplier,
            status: o.status,
            supplierRef: o.supplierRef,
            trackingNumber: o.trackingNumber,
            carrier: o.carrier,
            expectedDelivery: o.expectedDelivery,
            totalCost: o.totalCost,
            currency: o.currency,
            items: o.items.map((i) => `${i.quantity}x ${i.title}`),
            shipToCountry: o.shipToCountry,
            flags,
            note: o.note,
          })),
        };
      },
    },
    {
      name: "dropship_orders_needing_supplier",
      description:
        "Paid, not-cancelled store orders from the last N days that have NO supplier order yet (customers waiting for you to buy). Oldest first.",
      requiresEnv: ["MEDUSA_BACKEND_URL", "MEDUSA_ADMIN_TOKEN"],
      input: z.object({ days: z.number().int().min(1).max(60).default(14) }),
      risk: "read",
      run: async ({ days }, ctx) => {
        if (!ctx.userId) throw new Error("No signed-in user for this request.");
        const since = new Date(Date.now() - days * 86_400_000).toISOString();
        const [orders, have] = await Promise.all([
          listOrders(since),
          activeStoreOrderIds(ctx.userId),
        ]);
        const paid = new Set(["captured", "paid", "completed"]);
        const waiting = orders
          .filter(
            (o) =>
              o.status !== "canceled" &&
              (o.payment_status === undefined || paid.has(o.payment_status)) &&
              !have.has(o.id),
          )
          .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
        return {
          count: waiting.length,
          orders: waiting.slice(0, 50).map((o) => ({
            id: o.id,
            displayId: o.display_id ?? null,
            total: o.total ?? null,
            currency: o.currency_code ?? null,
            hoursWaiting: Math.floor((Date.now() - Date.parse(o.created_at)) / 3_600_000),
          })),
        };
      },
    },
    {
      name: "dropship_store_overview",
      description:
        "Read the Medusa store: product counts by status, products missing cost data (so prices can't be protected), and orders in the last N days with revenue, unfulfilled and unpaid counts.",
      requiresEnv: ["MEDUSA_BACKEND_URL", "MEDUSA_ADMIN_TOKEN"],
      input: z.object({ days: z.number().int().min(1).max(90).default(30) }),
      risk: "read",
      run: async ({ days }) => {
        const since = new Date(Date.now() - days * 86_400_000).toISOString();
        const [{ products, count }, orders] = await Promise.all([
          listProducts(100),
          listOrders(since),
        ]);
        const byStatus: Record<string, number> = {};
        for (const p of products) byStatus[p.status] = (byStatus[p.status] ?? 0) + 1;
        const revenue: Record<string, number> = {};
        let unfulfilled = 0,
          unpaid = 0,
          stale = 0;
        const staleBefore = Date.now() - 3 * 86_400_000;
        for (const o of orders) {
          const cur = (o.currency_code ?? "?").toLowerCase();
          revenue[cur] = Math.round(((revenue[cur] ?? 0) + (o.total ?? 0)) * 100) / 100;
          const unf =
            o.fulfillment_status !== undefined &&
            !DONE_FULFILLMENT.has(o.fulfillment_status) &&
            o.status !== "canceled";
          if (unf) {
            unfulfilled++;
            if (Date.parse(o.created_at) < staleBefore) stale++;
          }
          if (
            o.payment_status !== undefined &&
            !DONE_PAYMENT.has(o.payment_status) &&
            o.status !== "canceled"
          )
            unpaid++;
        }
        return {
          productsTotal: count,
          productsInspected: products.length,
          byStatus,
          withoutCostData: products
            .filter((p) => !costFromMetadata(p.metadata))
            .map((p) => p.title)
            .slice(0, 20),
          orders: {
            days,
            count: orders.length,
            revenue,
            unfulfilled,
            unfulfilledOver3Days: stale,
            notPaid: unpaid,
          },
        };
      },
    },
    {
      name: "dropship_store_products",
      description:
        "List products in the Medusa store with status, variant prices and recorded cost, with each product's break-even floor (minimum 10% margin).",
      requiresEnv: ["MEDUSA_BACKEND_URL", "MEDUSA_ADMIN_TOKEN"],
      input: z.object({ limit: z.number().int().min(1).max(50).default(25) }),
      risk: "read",
      run: async ({ limit }) => {
        const { products, count } = await listProducts(limit);
        return {
          total: count,
          products: products.map((p) => {
            const c = costFromMetadata(p.metadata);
            return {
              id: p.id,
              title: p.title,
              status: p.status,
              variants: (p.variants ?? []).map((v) => ({ id: v.id, prices: v.prices ?? [] })),
              cost: c ? { ...c.cost, currency: c.currency } : null,
              breakEvenFloor: c ? Math.ceil(floorPrice(c.cost, 0.1) * 100) / 100 : null,
            };
          }),
        };
      },
    },
  ],
};

export { medusaConfigured };
