// Client-safe, dependency-free: turns a raw table (CSV upload, Google Sheet,
// Drive file) into typed business records. The browser uses it for the live
// preview, the server re-runs the very same code before anything is saved —
// so what you preview is exactly what gets imported.

export type ImportKind = "sale" | "lead" | "customer" | "deal";
export type DealStageName = "New" | "Contacted" | "Negotiation" | "Won";
export type FieldKey =
  | "date"
  | "amount"
  | "name"
  | "company"
  | "email"
  | "channel"
  | "stage"
  | "probability"
  | "owner"
  | "segment"
  | "orders";

export type DateOrder = "auto" | "dmy" | "mdy";
export type Mapping = Partial<Record<FieldKey, number>>; // field -> column index

export const MAX_IMPORT_ROWS = 10_000;
export const SUPPORTED_CURRENCIES = [
  "NGN",
  "USD",
  "EUR",
  "GBP",
  "GHS",
  "KES",
  "ZAR",
  "JPY",
] as const;

export interface FieldSpec {
  key: FieldKey;
  label: string;
  required?: boolean;
  hint?: string;
}

export const KIND_LABELS: Record<ImportKind, string> = {
  sale: "Sales",
  lead: "Leads",
  customer: "Customers",
  deal: "Deals (pipeline)",
};

export const KIND_FIELDS: Record<ImportKind, FieldSpec[]> = {
  sale: [
    { key: "date", label: "Date", required: true },
    { key: "amount", label: "Amount", required: true },
    { key: "name", label: "Customer", hint: "Lets us rank top customers and measure retention" },
    { key: "channel", label: "Channel / source", hint: "Fills Revenue by Channel" },
  ],
  lead: [
    { key: "date", label: "Date", required: true },
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "company", label: "Company" },
    { key: "channel", label: "Channel / source" },
  ],
  customer: [
    { key: "name", label: "Name", required: true },
    { key: "amount", label: "Lifetime value" },
    { key: "orders", label: "Orders" },
    { key: "date", label: "Last order date" },
    { key: "segment", label: "Segment" },
    { key: "email", label: "Email" },
  ],
  deal: [
    { key: "name", label: "Contact / deal name", required: true },
    { key: "amount", label: "Value", required: true },
    { key: "stage", label: "Stage", required: true },
    { key: "company", label: "Company" },
    { key: "owner", label: "Owner" },
    { key: "probability", label: "Probability %" },
    { key: "date", label: "Date" },
  ],
};

// ---------------------------------------------------------------- CSV parse

/** RFC-4180-ish CSV/TSV parser: quoted fields, escaped quotes, CRLF, BOM and
 *  automatic delimiter detection (comma / semicolon / tab). */
export function parseCsv(input: string): string[][] {
  const text = input.replace(/^\uFEFF/, "");
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const counts: Record<string, number> = {
    ",": (firstLine.match(/,/g) ?? []).length,
    ";": (firstLine.match(/;/g) ?? []).length,
    "\t": (firstLine.match(/\t/g) ?? []).length,
  };
  const delimiter = (Object.keys(counts) as string[]).reduce(
    (best, d) => ((counts[d] ?? 0) > (counts[best] ?? 0) ? d : best),
    ",",
  );

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
      continue;
    }
    if (c === '"') inQuotes = true;
    else if (c === delimiter) {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
    } else field += c;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  // Drop fully-empty lines.
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

// ------------------------------------------------------- header auto-detect

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

// Synonyms per field. Exact matches score 3, whole-word containment scores 1.
const SYNONYMS: Record<FieldKey, string[]> = {
  date: [
    "date",
    "order date",
    "sale date",
    "sales date",
    "transaction date",
    "created",
    "created at",
    "created on",
    "date created",
    "timestamp",
    "paid at",
    "payment date",
    "invoice date",
    "lead date",
    "last order",
    "last order date",
    "close date",
    "closed date",
    "day",
    "time",
  ],
  amount: [
    "amount",
    "total",
    "revenue",
    "sales",
    "sale amount",
    "order total",
    "grand total",
    "price",
    "value",
    "deal value",
    "ltv",
    "lifetime value",
    "total spent",
    "total spend",
    "net",
    "gross",
    "paid",
    "payment",
    "subtotal",
    "cost",
  ],
  name: [
    "name",
    "customer",
    "customer name",
    "client",
    "client name",
    "contact",
    "contact name",
    "full name",
    "lead",
    "lead name",
    "buyer",
    "deal",
    "deal name",
    "deal title",
    "title",
  ],
  company: ["company", "company name", "organization", "organisation", "business", "account"],
  email: ["email", "e mail", "email address", "mail"],
  channel: [
    "channel",
    "source",
    "lead source",
    "utm source",
    "medium",
    "platform",
    "origin",
    "sales channel",
    "campaign",
    "referrer",
    "acquisition",
  ],
  stage: ["stage", "deal stage", "pipeline stage", "pipeline", "status", "deal status"],
  probability: ["probability", "win probability", "chance", "likelihood", "win rate"],
  owner: ["owner", "assigned to", "assignee", "sales rep", "rep", "account owner", "salesperson"],
  segment: ["segment", "tier", "type", "category", "customer type", "group"],
  orders: [
    "orders",
    "order count",
    "number of orders",
    "total orders",
    "purchases",
    "no of orders",
    "num orders",
    "order",
  ],
};

