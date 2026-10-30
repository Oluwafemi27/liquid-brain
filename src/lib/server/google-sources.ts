import "@tanstack/react-start/server-only";
import { MAX_IMPORT_ROWS, parseCsv } from "@/lib/import-mapping";
import { getSupabaseAdmin, DEFAULT_WORKSPACE_ID } from "./supabase";
import { googleApi, ImportError } from "./google-auth";

// ------------------------------------------------------------------ helpers

async function isConnected(id: string): Promise<boolean> {
  const db = getSupabaseAdmin();
  if (!db) return false;
  const { data } = await db
    .from("connectors")
    .select("connected, access_token")
    .eq("workspace_id", DEFAULT_WORKSPACE_ID)
    .eq("id", id)
    .maybeSingle();
  return Boolean(data?.["connected"] && data?.["access_token"]);
}

const SHEET_MIME = "application/vnd.google-apps.spreadsheet";

export interface GoogleFile {
  id: string;
  name: string;
  kind: "sheet" | "csv";
  modifiedTime: string;
}

export interface LoadedTable {
  source: "sheets" | "drive";
  fileId: string;
  title: string;
  tabs: string[];
  tab: string | null;
  /** First row is the header. */
  rows: string[][];
  truncated: boolean;
}

/** Spreadsheets and CSVs in the owner's Drive, newest first. */
export async function listGoogleFiles(query?: string): Promise<GoogleFile[]> {
  if (!(await isConnected("drive"))) {
    throw new ImportError(
      "Google Drive isn't connected. Connect it in Settings, or paste a Google Sheets link instead.",
      "not_connected",
    );
  }
  const clauses = [
    `(mimeType='${SHEET_MIME}' or mimeType='text/csv' or mimeType='application/vnd.ms-excel')`,
    "trashed=false",
  ];
  const q = query?.trim();
  if (q) clauses.push(`name contains '${q.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`);
  const url = new URL("https://www.googleapis.com/drive/v3/files");
  url.searchParams.set("q", clauses.join(" and "));
  url.searchParams.set("orderBy", "modifiedTime desc");
  url.searchParams.set("pageSize", "25");
  url.searchParams.set("fields", "files(id,name,mimeType,modifiedTime)");
  url.searchParams.set("supportsAllDrives", "true");
  url.searchParams.set("includeItemsFromAllDrives", "true");
  const res = await googleApi("drive", url.toString());
  const json = (await res.json()) as {
    files?: { id: string; name: string; mimeType: string; modifiedTime: string }[];
  };
  return (json.files ?? []).map((f) => ({
    id: f.id,
    name: f.name,
    kind: f.mimeType === SHEET_MIME ? "sheet" : "csv",
    modifiedTime: f.modifiedTime,
  }));
}

/** Accepts a full Sheets/Drive URL or a bare file id. */
export function extractFileId(input: string): string {
  const s = input.trim();
  const m = s.match(/\/d\/([a-zA-Z0-9_-]{10,})/) ?? s.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
  if (m) return m[1]!;
  if (/^[a-zA-Z0-9_-]{20,}$/.test(s)) return s;
  throw new ImportError("That doesn't look like a Google Sheets link or file id.", "bad_data");
}

function cap(rows: string[][]): { rows: string[][]; truncated: boolean } {
  // header + MAX_IMPORT_ROWS data rows
  if (rows.length > MAX_IMPORT_ROWS + 1)
    return { rows: rows.slice(0, MAX_IMPORT_ROWS + 1), truncated: true };
  return { rows, truncated: false };
}

/** Reads one sheet tab (or a Drive CSV) into a plain table. Uses the Sheets
 *  API when Sheets is connected (real tab choice); otherwise falls back to
 *  Drive's CSV export (first tab only). */
