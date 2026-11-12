import "@tanstack/react-start/server-only";
import { z } from "zod";
import type { ActionPreview } from "@/lib/aduf-types";
import {
  createDraftProduct,
  deleteProduct,
  getProduct,
  medusaConfigured,
  setVariantPrice,
  type MedusaProduct,
  type MedusaVariant,
} from "../services/medusa";
import { costFromMetadata, costToMetadata } from "./costs";
import { floorPrice, unitEconomics, type CostModel } from "./engine";

/** The hard rule behind every dropship write: a price may never go below this contribution margin. */
export const MIN_MARGIN = 0.1;

export const createProductSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  currency: z.string().length(3),
  price: z.number().positive().max(1_000_000),
  productCost: z.number().min(0).max(1_000_000),
  shippingCost: z.number().min(0).max(1_000_000),
  otherCostPerOrder: z.number().min(0).max(1_000_000).optional(),
  refundRate: z.number().min(0).max(0.9).optional(),
  supplierUrl: z.string().url().max(500).optional(),
  /** The supplier's SKU/variant id. Saved as the variant SKU so supplier orders can be built from store orders. */
  supplierSku: z.string().min(1).max(100).optional(),
});

export const updatePriceSchema = z.object({
  productId: z.string().min(1).max(100),
  variantId: z.string().min(1).max(100).optional(),
  currency: z.string().length(3),
  newPrice: z.number().positive().max(1_000_000),
});

const money = (n: number, cur: string) => `${n.toFixed(2)} ${cur.toUpperCase()}`;

function costOf(p: z.infer<typeof createProductSchema>): CostModel {
  return {
    productCost: p.productCost,
    shippingCost: p.shippingCost,
    ...(p.otherCostPerOrder !== undefined ? { otherCostPerOrder: p.otherCostPerOrder } : {}),
    ...(p.refundRate !== undefined ? { refundRate: p.refundRate } : {}),
  };
}

function pickVariant(product: MedusaProduct, variantId?: string): MedusaVariant {
  const vs = product.variants ?? [];
  if (variantId) {
    const v = vs.find((x) => x.id === variantId);
    if (!v) throw new Error("That variant isn't on the product.");
    return v;
  }
  if (vs.length !== 1)
    throw new Error("This product has several variants; say which variant to change.");
  return vs[0]!;
}

const priceIn = (v: MedusaVariant, cur: string): number | null =>
  v.prices?.find((x) => x.currency_code.toLowerCase() === cur.toLowerCase())?.amount ?? null;

/** Throws unless the product has recorded costs and the price clears break-even. */
function assertAboveFloor(
  product: MedusaProduct,
  cur: string,
  price: number,
): { cost: CostModel; floor: number } {
  const c = costFromMetadata(product.metadata);
  if (!c)
    throw new Error(
      "This product has no cost on file (it wasn't created by ADUF), so ADUF can't check break-even and won't change its price.",
    );
  if (c.currency && c.currency !== cur.toLowerCase())
    throw new Error(`Costs on file are in ${c.currency.toUpperCase()}, not ${cur.toUpperCase()}.`);
  const floor = floorPrice(c.cost, MIN_MARGIN);
  if (price < floor)
    throw new Error(
      `${money(price, cur)} is below break-even. The lowest allowed price is ${money(Math.ceil(floor * 100) / 100, cur)}.`,
    );
  return { cost: c.cost, floor };
}

export async function previewCreateProduct(raw: Record<string, unknown>): Promise<ActionPreview> {
  const p = createProductSchema.parse(raw);
  const eco = unitEconomics(p.price, costOf(p));
  const floor = floorPrice(costOf(p), MIN_MARGIN);
  return {
    headline: `If you approve: “${p.title}” is added to your Medusa store as a DRAFT. It isn't visible to customers until you publish it.`,
    effects: [
      `Price ${money(p.price, p.currency)}; costs are saved on the product so later price changes are checked against break-even`,
      ...(!medusaConfigured()
        ? ["Medusa isn't configured on this server, so approving will fail"]
        : []),
    ],
    unchanged: ["Nothing is published", "Your ad accounts", "Messages to your customers"],
    estimate: [
      { label: "Profit per order before ads", value: money(eco.contributionBeforeAds, p.currency) },
      { label: "Margin after fees and refunds", value: `${eco.contributionMarginPct}%` },
      {
        label: "Break-even cost per sale",
        value: eco.breakEvenCpa === null ? "n/a" : money(eco.breakEvenCpa, p.currency),
      },
      { label: "Lowest allowed price", value: money(Math.ceil(floor * 100) / 100, p.currency) },
    ],
    confidence: "high",
    confidenceNote: "The arithmetic is exact. It doesn't predict how many you'll sell.",
    sources: [],
  };
}