function scoreHeader(header: string, field: FieldKey): number {
  const h = norm(header);
  if (!h) return 0;
  let best = 0;
  for (const syn of SYNONYMS[field]) {
    if (h === syn) return 3;
    if (` ${h} `.includes(` ${syn} `)) best = Math.max(best, 1);
  }
  return best;
}

/** Best column for every field of `kind` (each column used at most once). */
export function autoMap(kind: ImportKind, header: string[]): Mapping {
  const fields = KIND_FIELDS[kind].map((f) => f.key);
  const candidates: { field: FieldKey; col: number; score: number }[] = [];
  for (const field of fields) {
    header.forEach((h, col) => {
      const s = scoreHeader(h, field);
      if (s > 0) candidates.push({ field, col, score: s });
    });
  }
  candidates.sort((a, b) => b.score - a.score || a.col - b.col);
  const mapping: Mapping = {};
  const usedCols = new Set<number>();
  for (const c of candidates) {
    if (mapping[c.field] !== undefined || usedCols.has(c.col)) continue;
    mapping[c.field] = c.col;
    usedCols.add(c.col);
  }
  return mapping;
}

/** Guess whether a table holds sales, leads, customers or deals. */
export function detectKind(header: string[]): ImportKind {
  const has = (f: FieldKey) => header.some((h) => scoreHeader(h, f) >= 3);
  const hasAny = (f: FieldKey) => header.some((h) => scoreHeader(h, f) >= 1);
  const stageCol = header.some((h) => {
    const n = norm(h);
    return n.includes("stage") || n === "pipeline" || n.includes("probability");
  });
  if (stageCol && hasAny("amount")) return "deal";
  const customerCols = header.some((h) => {
    const n = norm(h);
    return (
      n.includes("lifetime") || n === "ltv" || n.includes("orders") || n.includes("total spent")
    );
  });
  if (customerCols && !has("date")) return "customer";
  if (customerCols && header.some((h) => /last order/.test(norm(h)))) return "customer";
  if (hasAny("amount") && hasAny("date")) return "sale";
  if (hasAny("email") || hasAny("name")) return hasAny("date") ? "lead" : "customer";
  return "sale";
}

/** Which required fields still have no column. */
export function missingRequired(kind: ImportKind, mapping: Mapping): FieldSpec[] {
  return KIND_FIELDS[kind].filter((f) => f.required && mapping[f.key] === undefined);
}

// ------------------------------------------------------------- value parsing

/** "₦1,250.50", "1 250,50", "(300)", "$ 12k"-less numbers → number | null. */
export function parseAmount(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  let s = raw.trim();
  if (!s) return null;
  const negative = /^\(.*\)$/.test(s) || /^-/.test(s) || /-$/.test(s);
  s = s.replace(/[^0-9.,]/g, "");
  if (!s || !/[0-9]/.test(s)) return null;
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma > -1 && lastDot > -1) {
    // Whichever separator comes last is the decimal mark.
    if (lastComma > lastDot) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (lastComma > -1) {
    // "1,234" / "1,234,567" → thousands separators; "12,5" / "1234,56" → decimal comma.
    const commaCount = (s.match(/,/g) ?? []).length;
    const after = s.length - lastComma - 1;
    s = commaCount > 1 || after === 3 ? s.replace(/,/g, "") : s.replace(",", ".");
  } else if ((s.match(/\./g) ?? []).length > 1) {
    s = s.replace(/\./g, "");
  }
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return negative ? -Math.abs(n) : n;
}

