import { applyUpdate, lateFlags, type SupplierOrderState } from "@/skills/skill-dropship/supplier/state";
import { execPlace, execUpdate, undoPlace, undoUpdate, previewPlace } from "@/skills/skill-dropship/supplier/actions";
import { tables } from "@/lib/server/supabase";
import { riskFor, tierFor } from "@/lib/action-registry";
import { ensureSkillsRegistered, runSkillTool } from "@/skills";

const ok = (c: unknown, m: string) => { if (!c) { console.error("FAIL", m); process.exit(1); } console.log("ok  ", m); };
const rejects = async (p: Promise<unknown>, re: RegExp) => { try { await p; return false; } catch (e: any) { return re.test(e.message); } };
const U = "user-1";
const day = 86_400_000;
const base: SupplierOrderState = { status: "to_place", supplierRef: null, trackingNumber: null, carrier: null, expectedDelivery: null, placedAt: null, shippedAt: null, deliveredAt: null, note: null };

(async () => {
  // ---- state machine
  let r = applyUpdate(base, { status: "placed", supplierRef: "CJ123" });
  ok(r.next.status === "placed" && r.next.placedAt && r.event?.to === "placed", "to_place -> placed with supplier ref");
  ok(await rejects(Promise.resolve().then(() => applyUpdate(base, { status: "placed" })), /supplier's own order number/), "placed requires supplier order number");
  ok(await rejects(Promise.resolve().then(() => applyUpdate(base, { status: "shipped" })), /can't move/), "to_place can't jump to shipped");
  ok(await rejects(Promise.resolve().then(() => applyUpdate(r.next, { status: "shipped" })), /tracking number/), "shipped requires tracking number");
  const sh = applyUpdate(r.next, { status: "shipped", trackingNumber: "YT123456", carrier: "YunExpress" });
  ok(sh.next.status === "shipped" && sh.next.shippedAt, "placed -> shipped");
  ok(await rejects(Promise.resolve().then(() => applyUpdate(sh.next, { status: "placed" })), /can't move/), "shipped can't go back to placed");
  const dl = applyUpdate(sh.next, { status: "delivered" });
  ok(dl.next.deliveredAt !== null, "shipped -> delivered");
  ok(await rejects(Promise.resolve().then(() => applyUpdate({ ...base, status: "cancelled" }, { note: "x" })), /can't be edited/), "cancelled orders are final");
  ok(await rejects(Promise.resolve().then(() => applyUpdate(base, { expectedDelivery: "next week" })), /date like/), "bad date rejected");
  const tr = applyUpdate(r.next, { trackingNumber: "AB123" });
  ok(tr.event === null && tr.next.trackingNumber === "AB123" && tr.next.status === "placed", "tracking can be added without a status change");

  // ---- lateness
  const now = new Date("2026-11-20T12:00:00Z");
  const c = (o: Partial<SupplierOrderState> & { createdAt?: string }) => lateFlags({ ...base, createdAt: "2026-11-20T00:00:00Z", ...o }, now);
  ok(c({}).length === 0, "fresh to_place: no flag");
  ok(c({ createdAt: "2026-11-18T00:00:00Z" })[0]?.code === "not_placed" && c({ createdAt: "2026-11-18T00:00:00Z" })[0]?.severity === "warn", "to_place 2 days: warn");
  ok(c({ createdAt: "2026-11-10T00:00:00Z" })[0]?.severity === "urgent", "to_place 10 days: urgent");
  ok(c({ status: "placed", placedAt: "2026-11-10T00:00:00Z" })[0]?.code === "no_tracking", "placed 10 days, no tracking: flagged");
  ok(c({ status: "placed", placedAt: "2026-11-10T00:00:00Z", trackingNumber: "T" }).length === 0, "placed with tracking: fine");
  ok(c({ status: "shipped", expectedDelivery: "2026-11-10" })[0]?.code === "late_delivery" && c({ status: "shipped", expectedDelivery: "2026-11-10" })[0]?.severity === "urgent", "shipped 10 days past expected: urgent");
  ok(c({ status: "shipped", expectedDelivery: "2026-11-30" }).length === 0, "shipped before expected: fine");
  ok(c({ status: "shipped", shippedAt: "2026-09-01T00:00:00Z" })[0]?.code === "stuck_in_transit", "in transit 80 days, no ETA: stuck");
  ok(c({ status: "issue" })[0]?.severity === "urgent" && c({ status: "delivered" }).length === 0 && c({ status: "refunded" }).length === 0, "issue urgent; final states silent");

  // ---- action risk/tier
  ok(tierFor("dropship_place_supplier_order", { supplier: "manual" }) === "approve" && riskFor("dropship_place_supplier_order", { supplier: "cj" }) === "external", "placing always needs approval");
  ok(tierFor("dropship_update_supplier_order", { trackingNumber: "x" }) === "auto", "tracking-only update runs automatically");
  ok(tierFor("dropship_update_supplier_order", { status: "delivered" }) === "approve" && tierFor("dropship_update_supplier_order", { status: "refunded" }) === "approve" && tierFor("dropship_update_supplier_order", { status: "cancelled" }) === "approve", "delivered/refunded/cancelled need approval");

  // ---- mock Medusa + CJ
  process.env.MEDUSA_BACKEND_URL = "https://store.example.com"; process.env.MEDUSA_ADMIN_TOKEN = "sk"; process.env.CJ_ACCESS_TOKEN = "cjtok";
  const meta = { aduf_product_cost: 8, aduf_shipping_cost: 4, aduf_currency: "usd" };
  const orders: Record<string, any> = {
    o_ok: { id: "o_ok", display_id: 101, status: "pending", created_at: new Date(Date.now() - 2 * day).toISOString(), total: 40, currency_code: "usd", payment_status: "captured", fulfillment_status: "not_fulfilled",
      items: [{ id: "i1", title: "Lamp", quantity: 2, variant_sku: "CJ-LAMP-1", product_id: "p1" }],
      shipping_address: { first_name: "Ada", last_name: "Obi", address_1: "1 Main St", city: "Lagos", province: "Lagos", country_code: "ng", postal_code: "100001", phone: "+2348000000" } },
    o_unpaid: { id: "o_unpaid", display_id: 102, status: "pending", created_at: new Date().toISOString(), total: 40, currency_code: "usd", payment_status: "awaiting", items: [{ id: "i", title: "Lamp", quantity: 1, variant_sku: "S", product_id: "p1" }], shipping_address: {} },
    o_loss: { id: "o_loss", display_id: 103, status: "pending", created_at: new Date().toISOString(), total: 10, currency_code: "usd", payment_status: "captured", items: [{ id: "i", title: "Lamp", quantity: 1, variant_sku: "S", product_id: "p1" }], shipping_address: { first_name: "A", last_name: "B", address_1: "x", city: "y", country_code: "ng" } },
    o_nosku: { id: "o_nosku", display_id: 104, status: "pending", created_at: new Date().toISOString(), total: 90, currency_code: "usd", payment_status: "captured", items: [{ id: "i", title: "Lamp", quantity: 1, variant_sku: null, product_id: "p1" }], shipping_address: { first_name: "A", last_name: "B", address_1: "x", city: "y", country_code: "ng" } },
    o_man: { id: "o_man", display_id: 105, status: "pending", created_at: new Date(Date.now() - 3 * 86400000).toISOString(), total: 50, currency_code: "usd", payment_status: "captured", items: [{ id: "i", title: "Lamp", quantity: 1, variant_sku: "S", product_id: "p1" }], shipping_address: { first_name: "A", last_name: "B", address_1: "x", city: "y", country_code: "gh" } },
    o_cancel: { id: "o_cancel", display_id: 106, status: "canceled", created_at: new Date().toISOString(), total: 50, currency_code: "usd", payment_status: "captured", items: [], shipping_address: {} },
  };
  const cjCalls: any[] = []; let cjFail = false;
  globalThis.fetch = (async (url: any, init: any = {}) => {
    const u = new URL(String(url));
    if (u.hostname === "developers.cjdropshipping.com") {
      cjCalls.push({ url: String(url), headers: init.headers, body: JSON.parse(init.body) });
      return cjFail ? new Response(JSON.stringify({ result: false, message: "Out of stock" }), { status: 200 }) : new Response(JSON.stringify({ result: true, code: 200, data: { orderId: "CJ-ORDER-1", orderStatus: "CREATED" } }));
    }
    const m = u.pathname.match(/^\/admin\/orders\/([^/]+)$/); if (m) return new Response(JSON.stringify({ order: orders[m[1]!] }));
    const pm = u.pathname.match(/^\/admin\/products\/([^/]+)$/); if (pm) return new Response(JSON.stringify({ product: { id: pm[1], title: "Lamp", status: "draft", metadata: meta, variants: [] } }));
    if (u.pathname === "/admin/orders") return new Response(JSON.stringify({ orders: Object.values(orders).map(({ items, shipping_address, ...o }: any) => o) }));
    return new Response("nf", { status: 404 });
  }) as any;

  ok(await rejects(execPlace(U, { storeOrderId: "o_unpaid", supplier: "manual" }), /hasn't paid/), "refuses an unpaid customer order");
  ok(await rejects(execPlace(U, { storeOrderId: "o_cancel", supplier: "manual" }), /cancelled/), "refuses a cancelled order");
  ok(await rejects(execPlace(U, { storeOrderId: "o_loss", supplier: "manual" }), /at a loss/), "refuses to buy at a loss (cost 12 > paid 10)");
  ok(tables.supplier_orders.length === 0, "refusals write nothing");
  ok(await rejects(execPlace(U, { storeOrderId: "o_nosku", supplier: "cj", logisticName: "CJPacket" }), /no supplier SKU/), "cj refuses items without a supplier SKU");
  ok(await rejects(execPlace(U, { storeOrderId: "o_ok", supplier: "cj" }), /shipping method/), "cj needs a shipping method");
  ok(tables.supplier_orders.length === 0 && cjCalls.length === 0, "validation failures never reach CJ or the ledger");

  const man = await execPlace(U, { storeOrderId: "o_man", supplier: "manual" });
  ok(man.changed && tables.supplier_orders[0]!.status === "to_place" && tables.supplier_orders[0]!.total_cost === 12 && tables.supplier_orders[0]!.ship_to_country === "GH", "manual: to-do row with cost 12 and country only");
  ok(!JSON.stringify(tables.supplier_orders[0]).includes("Main St") && !("ship_address" in tables.supplier_orders[0]!), "no customer address stored");
  ok(await rejects(execPlace(U, { storeOrderId: "o_man", supplier: "manual" }), /already exists/), "second supplier order for the same store order refused");

  cjFail = true;
  ok(await rejects(execPlace(U, { storeOrderId: "o_ok", supplier: "cj", logisticName: "CJPacket Ordinary" }), /CJ rejected/) && tables.supplier_orders.length === 1, "CJ failure leaves no ghost row (retry is possible)");
  cjFail = false;
  const cj = await execPlace(U, { storeOrderId: "o_ok", supplier: "cj", logisticName: "CJPacket Ordinary" });
  const body = cjCalls.at(-1)!.body;
  ok(cj.result["supplierRef"] === "CJ-ORDER-1" && body.payType === 3 && body.products[0].sku === "CJ-LAMP-1" && body.products[0].quantity === 2 && body.shippingCountryCode === "NG" && body.shippingCountry === "Nigeria" && cjCalls.at(-1)!.headers["CJ-Access-Token"] === "cjtok", "CJ create: unpaid (payType 3), sku/qty, Nigeria, token header");
  const cjRow = tables.supplier_orders.find((r) => r.store_order_id === "o_ok")!;
  ok(cjRow.status === "placed" && cjRow.supplier_ref === "CJ-ORDER-1" && cjRow.total_cost === 24 && body.orderNumber === cjRow.id, "CJ row is placed, orderNumber = ledger id (idempotent)");
  ok(await rejects(undoPlace(U, cj.result), /cancel it inside CJ/i), "cannot 'undo' a CJ order from ADUF");

  // ---- updates + undo
  const id = tables.supplier_orders.find((r) => r.store_order_id === "o_man")!.id;
  const placed = await execUpdate(U, { orderId: id, status: "placed", supplierRef: "ALI-777" });
  ok(tables.supplier_orders.find((r) => r.id === id)!.status === "placed", "owner reports it placed");
  await undoUpdate(U, placed.result);
  ok(tables.supplier_orders.find((r) => r.id === id)!.status === "to_place" && tables.supplier_orders.find((r) => r.id === id)!.supplier_ref === null, "undo restores previous state");
  ok(await rejects(execUpdate(U, { orderId: id, status: "delivered" }), /can't move/), "invalid jump refused by the ledger");
  ok(await rejects(execUpdate("other-user", { orderId: id, note: "x" }), /not found/), "another user can't touch this order");
  await undoPlace(U, man.result);
  ok(tables.supplier_orders.find((r) => r.id === id)!.status === "cancelled", "undo of a manual to-do cancels it");
  const retry = await execPlace(U, { storeOrderId: "o_man", supplier: "manual" });
  ok(retry.changed, "a cancelled attempt can be re-placed");

  // ---- preview + tools
  const pv = await previewPlace({ storeOrderId: "o_loss", supplier: "manual" });
  ok(pv.effects.some((e) => /at a loss/.test(e)), "preview warns before approval");
  const pv2 = await previewPlace({ storeOrderId: "o_ok", supplier: "cj" });
  ok(pv2.effects.some((e) => /UNPAID/.test(e)) && !JSON.stringify(pv2).includes("Main St"), "preview says unpaid, no address");

  ensureSkillsRegistered();
  const ctx = { userId: U, sessionId: "s" };
  let t: any = await runSkillTool("dropship_supplier_orders", {}, ctx);
  ok(t.ok && t.output.orders.length === 3 && !JSON.stringify(t.output).includes("Lagos"), "tool lists supplier orders without addresses");
  t = await runSkillTool("dropship_supplier_orders", { onlyProblems: true }, ctx);
  ok(t.ok && t.output.orders.every((o: any) => o.flags.length > 0), "tool onlyProblems filter");
  t = await runSkillTool("dropship_orders_needing_supplier", { days: 14 }, ctx);
  const ids = t.output.orders.map((o: any) => o.id);
  ok(t.ok && !ids.includes("o_ok") && !ids.includes("o_man") && !ids.includes("o_unpaid") && !ids.includes("o_cancel") && ids.includes("o_loss"), "needing-supplier: excludes covered, unpaid and cancelled orders");
  t = await runSkillTool("dropship_supplier_orders", {}, { userId: null, sessionId: "s" });
  ok(!t.ok, "tool needs a signed-in user");
})().catch((e) => { console.error("CRASH", e); process.exit(1); });