export async function previewUpdatePrice(raw: Record<string, unknown>): Promise<ActionPreview> {
  const p = updatePriceSchema.parse(raw);
  const effects: string[] = [];
  const estimate: { label: string; value: string }[] = [];
  let note = "The arithmetic is exact. It doesn't predict how sales will react to the new price.";
  if (medusaConfigured()) {
    try {
      const product = await getProduct(p.productId);
      const v = pickVariant(product, p.variantId);
      const old = priceIn(v, p.currency);
      const c = costFromMetadata(product.metadata);
      effects.push(
        `${product.title}: ${old === null ? "no price in this currency yet" : money(old, p.currency)} → ${money(p.newPrice, p.currency)}`,
      );
      if (c) {
        const floor = floorPrice(c.cost, MIN_MARGIN);
        const eco = unitEconomics(p.newPrice, c.cost);
        estimate.push(
          { label: "Margin at the new price", value: `${eco.contributionMarginPct}%` },
          {
            label: "Profit per order before ads",
            value: money(eco.contributionBeforeAds, p.currency),
          },
          { label: "Lowest allowed price", value: money(Math.ceil(floor * 100) / 100, p.currency) },
        );
        if (old !== null)
          estimate.push({
            label: "Margin before",
            value: `${unitEconomics(old, c.cost).contributionMarginPct}%`,
          });
        if (p.newPrice < floor) effects.push("⚠ Below break-even: approving will be refused");
      } else {
        effects.push("⚠ No cost on file for this product: approving will be refused");
      }
    } catch (e) {
      note = `Couldn't read the product from Medusa (${e instanceof Error ? e.message : "error"}).`;
    }
  } else {
    effects.push("Medusa isn't configured on this server, so approving will fail");
  }
  return {
    headline: "If you approve: this product's price is changed in your Medusa store right away.",
    effects,
    unchanged: ["Other products", "Your ad accounts", "Messages to your customers"],
    estimate,
    confidence: "medium",
    confidenceNote: note,
    sources: [],
  };
}

export async function execCreateProduct(
  raw: Record<string, unknown>,
): Promise<{ result: Record<string, unknown>; changed: boolean }> {
  const p = createProductSchema.parse(raw);
  const cost = costOf(p);
  const floor = floorPrice(cost, MIN_MARGIN);
  if (p.price < floor)
    throw new Error(
      `${money(p.price, p.currency)} is below break-even. The lowest allowed price is ${money(Math.ceil(floor * 100) / 100, p.currency)}.`,
    );
  const product = await createDraftProduct({
    title: p.title,
    ...(p.description ? { description: p.description } : {}),
    ...(p.supplierSku ? { sku: p.supplierSku } : {}),
    currencyCode: p.currency,
    price: p.price,
    metadata: costToMetadata(cost, p.currency, p.supplierUrl, p.supplierSku),
  });
  return {
    result: {
      entityId: product.id,
      note: "Created as a draft in Medusa. Publish it there when you're ready.",
    },
    changed: true,
  };
}

export async function execUpdatePrice(
  raw: Record<string, unknown>,
): Promise<{ result: Record<string, unknown>; changed: boolean }> {
  const p = updatePriceSchema.parse(raw);
  const product = await getProduct(p.productId);
  const v = pickVariant(product, p.variantId);
  assertAboveFloor(product, p.currency, p.newPrice);
  const prev = priceIn(v, p.currency);
  if (prev === p.newPrice)
    return { result: { note: "Already at that price — nothing changed." }, changed: false };
  await setVariantPrice(product.id, v, p.currency, p.newPrice);
  return {
    result: {
      entityId: product.id,
      variantId: v.id,
      currency: p.currency.toLowerCase(),
      prev,
      note: `Price changed to ${money(p.newPrice, p.currency)}.`,
    },
    changed: true,
  };
}

export async function undoCreateProduct(result: Record<string, unknown>): Promise<void> {
  const id = String(result["entityId"] ?? "");
  const product = await getProduct(id);
  if (product.status !== "draft")
    throw new Error(
      "The product has been published, so ADUF won't delete it. Remove it in Medusa.",
    );
  await deleteProduct(id);
}

export async function undoUpdatePrice(result: Record<string, unknown>): Promise<void> {
  const prev = result["prev"];
  if (typeof prev !== "number") throw new Error("There was no previous price to restore.");
  const product = await getProduct(String(result["entityId"]));
  const v = pickVariant(product, String(result["variantId"]));
  await setVariantPrice(product.id, v, String(result["currency"]), prev);
}
