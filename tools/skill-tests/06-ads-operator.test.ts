import { diagnose } from "@/skills/skill-ads-operator/rules";
import { tables } from "@/lib/server/supabase";
import { ensureSkillsRegistered, runSkillTool, buildSkillToolsBlock } from "@/skills";
import { unitEconomics } from "@/skills/skill-dropship/engine";
import { withBilling } from "@/lib/server/billing";
// Skill tools find the signed-in person through the billing context, exactly as in the chat route.
const asUser = (uid: string, name: string, input: any, ctx: any) =>
  withBilling({ userId: uid, feature: "test" }, () => runSkillTool(name, input, ctx));
const ok = (c: unknown, m: string) => {
  if (!c) {
    console.error("FAIL", m);
    process.exit(1);
  }
  console.log("ok  ", m);
};
const row = (o: any) => ({
  id: "c",
  name: "C",
  level: "campaign",
  spend: 100,
  impressions: 20000,
  clicks: 400,
  ctr: 2,
  cpc: 0.25,
  frequency: 1.5,
  purchases: 0,
  revenue: 0,
  ...o,
});
const eco = (() => {
  const e = unitEconomics(30, { productCost: 8, shippingCost: 4 });
  return { breakEvenCpa: e.breakEvenCpa!, breakEvenRoas: e.breakEvenRoas! };
})(); // cpa 15.33, roas 1.96
const one = (o: any, e: any = eco) => diagnose([row(o)], e)[0]!;
(async () => {
  ok(one({ impressions: 500 }).verdict === "wait", "under 1000 impressions: wait");
  ok(
    one({ purchases: 0, spend: 20 }).verdict === "wait",
    "no sales but spend < 2x break-even CPA: wait",
  );
  ok(
    one({ purchases: 0, spend: 40 }).verdict === "pause" &&
      one({ purchases: 0, spend: 40 }).suggestedBudgetChangePct === -20,
    "no sales after 2x break-even CPA: pause",
  );
  ok(
    one({ purchases: 2, revenue: 60, spend: 20 }).verdict === "wait",
    "fewer than 3 sales: never judged",
  );
  ok(
    one({ purchases: 10, revenue: 200, spend: 150 }).verdict === "pause",
    "10 sales, ROAS 1.33 < 80% of 1.96: pause",
  );
  ok(
    one({ purchases: 4, revenue: 150, spend: 150 }).verdict === "fix",
    "4 sales, ROAS 1.0: fix (not enough sales to pause)",
  );
  ok(
    one({ purchases: 12, revenue: 360, spend: 120 }).verdict === "scale" &&
      one({ purchases: 12, revenue: 360, spend: 120 }).suggestedBudgetChangePct === 20,
    "12 sales ROAS 3.0: scale, capped at +20%",
  );
  ok(
    one({ purchases: 12, revenue: 360, spend: 120, frequency: 4.2 }).verdict !== "scale",
    "winning but fatigued: not scaled",
  );
  ok(
    one({ purchases: 6, revenue: 130, spend: 60 }).verdict === "keep",
    "just above break-even: keep",
  );
  ok(
    one({ purchases: 6, revenue: 110, spend: 60 }).verdict === "fix",
    "just under break-even: fix, no budget change",
  );
  ok(
    one({ purchases: 12, revenue: 360, spend: 120 }, null).verdict === "wait" &&
      one({ purchases: 12, revenue: 360, spend: 120 }, null).reasons[0]!.includes("No break-even"),
    "no economics: reports only, never judges profit",
  );
  const all = diagnose(
    [
      row({ purchases: 12, revenue: 360, spend: 120 }),
      row({ purchases: 40, revenue: 1400, spend: 500, id: "d" }),
    ],
    eco,
  );
  ok(
    all.every((d) => Math.abs(d.suggestedBudgetChangePct) <= 20),
    "no suggestion ever exceeds 20%",
  );
  ok(
    one({ purchases: 25, revenue: 900, spend: 300 }).confidence === "high" &&
      one({ purchases: 6, revenue: 130, spend: 60 }).confidence === "medium",
    "confidence follows sale count",
  );

  // ---- Meta client
  delete process.env.META_ADS_ACCESS_TOKEN;
  delete process.env.META_CLIENT_ID;
  ensureSkillsRegistered();
  ok(!buildSkillToolsBlock().includes("ads_report"), "ads tools hidden with no Meta credentials");
  process.env.META_CLIENT_ID = "app";
  ok(
    buildSkillToolsBlock().includes("ads_diagnose") &&
      buildSkillToolsBlock().includes("never changes") === false,
    "ads tools offered once Meta app is configured",
  );
  const calls: { url: URL; auth: string | null }[] = [];
  globalThis.fetch = (async (url: any, init: any = {}) => {
    const u = new URL(String(url));
    calls.push({ url: u, auth: init.headers?.authorization ?? null });
    if (u.pathname.endsWith("/me/adaccounts"))
      return new Response(
        JSON.stringify({
          data: [{ id: "act_123456", name: "Shop", account_status: 1, currency: "USD" }],
        }),
      );
    if (u.pathname.endsWith("/insights"))
      return new Response(
        JSON.stringify({
          data: [
            {
              campaign_id: "1",
              campaign_name: "Lamp",
              spend: "120.50",
              impressions: "20000",
              clicks: "400",
              ctr: "2.0",
              cpc: "0.30",
              frequency: "1.4",
              actions: [
                { action_type: "link_click", value: "400" },
                { action_type: "purchase", value: "12" },
                { action_type: "omni_purchase", value: "12" },
                { action_type: "offsite_conversion.fb_pixel_purchase", value: "12" },
              ],
              action_values: [
                { action_type: "purchase", value: "360" },
                { action_type: "omni_purchase", value: "360" },
              ],
            },
            {
              campaign_id: "2",
              campaign_name: "Dead",
              spend: "50",
              impressions: "9000",
              clicks: "70",
              ctr: "0.7",
              cpc: "0.7",
              frequency: "1.1",
            },
          ],
        }),
      );
    if (u.pathname.endsWith("/campaigns"))
      return new Response(
        JSON.stringify({ data: [{ id: "1", effective_status: "ACTIVE", daily_budget: "2500" }] }),
      );
    if (u.pathname.endsWith("/bad"))
      return new Response(JSON.stringify({ error: { code: 190, message: "expired" } }), {
        status: 400,
      });
    return new Response("nf", { status: 404 });
  }) as any;
  const ctx = { userId: "u", sessionId: "s" };

  let r: any = await asUser("u", "ads_accounts", {}, ctx);
  ok(!r.ok && /isn't connected/.test(r.message), "not connected -> clear message");
  tables.connectors.push({
    workspace_id: "u",
    id: "meta",
    connected: true,
    access_token: "tok-from-connector",
  });
  r = await asUser("u", "ads_accounts", {}, ctx);
  ok(
    r.ok &&
      r.output.accounts[0].id === "act_123456" &&
      calls.at(-1)!.auth === "Bearer tok-from-connector" &&
      !calls.at(-1)!.url.search.includes("tok-from"),
    "uses the connected login; token in header, not URL",
  );
  r = await asUser("someone-else", "ads_accounts", {}, ctx);
  ok(
    !r.ok && /isn't connected/.test(r.message),
    "another account cannot use this person's Meta login",
  );
  process.env.META_ADS_ACCESS_TOKEN = "sys-token";
  r = await asUser("u", "ads_report", { accountId: "123456", days: 7 }, ctx);
  const ins = calls.find((c) => c.url.pathname.endsWith("/insights"))!;
  ok(
    r.ok &&
      ins.auth === "Bearer tok-from-connector" &&
      ins.url.pathname.includes("/act_123456/") &&
      JSON.parse(ins.url.searchParams.get("time_range")!).since <
        JSON.parse(ins.url.searchParams.get("time_range")!).until,
    "a server-wide token is never used (own login only); act_ prefix added; time_range set",
  );
  const c1 = r.output.rows[0];
  ok(
    c1.purchases === 12 && c1.revenue === 360 && c1.roas === 2.99 && c1.cpa === 10.04,
    "purchases not triple-counted across action types (12, not 36)",
  );
  ok(
    c1.budget.dailyBudget === 25 && r.output.rows[1].purchases === 0 && r.output.rows[1].roas === 0,
    "budget cents -> major units; campaign with no actions = 0 sales",
  );
  ok(r.output.totals.spend === 170.5 && r.output.totals.purchases === 12, "totals add up");
  r = await asUser("u", "ads_report", { accountId: "abc; drop table", days: 7 }, ctx);
  ok(!r.ok && r.code === "invalid", "malformed account id rejected before any request");
  r = await asUser(
    "u",
    "ads_diagnose",
    { accountId: "act_123456", days: 14, product: { price: 30, productCost: 8, shippingCost: 4 } },
    ctx,
  );
  ok(
    r.ok &&
      r.output.basis.breakEvenRoas === 1.96 &&
      r.output.campaigns[0].verdict === "scale" &&
      r.output.campaigns[1].verdict === "pause",
    "diagnose joins ads with unit economics: Lamp=scale, Dead=pause",
  );
  r = await asUser(
    "u",
    "ads_diagnose",
    { accountId: "123456", days: 14, product: { price: 12, productCost: 8, shippingCost: 4 } },
    ctx,
  );
  ok(
    r.ok && r.output.basis === null && /loses money on every sale/.test(r.output.note),
    "unprofitable product: says no ad spend can work",
  );
  // the skill has no write tools at all
  const writes = ["ads_set_budget", "ads_pause_campaign", "ads_create_campaign"];
  for (const w of writes) {
    r = await runSkillTool(w, {}, ctx);
    if (r.ok || r.code !== "unknown") {
      console.error("FAIL write tool exists", w);
      process.exit(1);
    }
  }
  ok(true, "no tool exists that can change an ad account");
})().catch((e) => {
  console.error("CRASH", e);
  process.exit(1);
});
