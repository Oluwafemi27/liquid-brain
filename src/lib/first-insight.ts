import type { BusinessData, SourceRef } from "@/lib/aduf-types";
import { makeSource } from "@/lib/sources";

export interface FirstInsight {
  id: string;
  text: string;
  /** How sure this is, in plain words. */
  basis: string;
  source: SourceRef;
}

const usd = (n: number) =>
  Math.abs(n) >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${Math.round(n)}`;

/** Plain-language observations computed ONLY from what's been imported — the "first value" shown
 *  right after the first connection. Never guesses; says nothing it can't back up. */
export function firstInsights(
  d: Pick<
    BusinessData,
    | "series"
    | "channelRevenue"
    | "channelPeriod"
    | "counts"
    | "salesFrom"
    | "leadsFrom"
    | "imports"
    | "topCustomers"
  >,
): FirstInsight[] {
  const out: FirstInsight[] = [];
  const latest =
    d.imports
      .map((i) => i.createdAt)
      .sort()
      .at(-1) ?? null;
  const src = makeSource("Your imported data", "/analytics", latest, 14);
  const s = d.series;

  if (d.salesFrom && s.length >= 2) {
    const best = s.reduce((m, p) => (p.sales > m.sales ? p : m), s[0]!);
    if (best.sales > 0) {
      out.push({
        id: "best",
        text: `${best.month} was your strongest month of the last six, at ${usd(best.sales)} in sales.`,
        basis: `From ${d.counts.sales.toLocaleString()} imported sale${d.counts.sales === 1 ? "" : "s"}.`,
        source: src,
      });
    }
    const done = s.slice(0, -1); // the current month is incomplete, so compare finished months only
    const a = done.at(-2);
    const b = done.at(-1);
    if (a && b && a.sales > 0 && b.sales > 0) {
      const ch = Math.round(((b.sales - a.sales) / a.sales) * 100);
      out.push({
        id: "mom",
        text: `${b.month} sales were ${ch >= 0 ? "up" : "down"} ${Math.abs(ch)}% on ${a.month} (${usd(b.sales)} vs ${usd(a.sales)}).`,
        basis: "Compares two finished months.",
        source: src,
      });
    }
  }
  const top = d.channelRevenue[0];
  if (top && top.channel !== "Other" && top.value >= 40) {
    out.push({
      id: "channel",
      text: `${top.channel} brings in ${top.value}% of your revenue (${d.channelPeriod.toLowerCase()}).`,
      basis: "Relying on one source is a risk if it dries up.",
      source: src,
    });
  }
  const tc = d.topCustomers[0];
  if (tc)
    out.push({
      id: "customer",
      text: `Your top customer is ${tc.name}, worth ${usd(tc.ltv)} across ${tc.orders} order${tc.orders === 1 ? "" : "s"}.`,
      basis: "From your imported sales and customers.",
      source: src,
    });
  if (d.leadsFrom && s.length) {
    const cur = s.at(-1)!;
    if (cur.leads > 0)
      out.push({
        id: "leads",
        text: `${cur.leads.toLocaleString()} new lead${cur.leads === 1 ? "" : "s"} so far in ${cur.month}.`,
        basis:
          d.leadsFrom === "ga"
            ? "Counts Google Analytics key events (sign-ups and similar)."
            : "Counts leads you imported.",
        source: src,
      });
  }
  return out.slice(0, 4);
}
