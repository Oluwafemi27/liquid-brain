import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Check,
  KeyRound,
  Loader2,
  Plug,
  RefreshCw,
  Search,
  Settings as SettingsIcon,
  Unplug,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell, PageHeader } from "@/components/aduf/app-shell";
import { GlassCard } from "@/components/aduf/liquid";
import {
  disconnectComposioFn,
  fetchComposioBoard,
  startComposioConnectFn,
  type CatalogApp,
  type ComposioBoard,
} from "@/lib/composio-fns";
import { cn } from "@/lib/utils";
import { useAuth } from "@/store/auth-store";

export const Route = createFileRoute("/connectors")({
  head: () => ({
    meta: [
      { title: "Connectors · ADUF AI" },
      {
        name: "description",
        content: "Connect your business apps so ADUF can read from them and work with them.",
      },
    ],
  }),
  component: ConnectorsPage,
});

const PAGE_SIZE = 48;
type View = "all" | "connected" | "oneclick";

const hue = (s: string) => [...s].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 360, 11);

function AppLogo({
  app,
  size = 44,
}: {
  app: Pick<CatalogApp, "name" | "logo" | "slug">;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const initials = app.name
    .replace(/[^A-Za-z0-9 ]/g, "")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span
      className="grid shrink-0 place-items-center overflow-hidden rounded-xl bg-white/90"
      style={{ width: size, height: size }}
    >
      {app.logo && !failed ? (
        <img
          src={app.logo}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="h-[70%] w-[70%] object-contain"
        />
      ) : (
        <span
          className="grid h-full w-full place-items-center text-xs font-semibold"
          style={{
            background: `hsl(${hue(app.slug)} 45% 30%)`,
            color: `hsl(${hue(app.slug)} 80% 90%)`,
          }}
        >
          {initials}
        </span>
      )}
    </span>
  );
}

