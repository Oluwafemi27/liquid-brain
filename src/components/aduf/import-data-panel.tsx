import { Link } from "@tanstack/react-router";
import {
  BarChart3,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  Mail,
  RefreshCw,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GlassCard } from "@/components/aduf/liquid";
import { useBusinessDataRefresh } from "@/hooks/use-business-data-refresh";
import { Button } from "@/components/ui/button";
import type { ImportSummary } from "@/lib/aduf-types";
import {
  autoMap,
  detectKind,
  KIND_FIELDS,
  KIND_LABELS,
  MAX_IMPORT_ROWS,
  missingRequired,
  normalizeRows,
  parseCsv,
  SUPPORTED_CURRENCIES,
  type DateOrder,
  type FieldKey,
  type ImportKind,
  type Mapping,
} from "@/lib/import-mapping";
import {
  deleteImportFn,
  importGaFn,
  importGmailLeadsFn,
  importTableFn,
  listGaPropertiesFn,
  listGoogleFilesFn,
  loadGoogleTableFn,
  resyncImportFn,
} from "@/lib/server-fns";
import { PLATFORM_NAMES } from "@/lib/permissions-catalog";
import { useAduf } from "@/store/aduf-store";
import { useAuth } from "@/store/auth-store";

// ------------------------------------------------------------------ helpers

type Tab = "file" | "google" | "ga" | "gmail";

interface Draft {
  source: "csv" | "sheets" | "drive";
  sourceRef: string;
  label: string;
  rows: string[][]; // header + data
  truncated: boolean;
  tabs: string[];
  tab: string | null;
  fileRef: string | null; // Google file id/url, for switching tabs
}

type Notice = { kind: "ok" | "error"; text: string; detail?: string[] } | null;

const selectClass =
  "w-full rounded-xl border border-white/10 bg-white/6 px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring";

const SOURCE_LABEL: Record<ImportSummary["source"], string> = new Proxy(
  {} as Record<string, string>,
  { get: (_t, k: string) => (k === "csv" ? "File upload" : (PLATFORM_NAMES[k] ?? k)) },
);

const KIND_NOUN: Record<ImportSummary["kind"], string> = {
  sale: "sales",
  lead: "leads",
  customer: "customers",
  deal: "deals",
  traffic: "months of traffic",
};

function detectCurrency(rows: string[][], col: number | undefined): string {
  if (col === undefined) return "NGN";
  const sample = rows
    .slice(0, 60)
    .map((r) => r[col] ?? "")
    .join(" ");
  if (/₦|NGN|naira/i.test(sample)) return "NGN";
  if (/€|EUR/i.test(sample)) return "EUR";
  if (/£|GBP/i.test(sample)) return "GBP";
  if (/\$|USD/i.test(sample)) return "USD";
  if (/GHS|₵/i.test(sample)) return "GHS";
  if (/KES/i.test(sample)) return "KES";
  if (/ZAR/i.test(sample)) return "ZAR";
  return "NGN";
}

function clampRows(rows: string[][]): string[][] {
  return rows
    .slice(0, MAX_IMPORT_ROWS + 1)
    .map((r) => r.slice(0, 200).map((c) => c.slice(0, 2000)));
}

