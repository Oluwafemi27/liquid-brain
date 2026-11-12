import { unitEconomics, floorPrice, recommendPrice, scoreProduct, rankProducts } from "@/skills/skill-dropship/engine";
import { execCreateProduct, execUpdatePrice, undoCreateProduct, undoUpdatePrice, previewUpdatePrice } from "@/skills/skill-dropship/actions";
import { riskFor, tierFor } from "@/lib/action-registry";
import { ensureSkillsRegistered, runSkillTool } from "@/skills";

const ok = (c: unknown, m: string) => { if (!c) { console.error("FAIL", m); process.exit(1); } console.log("ok  ", m); };
const near = (a: number, b: number, e = 0.011) => Math.abs(a - b) <= e;

(async () => {
  // --- engine math, hand-checked
  const cost = { productCost: 8, shippingCost: 4 };
  const e = unitEconomics(30, cost);
  ok(near(e.contributionBeforeAds, 15.33) && near(e.breakEvenRoas!, 1.96) && near(e.paymentFees, 1.17), "unit economics hand-check (30 / 8+4)");
  const withAds = unitEconomics(30, cost, { cpc: 0.5, conversionRate: 0.02 });
  ok(near(withAds.atAdCost!.cpa, 25) && withAds.atAdCost!.profitPerOrder < 0 && withAds.warnings.some((w) => /Loses money/.test(w)), "ad cost above break-even is flagged");
  ok(near(unitEconomics(30, cost, { conversionRate: 0.02 }).maxCpcAtBreakEven!, 0.31), "max CPC at break-even");
  ok(near(floorPrice(cost, 0.15), 15.95, 0.01), "floor price closed form");
  const atFloor = unitEconomics(floorPrice(cost, 0.15), cost);
  ok(near(atFloor.contributionMarginPct, 15, 0.1), "margin at floor == requested margin");
  let threw = false; try { unitEconomics(10, { productCost: 1, shippingCost: 1, paymentPct: 0.6, refundRate: 0.5 }); } catch { threw = true; }
  ok(threw, "impossible fee/refund combination rejected");
  threw = false; try { unitEconomics(-1, cost); } catch { threw = true; }
  ok(threw, "negative price rejected");

  // --- property: no strategy ever prices below the floor / margin
  let bad = 0, n = 0;
  const strategies = ["auto", "cost_plus", "competitive", "premium", "penetration", "dynamic"] as const;
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 3000; i++) {
    const c = { productCost: rnd() * 60, shippingCost: rnd() * 15, refundRate: rnd() * 0.2 };
    const comps = Array.from({ length: Math.floor(rnd() * 5) }, () => 3 + rnd() * 120);
    for (const s of strategies) {
      const r = recommendPrice({ cost: c, competitorPrices: comps, demandScore: rnd(), strategy: s });
      n++;
      if (r.price < r.floor - 1e-9 || r.economics.contributionMarginPct < 14.9 || !Number.isFinite(r.price)) bad++;
    }
  }
  ok(bad === 0, `${n} random recommendations never below break-even floor / 15% margin`);
  const aggressive = recommendPrice({ cost: { productCost: 20, shippingCost: 5 }, competitorPrices: [18, 20, 22], strategy: "penetration" });
  ok(aggressive.limitedByFloor && aggressive.price >= aggressive.floor && aggressive.notes.some((x) => /floor/.test(x)), "penetration below cost is lifted to floor with a note");
  ok(recommendPrice({ cost, competitorPrices: [], strategy: "competitive" }).notes.some((x) => /fell back/.test(x)), "competitive with no data says it fell back");
  ok(recommendPrice({ cost, strategy: "cost_plus" }).price % 1 > 0.98, "charm pricing ends in .99");

  // --- scoring
  const great = scoreProduct({ name: "A", cost: { productCost: 6, shippingCost: 2 }, expectedPrice: 34.99, orders: 8000, reviews: 900, rating: 4.7, supplierRating: 4.8, shippingDays: 9 });
  const loser = scoreProduct({ name: "B", cost: { productCost: 20, shippingCost: 9 }, expectedPrice: 24.99, orders: 5000, rating: 4.8, supplierRating: 4.9, shippingDays: 8 });
  const lowRated = scoreProduct({ name: "C", cost: { productCost: 5, shippingCost: 2 }, expectedPrice: 35, orders: 9000, rating: 3.5, shippingDays: 10 });
  const unknown = scoreProduct({ name: "D", cost: { productCost: 5, shippingCost: 2 }, expectedPrice: 35 });
  ok(great.verdict === "go" && great.confidence === "high", "strong product = go, high confidence");
  ok(loser.verdict === "skip" && loser.reasons.some((r) => /Loses money/.test(r)), "money-losing product skipped despite great ratings");
  ok(lowRated.verdict === "skip", "rating < 3.8 forces skip");
  ok(unknown.confidence === "low" && unknown.verdict !== "go", "no demand data => low confidence, never 'go'");
  ok(rankProducts([loser, great].map((x) => ({ name: x.name, cost: x.name === "A" ? { productCost: 6, shippingCost: 2 } : { productCost: 20, shippingCost: 9 }, expectedPrice: x.name === "A" ? 34.99 : 24.99, orders: 5000, rating: 4.7 })))[0]!.name === "A", "ranking sorts best first");

  // --- action tiers
  ok(tierFor("dropship_update_price", {}) === "approve" && riskFor("dropship_update_price", {}) === "money", "price change: always approval, money risk");
  ok(tierFor("dropship_create_product", {}) === "approve" && riskFor("dropship_create_product", {}) === "external", "create product: always approval");

  // --- Medusa flow against a mock server
  process.env.MEDUSA_BACKEND_URL = "https://store.example.com/"; process.env.MEDUSA_ADMIN_TOKEN = "sk_test";
  const db = new Map<string, any>(); const log: string[] = []; let auths = new Set<string>();
  globalThis.fetch = (async (url: any, init: any = {}) => {
    const u = new URL(String(url)); const m = init.method ?? "GET"; auths.add(init.headers?.authorization); log.push(`${m} ${u.pathname}`);
    const body = init.body ? JSON.parse(init.body) : null;
    if (m === "POST" && u.pathname === "/admin/products") {
      const id = "prod_1"; db.set(id, { id, title: body.title, status: body.status, metadata: body.metadata, variants: [{ id: "var_1", prices: body.variants[0].prices }] });
      return new Response(JSON.stringify({ product: db.get(id) }));
    }
    const mp = u.pathname.match(/^\/admin\/products\/([^/]+)(?:\/variants\/([^/]+))?$/);
    if (mp) {
      const p = db.get(mp[1]!);
      if (!p) return new Response("nf", { status: 404 });
      if (m === "GET") return new Response(JSON.stringify({ product: p }));
      if (m === "DELETE") { db.delete(mp[1]!); return new Response("{}"); }
      if (m === "POST" && mp[2]) { p.variants[0].prices = body.prices; return new Response("{}"); }
    }
    return new Response("bad", { status: 400 });
  }) as any;

  // below floor refused, nothing sent
  threw = false; try { await execCreateProduct({ title: "Lamp", currency: "USD", price: 10, productCost: 8, shippingCost: 4 }); } catch (x: any) { threw = /below break-even/.test(x.message); }
  ok(threw && log.length === 0, "create below break-even refused before any request");
  const created = await execCreateProduct({ title: "Lamp", currency: "USD", price: 29.99, productCost: 8, shippingCost: 4, supplierUrl: "https://ali.example/item/1" });
  ok(created.changed && db.get("prod_1").status === "draft" && db.get("prod_1").metadata.aduf_product_cost === 8 && [...auths][0] === "Basic sk_test", "creates DRAFT with cost metadata, Basic auth");
  ok(db.get("prod_1").variants[0].prices[0].amount === 29.99 && db.get("prod_1").variants[0].prices[0].currency_code === "usd", "price stored in major units, lowercase currency");

  threw = false; try { await execUpdatePrice({ productId: "prod_1", currency: "USD", newPrice: 12 }); } catch (x: any) { threw = /below break-even/.test(x.message); }
  ok(threw && db.get("prod_1").variants[0].prices[0].amount === 29.99, "price below floor refused, price unchanged");
  const up = await execUpdatePrice({ productId: "prod_1", currency: "USD", newPrice: 34.99 });
  ok(up.changed && db.get("prod_1").variants[0].prices[0].amount === 34.99 && up.result["prev"] === 29.99, "valid price change applied, previous recorded");
  await undoUpdatePrice(up.result);
  ok(db.get("prod_1").variants[0].prices[0].amount === 29.99, "undo restores previous price");
  const same = await execUpdatePrice({ productId: "prod_1", currency: "USD", newPrice: 29.99 });
  ok(!same.changed, "same price = no change");
  threw = false; try { await execUpdatePrice({ productId: "prod_1", currency: "EUR", newPrice: 40 }); } catch (x: any) { threw = /in USD/.test(x.message); }
  ok(threw, "currency mismatch with recorded costs refused");
  db.set("prod_2", { id: "prod_2", title: "Foreign", status: "published", metadata: {}, variants: [{ id: "v", prices: [{ currency_code: "usd", amount: 10 }] }] });
  threw = false; try { await execUpdatePrice({ productId: "prod_2", currency: "USD", newPrice: 99 }); } catch (x: any) { threw = /no cost on file/.test(x.message); }
  ok(threw, "product with no cost data is never repriced");
  const pv = await previewUpdatePrice({ productId: "prod_1", currency: "USD", newPrice: 12 });
  ok(pv.effects.some((x) => /Below break-even/.test(x)), "preview warns when below floor");
  await undoCreateProduct(created.result);
  ok(!db.has("prod_1"), "undo deletes a draft product");
  db.set("prod_3", { id: "prod_3", status: "published", metadata: {}, variants: [] });
  threw = false; try { await undoCreateProduct({ entityId: "prod_3" }); } catch { threw = true; }
  ok(threw && db.has("prod_3"), "undo refuses to delete a published product");

  // --- skill tools through the registry
  ensureSkillsRegistered();
  let r: any = await runSkillTool("dropship_unit_economics", { price: 30, cost: { productCost: 8, shippingCost: 4 } }, { userId: null, sessionId: "s" });
  ok(r.ok && near(r.output.contributionBeforeAds, 15.33), "registry: unit economics tool");
  r = await runSkillTool("dropship_price_recommendation", { cost: { productCost: 8, shippingCost: 4 }, competitorPrices: [29, 35] }, { userId: null, sessionId: "s" });
  ok(r.ok && r.output.price >= r.output.floor, "registry: price recommendation tool");
  r = await runSkillTool("dropship_score_products", { products: [{ name: "X", cost: { productCost: 6, shippingCost: 2 }, expectedPrice: 30, orders: 3000, rating: 4.6 }] }, { userId: null, sessionId: "s" });
  ok(r.ok && r.output.ranked.length === 1, "registry: scoring tool");
  r = await runSkillTool("dropship_unit_economics", { price: 30, cost: { productCost: -1, shippingCost: 4 } }, { userId: null, sessionId: "s" });
  ok(!r.ok && r.code === "invalid", "registry: negative cost rejected");
  db.set("pX", { id: "pX", title: "Mine", status: "draft", metadata: { aduf_product_cost: 8, aduf_shipping_cost: 4, aduf_currency: "usd" }, variants: [{ id: "v1", prices: [{ currency_code: "usd", amount: 30 }] }] });
  globalThis.fetch = (async (url: any) => { const u = new URL(String(url)); return new Response(JSON.stringify(u.pathname === "/admin/orders" ? { orders: [{ id: "o1", created_at: new Date(Date.now() - 5 * 86400000).toISOString(), total: 30, currency_code: "usd", fulfillment_status: "not_fulfilled", payment_status: "captured" }, { id: "o2", created_at: new Date().toISOString(), total: 20, currency_code: "usd", fulfillment_status: "shipped", payment_status: "awaiting" }] } : { products: [...db.values()], count: db.size })); }) as any;
  r = await runSkillTool("dropship_store_overview", { days: 30 }, { userId: null, sessionId: "s" });
  ok(r.ok && r.output.orders.count === 2 && r.output.orders.revenue.usd === 50 && r.output.orders.unfulfilledOver3Days === 1 && r.output.orders.notPaid === 1 && r.output.withoutCostData.includes("Foreign") && !r.output.withoutCostData.includes("Mine"), "registry: store overview aggregates orders");
  r = await runSkillTool("dropship_store_products", {}, { userId: null, sessionId: "s" });
  ok(r.ok && r.output.products.find((p: any) => p.id === "pX").breakEvenFloor > 0, "registry: store products include break-even floor");
})().catch((e) => { console.error("CRASH", e); process.exit(1); });
