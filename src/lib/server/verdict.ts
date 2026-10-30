import "@tanstack/react-start/server-only";
import type {
  ConnectionHealth,
  Confidence,
  DailyVerdict,
  OwnerSettings,
  SourceRef,
  VerdictItem,
  VerdictStatus,
} from "@/lib/aduf-types";
import { ageLabel, makeSource } from "@/lib/sources";
import { listPendingActions } from "./actions";
import { toUsdWith, usdRates } from "./business-data";
import { checkConnections } from "./connection-health";
import { getOwnerSettings } from "./owner-settings";
import { getSupabaseAdmin } from "./supabase";

// ------------------------------------------------------------------ inputs

export interface VerdictInput {
  now: Date;
  settings: Pick<OwnerSettings, "salesDropPct" | "failedRunsThreshold">;
  pending: { count: number; overLimit: number };
  health: ConnectionHealth[];
  goals: {
    title: string;
    current: number;
    target: number;
    due: string | null;
    createdAt: string;
    updatedAt: string | null;
  }[];
  automations: { total: number; enabled: number };
  runs24h: { total: number; failed: number; lastAt: string | null };
  /** Sales in USD over the last 30 days vs the 30 before; null when no sale records exist. */
  sales: {
    last30: number;
    prev30: number;
    nLast: number;
    nPrev: number;
    latestRecordAt: string | null;
    latestImportAt: string | null;
  } | null;
  imports: { label: string; source: string; syncedAt: string }[];
}

const LEVEL_ORDER = { act: 0, watch: 1, ok: 2 } as const;

