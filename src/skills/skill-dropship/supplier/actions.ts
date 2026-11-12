import "@tanstack/react-start/server-only";
import { z } from "zod";
import type { ActionPreview } from "@/lib/aduf-types";
import {
  getOrder,
  getProduct,
  medusaConfigured,
  type MedusaOrderDetail,
} from "../../services/medusa";
import { costFromMetadata } from "../costs";
import { cjConfigured, cjCreateUnpaidOrder } from "./cj";
import { applyUpdate, STATUSES, type SupplierOrderState } from "./state";
import {
  deleteSupplierOrder,
  getSupplierOrder,
  insertSupplierOrder,
  saveSupplierOrder,
  type SupplierOrderItem,
} from "./store";

export const placeSchema = z.object({
  /** The store (Medusa) order id. The server reads items and address itself; the model never sees the address. */
  storeOrderId: z.string().min(1).max(100),
  supplier: z.enum(["manual", "cj"]),
  /** CJ shipping method name, e.g. "CJPacket Ordinary". Required for cj. */
  logisticName: z.string().min(1).max(50).optional(),
  /** Warehouse country, 2 letters. Default CN. */
  fromCountryCode: z.string().length(2).optional(),
  note: z.string().max(300).optional(),
});

export const updateSchema = z
  .object({
    orderId: z.string().uuid(),
    status: z.enum(STATUSES as [string, ...string[]]).optional(),
    supplierRef: z.string().min(1).max(100).optional(),
    trackingNumber: z.string().min(3).max(100).optional(),
    carrier: z.string().min(1).max(60).optional(),
    expectedDelivery: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    note: z.string().max(500).optional(),
  })
  .refine((v) => Object.keys(v).some((k) => k !== "orderId"), { message: "Nothing to change." });

const PAID = new Set(["captured", "paid", "completed"]);

interface Built {
  order: MedusaOrderDetail;
  items: SupplierOrderItem[];
  totalCost: number | null;
  revenue: number;
  currency: string;
  warnings: string[];
}

/** Builds the supplier purchase from a store order and refuses the ones that must never be bought. */
async function buildFromStoreOrder(storeOrderId: string): Promise<Built> {
  if (!medusaConfigured()) throw new Error("Medusa isn't configured on this server.");
  const order = await getOrder(storeOrderId);
  if (order.status === "canceled") throw new Error("That store order is cancelled.");
  if (order.payment_status !== undefined && !PAID.has(order.payment_status))
    throw new Error(
      `The customer hasn't paid yet (payment: ${order.payment_status}). Never buy stock for an unpaid order.`,
    );
  const lines = order.items ?? [];
  if (!lines.length) throw new Error("That order has no items.");

  const currency = (order.currency_code ?? "").toLowerCase();
  const warnings: string[] = [];
  const cache = new Map<string, ReturnType<typeof costFromMetadata>>();
  const items: SupplierOrderItem[] = [];
  let total = 0;
  let known = true;
  for (const l of lines) {
    let unit: number | null = null;
    if (l.product_id) {
      if (!cache.has(l.product_id))
        cache.set(l.product_id, costFromMetadata((await getProduct(l.product_id)).metadata));
      const c = cache.get(l.product_id);
      if (c && (!c.currency || c.currency === currency))
        unit = c.cost.productCost + c.cost.shippingCost;
      else if (c)
        warnings.push(
          `Cost for "${l.title ?? l.id}" is in ${c.currency.toUpperCase()}, not ${currency.toUpperCase()}: ignored.`,
        );
    }
    if (unit === null) {
      known = false;
      warnings.push(`No usable cost on file for "${l.title ?? l.id}".`);
    } else total += unit * l.quantity;
    items.push({
      title: l.title ?? l.id,
      sku: l.variant_sku ?? null,
      quantity: l.quantity,
      unitCost: unit,
    });
  }
  const totalCost = known ? Math.round(total * 100) / 100 : null;
  const revenue = Number(order.total ?? 0);
  if (totalCost !== null && revenue > 0 && totalCost > revenue)
    throw new Error(
      `Supplier cost (${totalCost.toFixed(2)} ${currency.toUpperCase()}) is higher than what the customer paid (${revenue.toFixed(2)}). Not buying at a loss: fix the price or cancel the order.`,
    );
  return { order, items, totalCost, revenue, currency, warnings };
}