const MONTH_NAMES = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
];

function iso(y: number, m: number, d: number): string | null {
  if (y < 1990 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCMonth() !== m - 1) return null; // e.g. 31 Feb
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Detects day-first vs month-first for slash/dash/dot dates by looking at the
 *  whole column: a first part > 12 proves day-first, a second part > 12 proves
 *  month-first. Fully ambiguous columns default to day-first (dd/mm/yyyy). */
export function detectDateOrder(values: string[]): "dmy" | "mdy" {
  for (const v of values) {
    const m = v.trim().match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
    if (!m) continue;
    if (Number(m[1]) > 12) return "dmy";
    if (Number(m[2]) > 12) return "mdy";
  }
  return "dmy";
}

export function parseDate(raw: string | undefined, order: "dmy" | "mdy"): string | null {
  if (raw === undefined) return null;
  const s = raw.trim();
  if (!s) return null;

  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/); // 2026-03-04, 2026-03-04T10:00Z
  if (m) return iso(Number(m[1]), Number(m[2]), Number(m[3]));

  m = s.match(/^(\d{4})[-/.](\d{1,2})$/); // 2026-03 (month only)
  if (m) return iso(Number(m[1]), Number(m[2]), 1);

  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  if (m) {
    let year = Number(m[3]);
    if (year < 100) year += 2000;
    const a = Number(m[1]);
    const b = Number(m[2]);
    return order === "dmy" ? iso(year, b, a) : iso(year, a, b);
  }

  // "5 Jan 2026", "Jan 5, 2026", "January 2026"
  const named = s.toLowerCase().replace(/,/g, " ");
  const monthIdx = MONTH_NAMES.findIndex((mn) => new RegExp(`\\b${mn}[a-z]*\\b`).test(named));
  if (monthIdx > -1) {
    const year = named.match(/\b(\d{4})\b/);
    const day = named.match(/\b(\d{1,2})(?:st|nd|rd|th)?\b/);
    if (year) {
      const d = day && day[1] !== year[1] ? Number(day[1]) : 1;
      return iso(Number(year[1]), monthIdx + 1, d);
    }
  }

  // Excel / Sheets serial day numbers (e.g. 46085).
  if (/^\d{5}(\.\d+)?$/.test(s)) {
    const serial = Number(s);
    if (serial > 20000 && serial < 80000) {
      const d = new Date(Date.UTC(1899, 11, 30) + Math.floor(serial) * 86_400_000);
      return iso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
    }
  }
  return null;
}

export const STAGE_PROBABILITY: Record<DealStageName, number> = {
  New: 10,
  Contacted: 30,
  Negotiation: 60,
  Won: 100,
};

/** Free-text stage → pipeline column. `null` = a lost / dead deal that doesn't
 *  belong on an active pipeline board. */
export function normalizeStage(raw: string | undefined): DealStageName | null {
  const s = norm(raw ?? "");
  if (!s) return "New";
  if (/\b(lost|dead|declined|rejected|cancel|churn|disqualif|closed lost|no deal)/.test(s))
    return null;
  if (/\b(won|closed won|paid|complete|signed|success|delivered|purchased)/.test(s)) return "Won";
  if (/(negotiat|proposal|quote|quoted|offer|contract|pricing|decision|verbal)/.test(s))
    return "Negotiation";
  if (
    /(contact|qualif|follow|repl|demo|meeting|discovery|call|engaged|interest|appointment|schedul|booked)/.test(
      s,
    )
  )
    return "Contacted";
  return "New";
}

// ------------------------------------------------------------ normalisation

export interface ParsedRecord {
  occurredOn: string | null; // YYYY-MM-DD
  amount: number | null;
  name: string | null;
  company: string | null;
  email: string | null;
  channel: string | null;
  stage: DealStageName | null;
  probability: number | null;
  owner: string | null;
  segment: string | null;
  orders: number | null;
  /** Set by platform importers when a source mixes currencies; otherwise the import's currency applies. */
  currency?: string | undefined;
}

export interface SkippedRow {
  row: number; // 1-based row number in the source, header = 1
  reason: string;
}

export interface NormalizeResult {
  records: ParsedRecord[];
  skipped: SkippedRow[];
  dateOrder: "dmy" | "mdy";
  /** True when every date in the column was ambiguous (both parts ≤ 12). */
  datesAmbiguous: boolean;
}