/** Parses the free-text due dates people type ("Dec 31", "2026-12-31"). Null when unusable. */
export function parseDue(due: string | null, now: Date): Date | null {
  if (!due || /^(not set|none|n\/a|-|—|tbd)$/i.test(due.trim())) return null;
  const hasYear = /\b(19|20)\d{2}\b/.test(due);
  let d = new Date(hasYear ? due : `${due} ${now.getFullYear()}`);
  if (Number.isNaN(d.getTime())) return null;
  // "Jan 15" typed in December means next January.
  if (!hasYear && d.getTime() < now.getTime() - 180 * 86_400_000)
    d = new Date(d.getFullYear() + 1, d.getMonth(), d.getDate());
  return d;
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const confidenceRank: Record<Confidence, number> = { high: 2, medium: 1, low: 0 };
const minConfidence = (list: Confidence[]): Confidence =>
  list.reduce<Confidence>((lo, c) => (confidenceRank[c] < confidenceRank[lo] ? c : lo), "high");

/** Pure: everything the verdict says, derived from the inputs and nothing else. */
export function computeVerdict(i: VerdictInput): DailyVerdict {
  const { now } = i;
  const items: VerdictItem[] = [];
  let judged = 0; // checks that actually had data behind them

  // 1. Connections
  const connSource = (h: ConnectionHealth): SourceRef =>
    makeSource(
      `${h.name} connection`,
      "/settings",
      h.checkedAt,
      1,
      h.method === "token-only" ? "Saved login only — not checked live" : undefined,
      now,
    );
  if (i.health.length > 0) judged += 1;
  for (const h of i.health) {
    if (h.state === "broken") {
      items.push({
        id: `health:${h.id}`,
        level: "act",
        text: `${h.name} isn't working.`,
        why: "Numbers that come from it may be wrong or out of date.",
        suggestion: h.actionLabel ? `${h.actionLabel}. ${h.message}` : h.message,
        confidence: h.method === "live-check" ? "high" : "medium",
        sources: [connSource(h)],
        href: h.actionHref ?? "/settings",
      });
    } else if (h.state === "delayed") {
      items.push({
        id: `health:${h.id}`,
        level: "watch",
        text: `${h.name} is running behind.`,
        why: "What you see from it may not include the latest activity.",
        suggestion: h.message,
        confidence: "medium",
        sources: [connSource(h)],
        href: h.actionHref ?? "/settings",
      });
    }
  }

  // 2. Approvals waiting
  if (i.pending.count > 0) {
    items.push({
      id: "approvals",
      level: "watch",
      text: `${plural(i.pending.count, "thing")} waiting for your OK.`,
      why: "ADUF won't do these until you approve them.",
      suggestion:
        i.pending.overLimit > 0
          ? `${plural(i.pending.overLimit, "request")} go over your limits — they need an explicit “Approve anyway”.`
          : "Review them below — each shows what to expect.",
      confidence: "high",
      sources: [makeSource("Approval queue", "/", now.toISOString(), 1, undefined, now)],
      href: "/",
    });
  }

  // 3. Automations
  if (i.runs24h.total > 0) {
    judged += 1;
    const src = makeSource(
      "Automation run log",
      "/automations",
      i.runs24h.lastAt,
      2,
      undefined,
      now,
    );
    if (i.runs24h.failed >= i.settings.failedRunsThreshold) {
      items.push({
        id: "runs",
        level: "act",
        text: `${plural(i.runs24h.failed, "automation run")} failed in the last 24 hours.`,
        why: "Work you expected to happen automatically didn't.",
        suggestion: "Open Automations to see which one is failing and why.",
        confidence: "high",
        sources: [src],
        href: "/automations",
      });
    } else if (i.runs24h.failed > 0) {
      items.push({
        id: "runs",
        level: "watch",
        text: `${plural(i.runs24h.failed, "automation run")} failed in the last 24 hours.`,
        why: `Below your alert level of ${i.settings.failedRunsThreshold}, but worth a look.`,
        confidence: "high",
        sources: [src],
        href: "/automations",
      });
    }
  }

  // 4. Goals
  const goalsSrc = makeSource(
    "Your goals",
    "/goals",
    i.goals.reduce<string | null>(
      (m, g) => (g.updatedAt && (!m || g.updatedAt > m) ? g.updatedAt : m),
      null,
    ) ??
      i.goals[0]?.createdAt ??
      null,
    14,
    undefined,
    now,
  );
  let noDue = 0;
  for (const g of i.goals) {
    if (g.target > 0 && g.current >= g.target) continue; // done
    const due = parseDue(g.due, now);
    if (!due) {
      noDue += 1;
      continue;
    }
    judged += 1;
    const pct = g.target > 0 ? Math.round((g.current / g.target) * 100) : 0;
    const start = new Date(g.createdAt).getTime();
    const total = due.getTime() - start;
    const elapsed = total > 0 ? Math.min(1, Math.max(0, (now.getTime() - start) / total)) : 1;
    if (due.getTime() < now.getTime()) {
      items.push({
        id: `goal:${g.title}`,
        level: "watch",
        text: `“${g.title}” is past its due date at ${pct}%.`,
        why: "Its deadline has passed without the target being reached.",
        suggestion: "Move the due date or adjust the target.",
        confidence: "high",
        sources: [goalsSrc],
        href: "/goals",
      });
    } else if (pct / 100 < elapsed - 0.25 && elapsed > 0.2) {
      items.push({
        id: `goal:${g.title}`,
        level: "watch",
        text: `“${g.title}” is behind pace (${pct}% done, ${Math.round(elapsed * 100)}% of the time used).`,
        why: "At this rate it won't reach the target by the due date.",
        confidence: "medium",
        sources: [goalsSrc],
        href: "/goals",
      });
    }
  }
  if (noDue > 0) {
    items.push({
      id: "goals-nodue",
      level: "ok",
      text: `${plural(noDue, "goal")} ha${noDue === 1 ? "s" : "ve"} no due date, so I can't judge pace.`,
      why: "Without a deadline there's nothing to measure against.",
      confidence: "high",
      sources: [goalsSrc],
      href: "/goals",
    });
  }

  // 5. Sales trend + freshness
  if (i.sales) {
    const s = i.sales;
    const src = makeSource(
      "Imported sales records",
      "/analytics",
      s.latestImportAt,
      14,
      `${s.nLast + s.nPrev} orders in the two periods`,
      now,
    );
    const staleDays = s.latestRecordAt
      ? (now.getTime() - new Date(s.latestRecordAt).getTime()) / 86_400_000
      : null;
    if (staleDays !== null && staleDays > 14) {
      items.push({
        id: "stale",
        level: "watch",
        text: `Your latest sale on record is ${Math.floor(staleDays)} days old.`,
        why: "I can't tell how this month is going without newer data.",
        suggestion: "Import or re-sync your sales data.",
        confidence: "high",
        sources: [src],
        href: "/analytics",
      });
    } else if (s.nLast >= 5 && s.nPrev >= 5 && s.prev30 > 0) {
      judged += 1;
      const change = ((s.last30 - s.prev30) / s.prev30) * 100;
      const conf: Confidence =
        Math.min(s.nLast, s.nPrev) >= 30
          ? "high"
          : Math.min(s.nLast, s.nPrev) >= 10
            ? "medium"
            : "low";
      const note = `Based on ${s.nLast} orders vs ${s.nPrev} orders${conf === "low" ? " — a small sample, so treat it as a hint" : ""}.`;
      if (-change >= i.settings.salesDropPct * 2) {
        items.push({
          id: "sales",
          level: "act",
          text: `Sales are down ${Math.round(-change)}% on the previous 30 days.`,
          why: "That's a big drop — well past your alert level.",
          suggestion: note,
          confidence: conf,
          sources: [src],
          href: "/analytics",
        });
      } else if (-change >= i.settings.salesDropPct) {
        items.push({
          id: "sales",
          level: "watch",
          text: `Sales are down ${Math.round(-change)}% on the previous 30 days.`,
          why: `That crosses the ${i.settings.salesDropPct}% drop you asked to hear about.`,
          suggestion: note,
          confidence: conf,
          sources: [src],
          href: "/analytics",
        });
      } else {
        items.push({
          id: "sales",
          level: "ok",
          text:
            change >= 1
              ? `Sales are up ${Math.round(change)}% on the previous 30 days.`
              : "Sales are steady against the previous 30 days.",
          why: "Compared with the 30 days before.",
          suggestion: note,
          confidence: conf,
          sources: [src],
          href: "/analytics",
        });
      }
    }
  } else if (i.imports.length === 0) {
    items.push({
      id: "no-sales",
      level: "ok",
      text: "I have no sales data yet, so I can't comment on sales.",
      why: "Nothing has been imported.",
      suggestion: "Upload a CSV or connect a source on Analytics.",
      confidence: "high",
      sources: [makeSource("Imported sales records", "/analytics", null, 14, undefined, now)],
      href: "/analytics",
    });
  }

  items.sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]);

  const acts = items.filter((x) => x.level === "act");
  const watches = items.filter((x) => x.level === "watch");
  const hasAnything =
    judged > 0 ||
    i.goals.length > 0 ||
    i.automations.total > 0 ||
    i.imports.length > 0 ||
    i.health.length > 0;

  let status: VerdictStatus;
  let headline: string;
  let subline: string;
  if (acts.length > 0) {
    status = "red";
    headline = acts[0]!.text;
    subline =
      acts.length > 1
        ? `Plus ${plural(acts.length - 1 + watches.length, "other thing")} to look at.`
        : acts[0]!.why;
  } else if (watches.length > 0) {
    status = "amber";
    headline =
      watches.length === 1
        ? watches[0]!.text
        : `${plural(watches.length, "thing")} need a look today.`;
    subline =
      watches.length === 1
        ? watches[0]!.why
        : watches
            .slice(0, 2)
            .map((w) => w.text.replace(/\.$/, ""))
            .join(" · ");
  } else if (judged > 0) {
    status = "green";
    headline = "On track — nothing needs you today.";
    subline = `Checked ${plural(judged, "area")} against your real data.`;
  } else {
    status = "unknown";
    headline = hasAnything
      ? "Not enough to call it yet."
      : "I can't call it yet — connect one source to get your first read.";
    subline = "I only give a verdict when there's real data behind it.";
  }

  const judgedItems = items.filter(
    (x) => x.level !== "ok" || x.sources.some((s) => s.state !== "missing"),
  );
  const confidence = judged === 0 ? "low" : minConfidence(judgedItems.map((x) => x.confidence));
  const staleSources = items.flatMap((x) => x.sources).filter((s) => s.state === "stale").length;
  const confidenceNote =
    judged === 0
      ? "Nothing to base a judgement on yet."
      : staleSources > 0
        ? "Some of the data behind this is out of date."
        : confidence === "low"
          ? "Some checks rest on small samples."
          : "Based on current data.";

  return {
    status,
    headline,
    subline,
    items,
    pendingApprovals: i.pending.count,
    confidence,
    confidenceNote,
    generatedAt: now.toISOString(),
    hasData: hasAnything,
  };
}

