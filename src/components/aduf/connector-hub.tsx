import { Blocks, ChevronDown, Loader2, Search, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { HealthBadge } from "@/components/aduf/health-badge";
import { IntegrationAccess } from "@/components/aduf/integration-access";
import { GlassCard } from "@/components/aduf/liquid";
import { Button } from "@/components/ui/button";
import { useBusinessDataRefresh } from "@/hooks/use-business-data-refresh";
import type { ConnectionHealth, DataSource } from "@/lib/aduf-types";
import {
  CONNECTORS,
  CONNECTOR_BY_ID,
  CONNECTOR_CATEGORIES,
  importLabel,
  recommendConnectors,
  type ConnectorCategory,
  type ConnectorDef,
} from "@/lib/connector-registry";
import {
  fetchBusinessProfileFn,
  importFromConnectorFn,
  requestConnectorFn,
} from "@/lib/server-fns";
import { useAuth } from "@/store/auth-store";

type StatusFilter = "all" | "connected" | "available" | "imports" | "africa";

const AUTH_LABEL = { oauth: "Sign in", key: "API key", bot: "Bot token" } as const;
const IMPORTABLE = new Set([
  "paystack",
  "stripe",
  "flutterwave",
  "woocommerce",
  "hubspot",
  "pipedrive",
]);

/** A stable colour per category so a long list is easy to scan. */
const hue = (c: string) => [...c].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 360, 7);

function Monogram({ def }: { def: ConnectorDef }) {
  const letters = def.name
    .replace(/[^A-Za-z0-9 ]/g, "")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span
      aria-hidden
      className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-xs font-semibold"
      style={{
        background: `hsl(${hue(def.category)} 45% 32% / 0.55)`,
        color: `hsl(${hue(def.category)} 80% 88%)`,
      }}
    >
      {letters}
    </span>
  );
}

interface HubProps {
  sources: DataSource[];
  configured: Record<string, boolean>;
  health: Record<string, ConnectionHealth>;
  isAdmin: boolean;
  pouringId: string | null;
  onConnect: (id: string) => void;
  onDisconnect: (id: string) => void;
}