function NoticeBar({ notice }: { notice: Notice }) {
  if (!notice) return null;
  const ok = notice.kind === "ok";
  return (
    <div
      role={ok ? "status" : "alert"}
      className={`mt-4 flex gap-2.5 rounded-2xl p-3 text-xs ${
        ok ? "bg-white/[0.07] text-foreground" : "bg-destructive/15 text-foreground"
      }`}
    >
      {ok ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-cyan" />
      ) : (
        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
      )}
      <div className="min-w-0">
        <p className="break-words">{notice.text}</p>
        {notice.detail?.length ? (
          <ul className="mt-1.5 space-y-0.5 text-muted-foreground">
            {notice.detail.map((d) => (
              <li key={d} className="break-words">
                · {d}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

function NeedsConnection({ name }: { name: string }) {
  return (
    <div className="rounded-2xl bg-white/[0.05] p-4 text-sm text-muted-foreground">
      {name} isn&apos;t connected yet.{" "}
      <Link to="/settings" className="text-foreground underline underline-offset-4">
        Connect it in Settings
      </Link>{" "}
      and come back.
    </div>
  );
}

// -------------------------------------------------------------- mapping step

function MappingStep({
  draft,
  onCancel,
  onDone,
  onSwitchTab,
}: {
  draft: Draft;
  onCancel: () => void;
  onDone: (notice: Notice) => void;
  onSwitchTab?: (tab: string) => void;
}) {
  const accessToken = useAuth((s) => s.accessToken);
  const refresh = useBusinessDataRefresh();
  const header = draft.rows[0] ?? [];
  const body = useMemo(() => draft.rows.slice(1), [draft.rows]);

  const [kind, setKind] = useState<ImportKind>(() => detectKind(header));
  const [mapping, setMapping] = useState<Mapping>(() => autoMap(detectKind(header), header));
  const [currency, setCurrency] = useState(() =>
    detectCurrency(body, autoMap(detectKind(header), header).amount),
  );
  const [dateOrder, setDateOrder] = useState<DateOrder>("auto");
  const [busy, setBusy] = useState(false);

  const changeKind = (next: ImportKind) => {
    const m = autoMap(next, header);
    setKind(next);
    setMapping(m);
    setCurrency(detectCurrency(body, m.amount));
  };
  const setField = (key: FieldKey, value: string) =>
    setMapping((prev) => {
      const next = { ...prev };
      if (value === "") delete next[key];
      else next[key] = Number(value);
      return next;
    });

  const result = useMemo(
    () => normalizeRows(kind, body, mapping, dateOrder),
    [kind, body, mapping, dateOrder],
  );
  const missing = missingRequired(kind, mapping);
  const fields = KIND_FIELDS[kind];
  const hasAmount = fields.some((f) => f.key === "amount");
  const colName = (i: number) => (header[i]?.trim() ? header[i]!.trim() : `Column ${i + 1}`);

  const submit = async () => {
    setBusy(true);
    try {
      const cleanMapping: Record<string, number> = {};
      for (const [k, v] of Object.entries(mapping)) if (v !== undefined) cleanMapping[k] = v;
      const res = await importTableFn({
        data: {
          accessToken,
          source: draft.source,
          sourceRef: draft.sourceRef,
          label: draft.label,
          kind,
          currency,
          dateOrder,
          fileRef: draft.fileRef,
          tab: draft.tab,
          mapping: cleanMapping,
          rows: clampRows(draft.rows).slice(1),
        },
      });
      if (!res.ok) {
        onDone({ kind: "error", text: res.error });
        return;
      }
      await refresh();
      const o = res.outcome;
      onDone({
        kind: "ok",
        text: `Imported ${o.imported.toLocaleString()} ${KIND_NOUN[kind]} from ${draft.label}${
          o.skipped ? ` · ${o.skipped} row${o.skipped === 1 ? "" : "s"} skipped` : ""
        }.`,
        detail: o.skippedSample.map((s) => `Row ${s.row}: ${s.reason}`),
      });
    } catch (err) {
      console.error("[import] failed", err);
      onDone({
        kind: "error",
        text: "The import request failed. Check your connection and try again.",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium break-words">{draft.label}</p>
        <p className="text-xs text-muted-foreground">
          {body.length.toLocaleString()} rows · {header.length} columns
          {draft.truncated
            ? ` · only the first ${MAX_IMPORT_ROWS.toLocaleString()} rows are read`
            : ""}
        </p>
      </div>

      {draft.tabs.length > 1 && onSwitchTab ? (
        <label className="block text-xs text-muted-foreground">
          Sheet tab
          <select
            className={`${selectClass} mt-1`}
            value={draft.tab ?? ""}
            onChange={(e) => onSwitchTab(e.target.value)}
          >
            {draft.tabs.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs text-muted-foreground">
          This file contains
          <select
            className={`${selectClass} mt-1`}
            value={kind}
            onChange={(e) => changeKind(e.target.value as ImportKind)}
          >
            {(Object.keys(KIND_LABELS) as ImportKind[]).map((k) => (
              <option key={k} value={k}>
                {KIND_LABELS[k]}
              </option>
            ))}
          </select>
        </label>
        {hasAmount ? (
          <label className="block text-xs text-muted-foreground">
            Amounts are in
            <select
              className={`${selectClass} mt-1`}
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map((f) => (
          <label key={f.key} className="block text-xs text-muted-foreground">
            {f.label}
            {f.required ? " *" : ""}
            <select
              className={`${selectClass} mt-1`}
              value={mapping[f.key] === undefined ? "" : String(mapping[f.key])}
              onChange={(e) => setField(f.key, e.target.value)}
            >
              <option value="">— not in this file —</option>
              {header.map((_, i) => (
                <option key={i} value={i}>
                  {colName(i)}
                </option>
              ))}
            </select>
            {f.hint ? <span className="mt-0.5 block text-[10px] opacity-70">{f.hint}</span> : null}
          </label>
        ))}
      </div>

      {fields.some((f) => f.key === "date") ? (
        <label className="block text-xs text-muted-foreground sm:max-w-xs">
          Date format
          <select
            className={`${selectClass} mt-1`}
            value={dateOrder}
            onChange={(e) => setDateOrder(e.target.value as DateOrder)}
          >
            <option value="auto">Detect automatically</option>
            <option value="dmy">Day / Month / Year (31/12/2026)</option>
            <option value="mdy">Month / Day / Year (12/31/2026)</option>
          </select>
        </label>
      ) : null}

      {missing.length > 0 ? (
        <p className="rounded-2xl bg-destructive/15 p-3 text-xs">
          Pick a column for: {missing.map((m) => m.label).join(", ")}.
        </p>
      ) : (
        <div className="rounded-2xl bg-white/[0.05] p-3 text-xs">
          <p className="font-medium">
            {result.records.length.toLocaleString()} of {body.length.toLocaleString()} rows are
            ready to import
            {result.skipped.length ? ` · ${result.skipped.length} will be skipped` : ""}
          </p>
          {result.datesAmbiguous ? (
            <p className="mt-1 text-muted-foreground">
              Every date in this file could be read either way, so it&apos;s treated as
              day/month/year. Switch the date format above if that&apos;s wrong.
            </p>
          ) : null}
          {result.skipped.slice(0, 3).map((s) => (
            <p key={`${s.row}-${s.reason}`} className="mt-1 text-muted-foreground">
              Row {s.row}: {s.reason}
            </p>
          ))}
          {result.records.length > 0 ? (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[420px] text-left text-[11px]">
                <thead className="text-muted-foreground">
                  <tr>
                    {fields
                      .filter((f) => mapping[f.key] !== undefined || f.key === "stage")
                      .map((f) => (
                        <th key={f.key} className="pb-1 pr-3 font-medium">
                          {f.label}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {result.records.slice(0, 4).map((r, i) => (
                    <tr key={i} className="border-t border-white/5">
                      {fields
                        .filter((f) => mapping[f.key] !== undefined || f.key === "stage")
                        .map((f) => {
                          const v =
                            f.key === "date"
                              ? r.occurredOn
                              : f.key === "amount"
                                ? r.amount
                                : f.key === "orders"
                                  ? r.orders
                                  : f.key === "probability"
                                    ? r.probability
                                    : r[
                                        f.key as
                                          | "name"
                                          | "company"
                                          | "email"
                                          | "channel"
                                          | "stage"
                                          | "owner"
                                          | "segment"
                                      ];
                          return (
                            <td key={f.key} className="max-w-[140px] truncate py-1 pr-3">
                              {v ?? "—"}
                            </td>
                          );
                        })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          onClick={submit}
          disabled={busy || missing.length > 0 || result.records.length === 0}
        >
          {busy ? <Loader2 className="animate-spin" /> : <Upload />}
          {busy
            ? "Importing…"
            : `Import ${result.records.length.toLocaleString()} ${KIND_NOUN[kind]}`}
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Importing this same file again replaces what it added before — nothing is counted twice.
      </p>
    </div>
  );
}

// -------------------------------------------------------------------- tabs

function FileTab({
  onDraft,
  setNotice,
}: {
  onDraft: (d: Draft) => void;
  setNotice: (n: Notice) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [reading, setReading] = useState(false);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setNotice(null);
    if (/\.(xlsx|xls|xlsm|numbers|ods)$/i.test(file.name)) {
      setNotice({
        kind: "error",
        text: "Excel and Numbers files can't be read directly. In your spreadsheet app choose File → Export / Save as → CSV, then upload that — or open it in Google Sheets and import it from the Google tab.",
      });
      return;
    }
    if (file.size > 8_000_000) {
      setNotice({
        kind: "error",
        text: "That file is over 8 MB. Split it or export fewer columns.",
      });
      return;
    }
    setReading(true);
    try {
      const rows = parseCsv(await file.text());
      if (rows.length < 2) {
        setNotice({
          kind: "error",
          text: "That file has no data rows — it needs a header row plus at least one row.",
        });
        return;
      }
      onDraft({
        source: "csv",
        sourceRef: `csv:${file.name.toLowerCase()}`,
        label: file.name,
        rows: clampRows(rows),
        truncated: rows.length > MAX_IMPORT_ROWS + 1,
        tabs: [],
        tab: null,
        fileRef: null,
      });
    } catch {
      setNotice({
        kind: "error",
        text: "Couldn't read that file. Make sure it's a plain .csv export.",
      });
    } finally {
      setReading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Upload a CSV of your sales, leads, customers or deals — an export from Shopify, Paystack, a
        CRM or Excel. We detect the columns and show you exactly what will be imported before
        anything is saved.
      </p>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.tsv,.txt,text/csv"
        className="hidden"
        onChange={(e) => void onFile(e.target.files?.[0])}
      />
      <Button onClick={() => inputRef.current?.click()} disabled={reading}>
        {reading ? <Loader2 className="animate-spin" /> : <Upload />}
        Choose CSV file
      </Button>
    </div>
  );
}

function GoogleTab({
  onDraft,
  setNotice,
}: {
  onDraft: (d: Draft) => void;
  setNotice: (n: Notice) => void;
}) {
  const accessToken = useAuth((s) => s.accessToken);
  const sources = useAduf((s) => s.sources);
  const driveOn = sources.find((s) => s.id === "drive")?.connected ?? false;
  const sheetsOn = sources.find((s) => s.id === "sheets")?.connected ?? false;

  const [files, setFiles] = useState<
    { id: string; name: string; kind: "sheet" | "csv"; modifiedTime: string }[]
  >([]);
  const [listing, setListing] = useState(false);
  const [query, setQuery] = useState("");
  const [link, setLink] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const loadList = useCallback(
    async (q?: string) => {
      if (!driveOn) return;
      setListing(true);
      try {
        const res = await listGoogleFilesFn({ data: { accessToken, ...(q ? { query: q } : {}) } });
        if (res.ok) setFiles(res.files);
        else setNotice({ kind: "error", text: res.error });
      } catch {
        setNotice({ kind: "error", text: "Couldn't reach Google Drive. Try again." });
      } finally {
        setListing(false);
      }
    },
    [accessToken, driveOn, setNotice],
  );

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const open = async (file: string, label?: string) => {
    setNotice(null);
    setLoadingId(file);
    try {
      const res = await loadGoogleTableFn({ data: { accessToken, file } });
      if (!res.ok) {
        setNotice({ kind: "error", text: res.error });
        return;
      }
      const t = res.table;
      if (t.rows.length < 2) {
        setNotice({
          kind: "error",
          text: `“${t.title}” has no data rows — it needs a header row plus at least one row.`,
        });
        return;
      }
      onDraft({
        source: t.source,
        sourceRef: `${t.source}:${t.fileId}${t.tab ? `:${t.tab}` : ""}`,
        label: `${label ?? t.title}${t.tab && t.tabs.length > 1 ? ` — ${t.tab}` : ""}`,
        rows: clampRows(t.rows),
        truncated: t.truncated,
        tabs: t.tabs,
        tab: t.tab,
        fileRef: t.fileId,
      });
    } catch {
      setNotice({ kind: "error", text: "Couldn't read that file from Google. Try again." });
    } finally {
      setLoadingId(null);
    }
  };

  if (!driveOn && !sheetsOn) return <NeedsConnection name="Google Drive or Google Sheets" />;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Pick a spreadsheet from your Drive, or paste a Google Sheets link. Read-only — ADUF never
        edits your files.
      </p>

      <div className="flex gap-2">
        <input
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="Paste a Google Sheets link"
          className={selectClass}
        />
        <Button onClick={() => void open(link)} disabled={!link.trim() || loadingId !== null}>
          {loadingId === link ? <Loader2 className="animate-spin" /> : null}
          Load
        </Button>
      </div>

      {driveOn ? (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void loadList(query);
              }}
              placeholder="Search your Drive by file name"
              className={selectClass}
            />
            <Button
              variant="outline"
              onClick={() => void loadList(query)}
              disabled={listing}
              aria-label="Refresh files"
            >
              <RefreshCw className={listing ? "animate-spin" : ""} />
            </Button>
          </div>
          <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
            {files.length === 0 && !listing ? (
              <p className="py-3 text-center text-xs text-muted-foreground">
                No spreadsheets or CSV files found.
              </p>
            ) : null}
            {files.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => void open(f.id, f.name)}
                disabled={loadingId !== null}
                className="flex w-full items-center gap-3 rounded-2xl bg-white/[0.05] p-3 text-left transition-colors hover:bg-white/10 disabled:opacity-60"
              >
                {loadingId === f.id ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                ) : (
                  <FileSpreadsheet className="h-4 w-4 shrink-0 text-cyan" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{f.name}</span>
                  <span className="block text-[11px] text-muted-foreground">
                    {f.kind === "sheet" ? "Google Sheet" : "CSV"} · edited{" "}
                    {new Date(f.modifiedTime).toLocaleDateString()}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground">
          Connect Google Drive in Settings to browse your files here instead of pasting links.
        </p>
      )}
    </div>
  );
}

function GaTab({ setNotice }: { setNotice: (n: Notice) => void }) {
  const accessToken = useAuth((s) => s.accessToken);
  const connected = useAduf((s) => s.sources.find((x) => x.id === "ga")?.connected ?? false);
  const refresh = useBusinessDataRefresh();
  const [props, setProps] = useState<{ id: string; name: string; account: string }[] | null>(null);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listGaPropertiesFn({ data: { accessToken } });
      if (!res.ok) {
        setNotice({ kind: "error", text: res.error });
        setProps([]);
        return;
      }
      setProps(res.properties);
      setSelected((cur) => cur || res.properties[0]?.id || "");
    } catch {
      setNotice({ kind: "error", text: "Couldn't reach Google Analytics. Try again." });
      setProps([]);
    } finally {
      setLoading(false);
    }
  }, [accessToken, setNotice]);

  useEffect(() => {
    if (connected) void load();
  }, [connected, load]);

  if (!connected) return <NeedsConnection name="Google Analytics" />;

  const run = async () => {
    const p = props?.find((x) => x.id === selected);
    if (!p) return;
    setNotice(null);
    setBusy(true);
    try {
      const res = await importGaFn({
        data: { accessToken, propertyId: p.id, propertyName: p.name },
      });
      if (!res.ok) {
        setNotice({ kind: "error", text: res.error });
        return;
      }
      await refresh();
      setNotice({
        kind: "ok",
        text: `Imported 6 months of traffic from ${p.name}. Sessions, key events and purchase revenue now feed Sales trend, Leads and Revenue by Channel.`,
        detail: [res.outcome.note],
      });
    } catch {
      setNotice({ kind: "error", text: "The import request failed. Try again." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Pulls the last 6 months of sessions, key events and purchase revenue from a GA4 property, by
        month and by channel. Used for Sales / Leads / Channel panels only when you haven&apos;t
        imported your own sales or lead data — your own records always win.
      </p>
      {loading ? (
        <p className="text-xs text-muted-foreground">Loading your properties…</p>
      ) : props && props.length > 0 ? (
        <>
          <select
            className={selectClass}
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            {props.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.account ? ` — ${p.account}` : ""}
              </option>
            ))}
          </select>
          <Button onClick={run} disabled={busy || !selected}>
            {busy ? <Loader2 className="animate-spin" /> : <BarChart3 />}
            {busy ? "Importing…" : "Import last 6 months"}
          </Button>
        </>
      ) : props ? (
        <p className="text-xs text-muted-foreground">
          No GA4 properties were found for the connected Google account.{" "}
          <button
            type="button"
            className="underline underline-offset-4"
            onClick={() => void load()}
          >
            Try again
          </button>
        </p>
      ) : null}
    </div>
  );
}

function GmailTab({ setNotice }: { setNotice: (n: Notice) => void }) {
  const accessToken = useAuth((s) => s.accessToken);
  const connected = useAduf((s) => s.sources.find((x) => x.id === "gmail")?.connected ?? false);
  const refresh = useBusinessDataRefresh();
  const [busy, setBusy] = useState(false);
  if (!connected) return <NeedsConnection name="Gmail" />;

  const run = async () => {
    setNotice(null);
    setBusy(true);
    try {
      const res = await importGmailLeadsFn({ data: { accessToken } });
      if (!res.ok) {
        setNotice({ kind: "error", text: res.error });
        return;
      }
      await refresh();
      setNotice({
        kind: "ok",
        text: `Imported ${res.outcome.imported} inbound enquiries as leads.`,
        detail: [res.outcome.note],
      });
    } catch {
      setNotice({ kind: "error", text: "The import request failed. Try again." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Counts each new person who emailed your primary inbox in the last 6 months as a lead. Only
        the sender and date are read — never the message text — and newsletters, receipts and
        no-reply mail are ignored. It scans your latest 200 primary-inbox emails, so treat it as a
        sample, not a full CRM.
      </p>
      <Button onClick={run} disabled={busy}>
        {busy ? <Loader2 className="animate-spin" /> : <Mail />}
        {busy ? "Scanning inbox…" : "Import inbound enquiries"}
      </Button>
    </div>
  );
}

// ------------------------------------------------------------ import history

function ImportHistory({
  imports,
  setNotice,
}: {
  imports: ImportSummary[];
  setNotice: (n: Notice) => void;
}) {
  const accessToken = useAuth((s) => s.accessToken);
  const refresh = useBusinessDataRefresh();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  if (imports.length === 0) return null;

  const sync = async (id: string) => {
    setSyncingId(id);
    try {
      const res = await resyncImportFn({ data: { accessToken, importId: id } });
      setNotice(res.ok ? { kind: "ok", text: res.message } : { kind: "error", text: res.error });
      await refresh();
    } catch {
      setNotice({ kind: "error", text: "Couldn't sync. Try again." });
    } finally {
      setSyncingId(null);
    }
  };

  const remove = async (id: string) => {
    setBusyId(id);
    try {
      const res = await deleteImportFn({ data: { accessToken, importId: id } });
      if (!res.ok) setNotice({ kind: "error", text: res.error });
      else {
        await refresh();
        setNotice({ kind: "ok", text: "Import removed. The panels now reflect what's left." });
      }
    } catch {
      setNotice({ kind: "error", text: "Couldn't remove that import. Try again." });
    } finally {
      setBusyId(null);
      setConfirmId(null);
    }
  };

  return (
    <div className="mt-6 border-t border-white/10 pt-4">
      <h3 className="mb-2 text-sm font-semibold">Imported data</h3>
      <div className="space-y-2">
        {imports.map((i) => (
          <div key={i.id} className="flex items-center gap-3 rounded-2xl bg-white/[0.04] p-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">{i.label}</p>
              <p className="text-[11px] text-muted-foreground">
                {SOURCE_LABEL[i.source]} · {i.rowsImported.toLocaleString()} {KIND_NOUN[i.kind]}
                {i.rowsSkipped ? ` · ${i.rowsSkipped} skipped` : ""} ·{" "}
                {new Date(i.createdAt).toLocaleDateString()}
              </p>
            </div>
            {i.canSync && confirmId !== i.id ? (
              <Button
                size="icon"
                variant="ghost"
                aria-label={`Sync ${i.label} now`}
                disabled={syncingId === i.id}
                onClick={() => void sync(i.id)}
              >
                <RefreshCw className={syncingId === i.id ? "animate-spin" : ""} />
              </Button>
            ) : null}
            {confirmId === i.id ? (
              <div className="flex shrink-0 gap-1.5">
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={busyId === i.id}
                  onClick={() => void remove(i.id)}
                >
                  {busyId === i.id ? <Loader2 className="animate-spin" /> : "Remove"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmId(null)}>
                  Keep
                </Button>
              </div>
            ) : (
              <Button
                size="icon"
                variant="ghost"
                aria-label={`Remove ${i.label}`}
                onClick={() => setConfirmId(i.id)}
              >
                <Trash2 />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// -------------------------------------------------------------------- panel

const TABS: { id: Tab; label: string }[] = [
  { id: "file", label: "Upload CSV" },
  { id: "google", label: "Sheets & Drive" },
  { id: "ga", label: "Analytics" },
  { id: "gmail", label: "Gmail" },
];

/** The "Import business data" card on Analytics: the feature the old
 *  "importing sales, leads and customers isn't built yet" notice pointed at. */
export function ImportDataPanel() {
  const imports = useAduf((s) => s.businessMeta?.imports ?? []);
  const accessToken = useAuth((s) => s.accessToken);
  const [tab, setTab] = useState<Tab>("file");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [switching, setSwitching] = useState(false);

  const switchTab = async (tabName: string) => {
    if (!draft?.fileRef) return;
    setSwitching(true);
    try {
      const res = await loadGoogleTableFn({
        data: { accessToken, file: draft.fileRef, tab: tabName },
      });
      if (!res.ok) {
        setNotice({ kind: "error", text: res.error });
        return;
      }
      const t = res.table;
      setDraft({
        ...draft,
        sourceRef: `${t.source}:${t.fileId}${t.tab ? `:${t.tab}` : ""}`,
        label: `${draft.label.split(" — ")[0]}${t.tab ? ` — ${t.tab}` : ""}`,
        rows: clampRows(t.rows),
        truncated: t.truncated,
        tab: t.tab,
      });
    } catch {
      setNotice({ kind: "error", text: "Couldn't load that tab. Try again." });
    } finally {
      setSwitching(false);
    }
  };

  return (
    <GlassCard hover={false} className="mb-6">
      <h2 className="text-base font-semibold">Import business data</h2>
      <p className="mb-4 text-xs text-muted-foreground">
        Bring in sales, leads, customers and deals — the panels below are built only from what you
        import.
      </p>

      {draft ? (
        <div className={switching ? "pointer-events-none opacity-60" : undefined}>
          <MappingStep
            key={draft.sourceRef}
            draft={draft}
            onCancel={() => setDraft(null)}
            onSwitchTab={(t) => void switchTab(t)}
            onDone={(n) => {
              setNotice(n);
              if (n?.kind === "ok") setDraft(null);
            }}
          />
        </div>
      ) : (
        <>
          <div className="-mx-1 mb-4 flex gap-1 overflow-x-auto px-1 pb-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTab(t.id);
                  setNotice(null);
                }}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs transition-colors ${
                  tab === t.id
                    ? "bg-white/15 text-foreground"
                    : "bg-white/[0.05] text-muted-foreground hover:bg-white/10"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          {tab === "file" ? <FileTab onDraft={setDraft} setNotice={setNotice} /> : null}
          {tab === "google" ? <GoogleTab onDraft={setDraft} setNotice={setNotice} /> : null}
          {tab === "ga" ? <GaTab setNotice={setNotice} /> : null}
          {tab === "gmail" ? <GmailTab setNotice={setNotice} /> : null}
        </>
      )}

      <NoticeBar notice={notice} />
      <ImportHistory imports={imports} setNotice={setNotice} />
    </GlassCard>
  );
}
