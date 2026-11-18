import { requireRoom } from "./billing";
import "@tanstack/react-start/server-only";
import type {
  BusinessData,
  ChannelRevenue,
  CrmDeal,
  FunnelStage,
  ImportRecordKind,
  ImportSource,
  ImportSummary,
  SeriesPoint,
  TopCustomer,
  Trend,
} from "@/lib/aduf-types";
import {
  normalizeRows,
  type DateOrder,
  type ImportKind,
  type Mapping,
  type ParsedRecord,
} from "@/lib/import-mapping";
import { ImportError } from "./google-auth";
import type { GaMonth, GmailLead } from "./google-sources";
import { getKv } from "./kv";
import { getSupabaseAdmin } from "./supabase";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WINDOW_MONTHS = 6;
const CHUNK = 500;

function requireDb() {
  const db = getSupabaseAdmin();
  if (!db)
    throw new ImportError(
      "The backend isn't configured, so imported data can't be saved.",
      "no_backend",
    );
  return db;
}

// -------------------------------------------------------------- FX (to USD)

const FALLBACK_RATES: Record<string, number> = {
  USD: 1,
  NGN: 1500,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 149,
  GHS: 15.5,
  KES: 129,
  ZAR: 18,
};
let rateCache: { rates: Record<string, number>; at: number } | null = null;

export async function usdRates(): Promise<Record<string, number>> {
  if (rateCache && Date.now() - rateCache.at < 3_600_000) return rateCache.rates;
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD");
    const j = (await res.json()) as { result?: string; rates?: Record<string, number> };
    if (j.result === "success" && j.rates) {
      rateCache = { rates: j.rates, at: Date.now() };
      return j.rates;
    }
  } catch {
    /* fall through to cache / fallback */
  }
  return rateCache?.rates ?? FALLBACK_RATES;
}

export const toUsdWith = (rates: Record<string, number>) => (amount: number, currency: string) => {
  if (currency === "USD") return amount;
  const rate = rates[currency] ?? FALLBACK_RATES[currency];
  return rate ? amount / rate : amount;
};

// ------------------------------------------------------------------ writing

export interface ImportMeta {
  source: ImportSource;
  kind: ImportRecordKind;
  label: string;
  sourceRef: string;
  currency: string;
  note?: string;
  skipped?: number;
  /** How to repeat this import later (re-sync). */
  config?: Record<string, unknown> | null;
}

export interface ImportOutcome {
  importId: string;
  imported: number;
  skipped: number;
  skippedSample: { row: number; reason: string }[];
  note: string;
}

/** Re-importing the same file / property / mailbox REPLACES what that source
 *  contributed before (the old import row is deleted and cascades its
 *  records), so edits and deletions in the source sheet carry over and
 *  nothing is ever double-counted. */
async function replaceImport(userId: string, meta: ImportMeta, rowsCount: number) {
  const db = requireDb();
  if (!/^[A-Z]{3}$/.test(meta.currency)) {
    throw new ImportError(`Unsupported currency “${meta.currency}”.`, "bad_data");
  }
  const { data: already } = await db
    .from("data_imports")
    .select("id")
    .eq("user_id", userId)
    .eq("source_ref", meta.sourceRef)
    .eq("kind", meta.kind)
    .maybeSingle();
  if (!already) {
    const { count } = await db
      .from("data_imports")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    try {
      await requireRoom(userId, "dataSources", count ?? 0);
    } catch (e) {
      throw new ImportError(
        e instanceof Error ? e.message : "Your plan's data-source limit is reached.",
        "bad_data",
      );
    }
  }
  await db
    .from("data_imports")
    .delete()
    .eq("user_id", userId)
    .eq("source_ref", meta.sourceRef)
    .eq("kind", meta.kind);

  const { data, error } = await db
    .from("data_imports")
    .insert({
      user_id: userId,
      source: meta.source,
      kind: meta.kind,
      label: meta.label.slice(0, 200),
      source_ref: meta.sourceRef,
      currency: meta.currency,
      rows_imported: rowsCount,
      rows_skipped: meta.skipped ?? 0,
      note: meta.note ?? "",
      config: meta.config ?? null,
      synced_at: new Date().toISOString(),
      last_error: null,
    })
    .select("id")
    .single();
  if (error || !data) {
    throw new ImportError(
      `Couldn't record the import: ${error?.message ?? "unknown error"}`,
      "api",
    );
  }
  return data["id"] as string;
}

