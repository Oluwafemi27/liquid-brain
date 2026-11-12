import type { CostModel } from "./engine";

/** Cost facts saved on a Medusa product's metadata when ADUF creates it. Price changes read them back
 *  so a price can never be set below break-even later, even from a different chat. */
export const COST_KEYS = {
  productCost: "aduf_product_cost",
  shippingCost: "aduf_shipping_cost",
  otherCost: "aduf_other_cost",
  refundRate: "aduf_refund_rate",
  currency: "aduf_currency",
  supplierUrl: "aduf_supplier_url",
  supplierSku: "aduf_supplier_sku",
} as const;

export function costToMetadata(
  c: CostModel,
  currency: string,
  supplierUrl?: string,
  supplierSku?: string,
): Record<string, unknown> {
  return {
    [COST_KEYS.productCost]: c.productCost,
    [COST_KEYS.shippingCost]: c.shippingCost,
    [COST_KEYS.otherCost]: c.otherCostPerOrder ?? 0,
    [COST_KEYS.refundRate]: c.refundRate ?? 0.05,
    [COST_KEYS.currency]: currency.toLowerCase(),
    ...(supplierUrl ? { [COST_KEYS.supplierUrl]: supplierUrl } : {}),
    ...(supplierSku ? { [COST_KEYS.supplierSku]: supplierSku } : {}),
  };
}

export function costFromMetadata(
  meta: Record<string, unknown> | null | undefined,
): { cost: CostModel; currency: string } | null {
  if (!meta) return null;
  const pc = Number(meta[COST_KEYS.productCost]);
  const sc = Number(meta[COST_KEYS.shippingCost]);
  if (!Number.isFinite(pc) || !Number.isFinite(sc) || meta[COST_KEYS.productCost] == null)
    return null;
  const other = Number(meta[COST_KEYS.otherCost]);
  const refund = Number(meta[COST_KEYS.refundRate]);
  return {
    cost: {
      productCost: pc,
      shippingCost: sc,
      ...(Number.isFinite(other) ? { otherCostPerOrder: other } : {}),
      ...(Number.isFinite(refund) ? { refundRate: refund } : {}),
    },
    currency: String(meta[COST_KEYS.currency] ?? ""),
  };
}