function ConnectorsPage() {
  const { accessToken, user } = useAuth();
  const [board, setBoard] = useState<ComposioBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setFailure(null);
    try {
      setBoard(await fetchComposioBoard({ data: { accessToken } }));
    } catch (e) {
      setFailure(e instanceof Error ? e.message : "Couldn't load connectors.");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  return (
    <AppShell>
      <ConnectorsView board={board} loading={loading} failure={failure} reload={load} />
    </AppShell>
  );
}

export function ConnectorsView({
  board,
  loading,
  failure,
  reload,
}: {
  board: ComposioBoard | null;
  loading: boolean;
  failure: string | null;
  reload: () => Promise<void> | void;
}) {
  const { accessToken } = useAuth();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [view, setView] = useState<View>("all");
  const [shown, setShown] = useState(PAGE_SIZE);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  // Coming back from an app's sign-in page.
  useEffect(() => {
    const slug = new URLSearchParams(window.location.search).get("connected");
    if (slug) {
      setNotice({
        ok: true,
        text: `Finished connecting ${slug}. It shows as connected below once the sign-in is confirmed.`,
      });
      window.history.replaceState(null, "", "/connectors");
    }
  }, []);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(t);
  }, [notice]);

  const connectionBySlug = useMemo(
    () => new Map((board?.connections ?? []).map((c) => [c.toolkit, c])),
    [board],
  );
  const apps = board?.apps ?? [];
  const bySlug = useMemo(() => new Map(apps.map((a) => [a.slug, a])), [apps]);

  const categories = useMemo(() => {
    const count = new Map<string, number>();
    for (const a of apps) for (const c of a.categories) count.set(c, (count.get(c) ?? 0) + 1);
    return [...count.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 14)
      .map(([c]) => c);
  }, [apps]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rank = (a: CatalogApp) => {
      if (!q) return 0;
      const n = a.name.toLowerCase();
      if (n === q) return 100;
      if (n.startsWith(q)) return 80;
      if (n.includes(q)) return 60;
      if (a.slug.includes(q)) return 50;
      if (a.categories.some((c) => c.toLowerCase().includes(q))) return 30;
      if (a.description.toLowerCase().includes(q)) return 10;
      return -1;
    };
    return apps
      .map((a) => ({ a, r: rank(a) }))
      .filter(({ a, r }) => {
        if (r < 0) return false;
        if (category !== "All" && !a.categories.includes(category)) return false;
        if (view === "connected") return connectionBySlug.has(a.slug);
        if (view === "oneclick") return a.access === "managed";
        return true;
      })
      .sort((x, y) => y.r - x.r)
      .map(({ a }) => a);
  }, [apps, query, category, view, connectionBySlug]);

  useEffect(() => setShown(PAGE_SIZE), [query, category, view]);

  const connect = async (app: CatalogApp) => {
    setBusy(app.slug);
    try {
      const r = await startComposioConnectFn({
        data: { accessToken, slug: app.slug, origin: window.location.origin },
      });
      if (r.ok) window.location.assign(r.url);
      else setNotice({ ok: false, text: r.message });
    } catch (e) {
      setNotice({
        ok: false,
        text: e instanceof Error ? e.message : "Couldn't start the connection.",
      });
    } finally {
      setBusy(null);
    }
  };

  const remove = async (slug: string, connectionId: string, name: string) => {
    if (
      !window.confirm(
        `Disconnect ${name}? ADUF will stop being able to use it until you connect it again.`,
      )
    )
      return;
    setBusy(slug);
    try {
      const r = await disconnectComposioFn({ data: { accessToken, connectionId } });
      setNotice({ ok: r.ok, text: r.ok ? `${name} disconnected.` : r.message });
      if (r.ok) await reload();
    } catch (e) {
      setNotice({ ok: false, text: e instanceof Error ? e.message : "Couldn't disconnect." });
    } finally {
      setBusy(null);
    }
  };

  const connectedApps = (board?.connections ?? []).map((c) => ({
    c,
    app: bySlug.get(c.toolkit) ?? ({ slug: c.toolkit, name: c.toolkit, logo: null } as const),
  }));

  return (
    <>
      <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-8 sm:px-6 lg:pb-10">
        <PageHeader eyebrow="Integrations" title="Connectors">
          <div className="flex items-center gap-2">
            <Link
              to="/settings"
              className="glass hidden h-9 items-center gap-2 rounded-full px-4 text-xs hover:bg-white/12 sm:inline-flex"
            >
              <SettingsIcon className="h-3.5 w-3.5" />
              Built-in connections
            </Link>
            <button
              type="button"
              onClick={() => void reload()}
              disabled={loading}
              className="glass inline-flex h-9 items-center gap-2 rounded-full px-4 text-xs hover:bg-white/12 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan disabled:opacity-60"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
              Refresh
            </button>
          </div>
        </PageHeader>

        {failure ? (
          <GlassCard className="p-5">
            <p className="text-sm font-medium">Couldn't load connectors</p>
            <p className="mt-1 text-sm text-muted-foreground">{failure}</p>
          </GlassCard>
        ) : !board && loading ? (
          <Skeleton />
        ) : !board ? (
          <GlassCard className="p-6 text-sm text-muted-foreground">
            Sign in to connect your apps.
          </GlassCard>
        ) : !board.configured ? (
          <SetupCard />
        ) : board.error ? (
          <GlassCard className="p-5">
            <p className="text-sm font-medium">Composio didn't respond</p>
            <p className="mt-1 text-sm text-muted-foreground">{board.error}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              If the key was just added, redeploy so the server picks it up, then refresh.
            </p>
          </GlassCard>
        ) : (
          <div className="space-y-6">
            <section aria-label="Connected apps">
              <GlassCard className="p-4 sm:p-5">
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="text-sm font-semibold">Connected</h2>
                  <span className="text-xs text-muted-foreground">
                    {connectedApps.length === 0
                      ? "Nothing yet"
                      : `${connectedApps.length} ${connectedApps.length === 1 ? "app" : "apps"}`}
                  </span>
                </div>
                {connectedApps.length === 0 ? (
                  <p className="mt-2 max-w-prose text-sm text-muted-foreground">
                    Pick an app below and sign in. ADUF can then look things up in it, and ask your
                    approval before changing anything.
                  </p>
                ) : (
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {connectedApps.map(({ c, app }) => (
                      <li
                        key={c.id}
                        className="flex items-center gap-2 rounded-full border border-white/12 bg-white/5 py-1 pl-1 pr-3"
                      >
                        <AppLogo app={app} size={28} />
                        <span className="text-xs font-medium">{app.name}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </GlassCard>
            </section>

            <section aria-label="All apps">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <label className="glass flex h-10 w-full min-w-0 items-center gap-2 rounded-full px-4 sm:w-auto sm:max-w-md sm:flex-1">
                  <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={`Search ${apps.length.toLocaleString()} apps`}
                    aria-label="Search apps"
                    className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  />
                </label>
                <div className="flex gap-1.5" role="tablist" aria-label="Show">
                  {(
                    [
                      ["all", "All"],
                      ["connected", "Connected"],
                      ["oneclick", "One-click"],
                    ] as [View, string][]
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      role="tab"
                      aria-selected={view === id}
                      onClick={() => setView(id)}
                      className={cn(
                        "rounded-full border px-3.5 py-1.5 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan",
                        view === id
                          ? "border-white/30 bg-white/14"
                          : "border-white/10 text-muted-foreground hover:bg-white/8",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div
                className="-mx-4 mb-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
                role="group"
                aria-label="Categories"
              >
                {["All", ...categories].map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={category === c}
                    onClick={() => setCategory(c)}
                    className={cn(
                      "shrink-0 rounded-full px-3 py-1 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan",
                      category === c
                        ? "bg-foreground text-background"
                        : "bg-white/6 text-muted-foreground hover:bg-white/12",
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>

              {filtered.length === 0 ? (
                <GlassCard className="p-8 text-center">
                  <Plug className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="mt-3 text-sm font-medium">
                    {view === "connected" && apps.length
                      ? "No connected apps yet"
                      : "No apps match"}
                  </p>
                  <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                    {view === "connected"
                      ? "Connect one from the full list."
                      : "Try a different word, or clear the category filter."}
                  </p>
                </GlassCard>
              ) : (
                <>
                  <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {filtered.slice(0, shown).map((app) => {
                      const conn = connectionBySlug.get(app.slug);
                      const isBusy = busy === app.slug;
                      return (
                        <li key={app.slug} className="glass flex flex-col rounded-3xl p-4">
                          <div className="flex items-start gap-3">
                            <AppLogo app={app} />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className="truncate text-sm font-semibold">{app.name}</h3>
                                {conn ? (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-[oklch(0.8_0.13_155/45%)] bg-[oklch(0.8_0.13_155/14%)] px-1.5 py-0.5 text-[10px] text-[oklch(0.88_0.1_155)]">
                                    <Check className="h-3 w-3" /> Connected
                                  </span>
                                ) : null}
                              </div>
                              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                                {app.categories[0] ?? "App"}
                                {app.toolsCount
                                  ? `, ${app.toolsCount.toLocaleString()} actions`
                                  : ""}
                              </p>
                            </div>
                          </div>
                          <p className="mt-3 line-clamp-2 min-h-[2.5rem] text-xs leading-relaxed text-muted-foreground">
                            {app.description || "No description yet."}
                          </p>
                          <div className="mt-4 flex items-center justify-between gap-2">
                            {conn ? (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => void remove(app.slug, conn.id, app.name)}
                                className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-4 py-1.5 text-xs transition-colors hover:border-red-400/40 hover:bg-red-400/10 hover:text-red-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan disabled:opacity-60"
                              >
                                {isBusy ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Unplug className="h-3.5 w-3.5" />
                                )}
                                Disconnect
                              </button>
                            ) : app.access === "managed" ? (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => void connect(app)}
                                className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-1.5 text-xs font-medium text-background transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan disabled:opacity-60"
                              >
                                {isBusy ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Plug className="h-3.5 w-3.5" />
                                )}
                                Connect
                              </button>
                            ) : app.access === "none" ? (
                              <span className="text-[11px] text-muted-foreground">
                                No sign-in needed
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground"
                                title="This app needs your own developer app registered in Composio first."
                              >
                                <KeyRound className="h-3.5 w-3.5" /> Needs your own app keys
                              </span>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  {shown < filtered.length ? (
                    <div className="mt-5 text-center">
                      <button
                        type="button"
                        onClick={() => setShown((n) => n + PAGE_SIZE)}
                        className="glass rounded-full px-5 py-2 text-xs hover:bg-white/12 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan"
                      >
                        Show more ({(filtered.length - shown).toLocaleString()} left)
                      </button>
                    </div>
                  ) : null}
                </>
              )}
            </section>
          </div>
        )}
      </div>

      {notice ? (
        <div
          role="status"
          className={cn(
            "fixed bottom-24 left-1/2 z-50 w-[min(92vw,26rem)] -translate-x-1/2 rounded-2xl border px-4 py-3 text-sm shadow-xl backdrop-blur-xl lg:bottom-8",
            notice.ok
              ? "border-[oklch(0.8_0.13_155/45%)] bg-[oklch(0.25_0.04_155/85%)]"
              : "border-[oklch(0.68_0.14_30/55%)] bg-[oklch(0.25_0.05_30/85%)]",
          )}
        >
          {notice.text}
        </div>
      ) : null}
    </>
  );
}

function SetupCard() {
  return (
    <GlassCard className="p-6">
      <h2 className="text-base font-semibold">Turn on connectors</h2>
      <p className="mt-1 max-w-prose text-sm text-muted-foreground">
        Connectors run through Composio. It has a free plan with no card needed, and you don't host
        anything.
      </p>
      <ol className="mt-4 max-w-prose list-decimal space-y-2 pl-5 text-sm">
        <li>Create a free account at composio.dev and copy your API key.</li>
        <li>
          In Vercel, add it as{" "}
          <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">COMPOSIO_API_KEY</code>. Also
          set <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">APP_URL</code> to your
          site address.
        </li>
        <li>Redeploy, then come back to this page.</li>
      </ol>
    </GlassCard>
  );
}

function Skeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading connectors">
      <div className="glass h-24 animate-pulse rounded-3xl" />
      <div className="glass h-10 w-80 max-w-full animate-pulse rounded-full" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="glass h-40 animate-pulse rounded-3xl" />
        ))}
      </div>
    </div>
  );
}