async function insertChunks(
  table: string,
  rows: Record<string, unknown>[],
  importId: string,
  userId: string,
) {
  const db = requireDb();
  try {
    for (let i = 0; i < rows.length; i += CHUNK) {
      const { error } = await db.from(table).insert(rows.slice(i, i + CHUNK));
      if (error) throw new Error(error.message);
    }
  } catch (e) {
    // Never leave a half-imported source behind.
    await db.from("data_imports").delete().eq("id", importId).eq("user_id", userId);
    throw new ImportError(
      `Import failed while saving rows: ${e instanceof Error ? e.message : String(e)}`,
      "api",
    );
  }
}

/** Validates (again, server-side) and saves a mapped table. */
async function importTableImpl(
  userId: string,
  args: {
    source: ImportSource;
    sourceRef: string;
    label: string;
    kind: ImportKind;
    currency: string;
    dateOrder: DateOrder;
    mapping: Mapping;
    rows: string[][]; // data rows, header excluded
    config?: Record<string, unknown> | null;
  },
): Promise<ImportOutcome> {
  const { records, skipped } = normalizeRows(args.kind, args.rows, args.mapping, args.dateOrder);
  if (records.length === 0) {
    const why = skipped[0]?.reason ? ` First problem: ${skipped[0].reason}.` : "";
    throw new ImportError(
      `None of the ${args.rows.length} rows could be imported.${why}`,
      "bad_data",
    );
  }
  const note = skipped.length ? `${skipped.length} row(s) skipped` : "";
  const importId = await replaceImport(
    userId,
    {
      source: args.source,
      kind: args.kind,
      label: args.label,
      sourceRef: args.sourceRef,
      currency: args.currency,
      note,
      skipped: skipped.length,
      config: args.config ?? null,
    },
    records.length,
  );
  await insertChunks(
    "business_records",
    records.map((r: ParsedRecord) => ({
      import_id: importId,
      user_id: userId,
      kind: args.kind,
      occurred_on: r.occurredOn,
      amount: r.amount,
      currency: r.currency ?? args.currency,
      name: r.name,
      company: r.company,
      email: r.email,
      channel: r.channel,
      stage: r.stage,
      probability: r.probability,
      owner: r.owner,
      segment: r.segment,
      orders: r.orders,
    })),
    importId,
    userId,
  );
  return {
    importId,
    imported: records.length,
    skipped: skipped.length,
    skippedSample: skipped.slice(0, 8),
    note,
  };
}

async function importGaMonthsImpl(
  userId: string,
  args: {
    propertyId: string;
    propertyName: string;
    currency: string;
    months: GaMonth[];
    config?: Record<string, unknown> | null;
  },
): Promise<ImportOutcome> {
  if (args.months.length === 0) {
    throw new ImportError(
      "Google Analytics returned no data for the last 6 months for that property.",
      "bad_data",
    );
  }
  const note = "Last 6 months, grouped by month and default channel group.";
  const importId = await replaceImport(
    userId,
    {
      source: "ga",
      kind: "traffic",
      label: args.propertyName,
      sourceRef: `ga:${args.propertyId}`,
      currency: args.currency,
      note,
      config: args.config ?? { propertyId: args.propertyId, propertyName: args.propertyName },
    },
    args.months.length,
  );
  await insertChunks(
    "traffic_snapshots",
    args.months.map((m) => ({
      import_id: importId,
      user_id: userId,
      month: m.month,
      channel: m.channel,
      sessions: m.sessions,
      key_events: m.keyEvents,
      revenue: m.revenue,
      currency: args.currency,
    })),
    importId,
    userId,
  );
  return { importId, imported: args.months.length, skipped: 0, skippedSample: [], note };
}