// ------------------------------------------------------------------ loading

type Row = Record<string, unknown>;

export async function loadVerdictInput(
  userId: string,
  opts: { forceHealth?: boolean } = {},
): Promise<VerdictInput> {
  const db = getSupabaseAdmin();
  const now = new Date();
  const settings = await getOwnerSettings(userId);
  const empty: VerdictInput = {
    now,
    settings,
    pending: { count: 0, overLimit: 0 },
    health: [],
    goals: [],
    automations: { total: 0, enabled: 0 },
    runs24h: { total: 0, failed: 0, lastAt: null },
    sales: null,
    imports: [],
  };
  if (!db) return empty;

  const since24 = new Date(now.getTime() - 86_400_000).toISOString();
  const since60 = new Date(now.getTime() - 60 * 86_400_000).toISOString().slice(0, 10);
  const cut30 = new Date(now.getTime() - 30 * 86_400_000).toISOString().slice(0, 10);

  const [pending, health, goals, autos, runs, sales, imports, rates] = await Promise.all([
    listPendingActions(userId),
    checkConnections({ force: opts.forceHealth ?? false }).catch(() => [] as ConnectionHealth[]),
    db.from("goals").select("title, current, target, due, created_at").eq("user_id", userId),
    db.from("automations").select("id, enabled").eq("user_id", userId),
    db
      .from("automation_runs")
      .select("status, started_at")
      .eq("user_id", userId)
      .gte("started_at", since24)
      .order("started_at", { ascending: false })
      .limit(500),
    db
      .from("business_records")
      .select("occurred_on, amount, currency")
      .eq("user_id", userId)
      .eq("kind", "sale")
      .gte("occurred_on", since60)
      .limit(50_000),
    db.from("data_imports").select("label, source, synced_at, kind").eq("user_id", userId),
    usdRates(),
  ]);

  const toUsd = toUsdWith(rates);
  const saleRows = (sales.data ?? []) as Row[];
  let allSales: VerdictInput["sales"] = null;
  const hasSaleImport = (imports.data ?? []).some((r) => r["kind"] === "sale");
  if (hasSaleImport || saleRows.length > 0) {
    let last30 = 0,
      prev30 = 0,
      nLast = 0,
      nPrev = 0,
      latest: string | null = null;
    for (const r of saleRows) {
      const d = r["occurred_on"] as string;
      const v = toUsd(Number(r["amount"] ?? 0), r["currency"] as string);
      if (d >= cut30) {
        last30 += v;
        nLast += 1;
      } else {
        prev30 += v;
        nPrev += 1;
      }
      if (!latest || d > latest) latest = d;
    }
    // Latest record may predate the 60-day window entirely — look it up so "stale" is accurate.
    if (!latest) {
      const { data } = await db
        .from("business_records")
        .select("occurred_on")
        .eq("user_id", userId)
        .eq("kind", "sale")
        .order("occurred_on", { ascending: false })
        .limit(1);
      latest = (data?.[0]?.["occurred_on"] as string | undefined) ?? null;
    }
    const saleImports = (imports.data ?? [])
      .filter((r) => r["kind"] === "sale")
      .map((r) => r["synced_at"] as string)
      .sort();
    allSales = {
      last30,
      prev30,
      nLast,
      nPrev,
      latestRecordAt: latest,
      latestImportAt: saleImports.at(-1) ?? null,
    };
  }

  const runRows = (runs.data ?? []) as Row[];
  return {
    now,
    settings,
    pending: { count: pending.length, overLimit: pending.filter((p) => p.overLimit).length },
    health,
    goals: ((goals.data ?? []) as Row[]).map((g) => ({
      title: g["title"] as string,
      current: Number(g["current"]),
      target: Number(g["target"]),
      due: (g["due"] as string | null) ?? null,
      createdAt: g["created_at"] as string,
      updatedAt: null,
    })),
    automations: {
      total: autos.data?.length ?? 0,
      enabled: (autos.data ?? []).filter((a) => a["enabled"]).length,
    },
    runs24h: {
      total: runRows.length,
      failed: runRows.filter((r) => r["status"] !== "success").length,
      lastAt: (runRows[0]?.["started_at"] as string | undefined) ?? null,
    },
    sales: allSales,
    imports: ((imports.data ?? []) as Row[]).map((r) => ({
      label: r["label"] as string,
      source: r["source"] as string,
      syncedAt: r["synced_at"] as string,
    })),
  };
}

