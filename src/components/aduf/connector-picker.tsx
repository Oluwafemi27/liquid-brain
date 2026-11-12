import { Link } from "@tanstack/react-router";
import { Check, Loader2, Plug, RefreshCw, Search, Unplug } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ConnectorLogo } from "@/components/aduf/connector-logo";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useConnectorEntries } from "@/hooks/use-connector-entries";
import { disconnectComposioFn, startComposioConnectFn } from "@/lib/composio-fns";
import {
  categoryCounts,
  filterEntries,
  type ConnectorEntry,
  type ConnectorTab,
} from "@/lib/connector-entries";
import { cn } from "@/lib/utils";
import { useAuth } from "@/store/auth-store";

const PAGE = 40;
const SETUP_LABEL: Record<ConnectorEntry["setup"], string> = {
  oauth: "Sign in",
  key: "API key",
  bot: "Bot token",
  "one-click": "One click",
  "own-app": "Needs setup",
  none: "No login",
};

function openPopup(url: string): Window | null {
  const w = 520;
  const h = 720;
  const left = Math.max(0, Math.round(window.screenX + (window.outerWidth - w) / 2));
  const top = Math.max(0, Math.round(window.screenY + (window.outerHeight - h) / 2));
  return window.open(
    url,
    "aduf-connect",
    `popup=yes,width=${w},height=${h},left=${left},top=${top}`,
  );
}

/** The on-screen "connect an app" panel: search 1,000+ apps, see what's connected, and connect or
 *  disconnect without leaving the page you're on. Sign-in opens in a small window and the list
 *  updates itself when it finishes. */