async function importGmailLeadsImpl(
  userId: string,
  args: { leads: GmailLead[]; scanned: number },
): Promise<ImportOutcome> {
  if (args.leads.length === 0) {
    throw new ImportError(
      `No inbound enquiries found in the ${args.scanned} most recent primary-inbox emails (newsletters, no-reply and automated mail are ignored).`,
      "bad_data",
    );
  }
  const note = `Distinct senders in your latest ${args.scanned} primary-inbox emails (last 6 months). Newsletters and automated mail are ignored. Counted by first message seen in that sample.`;
  const importId = await replaceImport(
    userId,
    {
      source: "gmail",
      kind: "lead",
      label: "Inbound email",
      sourceRef: "gmail:inbox",
      currency: "USD",
      note,
    },
    args.leads.length,
  );
  await insertChunks(
    "business_records",
    args.leads.map((l) => ({
      import_id: importId,
      user_id: userId,
      kind: "lead",
      occurred_on: l.firstSeen,
      name: l.name,
      email: l.email,
      channel: "Email",
      currency: "USD",
    })),
    importId,
    userId,
  );
  return { importId, imported: args.leads.length, skipped: 0, skippedSample: [], note };
}

async function deleteImportImpl(userId: string, importId: string): Promise<void> {
  const db = requireDb();
  const { error } = await db.from("data_imports").delete().eq("id", importId).eq("user_id", userId);
  if (error) throw new ImportError(`Couldn't remove that import: ${error.message}`, "api");
}

// ------------------------------------------------------------------ reading

export interface RecordRow {
  id: string;
  kind: "sale" | "lead" | "customer" | "deal";
  occurred_on: string | null;
  amount: number | null;
  currency: string;
  name: string | null;
  company: string | null;
  email: string | null;
  channel: string | null;
  stage: string | null;
  probability: number | null;
  owner: string | null;
  segment: string | null;
  orders: number | null;
}

export interface TrafficRow {
  month: string;
  channel: string | null;
  sessions: number;
  key_events: number;
  revenue: number;
  currency: string;
}

const CHANNEL_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function emptyData(): BusinessData {
  return {
    series: [],
    deals: [],
    dealsTotal: 0,
    topCustomers: [],
    channelRevenue: [],
    channelPeriod: "Last 30 days",
    funnel: [],
    salesFrom: null,
    leadsFrom: null,
    outsideWindow: false,
    counts: { sales: 0, leads: 0, customers: 0, deals: 0, trafficMonths: 0 },
    imports: [],
    generatedAt: new Date().toISOString(),
  };
}

export const monthKey = (iso: string) => iso.slice(0, 7); // YYYY-MM