export async function getDailyVerdict(
  userId: string,
  opts: { forceHealth?: boolean } = {},
): Promise<DailyVerdict> {
  return computeVerdict(await loadVerdictInput(userId, opts));
}

// ------------------------------------------------------- chat "facts sheet"

export interface FactSource extends SourceRef {
  id: string;
}

/** What ADUF actually knows right now, numbered so chat answers can cite it ([S1]…).
 *  Missing/stale data is spelled out so the model says so instead of guessing. */
export async function buildFactsSheet(
  userId: string,
): Promise<{ text: string; sources: FactSource[] }> {
  const input = await loadVerdictInput(userId);
  const verdict = computeVerdict(input);
  const sources: FactSource[] = [];
  const lines: string[] = [];
  const add = (
    label: string,
    href: string,
    asOf: string | null,
    staleDays: number,
    body: string,
    note?: string,
  ) => {
    const id = `S${sources.length + 1}`;
    sources.push({ id, ...makeSource(label, href, asOf, staleDays, note, input.now) });
    lines.push(
      `[${id}] ${label} (${asOf ? `as of ${ageLabel(asOf, input.now)}` : "no data"}): ${body}`,
    );
  };

  add(
    "Today's verdict",
    "/",
    verdict.generatedAt,
    1,
    `${verdict.status.toUpperCase()} — ${verdict.headline} Confidence: ${verdict.confidence}.`,
  );
  if (input.sales) {
    const s = input.sales;
    add(
      "Sales records",
      "/analytics",
      s.latestImportAt,
      14,
      `last 30 days: $${Math.round(s.last30).toLocaleString()} from ${s.nLast} orders; previous 30 days: $${Math.round(s.prev30).toLocaleString()} from ${s.nPrev} orders; latest sale ${s.latestRecordAt ?? "unknown"}.`,
    );
  } else
    lines.push(
      "[NO DATA] Sales: nothing has been imported, so you cannot state any sales figures.",
    );
  if (input.goals.length) {
    add(
      "Goals",
      "/goals",
      input.goals[0]!.createdAt,
      30,
      input.goals
        .map(
          (g) =>
            `${g.title}: ${g.current}/${g.target}${g.due ? ` due ${g.due}` : " (no due date)"}`,
        )
        .join("; "),
    );
  } else lines.push("[NO DATA] Goals: none set.");
  if (input.automations.total) {
    add(
      "Automations",
      "/automations",
      input.runs24h.lastAt,
      7,
      `${input.automations.enabled}/${input.automations.total} on; last 24h: ${input.runs24h.total} runs, ${input.runs24h.failed} failed.`,
    );
  }
  if (input.health.length) {
    add(
      "Connections",
      "/settings",
      input.health[0]?.checkedAt ?? null,
      1,
      input.health
        .map((h) => `${h.name}: ${h.state}${h.state !== "live" ? ` (${h.message})` : ""}`)
        .join("; "),
    );
  } else lines.push("[NO DATA] Connections: none connected.");
  if (input.imports.length) {
    add(
      "Imported data",
      "/analytics",
      input.imports
        .map((x) => x.syncedAt)
        .sort()
        .at(-1) ?? null,
      14,
      input.imports.map((x) => `${x.label} (synced ${ageLabel(x.syncedAt, input.now)})`).join("; "),
    );
  }
  if (input.pending.count)
    add(
      "Approval queue",
      "/",
      input.now.toISOString(),
      1,
      `${input.pending.count} actions waiting for the owner's approval.`,
    );
  return { text: lines.join("\n"), sources };
}