export async function loadGoogleTable(fileOrUrl: string, tab?: string): Promise<LoadedTable> {
  const fileId = extractFileId(fileOrUrl);
  const sheetsOn = await isConnected("sheets");
  const driveOn = await isConnected("drive");
  if (!sheetsOn && !driveOn) {
    throw new ImportError(
      "Connect Google Sheets or Google Drive in Settings to read this file.",
      "not_connected",
    );
  }

  // Work out what the file is when Drive can tell us.
  let mime: string | null = null;
  let title = "Spreadsheet";
  if (driveOn) {
    try {
      const meta = await googleApi(
        "drive",
        `https://www.googleapis.com/drive/v3/files/${fileId}?fields=name,mimeType&supportsAllDrives=true`,
      );
      const j = (await meta.json()) as { name?: string; mimeType?: string };
      mime = j.mimeType ?? null;
      title = j.name ?? title;
    } catch (e) {
      if (!sheetsOn) throw e;
    }
  }

  // Plain CSV stored in Drive.
  if (mime && mime !== SHEET_MIME) {
    const res = await googleApi(
      "drive",
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&supportsAllDrives=true`,
    );
    const body = await res.text();
    if (body.length > 12_000_000)
      throw new ImportError("That file is too large to import (over ~12 MB).", "bad_data");
    const { rows, truncated } = cap(parseCsv(body));
    return { source: "drive", fileId, title, tabs: [], tab: null, rows, truncated };
  }

  if (sheetsOn) {
    const metaRes = await googleApi(
      "sheets",
      `https://sheets.googleapis.com/v4/spreadsheets/${fileId}?fields=properties.title,sheets.properties.title`,
    );
    const meta = (await metaRes.json()) as {
      properties?: { title?: string };
      sheets?: { properties?: { title?: string } }[];
    };
    title = meta.properties?.title ?? title;
    const tabs = (meta.sheets ?? []).map((s) => s.properties?.title ?? "").filter(Boolean);
    const chosen = tab && tabs.includes(tab) ? tab : tabs[0];
    if (!chosen) throw new ImportError("That spreadsheet has no tabs.", "bad_data");
    const range = `'${chosen.replace(/'/g, "''")}'!A1:AZ${MAX_IMPORT_ROWS + 1}`;
    const valuesRes = await googleApi(
      "sheets",
      `https://sheets.googleapis.com/v4/spreadsheets/${fileId}/values/${encodeURIComponent(range)}?valueRenderOption=FORMATTED_VALUE&dateTimeRenderOption=FORMATTED_STRING`,
    );
    const values = ((await valuesRes.json()) as { values?: unknown[][] }).values ?? [];
    // The API trims trailing empty cells, so pad every row to the header width.
    const width = Math.max(0, ...values.map((r) => r.length));
    const rows = values
      .map((r) => Array.from({ length: width }, (_, i) => (r[i] === undefined ? "" : String(r[i]))))
      .filter((r) => r.some((c) => c.trim() !== ""));
    return {
      source: "sheets",
      fileId,
      title,
      tabs,
      tab: chosen,
      rows: rows.slice(0, MAX_IMPORT_ROWS + 1),
      truncated: values.length > MAX_IMPORT_ROWS + 1,
    };
  }

  // Drive-only: export the first tab as CSV.
  const res = await googleApi(
    "drive",
    `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text%2Fcsv`,
  );
  const { rows, truncated } = cap(parseCsv(await res.text()));
  return { source: "drive", fileId, title, tabs: [], tab: null, rows, truncated };
}

// -------------------------------------------------------- Google Analytics 4

export interface GaProperty {
  id: string; // numeric id, without "properties/"
  name: string;
  account: string;
}

export async function listGaProperties(): Promise<GaProperty[]> {
  const res = await googleApi(
    "ga",
    "https://analyticsadmin.googleapis.com/v1beta/accountSummaries?pageSize=200",
  );
  const json = (await res.json()) as {
    accountSummaries?: {
      displayName?: string;
      propertySummaries?: { property?: string; displayName?: string }[];
    }[];
  };
  const out: GaProperty[] = [];
  for (const acc of json.accountSummaries ?? []) {
    for (const p of acc.propertySummaries ?? []) {
      const id = p.property?.replace("properties/", "");
      if (id)
        out.push({ id, name: p.displayName ?? `Property ${id}`, account: acc.displayName ?? "" });
    }
  }
  return out;
}

export interface GaMonth {
  month: string; // YYYY-MM-01
  channel: string | null;
  sessions: number;
  keyEvents: number;
  revenue: number;
}

function monthsAgoStart(n: number): string {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - n, 1));
  return d.toISOString().slice(0, 10);
}

async function gaReport(propertyId: string, dimension: string | null, keyMetric: string) {
  const body = {
    dateRanges: [{ startDate: monthsAgoStart(5), endDate: "today" }],
    dimensions: [{ name: "yearMonth" }, ...(dimension ? [{ name: dimension }] : [])],
    metrics: [{ name: "sessions" }, { name: keyMetric }, { name: "purchaseRevenue" }],
    limit: 1000,
  };
  const res = await googleApi(
    "ga",
    `https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(propertyId)}:runReport`,
    { method: "POST", body },
  );
  return (await res.json()) as {
    rows?: { dimensionValues?: { value?: string }[]; metricValues?: { value?: string }[] }[];
  };
}

/** Six months of sessions / key events / purchase revenue, by month and by
 *  default channel group, plus the property's reporting currency. */
