import { Check, Loader2, Plug, Plus, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ConnectorLogo } from "@/components/aduf/connector-logo";
import { ConnectorPicker } from "@/components/aduf/connector-picker";
import { useConnectorEntries } from "@/hooks/use-connector-entries";
import { categoryCounts, filterEntries, type ConnectorTab } from "@/lib/connector-entries";
import { cn } from "@/lib/utils";

const PAGE = 30;

/** Data sources for the Memory page. Built to stay usable with thousands of apps: what ADUF is syncing
 *  is pinned at the top, everything else is searched, filtered by category and loaded as you scroll. */
export function SourceExplorer() {
  const { entries, loading, error, catalogueOn } = useConnectorEntries(true);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<ConnectorTab>("connected");
  const [category, setCategory] = useState("All");
  const [shown, setShown] = useState(PAGE);
  const [pickerOpen, setPickerOpen] = useState(false);
  const sentinel = useRef<HTMLLIElement>(null);

  const connected = useMemo(() => entries.filter((e) => e.connected), [entries]);
  // With nothing connected yet, start on the full list so the panel is never empty.
  const [autoTabbed, setAutoTabbed] = useState(false);
  useEffect(() => {
    if (!autoTabbed && entries.length > 0) {
      setAutoTabbed(true);
      if (connected.length === 0) setTab("available");
    }
  }, [entries.length, connected.length, autoTabbed]);

  const tabbed = useMemo(
    () => filterEntries(entries, { query: "", tab, category: "All" }),
    [entries, tab],
  );
  const cats = useMemo(() => categoryCounts(tabbed), [tabbed]);
  const results = useMemo(
    () => filterEntries(entries, { query, tab, category }),
    [entries, query, tab, category],
  );
  useEffect(() => setShown(PAGE), [query, tab, category]);
  useEffect(() => {
    if (category !== "All" && !cats.some((c) => c.name === category)) setCategory("All");
  }, [cats, category]);
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((e) => e[0]?.isIntersecting && setShown((n) => n + PAGE), {
      rootMargin: "200px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, [results.length, shown]);

  const tabs: Array<{ id: ConnectorTab; label: string; n: number }> = [
    { id: "connected", label: "Synced", n: connected.length },
    { id: "available", label: "Available", n: entries.length - connected.length },
    { id: "all", label: "All", n: entries.length },
  ];

  return (
    <section
      aria-labelledby="sources-heading"
      className="glass flex min-h-0 flex-col overflow-hidden rounded-3xl xl:sticky xl:top-6 xl:max-h-[calc(100dvh-3rem)]"
    >
      <div className="shrink-0 space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="sources-heading" className="text-sm font-semibold">
              Data sources
            </h2>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {entries.length === 0
                ? loading
                  ? "Checking…"
                  : catalogueOn
                    ? "No apps found"
                    : "Not switched on yet"
                : `${connected.length} synced · ${entries.length.toLocaleString("en")} apps available`}
            </p>
          </div>
          <button
            onClick={() => setPickerOpen(true)}
            className="flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-medium text-background transition-transform hover:scale-[1.03]"
            style={{ background: "var(--gradient-accent)" }}
          >
            <Plus className="h-3.5 w-3.5" /> Connect
          </button>
        </div>

        {entries.length > 0 ? (
          <>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search sources"
                aria-label="Search data sources"
                className="w-full rounded-full bg-white/8 py-2 pl-9 pr-3 text-xs outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex items-center gap-2">
              <div
                role="tablist"
                className="flex min-w-0 rounded-full bg-white/8 p-0.5 text-[11px]"
              >
                {tabs.map((t) => (
                  <button
                    key={t.id}
                    role="tab"
                    aria-selected={tab === t.id}
                    onClick={() => setTab(t.id)}
                    className={cn(
                      "whitespace-nowrap rounded-full px-2.5 py-1 transition-colors",
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
              {cats.length > 1 ? (
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  aria-label="Filter by category"
                  className="ml-auto min-w-0 max-w-[8.5rem] rounded-full border border-border bg-transparent px-2.5 py-1 text-[11px] text-muted-foreground outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="All">All categories</option>
                  {cats.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name} ({c.count})
                    </option>
                  ))}
                </select>
              ) : null}
            </div>
          </>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto border-t border-border px-2 py-2 max-xl:max-h-[28rem]">
        {entries.length === 0 ? (
          <div className="grid place-items-center gap-1.5 px-4 py-10 text-center">
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <Plug className="h-5 w-5 text-muted-foreground" />
            )}
            <p className="text-xs text-muted-foreground">
              {loading
                ? "Loading your apps…"
                : (error ??
                  "Connect an app and ADUF starts learning from it. Apps connect through Composio, which the admin switches on with a key.")}
            </p>
          </div>
        ) : results.length === 0 ? (
          <p className="px-4 py-10 text-center text-xs text-muted-foreground">
            {tab === "connected" && !query
              ? "Nothing synced yet. Open Available to connect an app."
              : "No sources match that search."}
          </p>
        ) : (
          <ul className="space-y-0.5">
            {results.slice(0, shown).map((e) => (
              <li
                key={e.key}
                className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-white/[0.04]"
                style={{ contentVisibility: "auto", containIntrinsicSize: "auto 48px" }}
              >
                <ConnectorLogo entry={e} size={34} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{e.name}</p>
                  <p className="truncate text-[10px] text-muted-foreground">{e.category}</p>
                </div>
                {e.connected ? (
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-cyan/15 px-2 py-0.5 text-[10px] font-medium text-cyan">
                    <Check className="h-3 w-3" /> Synced
                  </span>
                ) : (
                  <button
                    onClick={() => setPickerOpen(true)}
                    className="shrink-0 rounded-full border border-border px-2.5 py-0.5 text-[10px] text-muted-foreground hover:text-foreground"
                  >
                    Connect
                  </button>
                )}
              </li>
            ))}
            <li ref={sentinel} aria-hidden className="h-px" />
          </ul>
        )}
        {results.length > shown ? (
          <p className="py-2 text-center text-[10px] text-muted-foreground">
            Scroll for {(results.length - shown).toLocaleString("en")} more
          </p>
        ) : null}
      </div>
      <ConnectorPicker open={pickerOpen} onOpenChange={setPickerOpen} />
    </section>
  );
}
