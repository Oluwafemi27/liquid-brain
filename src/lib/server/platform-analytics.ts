import "@tanstack/react-start/server-only";
import type { ConnectionHealth, PlatformAnalytics } from "@/lib/aduf-types";
import { PLATFORM_NAMES } from "@/lib/permissions-catalog";
import { monthKey, toUsdWith, usdRates, windowMonths } from "./business-data";
import { checkConnections } from "./connection-health";
import { getSupabaseAdmin } from "./supabase";

type Row = Record<string, unknown>;
const usdFmt = (n: number) =>
  Math.abs(n) >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${Math.round(n)}`;

/** One entry per connected platform (plus uploads): real numbers from what was imported through
 *  it, or an honest "connected, nothing imported yet" — never invented figures. */
export async function getPlatformAnalytics(userId: string): Promise<PlatformAnalytics[]> {
  const db = getSupabaseAdmin();
  if (!db) return [];
  const now = new Date();
  const months = windowMonths(now);
  const [health, imports, records, traffic, rates] = await Promise.all([
    checkConnections().catch(() => [] as ConnectionHealth[]),
    db
      .from("data_imports")
      .select("id, source, kind, label, synced_at, last_error")
      .eq("user_id", userId),
    db
      .from("business_records")
      .select("import_id, kind, occurred_on, amount, currency, channel, stage")
      .eq("user_id", userId)
      .limit(50_000),
    db
      .from("traffic_snapshots")
      .select("import_id, month, channel, sessions, key_events, revenue, currency")
      .eq("user_id", userId)
      .limit(5_000),
    usdRates(),
  ]);
  const toUsd = toUsdWith(rates);
  const importRows = (imports.data ?? []) as Row[];
  const sourceOf = new Map(importRows.map((r) => [r["id"] as string, r["source"] as string]));
  const healthBy = new Map(health.map((h) => [h.id, h]));

  const platformIds = new Set<string>([
    ...health.map((h) => h.id),
    ...importRows.map((r) => r["source"] as string),
  ]);
  const out: PlatformAnalytics[] = [];

  for (const id of platformIds) {
    const mine = importRows.filter((r) => r["source"] === id);
    const lastSyncAt =
      mine
        .map((r) => r["synced_at"] as string)
        .sort()
        .at(-1) ?? null;
    const base = {
      id,
      name: PLATFORM_NAMES[id] ?? id,
      health: healthBy.get(id) ?? null,
      lastSyncAt,
      months: [] as PlatformAnalytics["months"],
      seriesLabels: { a: "" } as PlatformAnalytics["seriesLabels"],
      breakdown: [] as PlatformAnalytics["breakdown"],
      breakdownLabel: "",
    };
    if (mine.length === 0) {
      out.push({
        ...base,
        hasData: false,
        kpis: [],
        note: "Connected, but nothing has been imported from it yet. Import data on the Analytics page to see numbers here.",
      });
      continue;
    }

    if (id === "ga") {
      const t = ((traffic.data ?? []) as Row[]).filter(
        (r) => sourceOf.get(r["import_id"] as string) === "ga",
      );
      const totals = t.filter((r) => r["channel"] === null);
      const sessions = totals.reduce((s, r) => s + Number(r["sessions"]), 0);
      const events = totals.reduce((s, r) => s + Number(r["key_events"]), 0);
      const revenue = totals.reduce(
        (s, r) => s + toUsd(Number(r["revenue"]), r["currency"] as string),
        0,
      );
      const byChannel = new Map<string, number>();
      for (const r of t.filter((x) => x["channel"] !== null))
        byChannel.set(
          r["channel"] as string,
          (byChannel.get(r["channel"] as string) ?? 0) + Number(r["sessions"]),
        );
      out.push({
        ...base,
        hasData: true,
        kpis: [
          {
            label: "Sessions (6 mo)",
            value: sessions.toLocaleString(),
            hint: "Visits to your website",
          },
          {
            label: "Key events",
            value: events.toLocaleString(),
            hint: "Actions you marked as important, like sign-ups",
          },
          {
            label: "Event rate",
            value: sessions ? `${((events / sessions) * 100).toFixed(1)}%` : "—",
            hint: "Key events ÷ sessions",
          },
          { label: "Purchase revenue", value: usdFmt(revenue), hint: "As recorded by Analytics" },
        ],
        months: months.map((m) => ({
          month: m.label,
          a: totals
            .filter((r) => monthKey(r["month"] as string) === m.key)
            .reduce((s, r) => s + Number(r["sessions"]), 0),
          b: totals
            .filter((r) => monthKey(r["month"] as string) === m.key)
            .reduce((s, r) => s + Number(r["key_events"]), 0),
        })),
        seriesLabels: { a: "Sessions", b: "Key events" },
        breakdown: [...byChannel]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([name, value]) => ({ name, value })),
        breakdownLabel: "Sessions by channel",
      });
      continue;
    }

    // Everything else (Sheets, Drive, Gmail, uploads) contributes records.
    const mineIds = new Set(mine.map((r) => r["id"] as string));
    const recs = ((records.data ?? []) as Row[]).filter((r) =>
      mineIds.has(r["import_id"] as string),
    );
    const sales = recs.filter((r) => r["kind"] === "sale");
    const leads = recs.filter((r) => r["kind"] === "lead");
    const deals = recs.filter((r) => r["kind"] === "deal");
    const customers = recs.filter((r) => r["kind"] === "customer");
    const salesTotal = sales.reduce(
      (s, r) => s + toUsd(Number(r["amount"] ?? 0), r["currency"] as string),
      0,
    );
    const kpis: PlatformAnalytics["kpis"] = [];
    if (sales.length)
      kpis.push({
        label: "Sales",
        value: usdFmt(salesTotal),
        hint: `${sales.length.toLocaleString()} orders imported`,
      });
    if (leads.length)
      kpis.push({
        label: "Leads",
        value: leads.length.toLocaleString(),
        hint: id === "gmail" ? "New people who emailed you" : "Imported leads",
      });
    if (customers.length)
      kpis.push({ label: "Customers", value: customers.length.toLocaleString() });
    if (deals.length)
      kpis.push({
        label: "Pipeline",
        value: usdFmt(
          deals.reduce((s, r) => s + toUsd(Number(r["amount"] ?? 0), r["currency"] as string), 0),
        ),
        hint: `${deals.length} deals`,
      });
    const failing = mine.find((r) => r["last_error"]);
    const byChannel = new Map<string, number>();
    for (const r of sales)
      if (r["channel"])
        byChannel.set(
          r["channel"] as string,
          (byChannel.get(r["channel"] as string) ?? 0) +
            toUsd(Number(r["amount"] ?? 0), r["currency"] as string),
        );
    out.push({
      ...base,
      hasData: kpis.length > 0,
      kpis,
      months: months.map((m) => ({
        month: m.label,
        a: Math.round(
          sales
            .filter((r) => r["occurred_on"] && monthKey(r["occurred_on"] as string) === m.key)
            .reduce((s, r) => s + toUsd(Number(r["amount"] ?? 0), r["currency"] as string), 0),
        ),
        b: leads.filter((r) => r["occurred_on"] && monthKey(r["occurred_on"] as string) === m.key)
          .length,
      })),
      seriesLabels: sales.length
        ? { a: "Sales (USD)", ...(leads.length ? { b: "Leads" } : {}) }
        : { a: "", b: "Leads" },
      breakdown: [...byChannel]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([name, value]) => ({ name, value: Math.round(value) })),
      breakdownLabel: "Sales by channel (USD)",
      ...(failing ? { note: `Last sync failed: ${failing["last_error"] as string}` } : {}),
    });
  }
  return out.sort((a, b) => Number(b.hasData) - Number(a.hasData) || a.name.localeCompare(b.name));
}