const cell = (row: string[], idx: number | undefined): string | undefined =>
  idx === undefined ? undefined : row[idx];

const text = (row: string[], idx: number | undefined): string | null => {
  const v = cell(row, idx)?.trim();
  return v ? v : null;
};

/** Applies a column mapping to the data rows (header excluded) and validates
 *  every row. Rows that can't be used are reported, never silently dropped
 *  and never filled with made-up values. */
export function normalizeRows(
  kind: ImportKind,
  rows: string[][],
  mapping: Mapping,
  dateOrder: DateOrder = "auto",
): NormalizeResult {
  const records: ParsedRecord[] = [];
  const skipped: SkippedRow[] = [];

  const dateValues = mapping.date === undefined ? [] : rows.map((r) => cell(r, mapping.date) ?? "");
  const order = dateOrder === "auto" ? detectDateOrder(dateValues) : dateOrder;
  const datesAmbiguous =
    dateOrder === "auto" &&
    dateValues.some((v) => /^\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}/.test(v.trim())) &&
    !dateValues.some((v) => {
      const m = v.trim().match(/^(\d{1,2})[/.-](\d{1,2})[/.-]/);
      return m ? Number(m[1]) > 12 || Number(m[2]) > 12 : false;
    });

  const spec = KIND_FIELDS[kind];
  const requiredKeys = spec.filter((f) => f.required).map((f) => f.key);

  rows.slice(0, MAX_IMPORT_ROWS).forEach((r, i) => {
    const rowNo = i + 2; // header is row 1
    const rec: ParsedRecord = {
      occurredOn: null,
      amount: null,
      name: text(r, mapping.name),
      company: text(r, mapping.company),
      email: text(r, mapping.email)?.toLowerCase() ?? null,
      channel: text(r, mapping.channel),
      stage: null,
      probability: null,
      owner: text(r, mapping.owner),
      segment: text(r, mapping.segment),
      orders: null,
    };

    if (mapping.date !== undefined) {
      const raw = cell(r, mapping.date) ?? "";
      if (raw.trim()) {
        rec.occurredOn = parseDate(raw, order);
        if (!rec.occurredOn && requiredKeys.includes("date")) {
          skipped.push({
            row: rowNo,
            reason: `Couldn't read the date “${raw.trim().slice(0, 24)}”`,
          });
          return;
        }
      } else if (requiredKeys.includes("date")) {
        skipped.push({ row: rowNo, reason: "Missing date" });
        return;
      }
    }

    if (mapping.amount !== undefined) {
      const raw = cell(r, mapping.amount) ?? "";
      rec.amount = parseAmount(raw);
      if (rec.amount === null && requiredKeys.includes("amount")) {
        skipped.push({
          row: rowNo,
          reason: raw.trim()
            ? `Couldn't read the amount “${raw.trim().slice(0, 24)}”`
            : "Missing amount",
        });
        return;
      }
    }

    if (mapping.orders !== undefined) {
      const n = parseAmount(cell(r, mapping.orders));
      rec.orders = n === null ? null : Math.max(0, Math.round(n));
    }

    if (kind === "deal") {
      const stage = normalizeStage(cell(r, mapping.stage));
      if (stage === null) {
        skipped.push({ row: rowNo, reason: "Lost / closed-lost deal (not shown on the pipeline)" });
        return;
      }
      rec.stage = stage;
      let p = parseAmount(cell(r, mapping.probability));
      if (p !== null && p > 0 && p <= 1) p *= 100;
      rec.probability =
        p !== null ? Math.min(100, Math.max(0, Math.round(p))) : STAGE_PROBABILITY[stage];
    }

    if (requiredKeys.includes("name") && !rec.name && !(kind === "deal" && rec.company)) {
      skipped.push({ row: rowNo, reason: "Missing name" });
      return;
    }

    if (kind === "lead" && !rec.name && !rec.email && !rec.company) {
      skipped.push({ row: rowNo, reason: "Needs at least a name, email or company" });
      return;
    }

    records.push(rec);
  });

  if (rows.length > MAX_IMPORT_ROWS) {
    skipped.push({
      row: MAX_IMPORT_ROWS + 2,
      reason: `Only the first ${MAX_IMPORT_ROWS.toLocaleString()} rows are imported (${(rows.length - MAX_IMPORT_ROWS).toLocaleString()} more were ignored)`,
    });
  }

  return { records, skipped, dateOrder: order, datesAmbiguous };
}