export function ConnectorPicker({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const accessToken = useAuth((s) => s.accessToken);
  const { entries, loading, error, catalogueOn, reload } = useConnectorEntries(open);

  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<ConnectorTab>("all");
  const [category, setCategory] = useState("All");
  const [shown, setShown] = useState(PAGE);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const watchRef = useRef<number | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const connectedCount = useMemo(() => entries.filter((e) => e.connected).length, [entries]);
  const tabbed = useMemo(
    () => filterEntries(entries, { query: "", tab, category: "All" }),
    [entries, tab],
  );
  const cats = useMemo(() => categoryCounts(tabbed), [tabbed]);
  const results = useMemo(
    () => filterEntries(entries, { query, tab, category }),
    [entries, query, tab, category],
  );
  useEffect(() => setShown(PAGE), [query, tab, category, open]);
  useEffect(() => {
    if (category !== "All" && !cats.some((c) => c.name === category)) setCategory("All");
  }, [cats, category]);

  // Load more as the person scrolls to the end of the list.
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !open) return;
    const io = new IntersectionObserver((e) => e[0]?.isIntersecting && setShown((n) => n + PAGE), {
      rootMargin: "240px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, [open, results.length, shown]);

  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 6000);
    return () => window.clearTimeout(t);
  }, [notice]);

  const refreshAll = useCallback(async () => {
    await reload(true);
  }, [reload]);

  // A sign-in popup tells us when it's done; also re-check while it is open in case it can't.
  useEffect(() => {
    if (!open) return;
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.data?.type !== "aduf-connector") return;
      setBusy(null);
      if (e.data.error)
        setNotice({ ok: false, text: "That connection didn't go through. Try again." });
      else setNotice({ ok: true, text: "Connected." });
      void refreshAll();
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [open, refreshAll]);

  const watchPopup = (popup: Window, key: string) => {
    if (watchRef.current) window.clearInterval(watchRef.current);
    const started = Date.now();
    watchRef.current = window.setInterval(() => {
      const gone = popup.closed || Date.now() - started > 4 * 60_000;
      void refreshAll();
      if (gone) {
        if (watchRef.current) window.clearInterval(watchRef.current);
        watchRef.current = null;
        setBusy((b) => (b === key ? null : b));
      }
    }, 2500);
  };
  useEffect(() => () => void (watchRef.current && window.clearInterval(watchRef.current)), []);

  const connect = async (e: ConnectorEntry) => {
    setNotice(null);
    setBusy(e.key);
    try {
      const r = await startComposioConnectFn({
        data: { accessToken, slug: e.id, origin: window.location.origin, popup: true },
      });
      if (!r.ok) {
        setNotice({ ok: false, text: r.message });
        setBusy(null);
        return;
      }
      const popup = openPopup(r.url);
      if (!popup) window.location.assign(r.url);
      else watchPopup(popup, e.key);
    } catch (err) {
      setNotice({
        ok: false,
        text: err instanceof Error ? err.message : "Couldn't start the connection.",
      });
      setBusy(null);
    }
  };

  const disconnect = async (e: ConnectorEntry) => {
    if (
      !window.confirm(`Disconnect ${e.name}? ADUF will stop using it until you connect it again.`)
    )
      return;
    setBusy(e.key);
    try {
      if (!e.connectionId) throw new Error("Couldn't find that connection.");
      const r = await disconnectComposioFn({ data: { accessToken, connectionId: e.connectionId } });
      if (!r.ok) throw new Error(r.message);
      setNotice({ ok: true, text: `${e.name} disconnected.` });
      await refreshAll();
    } catch (err) {
      setNotice({ ok: false, text: err instanceof Error ? err.message : "Couldn't disconnect." });
    } finally {
      setBusy(null);
    }
  };

  const topCats = cats.slice(0, 6);
  const tabs: Array<{ id: ConnectorTab; label: string; n: number }> = [
    { id: "all", label: "All", n: entries.length },
    { id: "connected", label: "Connected", n: connectedCount },
    { id: "available", label: "Available", n: entries.length - connectedCount },
  ];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton
          className="flex h-[min(88dvh,760px)] max-w-2xl flex-col gap-0 overflow-hidden p-0 max-sm:h-dvh max-sm:max-w-none max-sm:rounded-none"
          onOpenAutoFocus={(ev) => {
            ev.preventDefault();
            if (window.matchMedia("(pointer: fine)").matches) searchRef.current?.focus();
          }}
        >
          <div className="shrink-0 space-y-3 border-b border-border p-4 pr-12 sm:p-5 sm:pr-12">
            <div>
              <DialogTitle className="text-base font-semibold">Connect your apps</DialogTitle>
              <DialogDescription className="mt-0.5 text-xs text-muted-foreground">
                {entries.length > 0
                  ? `${connectedCount} connected · ${entries.length.toLocaleString("en")} apps available`
                  : "Let ADUF read from and work with the tools you already use."}
              </DialogDescription>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search apps, e.g. Shopify, invoices, CRM"
                aria-label="Search apps"
                className="w-full rounded-full bg-white/8 py-2.5 pl-10 pr-4 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex items-center gap-2">
              <div role="tablist" className="flex shrink-0 rounded-full bg-white/8 p-0.5 text-xs">
                {tabs.map((t) => (
                  <button
                    key={t.id}
                    role="tab"
                    aria-selected={tab === t.id}
                    onClick={() => setTab(t.id)}
                    className={cn(
                      "rounded-full px-3 py-1.5 transition-colors",
                      tab === t.id
                        ? "bg-white/15 font-medium text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {t.label}{" "}
                    <span className="tabular-nums opacity-70">{t.n.toLocaleString("en")}</span>
                  </button>
                ))}
              </div>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                aria-label="Filter by category"
                className="ml-auto min-w-0 max-w-[11rem] rounded-full border border-border bg-transparent px-3 py-1.5 text-xs text-muted-foreground outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="All">All categories</option>
                {cats.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name} ({c.count})
                  </option>
                ))}
              </select>
            </div>
            {topCats.length > 1 ? (
              <div className="flex flex-wrap gap-1.5">
                {topCats.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => setCategory(category === c.name ? "All" : c.name)}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[11px] transition-colors",
                      category === c.name
                        ? "border-cyan/60 bg-cyan/15 text-cyan"
                        : "border-border text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {notice ? (
            <p
              role="status"
              className={cn(
                "shrink-0 px-5 py-2 text-xs",
                notice.ok ? "bg-cyan/10 text-cyan" : "bg-destructive/10 text-destructive",
              )}
            >
              {notice.text}
            </p>
          ) : null}
          <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2 sm:px-3" aria-live="polite">
            {entries.length === 0 && loading ? (
              <div className="grid place-items-center gap-2 py-16 text-sm text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" /> Loading apps…
              </div>
            ) : !catalogueOn && !loading && entries.length === 0 ? (
              <div className="grid place-items-center gap-1 px-6 py-16 text-center">
                <Plug className="h-6 w-6 text-muted-foreground" />
                <p className="text-sm font-medium">
                  {error ? "Couldn't load your apps" : "Connectors aren't switched on yet"}
                </p>
                <p className="max-w-xs text-xs text-muted-foreground">
                  {error ??
                    "Every app connects through Composio. The admin needs to add COMPOSIO_API_KEY on the server."}
                </p>
              </div>
            ) : results.length === 0 ? (
              <div className="grid place-items-center gap-1 px-6 py-16 text-center">
                <Plug className="h-6 w-6 text-muted-foreground" />
                <p className="text-sm font-medium">
                  {tab === "connected" && !query ? "Nothing connected yet" : "No apps match"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {tab === "connected" && !query
                    ? "Pick an app from Available to connect it."
                    : "Try a different word, or clear the category."}
                </p>
              </div>
            ) : (
              <ul className="space-y-0.5">
                {results.slice(0, shown).map((e) => {
                  const working = busy === e.key;
                  return (
                    <li
                      key={e.key}
                      className="flex items-center gap-3 rounded-2xl px-2.5 py-2 hover:bg-white/[0.04]"
                      style={{ contentVisibility: "auto", containIntrinsicSize: "auto 56px" }}
                    >
                      <ConnectorLogo entry={e} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{e.name}</p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {e.category} · {SETUP_LABEL[e.setup]}
                        </p>
                      </div>
                      {e.connected ? (
                        <div className="flex shrink-0 items-center gap-1.5">
                          <span className="flex items-center gap-1 rounded-full bg-cyan/15 px-2.5 py-1 text-[11px] font-medium text-cyan">
                            <Check className="h-3 w-3" /> Connected
                          </span>
                          <button
                            onClick={() => void disconnect(e)}
                            disabled={working}
                            aria-label={`Disconnect ${e.name}`}
                            className="grid h-7 w-7 place-items-center rounded-full text-muted-foreground hover:bg-white/10 hover:text-foreground disabled:opacity-50"
                          >
                            {working ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Unplug className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => void connect(e)}
                          disabled={working}
                          className="flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium text-background transition-transform enabled:hover:scale-[1.03] disabled:opacity-60"
                          style={{ background: "var(--gradient-accent)" }}
                        >
                          {working ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                          {working ? "Waiting…" : "Connect"}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            <div ref={sentinel} className="h-px" />
            {results.length > shown ? (
              <button
                onClick={() => setShown((n) => n + PAGE)}
                className="mx-auto my-3 block rounded-full border border-border px-4 py-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                Show more ({(results.length - shown).toLocaleString("en")} left)
              </button>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-3 border-t border-border px-4 py-3 text-xs text-muted-foreground sm:px-5">
            {error ? (
              <span className="min-w-0 flex-1 truncate text-destructive">{error}</span>
            ) : (
              <span className="min-w-0 flex-1 truncate">
                Your logins stay with each app. Disconnect any time.
              </span>
            )}
            <button
              onClick={() => void refreshAll()}
              aria-label="Refresh list"
              className="grid h-7 w-7 shrink-0 place-items-center rounded-full hover:bg-white/10 hover:text-foreground"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            </button>
            <Link
              to="/connectors"
              onClick={() => onOpenChange(false)}
              className="shrink-0 text-foreground underline-offset-2 hover:underline"
            >
              Full page
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
