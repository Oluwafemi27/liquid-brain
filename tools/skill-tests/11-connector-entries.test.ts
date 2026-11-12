import { buildEntries, categoryCounts, filterEntries } from "@/lib/connector-entries";

const ok = (c: unknown, m: string) => { if (!c) { console.error("FAIL", m); process.exit(1); } console.log("ok  ", m); };

const sources = [
  { id: "paystack", name: "Paystack", category: "Payments", connected: true },
  { id: "google_sheets", name: "Google Sheets", category: "Productivity", connected: false },
  { id: "telegram", name: "Telegram", category: "Messaging", connected: false },
];
const defs = { paystack: { id: "paystack", name: "Paystack", category: "Payments", auth: "key", blurb: "Import payments.", popular: true } } as any;
const apps = Array.from({ length: 1200 }, (_, i) => ({
  slug: `app${i}`, name: `App ${i}`, logo: null, description: i % 10 === 0 ? "sends invoices" : "", categories: [i % 3 === 0 ? "CRM" : "Developer Tools"],
  access: i % 2 ? "managed" : "own",
})) as any;
apps.push({ slug: "slack", name: "Slack", logo: null, description: "team chat", categories: ["Communication"], access: "managed" });
apps.push({ slug: "google_sheets2", name: "Google Sheets", logo: null, description: "", categories: ["Productivity"], access: "managed" });
const board = { apps, connections: [{ id: "c1", toolkit: "slack" }, { id: "c2", toolkit: "ghost_app" }] };

const all = buildEntries(sources as any, defs, board);
ok(all.length === 3 + 1200 + 1 + 1, "built-in + composio + an orphan connection are all listed; the duplicate Google Sheets is dropped");
ok(all.filter((e) => e.name === "Google Sheets").length === 1 && all.find((e) => e.name === "Google Sheets")!.origin === "builtin", "when both offer an app, the built-in one wins");
ok(all[0]!.connected && all.slice(0, 3).every((e) => e.connected), "connected apps sort first (paystack, slack, orphan)");
ok(all.find((e) => e.id === "slack")!.connectionId === "c1", "composio connection id is attached");
ok(all.find((e) => e.id === "app1")!.setup === "one-click" && all.find((e) => e.id === "app2")!.setup === "own-app", "setup type reflects managed vs own app");

const connected = filterEntries(all, { query: "", tab: "connected", category: "All" });
ok(connected.length === 3 && connected.every((e) => e.connected), "Connected tab shows only connected apps");
const available = filterEntries(all, { query: "", tab: "available", category: "All" });
ok(available.length === all.length - 3 && !available.some((e) => e.connected), "Available tab hides connected apps");
const q = filterEntries(all, { query: "slack", tab: "all", category: "All" });
ok(q[0]!.id === "slack", "search finds an app by name first");
const byDesc = filterEntries(all, { query: "invoices", tab: "all", category: "All" });
ok(byDesc.length === 120 && byDesc.every((e) => e.description.includes("invoices")), "search also matches descriptions");
const crm = filterEntries(all, { query: "", tab: "available", category: "CRM" });
ok(crm.length === 400 && crm.every((e) => e.categories.includes("CRM")), "category filter narrows 1,200 apps to the right group");
const none = filterEntries(all, { query: "zzzzqqq", tab: "all", category: "All" });
ok(none.length === 0, "no match returns an empty list");
const cats = categoryCounts(all);
ok(cats[0]!.name === "Developer Tools" && cats[0]!.count === 800, "categories are counted and sorted by size");
const t0 = Date.now();
for (let i = 0; i < 50; i++) filterEntries(all, { query: "app1", tab: "all", category: "All" });
ok(Date.now() - t0 < 1500, "filtering 1,200 apps 50 times is fast");
console.log("done");
