import { createServerFn } from "@tanstack/react-start";
import { verifyAccessToken } from "@/lib/server/survey";
import { listOrders, medusaConfigured } from "@/skills/services/medusa";
import { cjConfigured } from "@/skills/skill-dropship/supplier/cj";
import { execPlace, execUpdate } from "@/skills/skill-dropship/supplier/actions";
import { lateFlags, type Flag } from "@/skills/skill-dropship/supplier/state";
import {
  activeStoreOrderIds,
  listSupplierOrders,
  type SupplierOrder,
} from "@/skills/skill-dropship/supplier/store";

// Server functions for the Supplier Orders page. The owner clicking a button on this page IS the
// approval, so these call the same exec functions the agent's approved actions use. The customer's
// address is read on the server only when buying through CJ; it never reaches the browser.

export interface SupplierOrderView extends SupplierOrder {
  flags: Flag[];
}

export interface WaitingStoreOrder {
  id: string;
  displayId: number | null;
  total: number | null;
  currency: string | null;
  hoursWaiting: number;
}

export interface SupplierBoard {
  orders: SupplierOrderView[];
  /** null when the store isn't connected, so the page can say so instead of showing "all caught up". */
  waiting: WaitingStoreOrder[] | null;
  waitingError: string | null;
  storeConnected: boolean;
  cjEnabled: boolean;
}

const PAID = new Set(["captured", "paid", "completed"]);

export const fetchSupplierBoard = createServerFn({ method: "POST" })
  .validator((data: { accessToken: string | null }) => data)
  .handler(async ({ data }): Promise<SupplierBoard | null> => {
    const user = await verifyAccessToken(data.accessToken);
    if (!user) return null;
    const orders = (await listSupplierOrders(user.id, { limit: 200 })).map((o) => ({
      ...o,
      flags: lateFlags(o),
    }));
    const storeConnected = medusaConfigured();
    let waiting: WaitingStoreOrder[] | null = null;
    let waitingError: string | null = null;
    if (storeConnected) {
      try {
        const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
        const [store, have] = await Promise.all([listOrders(since), activeStoreOrderIds(user.id)]);
        waiting = store
          .filter(
            (o) =>
              o.status !== "canceled" &&
              (o.payment_status === undefined || PAID.has(o.payment_status)) &&
              !have.has(o.id),
          )
          .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at))
          .slice(0, 50)
          .map((o) => ({
            id: o.id,
            displayId: o.display_id ?? null,
            total: o.total ?? null,
            currency: o.currency_code ?? null,
            hoursWaiting: Math.floor((Date.now() - Date.parse(o.created_at)) / 3_600_000),
          }));
      } catch (e) {
        waitingError = e instanceof Error ? e.message : "Couldn't read store orders.";
      }
    }
    return { orders, waiting, waitingError, storeConnected, cjEnabled: cjConfigured() };
  });

export const updateSupplierOrderFn = createServerFn({ method: "POST" })
  .validator(
    (data: {
      accessToken: string | null;
      orderId: string;
      status?: string;
      supplierRef?: string;
      trackingNumber?: string;
      carrier?: string;
      expectedDelivery?: string;
      note?: string;
    }) => data,
  )
  .handler(
    async ({ data }): Promise<{ ok: true; message: string } | { ok: false; message: string }> => {
      const user = await verifyAccessToken(data.accessToken);
      if (!user) return { ok: false, message: "Sign in again to change this order." };
      const { accessToken: _t, ...patch } = data;
      const clean = Object.fromEntries(
        Object.entries(patch).filter(([, v]) => v !== undefined && v !== ""),
      );
      try {
        const { result } = await execUpdate(user.id, clean);
        return { ok: true, message: String(result["note"] ?? "Saved.") };
      } catch (e) {
        return { ok: false, message: e instanceof Error ? e.message : "Couldn't save the change." };
      }
    },
  );

export const placeSupplierOrderFn = createServerFn({ method: "POST" })
  .validator(
    (data: {
      accessToken: string | null;
      storeOrderId: string;
      supplier: "manual" | "cj";
      logisticName?: string;
    }) => data,
  )
  .handler(
    async ({ data }): Promise<{ ok: true; message: string } | { ok: false; message: string }> => {
      const user = await verifyAccessToken(data.accessToken);
      if (!user) return { ok: false, message: "Sign in again to add this order." };
      try {
        const { result } = await execPlace(user.id, {
          storeOrderId: data.storeOrderId,
          supplier: data.supplier,
          ...(data.logisticName ? { logisticName: data.logisticName } : {}),
        });
        return { ok: true, message: String(result["note"] ?? "Added.") };
      } catch (e) {
        return { ok: false, message: e instanceof Error ? e.message : "Couldn't add the order." };
      }
    },
  );
