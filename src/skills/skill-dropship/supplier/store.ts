import "@tanstack/react-start/server-only";
import { getSupabaseAdmin } from "@/lib/server/supabase";
import { type SupplierEvent, type SupplierOrderState, type SupplierStatus } from "./state";

export interface SupplierOrderItem {
  title: string;
  sku: string | null;
  quantity: number;
  unitCost: number | null;
}

export interface SupplierOrder extends SupplierOrderState {
  id: string;
  storeOrderId: string;
  storeOrderDisplay: string | null;
  supplier: "manual" | "cj";
  items: SupplierOrderItem[];
  currency: string;
  totalCost: number | null;
  shipToCountry: string | null;
  events: SupplierEvent[];
  createdAt: string;
  updatedAt: string;
}

type Row = Record<string, unknown>;
const db = () => {
  const d = getSupabaseAdmin();
  if (!d) throw new Error("No backend configured.");
  return d;
};

const fromRow = (r: Row): SupplierOrder => ({
  id: r["id"] as string,
  storeOrderId: r["store_order_id"] as string,
  storeOrderDisplay: (r["store_order_display"] as string | null) ?? null,
  supplier: r["supplier"] as "manual" | "cj",
  supplierRef: (r["supplier_ref"] as string | null) ?? null,
  status: r["status"] as SupplierStatus,
  items: (r["items"] as SupplierOrderItem[]) ?? [],
  currency: r["currency"] as string,
  totalCost: r["total_cost"] === null ? null : Number(r["total_cost"]),
  shipToCountry: (r["ship_to_country"] as string | null) ?? null,
  carrier: (r["carrier"] as string | null) ?? null,
  trackingNumber: (r["tracking_number"] as string | null) ?? null,
  expectedDelivery: (r["expected_delivery"] as string | null) ?? null,
  placedAt: (r["placed_at"] as string | null) ?? null,
  shippedAt: (r["shipped_at"] as string | null) ?? null,
  deliveredAt: (r["delivered_at"] as string | null) ?? null,
  note: (r["note"] as string | null) ?? null,
  events: (r["events"] as SupplierEvent[]) ?? [],
  createdAt: r["created_at"] as string,
  updatedAt: r["updated_at"] as string,
});

export async function listSupplierOrders(
  userId: string,
  opts: { status?: SupplierStatus; limit?: number } = {},
): Promise<SupplierOrder[]> {
  let q = db()
    .from("supplier_orders")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 100);
  if (opts.status) q = q.eq("status", opts.status);
  const { data, error } = await q;
  if (error) throw new Error(`Couldn't read supplier orders: ${error.message}`);
  return (data ?? []).map(fromRow);
}

export async function getSupplierOrder(userId: string, id: string): Promise<SupplierOrder | null> {
  const { data, error } = await db()
    .from("supplier_orders")
    .select("*")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Couldn't read the supplier order: ${error.message}`);
  return data ? fromRow(data as Row) : null;
}

/** Store order ids that already have a live (non-cancelled) supplier order. */
export async function activeStoreOrderIds(userId: string): Promise<Set<string>> {
  const { data, error } = await db()
    .from("supplier_orders")
    .select("store_order_id")
    .eq("user_id", userId)
    .neq("status", "cancelled");
  if (error) throw new Error(`Couldn't read supplier orders: ${error.message}`);
  return new Set((data ?? []).map((r) => String((r as Row)["store_order_id"])));
}

export async function insertSupplierOrder(
  userId: string,
  o: {
    storeOrderId: string;
    storeOrderDisplay: string | null;
    supplier: "manual" | "cj";
    items: SupplierOrderItem[];
    currency: string;
    totalCost: number | null;
    shipToCountry: string | null;
    note: string | null;
  },
): Promise<SupplierOrder> {
  const now = new Date().toISOString();
  const { data, error } = await db()
    .from("supplier_orders")
    .insert({
      user_id: userId,
      store_order_id: o.storeOrderId,
      store_order_display: o.storeOrderDisplay,
      supplier: o.supplier,
      status: "to_place",
      items: o.items,
      currency: o.currency.toLowerCase(),
      total_cost: o.totalCost,
      ship_to_country: o.shipToCountry,
      note: o.note,
      events: [{ at: now, from: null, to: "to_place", note: null }],
    })
    .select("*")
    .single();
  if (error) {
    if (error.code === "23505")
      throw new Error("A supplier order already exists for this store order.");
    throw new Error(`Couldn't save the supplier order: ${error.message}`);
  }
  return fromRow(data as Row);
}

export async function saveSupplierOrder(
  userId: string,
  id: string,
  next: SupplierOrderState,
  event: SupplierEvent | null,
  prevEvents: SupplierEvent[],
): Promise<void> {
  const { error } = await db()
    .from("supplier_orders")
    .update({
      status: next.status,
      supplier_ref: next.supplierRef,
      tracking_number: next.trackingNumber,
      carrier: next.carrier,
      expected_delivery: next.expectedDelivery,
      placed_at: next.placedAt,
      shipped_at: next.shippedAt,
      delivered_at: next.deliveredAt,
      note: next.note,
      events: event ? [...prevEvents, event].slice(-50) : prevEvents,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("id", id);
  if (error) throw new Error(`Couldn't update the supplier order: ${error.message}`);
}

export async function deleteSupplierOrder(userId: string, id: string): Promise<void> {
  const { error } = await db().from("supplier_orders").delete().eq("user_id", userId).eq("id", id);
  if (error) throw new Error(`Couldn't remove the supplier order: ${error.message}`);
}