export async function fetchGaMonths(
  propertyId: string,
): Promise<{ months: GaMonth[]; currency: string }> {
  const propRes = await googleApi(
    "ga",
    `https://analyticsadmin.googleapis.com/v1beta/properties/${encodeURIComponent(propertyId)}`,
  );
  const currency = ((await propRes.json()) as { currencyCode?: string }).currencyCode ?? "USD";

  const run = async (dimension: string | null) => {
    try {
      return await gaReport(propertyId, dimension, "keyEvents");
    } catch (e) {
      // Properties that predate the "key events" rename still expose "conversions".
      if (e instanceof ImportError && /keyEvents|Unknown|invalid/i.test(e.message)) {
        return gaReport(propertyId, dimension, "conversions");
      }
      throw e;
    }
  };
  const [totals, byChannel] = await Promise.all([run(null), run("sessionDefaultChannelGroup")]);

  const toMonth = (ym: string) => `${ym.slice(0, 4)}-${ym.slice(4, 6)}-01`;
  const months: GaMonth[] = [];
  for (const r of totals.rows ?? []) {
    const ym = r.dimensionValues?.[0]?.value;
    if (!ym || ym.length !== 6) continue;
    months.push({
      month: toMonth(ym),
      channel: null,
      sessions: Number(r.metricValues?.[0]?.value ?? 0),
      keyEvents: Math.round(Number(r.metricValues?.[1]?.value ?? 0)),
      revenue: Number(r.metricValues?.[2]?.value ?? 0),
    });
  }
  for (const r of byChannel.rows ?? []) {
    const ym = r.dimensionValues?.[0]?.value;
    const channel = r.dimensionValues?.[1]?.value;
    if (!ym || ym.length !== 6 || !channel) continue;
    months.push({
      month: toMonth(ym),
      channel,
      sessions: Number(r.metricValues?.[0]?.value ?? 0),
      keyEvents: Math.round(Number(r.metricValues?.[1]?.value ?? 0)),
      revenue: Number(r.metricValues?.[2]?.value ?? 0),
    });
  }
  return { months, currency };
}

// -------------------------------------------------------------------- Gmail

export interface GmailLead {
  email: string;
  name: string | null;
  firstSeen: string; // YYYY-MM-DD
}

const BULK_SENDER =
  /(no-?reply|do-?not-?reply|notification|mailer-daemon|postmaster|newsletter|bounce)/i;
const GMAIL_SCAN_LIMIT = 200;

/** New senders in the primary inbox → inbound enquiries. Skips mailing lists
 *  (anything with List-Unsubscribe / bulk precedence) and no-reply senders.
 *  Scans the latest 200 primary-inbox emails of the last 6 months — a bounded
 *  sample, which the import note says out loud. */
export async function fetchGmailLeads(): Promise<{ leads: GmailLead[]; scanned: number }> {
  const profileRes = await googleApi(
    "gmail",
    "https://gmail.googleapis.com/gmail/v1/users/me/profile",
  );
  const me =
    ((await profileRes.json()) as { emailAddress?: string }).emailAddress?.toLowerCase() ?? "";

  // The metadata-only scope can't use Gmail's `q` search, so filter by label here and by date below.
  const listUrl = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
  listUrl.searchParams.append("labelIds", "INBOX");
  listUrl.searchParams.append("labelIds", "CATEGORY_PERSONAL");
  listUrl.searchParams.set("maxResults", String(GMAIL_SCAN_LIMIT));
  const listRes = await googleApi("gmail", listUrl.toString());
  const ids =
    ((await listRes.json()) as { messages?: { id: string }[] }).messages?.map((m) => m.id) ?? [];
  const cutoff = Date.now() - 180 * 86_400_000;

  const bySender = new Map<string, GmailLead>();
  const fetchOne = async (id: string) => {
    const u = new URL(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}`);
    u.searchParams.set("format", "metadata");
    for (const h of ["From", "Date", "List-Unsubscribe", "Precedence", "Auto-Submitted"]) {
      u.searchParams.append("metadataHeaders", h);
    }
    const res = await googleApi("gmail", u.toString());
    const j = (await res.json()) as {
      internalDate?: string;
      payload?: { headers?: { name: string; value: string }[] };
    };
    const headers = new Map((j.payload?.headers ?? []).map((h) => [h.name.toLowerCase(), h.value]));
    if (headers.has("list-unsubscribe")) return;
    if (/bulk|list|junk/i.test(headers.get("precedence") ?? "")) return;
    const auto = headers.get("auto-submitted");
    if (auto && auto.toLowerCase() !== "no") return;
    const from = headers.get("from") ?? "";
    const m = from.match(/^(?:"?([^"<]*?)"?\s*)?<?([^<>\s]+@[^<>\s]+)>?$/);
    const email = m?.[2]?.toLowerCase();
    if (!email || email === me || BULK_SENDER.test(email)) return;
    const name = m?.[1]?.trim() || null;
    if (Number(j.internalDate ?? Date.now()) < cutoff) return;
    const when = new Date(Number(j.internalDate ?? Date.now())).toISOString().slice(0, 10);
    const prev = bySender.get(email);
    if (!prev) bySender.set(email, { email, name, firstSeen: when });
    else if (when < prev.firstSeen) prev.firstSeen = when;
  };

  // Modest concurrency keeps us inside Gmail's per-user rate limit.
  for (let i = 0; i < ids.length; i += 20) {
    await Promise.all(ids.slice(i, i + 20).map(fetchOne));
  }
  return { leads: [...bySender.values()], scanned: ids.length };
}
