// Supplier order lifecycle. Pure and client-safe: the allowed moves, what each move requires, and which
// orders are late. Every status change in the app goes through applyUpdate().

export type SupplierStatus =
  "to_place" | "placed" | "shipped" | "delivered" | "issue" | "cancelled" | "refunded";

export const STATUSES: SupplierStatus[] = [
  "to_place",
  "placed",
  "shipped",
  "delivered",
  "issue",
  "cancelled",
  "refunded",
];

const MOVES: Record<SupplierStatus, SupplierStatus[]> = {
  to_place: ["placed", "cancelled"],
  placed: ["shipped", "issue", "cancelled"],
  shipped: ["delivered", "issue"],
  issue: ["placed", "shipped", "delivered", "cancelled", "refunded"],
  delivered: ["issue", "refunded"],
  cancelled: [],
  refunded: [],
};

export interface SupplierOrderState {
  status: SupplierStatus;
  supplierRef: string | null;
  trackingNumber: string | null;
  carrier: string | null;
  expectedDelivery: string | null; // YYYY-MM-DD
  placedAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  note: string | null;
}

export interface SupplierPatch {
  status?: SupplierStatus | undefined;
  supplierRef?: string | undefined;
  trackingNumber?: string | undefined;
  carrier?: string | undefined;
  expectedDelivery?: string | undefined;
  note?: string | undefined;
}

export interface SupplierEvent {
  at: string;
  from: SupplierStatus | null;
  to: SupplierStatus;
  note: string | null;
}

/** Validates a patch against the current state and returns the next state. Throws a plain-English reason. */
export function applyUpdate(
  cur: SupplierOrderState,
  patch: SupplierPatch,
  now: Date = new Date(),
): { next: SupplierOrderState; event: SupplierEvent | null } {
  const next: SupplierOrderState = { ...cur };
  if (patch.supplierRef !== undefined) next.supplierRef = patch.supplierRef.trim() || null;
  if (patch.trackingNumber !== undefined) next.trackingNumber = patch.trackingNumber.trim() || null;
  if (patch.carrier !== undefined) next.carrier = patch.carrier.trim() || null;
  if (patch.expectedDelivery !== undefined) {
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(patch.expectedDelivery) ||
      Number.isNaN(Date.parse(patch.expectedDelivery))
    )
      throw new Error("Expected delivery must be a date like 2026-12-24.");
    next.expectedDelivery = patch.expectedDelivery;
  }
  if (patch.note !== undefined) next.note = patch.note.slice(0, 500);

  const to = patch.status;
  if (to !== undefined && to !== cur.status) {
    if (!MOVES[cur.status].includes(to))
      throw new Error(
        `An order that is "${cur.status}" can't move to "${to}".` +
          (MOVES[cur.status].length
            ? ` It can move to: ${MOVES[cur.status].join(", ")}.`
            : " It is final."),
      );
    if (to === "placed" && !next.supplierRef)
      throw new Error("Give the supplier's own order number to mark it placed.");
    if (to === "shipped" && !next.trackingNumber)
      throw new Error("Give the tracking number to mark it shipped.");
    const iso = now.toISOString();
    if (to === "placed") next.placedAt = next.placedAt ?? iso;
    if (to === "shipped") {
      next.shippedAt = next.shippedAt ?? iso;
      next.placedAt = next.placedAt ?? iso;
    }
    if (to === "delivered") {
      if (!next.trackingNumber)
        throw new Error("A delivered order needs a tracking number on file.");
      next.deliveredAt = iso;
    }
    next.status = to;
    return { next, event: { at: iso, from: cur.status, to, note: patch.note ?? null } };
  }
  if (to === undefined || to === cur.status) {
    // Same-status edits (adding tracking later, a note) are allowed on live orders only.
    if (["cancelled", "refunded"].includes(cur.status))
      throw new Error(`This order is ${cur.status}; it can't be edited.`);
  }
  return { next, event: null };
}

// ------------------------------------------------------------------ lateness

export interface Flag {
  code: "not_placed" | "no_tracking" | "late_delivery" | "stuck_in_transit" | "needs_attention";
  severity: "warn" | "urgent";
  message: string;
}

const DAY = 86_400_000;
const days = (a: number, b: number) => Math.floor((a - b) / DAY);

/** Rules (days): to_place > 1 = warn, > 3 = urgent; placed with no tracking > 4 = warn, > 8 = urgent;
 *  shipped past expected delivery = warn (urgent after 7 days late); shipped with no expected date and
 *  > 30 days in transit = urgent; issue = urgent. Final states have no flags. */
export function lateFlags(
  o: Pick<
    SupplierOrderState,
    "status" | "trackingNumber" | "expectedDelivery" | "placedAt" | "shippedAt"
  > & { createdAt: string },
  now: Date = new Date(),
): Flag[] {
  const t = now.getTime();
  const out: Flag[] = [];
  if (o.status === "to_place") {
    const d = days(t, Date.parse(o.createdAt));
    if (d >= 1)
      out.push({
        code: "not_placed",
        severity: d > 3 ? "urgent" : "warn",
        message: `Customer paid but the supplier order was not placed ${d} day(s) ago.`,
      });
  } else if (o.status === "placed") {
    const d = days(t, Date.parse(o.placedAt ?? o.createdAt));
    if (!o.trackingNumber && d > 4)
      out.push({
        code: "no_tracking",
        severity: d > 8 ? "urgent" : "warn",
        message: `Placed ${d} days ago and still no tracking number.`,
      });
  } else if (o.status === "shipped") {
    if (o.expectedDelivery) {
      const late = days(t, Date.parse(o.expectedDelivery));
      if (late > 0)
        out.push({
          code: "late_delivery",
          severity: late > 7 ? "urgent" : "warn",
          message: `${late} day(s) past the expected delivery date.`,
        });
    } else if (o.shippedAt) {
      const d = days(t, Date.parse(o.shippedAt));
      if (d > 30)
        out.push({
          code: "stuck_in_transit",
          severity: "urgent",
          message: `In transit for ${d} days with no expected date.`,
        });
    }
  } else if (o.status === "issue") {
    out.push({
      code: "needs_attention",
      severity: "urgent",
      message: "Marked as having a problem.",
    });
  }
  return out;
}