export async function previewPlace(raw: Record<string, unknown>): Promise<ActionPreview> {
  const p = placeSchema.parse(raw);
  const effects: string[] = [];
  const estimate: { label: string; value: string }[] = [];
  let note =
    "The cost comes from the costs saved on your products. It can't predict delivery problems.";
  try {
    const b = await buildFromStoreOrder(p.storeOrderId);
    effects.push(
      `Store order #${b.order.display_id ?? b.order.id}: ${b.items.map((i) => `${i.quantity}× ${i.title}`).join(", ")}`,
    );
    estimate.push({
      label: "Customer paid",
      value: `${b.revenue.toFixed(2)} ${b.currency.toUpperCase()}`,
    });
    if (b.totalCost !== null) {
      estimate.push({
        label: "Supplier cost incl. shipping",
        value: `${b.totalCost.toFixed(2)} ${b.currency.toUpperCase()}`,
      });
      estimate.push({
        label: "Left before fees and ads",
        value: `${(b.revenue - b.totalCost).toFixed(2)} ${b.currency.toUpperCase()}`,
      });
    }
    for (const w of b.warnings) effects.push(`⚠ ${w}`);
    if (p.supplier === "cj") {
      if (!cjConfigured()) effects.push("⚠ CJ_ACCESS_TOKEN isn't set: approving will fail");
      if (!p.logisticName)
        effects.push("⚠ CJ needs a shipping method (logisticName): approving will fail");
      if (b.items.some((i) => !i.sku))
        effects.push("⚠ An item has no supplier SKU: approving will fail");
      effects.push(
        "Creates the order at CJ UNPAID. You pay for it inside CJ; ADUF never spends money.",
      );
    } else {
      effects.push(
        "Adds it to your supplier to-do list. You place the order on the supplier's site, then give ADUF the supplier's order number.",
      );
    }
  } catch (e) {
    effects.push(
      `⚠ ${e instanceof Error ? e.message : "Couldn't read the store order"}: approving will be refused`,
    );
    note = "The order couldn't be checked.";
  }
  return {
    headline:
      p.supplier === "cj"
        ? "If you approve: an unpaid order is created at CJ Dropshipping for this customer order."
        : "If you approve: this customer order is added to your supplier to-do list.",
    effects,
    unchanged: [
      "Your money (nothing is paid by ADUF)",
      "Your store order",
      "Messages to your customer",
    ],
    estimate,
    confidence: "medium",
    confidenceNote: note,
    sources: [],
  };
}

export async function execPlace(
  userId: string,
  raw: Record<string, unknown>,
): Promise<{ result: Record<string, unknown>; changed: boolean }> {
  const p = placeSchema.parse(raw);
  const b = await buildFromStoreOrder(p.storeOrderId);
  const a = b.order.shipping_address;
  if (p.supplier === "cj") {
    if (!cjConfigured()) throw new Error("CJ_ACCESS_TOKEN isn't set.");
    if (!p.logisticName) throw new Error("CJ needs a shipping method (logisticName).");
    if (b.items.some((i) => !i.sku))
      throw new Error("An item has no supplier SKU. Set it on the product (supplierSku) first.");
    const name = [a?.first_name, a?.last_name].filter(Boolean).join(" ");
    if (!a?.country_code || !a.city || !a.address_1 || !name)
      throw new Error("The store order is missing a shipping name, address, city or country.");
  }
  const row = await insertSupplierOrder(userId, {
    storeOrderId: b.order.id,
    storeOrderDisplay: b.order.display_id !== undefined ? String(b.order.display_id) : null,
    supplier: p.supplier,
    items: b.items,
    currency: b.currency,
    totalCost: b.totalCost,
    shipToCountry: a?.country_code?.toUpperCase() ?? null,
    note: p.note ?? null,
  });
  if (p.supplier === "manual")
    return {
      result: {
        entityId: row.id,
        note: "Added to your supplier to-do. Place it on the supplier's site, then tell ADUF the supplier's order number.",
      },
      changed: true,
    };

  try {
    const cc = a!.country_code!.toUpperCase();
    const created = await cjCreateUnpaidOrder({
      orderNumber: row.id,
      customerName: [a!.first_name, a!.last_name].filter(Boolean).join(" ").slice(0, 50),
      countryCode: cc,
      country: (new Intl.DisplayNames(["en"], { type: "region" }).of(cc) ?? cc).slice(0, 50),
      province: (a!.province || a!.city!).slice(0, 50),
      city: a!.city!.slice(0, 50),
      address: [a!.address_1, a!.address_2].filter(Boolean).join(", ").slice(0, 500),
      zip: a!.postal_code ?? undefined,
      phone: a!.phone ?? undefined,
      logisticName: p.logisticName!,
      fromCountryCode: (p.fromCountryCode ?? "CN").toUpperCase(),
      products: b.items.map((i) => ({ sku: i.sku!, quantity: i.quantity })),
    });
    const { next, event } = applyUpdate(row, {
      status: "placed",
      supplierRef: created.orderId,
      note: "Created unpaid at CJ. Pay it inside CJ.",
    });
    await saveSupplierOrder(userId, row.id, next, event, row.events);
    return {
      result: {
        entityId: row.id,
        supplierRef: created.orderId,
        note: "Created at CJ as an unpaid order. Pay it inside CJ so it ships.",
      },
      changed: true,
    };
  } catch (e) {
    await deleteSupplierOrder(userId, row.id).catch(() => undefined); // nothing was created, so allow a clean retry
    throw e;
  }
}