/** Every platform ADUF can connect to — collapsible, searchable, filterable by category and status. */
export function ConnectorHub({
  sources,
  configured,
  health,
  isAdmin,
  pouringId,
  onConnect,
  onDisconnect,
}: HubProps) {
  const accessToken = useAuth((s) => s.accessToken);
  const refreshBusinessData = useBusinessDataRefresh();
  const connectedIds = useMemo(
    () => new Set(sources.filter((s) => s.connected).map((s) => s.id)),
    [sources],
  );
  const [open, setOpen] = useState(false);
  const [openedByDefault, setOpenedByDefault] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ConnectorCategory | "All">("All");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [profile, setProfile] = useState("");
  const [reqName, setReqName] = useState("");
  const [reqNote, setReqNote] = useState("");
  const [reqBusy, setReqBusy] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchBusinessProfileFn({ data: { accessToken } })
      .then((r) => setProfile(r.profile))
      .catch(() => undefined);
  }, [accessToken]);

  // Nobody connected yet → show the list so the first step is obvious.
  useEffect(() => {
    if (!openedByDefault && sources.length > 0) {
      setOpenedByDefault(true);
      if (connectedIds.size === 0) setOpen(true);
    }
  }, [sources.length, connectedIds.size, openedByDefault]);

  const merged = useMemo(
    () => CONNECTORS.map((def) => ({ def, connected: connectedIds.has(def.id) })),
    [connectedIds],
  );
  const q = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    const score = (d: ConnectorDef) => {
      if (!q) return 0;
      const name = d.name.toLowerCase();
      if (name === q) return 100;
      if (name.startsWith(q)) return 80;
      if (name.includes(q)) return 60;
      if (d.category.toLowerCase().includes(q)) return 40;
      if (d.blurb.toLowerCase().includes(q)) return 20;
      return -1;
    };
    return merged
      .filter(({ def, connected }) => {
        if (category !== "All" && def.category !== category) return false;
        if (status === "connected" && !connected) return false;
        if (status === "available" && connected) return false;
        if (status === "imports" && !def.imports?.length) return false;
        if (status === "africa" && !def.africa) return false;
        return score(def) >= 0;
      })
      .sort(
        (a, b) =>
          score(b.def) - score(a.def) ||
          Number(!!b.def.popular) - Number(!!a.def.popular) ||
          a.def.name.localeCompare(b.def.name),
      );
  }, [merged, q, category, status]);

  const grouped = useMemo(() => {
    if (q) return [["Results", filtered] as const];
    return CONNECTOR_CATEGORIES.map(
      (c) => [c, filtered.filter((x) => x.def.category === c)] as const,
    ).filter(([, list]) => list.length > 0);
  }, [filtered, q]);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const { def } of merged) m.set(def.category, (m.get(def.category) ?? 0) + 1);
    return m;
  }, [merged]);

  const recommended = useMemo(
    () =>
      recommendConnectors(profile)
        .map((id) => CONNECTOR_BY_ID[id])
        .filter((d): d is ConnectorDef => !!d && !connectedIds.has(d.id))
        .slice(0, 4),
    [profile, connectedIds],
  );
  const filtersActive = q !== "" || category !== "All" || status !== "all";

  const importNow = async (id: string) => {
    setImportingId(id);
    setNotice(null);
    try {
      const res = await importFromConnectorFn({
        data: { accessToken, connectorId: id as "paystack" },
      });
      if (res.ok) {
        await refreshBusinessData();
        setNotice({
          ok: true,
          text: `Imported ${res.imported.toLocaleString()} records from ${CONNECTOR_BY_ID[id]?.name}. See them on the Analytics page.`,
        });
      } else setNotice({ ok: false, text: res.error });
    } catch {
      setNotice({ ok: false, text: "The import request failed. Try again." });
    } finally {
      setImportingId(null);
    }
  };

  const sendRequest = async () => {
    setReqBusy(true);
    setNotice(null);
    try {
      const res = await requestConnectorFn({ data: { accessToken, name: reqName, note: reqNote } });
      if (res.ok) {
        setNotice({
          ok: true,
          text: `Thanks — we've noted ${reqName.trim()}. The most-requested platforms get built first.`,
        });
        setReqName("");
        setReqNote("");
      } else setNotice({ ok: false, text: res.error });
    } catch {
      setNotice({ ok: false, text: "Couldn't send that. Try again." });
    } finally {
      setReqBusy(false);
    }
  };

  const connectedList = merged.filter((m) => m.connected);

  const card = ({ def, connected }: { def: ConnectorDef; connected: boolean }) => {
    const h = health[def.id];
    const needsSetup = def.auth === "oauth" && !configured[def.id];
    const adminOnly = def.auth !== "oauth" && !isAdmin;
    const expanded = detailId === def.id;
    return (
      <li key={def.id} className="rounded-2xl border border-white/8 bg-white/[0.04] p-3.5">
        <div className="flex items-start gap-3">
          <Monogram def={def} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h4 className="text-sm font-semibold">{def.name}</h4>
              {def.popular ? (
                <span className="rounded-full bg-cyan/15 px-1.5 py-0.5 text-[10px] text-cyan">
                  Popular
                </span>
              ) : null}
              {def.africa ? (
                <span className="rounded-full bg-emerald-400/15 px-1.5 py-0.5 text-[10px] text-emerald-300">
                  Africa
                </span>
              ) : null}
              {connected && h ? <HealthBadge state={h.state} /> : null}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">{def.blurb}</p>
            <p className="mt-1 text-[10px] text-muted-foreground/80">
              {AUTH_LABEL[def.auth]}
              {def.imports?.length ? ` · imports ${importLabel(def)}` : ""}
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {connected ? (
            <>
              <span className="rounded-full border border-white/15 px-3 py-1.5 text-xs">
                Connected
              </span>
              {IMPORTABLE.has(def.id) ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={importingId === def.id}
                  onClick={() => void importNow(def.id)}
                >
                  {importingId === def.id ? <Loader2 className="animate-spin" /> : null}Import now
                </Button>
              ) : null}
              {isAdmin && def.id !== "telegram" ? (
                <button
                  type="button"
                  onClick={() => onDisconnect(def.id)}
                  className="ml-auto text-[11px] text-muted-foreground hover:text-red-400"
                >
                  Disconnect
                </button>
              ) : null}
            </>
          ) : needsSetup ? (
            <span
              className="text-[11px] text-amber-200"
              title="The server needs this platform's app credentials first"
            >
              {isAdmin
                ? "Needs setup — add its app credentials on the server (docs/CONNECTORS.md)"
                : "Not available yet — ask your admin to enable it"}
            </span>
          ) : adminOnly ? (
            <span className="text-[11px] text-muted-foreground">
              Ask your admin to connect this
            </span>
          ) : (
            <button
              type="button"
              disabled={pouringId === def.id}
              onClick={() => onConnect(def.id)}
              className="rounded-full px-4 py-1.5 text-xs font-medium"
              style={{ background: "var(--gradient-accent)", color: "var(--background)" }}
            >
              {pouringId === def.id ? "Connecting…" : "Connect"}
            </button>
          )}
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => setDetailId(expanded ? null : def.id)}
            className="ml-auto inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
          >
            Details{" "}
            <ChevronDown
              className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`}
            />
          </button>
        </div>
        {expanded ? <IntegrationAccess id={def.id} connected={connected} health={h} /> : null}
      </li>
    );
  };

  return (
    <GlassCard hover={false} className="p-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="connector-hub-panel"
        className="flex w-full items-center gap-3 p-5 text-left"
      >
        <Blocks className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Connectors
          </span>
          <span className="mt-1 block text-xs text-muted-foreground">
            {connectedList.length} connected · {CONNECTORS.length} platforms available
          </span>
        </span>
        {!open && connectedList.length > 0 ? (
          <span className="hidden gap-1 sm:flex">
            {connectedList.slice(0, 6).map((m) => (
              <Monogram key={m.def.id} def={m.def} />
            ))}
          </span>
        ) : null}
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div id="connector-hub-panel" className="border-t border-white/10">
          {/* Toolbar */}
          <div className="space-y-3 p-4 sm:p-5">
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="relative block flex-1">
                <span className="sr-only">Search connectors</span>
                <Search
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <input
                  ref={searchRef}
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search platforms — try “payments”, “WhatsApp”, “CRM”…"
                  className="w-full rounded-xl border border-white/10 bg-white/6 py-2.5 pl-10 pr-9 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
                {query ? (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={() => {
                      setQuery("");
                      searchRef.current?.focus();
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </label>
              <select
                aria-label="Filter by status"
                value={status}
                onChange={(e) => setStatus(e.target.value as StatusFilter)}
                className="rounded-xl border border-white/10 bg-white/6 px-3 py-2.5 text-sm outline-none"
              >
                <option value="all">All platforms</option>
                <option value="connected">Connected</option>
                <option value="available">Not connected</option>
                <option value="imports">Can import data</option>
                <option value="africa">Built for Africa</option>
              </select>
            </div>

            <div
              role="group"
              aria-label="Categories"
              className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1"
            >
              {(["All", ...CONNECTOR_CATEGORIES] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-pressed={category === c}
                  onClick={() => setCategory(c)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs transition-colors ${category === c ? "bg-white/15 text-foreground" : "bg-white/[0.05] text-muted-foreground hover:bg-white/10"}`}
                >
                  {c}
                  <span className="ml-1.5 opacity-60">
                    {c === "All" ? CONNECTORS.length : (counts.get(c) ?? 0)}
                  </span>
                </button>
              ))}
            </div>

            {recommended.length > 0 && !filtersActive ? (
              <div className="rounded-2xl bg-white/[0.04] p-3">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-medium">
                  <Sparkles className="h-3.5 w-3.5 text-cyan" aria-hidden /> Good places to start
                </p>
                <div className="flex flex-wrap gap-2">
                  {recommended.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => {
                        setQuery(d.name);
                        setDetailId(d.id);
                      }}
                      className="inline-flex items-center gap-2 rounded-full bg-white/[0.07] py-1 pl-1 pr-3 text-xs hover:bg-white/12"
                    >
                      <Monogram def={d} />
                      <span>{d.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {notice ? (
              <p
                role={notice.ok ? "status" : "alert"}
                className={`rounded-xl p-3 text-xs ${notice.ok ? "bg-emerald-400/10 text-emerald-200" : "bg-red-400/10 text-red-200"}`}
              >
                {notice.text}
              </p>
            ) : null}
          </div>

          {/* Results */}
          <div
            className="max-h-[68vh] overflow-y-auto px-4 pb-5 sm:px-5"
            tabIndex={0}
            aria-label="Connector list"
          >
            {filtered.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nothing matches{q ? ` “${query.trim()}”` : ""}.{" "}
                {filtersActive ? (
                  <button
                    className="underline underline-offset-4"
                    onClick={() => {
                      setQuery("");
                      setCategory("All");
                      setStatus("all");
                    }}
                  >
                    Clear filters
                  </button>
                ) : null}
              </p>
            ) : (
              grouped.map(([cat, list]) => (
                <section key={cat} aria-label={cat} className="mb-5 last:mb-0">
                  <h3 className="sticky top-0 z-10 -mx-1 mb-2 bg-background/85 px-1 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground backdrop-blur">
                    {cat} <span className="font-normal opacity-60">· {list.length}</span>
                  </h3>
                  <ul className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">{list.map(card)}</ul>
                </section>
              ))
            )}

            {/* Request a connector */}
            <div className="mt-6 rounded-2xl border border-dashed border-white/15 p-4">
              <p className="text-sm font-medium">Can't find your platform?</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Tell us what you use. The most-requested platforms get built first.
              </p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  value={reqName}
                  onChange={(e) => setReqName(e.target.value)}
                  maxLength={60}
                  placeholder="Platform name"
                  aria-label="Platform name"
                  className="rounded-xl border border-white/10 bg-white/6 px-3 py-2 text-sm outline-none sm:w-56"
                />
                <input
                  value={reqNote}
                  onChange={(e) => setReqNote(e.target.value)}
                  maxLength={300}
                  placeholder="What would you do with it? (optional)"
                  aria-label="What would you do with it"
                  className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/6 px-3 py-2 text-sm outline-none"
                />
                <Button
                  size="sm"
                  disabled={reqBusy || reqName.trim().length < 2}
                  onClick={() => void sendRequest()}
                >
                  {reqBusy ? <Loader2 className="animate-spin" /> : null}Request
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </GlassCard>
  );
}