export function windowMonths(now: Date): { key: string; label: string }[] {
  const out: { key: string; label: string }[] = [];
  for (let i = WINDOW_MONTHS - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    out.push({
      key: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`,
      label: MONTHS[d.getUTCMonth()]!,
    });
  }
  return out;
}

/** Percentages that add up to exactly 100 (largest-remainder rounding). */
function sharesTo100(values: number[]): number[] {
  const total = values.reduce((a, b) => a + b, 0);
  if (total <= 0) return values.map(() => 0);
  const raw = values.map((v) => (v / total) * 100);
  const floors = raw.map(Math.floor);
  let rest = 100 - floors.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => ({ i, frac: r - floors[i]! })).sort((a, b) => b.frac - a.frac);
  for (const { i } of order) {
    if (rest <= 0) break;
    floors[i]! += 1;
    rest -= 1;
  }
  return floors;
}

function formatDay(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** Loads this user's imported rows and turns them into the Analytics panels. */
async function loadBusinessData(userId: string): Promise<BusinessData> {
  const db = getSupabaseAdmin();
  if (!db) return emptyData();

  const [recRes, trafficRes, importsRes, rates] = await Promise.all([
    db
      .from("business_records")
      .select(
        "id, kind, occurred_on, amount, currency, name, company, email, channel, stage, probability, owner, segment, orders",
      )
      .eq("user_id", userId)
      .order("occurred_on", { ascending: false, nullsFirst: false })
      .limit(50_000),
    db
      .from("traffic_snapshots")
      .select("month, channel, sessions, key_events, revenue, currency")
      .eq("user_id", userId)
      .limit(5_000),
    db
      .from("data_imports")
      .select(
        "id, source, kind, label, currency, rows_imported, rows_skipped, note, created_at, synced_at, last_error, config",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100),
    usdRates(),
  ]);
  for (const [name, res] of Object.entries({ recRes, trafficRes, importsRes })) {
    if (res.error) console.error(`[business-data] ${name} failed`, res.error);
  }
  return computeBusinessData({
    records: (recRes.data ?? []) as unknown as RecordRow[],
    traffic: (trafficRes.data ?? []) as unknown as TrafficRow[],
    imports: (importsRes.data ?? []) as Record<string, unknown>[],
    rates,
    now: new Date(),
  });
}

/** Pure: imported rows in, Analytics panels out. Money is converted to USD.
 *  Empty in → empty out; nothing is ever invented. */
export function computeBusinessData(input: {
  records: RecordRow[];
  traffic: TrafficRow[];
  imports: Record<string, unknown>[];
  rates: Record<string, number>;
  now: Date;
}): BusinessData {
  const { records, traffic, rates, now } = input;
  const usd = toUsdWith(rates);
  const out = emptyData();

  out.imports = input.imports.map((r): ImportSummary => ({
    id: r["id"] as string,
    source: r["source"] as ImportSource,
    kind: r["kind"] as ImportRecordKind,
    label: r["label"] as string,
    currency: r["currency"] as string,
    rowsImported: Number(r["rows_imported"]),
    rowsSkipped: Number(r["rows_skipped"]),
    note: (r["note"] as string) ?? "",
    createdAt: r["created_at"] as string,
    syncedAt: (r["synced_at"] as string | undefined) ?? (r["created_at"] as string),
    lastError: (r["last_error"] as string | null | undefined) ?? null,
    canSync: r["config"] != null,
  }));

  const sales = records.filter((r) => r.kind === "sale" && r.occurred_on && r.amount !== null);
  const leads = records.filter((r) => r.kind === "lead" && r.occurred_on);
  const customers = records.filter((r) => r.kind === "customer");
  const dealRows = records.filter((r) => r.kind === "deal");
  const gaTotals = traffic.filter((t) => t.channel === null);
  const gaChannels = traffic.filter((t) => t.channel !== null);

  out.counts = {
    sales: sales.length,
    leads: leads.length,
    customers: customers.length,
    deals: dealRows.length,
    trafficMonths: gaTotals.length,
  };

  // ---- Series: sales & leads for the last 6 months ----------------------
  const months = windowMonths(now);
  const gaRevenueTotal = gaTotals.reduce((s, t) => s + t.revenue, 0);
  out.salesFrom = sales.length ? "records" : gaRevenueTotal > 0 ? "ga" : null;
  out.leadsFrom = leads.length ? "records" : gaTotals.some((t) => t.key_events > 0) ? "ga" : null;

  // First purchase month per customer name, for retention.
  const firstBuy = new Map<string, string>();
  for (const s of sales) {
    if (!s.name) continue;
    const k = s.name.toLowerCase();
    const m = monthKey(s.occurred_on!);
    const prev = firstBuy.get(k);
    if (!prev || m < prev) firstBuy.set(k, m);
  }

  const series: SeriesPoint[] = months.map((m) => {
    let salesTotal = 0;
    let leadCount = 0;
    if (out.salesFrom === "records") {
      for (const s of sales)
        if (monthKey(s.occurred_on!) === m.key) salesTotal += usd(s.amount!, s.currency);
    } else if (out.salesFrom === "ga") {
      for (const t of gaTotals)
        if (monthKey(t.month) === m.key) salesTotal += usd(t.revenue, t.currency);
    }
    if (out.leadsFrom === "records") {
      for (const l of leads) if (monthKey(l.occurred_on!) === m.key) leadCount += 1;
    } else if (out.leadsFrom === "ga") {
      for (const t of gaTotals) if (monthKey(t.month) === m.key) leadCount += t.key_events;
    }
    // Retention: of the named customers who bought this month, how many had bought before.
    const buyers = new Set<string>();
    for (const s of sales)
      if (s.name && monthKey(s.occurred_on!) === m.key) buyers.add(s.name.toLowerCase());
    let returning = 0;
    for (const b of buyers) if ((firstBuy.get(b) ?? m.key) < m.key) returning += 1;
    return {
      month: m.label,
      sales: Math.round(salesTotal),
      leads: leadCount,
      retention: buyers.size ? Math.round((returning / buyers.size) * 100) : 0,
    };
  });
  const hasWindowData = series.some((p) => p.sales !== 0 || p.leads !== 0);
  const hasAnyTimeData = sales.length > 0 || leads.length > 0 || gaTotals.length > 0;
  out.outsideWindow = hasAnyTimeData && !hasWindowData;
  out.series = hasWindowData ? series : [];

  // ---- Revenue by channel ----------------------------------------------
  const today = now.toISOString().slice(0, 10);
  const daysAgo = (n: number) =>
    new Date(now.getTime() - n * 86_400_000).toISOString().slice(0, 10);
  const channelTotals = (from: string | null) => {
    const map = new Map<string, number>();
    for (const s of sales) {
      if (!s.channel) continue;
      if (from && (s.occurred_on! < from || s.occurred_on! > today)) continue;
      map.set(s.channel, (map.get(s.channel) ?? 0) + usd(s.amount!, s.currency));
    }
    return map;
  };
  let channelMap = channelTotals(daysAgo(30));
  out.channelPeriod = "Last 30 days";
  if (![...channelMap.values()].some((v) => v > 0)) {
    channelMap = channelTotals(`${months[0]!.key}-01`);
    out.channelPeriod = "Last 6 months";
  }
  if (![...channelMap.values()].some((v) => v > 0)) {
    // No channel on sale rows — fall back to GA revenue by channel group.
    channelMap = new Map();
    for (const t of gaChannels) {
      if (monthKey(t.month) < months[0]!.key) continue;
      channelMap.set(t.channel!, (channelMap.get(t.channel!) ?? 0) + usd(t.revenue, t.currency));
    }
    out.channelPeriod = "Last 6 months · Google Analytics";
  }
  const channelList = [...channelMap.entries()]
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);
  if (channelList.length) {
    const top = channelList.slice(0, 4);
    const rest = channelList.slice(4).reduce((s, [, v]) => s + v, 0);
    const rows = rest > 0 ? [...top, ["Other", rest] as [string, number]] : top;
    const pct = sharesTo100(rows.map(([, v]) => v));
    out.channelRevenue = rows.map(([channel], i): ChannelRevenue => ({
      channel,
      value: pct[i]!,
      color: CHANNEL_COLORS[i % CHANNEL_COLORS.length]!,
    }));
  }

  // ---- Deals + funnel ----------------------------------------------------
  const dealsAll: CrmDeal[] = dealRows
    .map((d) => ({
      id: d.id,
      name: d.company ? (d.name ?? "") : "",
      company: d.company ?? d.name ?? "Untitled deal",
      value: Math.round(usd(d.amount ?? 0, d.currency)),
      stage: (d.stage ?? "New") as CrmDeal["stage"],
      owner: d.owner ?? "",
      probability: Math.round(d.probability ?? 0),
    }))
    .sort((a, b) => b.value - a.value);
  out.dealsTotal = dealsAll.length;
  out.deals = dealsAll.slice(0, 200);

  if (dealsAll.length) {
    const atLeast = (stages: string[]) => dealsAll.filter((d) => stages.includes(d.stage)).length;
    const funnel: FunnelStage[] = [
      { label: "New", value: dealsAll.length },
      { label: "Contacted", value: atLeast(["Contacted", "Negotiation", "Won"]) },
      { label: "Negotiation", value: atLeast(["Negotiation", "Won"]) },
      { label: "Won", value: atLeast(["Won"]) },
    ];
    // Imported leads sit above the pipeline only when there are at least as many.
    if (leads.length >= dealsAll.length) funnel.unshift({ label: "Leads", value: leads.length });
    out.funnel = funnel;
  }

  // ---- Top customers -----------------------------------------------------
  interface Agg {
    name: string;
    ltv: number;
    orders: number;
    last: string | null;
    segment: string | null;
    recent: number;
    prior: number;
  }
  const byCustomer = new Map<string, Agg>();
  const get = (name: string) => {
    const k = name.toLowerCase();
    let a = byCustomer.get(k);
    if (!a) {
      a = { name, ltv: 0, orders: 0, last: null, segment: null, recent: 0, prior: 0 };
      byCustomer.set(k, a);
    }
    return a;
  };
  const d90 = daysAgo(90);
  const d180 = daysAgo(180);
  const named = new Set<string>();
  for (const s of sales) {
    if (!s.name) continue;
    named.add(s.name.toLowerCase());
    const a = get(s.name);
    const v = usd(s.amount!, s.currency);
    a.ltv += v;
    a.orders += 1;
    if (!a.last || s.occurred_on! > a.last) a.last = s.occurred_on!;
    if (!a.segment && s.channel) a.segment = s.channel;
    if (s.occurred_on! >= d90) a.recent += v;
    else if (s.occurred_on! >= d180) a.prior += v;
  }
  for (const c of customers) {
    if (!c.name) continue;
    const a = get(c.name);
    // Customer-table LTV only fills in when we have no sales rows for them (no double count).
    if (!named.has(c.name.toLowerCase())) {
      a.ltv += usd(c.amount ?? 0, c.currency);
      a.orders += c.orders ?? 0;
    }
    if (c.occurred_on && (!a.last || c.occurred_on > a.last)) a.last = c.occurred_on;
    if (c.segment) a.segment = c.segment;
  }
  out.topCustomers = [...byCustomer.values()]
    .filter((a) => a.ltv > 0 || a.orders > 0)
    .sort((a, b) => b.ltv - a.ltv)
    .slice(0, 8)
    .map((a, i): TopCustomer => {
      let trend: Trend = "flat";
      if (a.recent > a.prior * 1.1) trend = "up";
      else if (a.prior > 0 && a.recent < a.prior * 0.9) trend = "down";
      return {
        id: `${i}-${a.name}`,
        name: a.name,
        segment: a.segment ?? "Customer",
        ltv: Math.round(a.ltv),
        orders: a.orders,
        lastOrder: a.last ? formatDay(a.last) : "—",
        trend,
      };
    });

  out.generatedAt = now.toISOString();
  return out;
}

/** Saves records a platform importer already mapped (no spreadsheet columns involved). */
async function importParsedRecordsImpl(
  userId: string,
  args: {
    source: ImportSource;
    sourceRef: string;
    label: string;
    kind: ImportKind;
    currency: string;
    records: ParsedRecord[];
    config?: Record<string, unknown> | null;
    note?: string;
  },
): Promise<ImportOutcome> {
  if (args.records.length === 0) {
    throw new ImportError(
      `${args.label} has nothing to import yet (no matching records in the last 12 months).`,
      "bad_data",
    );
  }
  const importId = await replaceImport(
    userId,
    {
      source: args.source,
      kind: args.kind,
      label: args.label,
      sourceRef: args.sourceRef,
      currency: args.currency,
      note: args.note ?? "",
      config: args.config ?? null,
    },
    args.records.length,
  );
  await insertChunks(
    "business_records",
    args.records.map((r) => ({
      import_id: importId,
      user_id: userId,
      kind: args.kind,
      occurred_on: r.occurredOn,
      amount: r.amount,
      currency: r.currency ?? args.currency,
      name: r.name,
      company: r.company,
      email: r.email,
      channel: r.channel,
      stage: r.stage,
      probability: r.probability,
      owner: r.owner,
      segment: r.segment,
      orders: r.orders,
    })),
    importId,
    userId,
  );
  return {
    importId,
    imported: args.records.length,
    skipped: 0,
    skippedSample: [],
    note: args.note ?? "",
  };
}

// ---- Short-lived cache -----------------------------------------------------------------------
// The Analytics, Verdict and Memory panels all re-read this every minute or two, and building it
// scans up to 50,000 rows. Within a few seconds the answer cannot change unless this person
// imports or deletes data, which clears their entry immediately.

const DATA_TTL_MS = 20_000;
const DATA_CACHE_MAX = 2_000;
const dataCache = new Map<string, { at: number; value: BusinessData }>();
const dataInFlight = new Map<string, Promise<BusinessData>>();
const dataVersion = new Map<string, number>();

export function invalidateBusinessData(userId: string): void {
  dataCache.delete(userId);
  // With Redis, tell every server (not just this one) to drop its copy.
  void getKv()
    .then((kv) => (kv.kind === "redis" ? kv.del(`bd:${userId}`) : undefined))
    .catch(() => undefined);
  dataVersion.set(userId, (dataVersion.get(userId) ?? 0) + 1);
}

/** Loads this user's imported rows and turns them into the Analytics panels (cached ~20s per user). */
export async function getBusinessData(userId: string): Promise<BusinessData> {
  const hit = dataCache.get(userId);
  if (hit && Date.now() - hit.at < DATA_TTL_MS) return hit.value;
  const pending = dataInFlight.get(userId);
  if (pending) return pending;
  const version = dataVersion.get(userId) ?? 0;
  const run = (async () => {
    const kv = await getKv();
    if (kv.kind === "redis") {
      const shared = await kv.get<BusinessData>(`bd:${userId}`);
      if (shared) return shared;
    }
    const fresh = await loadBusinessData(userId);
    if (kv.kind === "redis") await kv.set(`bd:${userId}`, fresh, DATA_TTL_MS / 1000);
    return fresh;
  })()
    .then((value) => {
      // Skip caching if an import landed while this was being computed.
      if ((dataVersion.get(userId) ?? 0) === version) {
        if (dataCache.size >= DATA_CACHE_MAX)
          dataCache.delete(dataCache.keys().next().value as string);
        dataCache.set(userId, { at: Date.now(), value });
      }
      return value;
    })
    .finally(() => dataInFlight.delete(userId));
  dataInFlight.set(userId, run);
  return run;
}

async function bumping<T>(userId: string, run: () => Promise<T>): Promise<T> {
  invalidateBusinessData(userId);
  try {
    return await run();
  } finally {
    invalidateBusinessData(userId);
  }
}

export const importTable = (...a: Parameters<typeof importTableImpl>) =>
  bumping(a[0], () => importTableImpl(...a));
export const importGaMonths = (...a: Parameters<typeof importGaMonthsImpl>) =>
  bumping(a[0], () => importGaMonthsImpl(...a));
export const importGmailLeads = (...a: Parameters<typeof importGmailLeadsImpl>) =>
  bumping(a[0], () => importGmailLeadsImpl(...a));
export const deleteImport = (...a: Parameters<typeof deleteImportImpl>) =>
  bumping(a[0], () => deleteImportImpl(...a));
export const importParsedRecords = (...a: Parameters<typeof importParsedRecordsImpl>) =>
  bumping(a[0], () => importParsedRecordsImpl(...a));