export async function undoPlace(userId: string, result: Record<string, unknown>): Promise<void> {
  const o = await getSupplierOrder(userId, String(result["entityId"] ?? ""));
  if (!o) throw new Error("The supplier order no longer exists.");
  if (o.supplier === "cj")
    throw new Error(
      "ADUF can't cancel an order at CJ. Cancel it inside CJ, then mark it cancelled here.",
    );
  if (o.status !== "to_place")
    throw new Error(
      `It is already "${o.status}", so it can't be undone here. Mark it cancelled instead.`,
    );
  const { next, event } = applyUpdate(o, { status: "cancelled", note: "Undone by the owner" });
  await saveSupplierOrder(userId, o.id, next, event, o.events);
}

const snapshot = (o: SupplierOrderState): SupplierOrderState => ({
  status: o.status,
  supplierRef: o.supplierRef,
  trackingNumber: o.trackingNumber,
  carrier: o.carrier,
  expectedDelivery: o.expectedDelivery,
  placedAt: o.placedAt,
  shippedAt: o.shippedAt,
  deliveredAt: o.deliveredAt,
  note: o.note,
});

export async function previewUpdate(
  userId: string,
  raw: Record<string, unknown>,
): Promise<ActionPreview> {
  const { orderId, ...patch } = updateSchema.parse(raw);
  const effects: string[] = [];
  try {
    const o = await getSupplierOrder(userId, orderId);
    if (!o) throw new Error("Supplier order not found.");
    applyUpdate(o, patch as Parameters<typeof applyUpdate>[1]);
    if (patch.status) effects.push(`Status: ${o.status} → ${patch.status}`);
    if (patch.trackingNumber)
      effects.push(
        `Tracking number: ${patch.trackingNumber}${patch.carrier ? ` (${patch.carrier})` : ""}`,
      );
    if (patch.supplierRef) effects.push(`Supplier order number: ${patch.supplierRef}`);
    if (patch.expectedDelivery) effects.push(`Expected delivery: ${patch.expectedDelivery}`);
    if (patch.note) effects.push("Adds a note");
  } catch (e) {
    effects.push(
      `⚠ ${e instanceof Error ? e.message : "Invalid change"}: approving will be refused`,
    );
  }
  return {
    headline:
      "If you approve: the supplier order record is updated. This only changes ADUF's tracking record.",
    effects,
    unchanged: ["The supplier's real order", "Your store order", "Messages to your customer"],
    confidence: "high",
    confidenceNote:
      "ADUF records what you or the agent report; it doesn't check it with the supplier.",
    sources: [],
  };
}

export async function execUpdate(
  userId: string,
  raw: Record<string, unknown>,
): Promise<{ result: Record<string, unknown>; changed: boolean }> {
  const { orderId, ...patch } = updateSchema.parse(raw);
  const o = await getSupplierOrder(userId, orderId);
  if (!o) throw new Error("Supplier order not found.");
  const { next, event } = applyUpdate(o, patch as Parameters<typeof applyUpdate>[1]);
  await saveSupplierOrder(userId, o.id, next, event, o.events);
  return {
    result: {
      entityId: o.id,
      prev: snapshot(o),
      prevEvents: o.events,
      note: event ? `Now "${next.status}".` : "Updated.",
    },
    changed: true,
  };
}

export async function undoUpdate(userId: string, result: Record<string, unknown>): Promise<void> {
  const o = await getSupplierOrder(userId, String(result["entityId"] ?? ""));
  if (!o) throw new Error("The supplier order no longer exists.");
  const prev = result["prev"] as SupplierOrderState | undefined;
  if (!prev) throw new Error("Nothing to restore.");
  await saveSupplierOrder(
    userId,
    o.id,
    prev,
    null,
    (result["prevEvents"] as typeof o.events) ?? o.events,
  );
}
