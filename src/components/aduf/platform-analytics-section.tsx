import { Link } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { HealthBadge } from "@/components/aduf/health-badge";
import { GlassCard } from "@/components/aduf/liquid";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { PlatformAnalytics } from "@/lib/aduf-types";
import { ageLabel } from "@/lib/sources";
import { fetchPlatformAnalyticsFn } from "@/lib/server-fns";
import { useAduf } from "@/store/aduf-store";
import { useAuth } from "@/store/auth-store";

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 14,
  color: "var(--foreground)",
};

function PlatformCard({ p }: { p: PlatformAnalytics }) {
  const hasSeries = p.months.some((m) => m.a > 0 || (m.b ?? 0) > 0);
  const max = Math.max(1, ...p.breakdown.map((b) => b.value));
  return (
    <GlassCard hover={false} className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold">{p.name}</h3>
        {p.health ? <HealthBadge state={p.health.state} /> : null}
        <span className="ml-auto text-[11px] text-muted-foreground">
          {p.lastSyncAt ? `Data from ${ageLabel(p.lastSyncAt)}` : "No data imported"}
        </span>
      </div>
      {p.health && p.health.state !== "live" ? (
        <p className="mt-2 text-xs text-amber-200">
          {p.health.message}{" "}
          {p.health.actionHref ? (
            <Link to={p.health.actionHref as "/"} className="underline underline-offset-4">
              {p.health.actionLabel ?? "Fix"}
            </Link>
          ) : null}
        </p>
      ) : null}
      {p.kpis.length > 0 ? (
        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {p.kpis.map((k) => (
            <div key={k.label} className="rounded-2xl bg-white/[0.05] p-3">
              <dt className="text-[11px] text-muted-foreground">{k.label}</dt>
              <dd className="mt-0.5 text-lg font-semibold">{k.value}</dd>
              {k.hint ? <p className="text-[10px] text-muted-foreground">{k.hint}</p> : null}
            </div>
          ))}
        </dl>
      ) : null}
      {hasSeries ? (
        <div className="mt-4 h-44" role="img" aria-label={`${p.name} by month`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={p.months}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={11} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.05)" }} />
              <Bar
                dataKey="a"
                name={p.seriesLabels.a || "Value"}
                fill="var(--chart-1)"
                radius={[6, 6, 0, 0]}
              />
              {p.seriesLabels.b ? (
                <Bar
                  dataKey="b"
                  name={p.seriesLabels.b}
                  fill="var(--chart-2)"
                  radius={[6, 6, 0, 0]}
                />
              ) : null}
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : null}
      {p.breakdown.length > 0 ? (
        <div className="mt-4">
          <p className="mb-2 text-xs font-medium">{p.breakdownLabel}</p>
          <ul className="space-y-1.5">
            {p.breakdown.map((b) => (
              <li key={b.name} className="text-xs">
                <div className="flex justify-between">
                  <span>{b.name}</span>
                  <span className="text-muted-foreground">{b.value.toLocaleString()}</span>
                </div>
                <div className="mt-0.5 h-1.5 rounded-full bg-white/8">
                  <div
                    className="h-full rounded-full bg-white/50"
                    style={{ width: `${(b.value / max) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {p.note ? <p className="mt-3 text-xs text-muted-foreground">{p.note}</p> : null}
    </GlassCard>
  );
}

/** Per-platform numbers with a drop-down to choose which connected platforms to look at. */
export function PlatformAnalyticsSection() {
  const accessToken = useAuth((s) => s.accessToken);
  const refreshStamp = useAduf((s) => s.businessMeta?.generatedAt);
  const [platforms, setPlatforms] = useState<PlatformAnalytics[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[] | null>(null); // null = all

  useEffect(() => {
    let cancelled = false;
    fetchPlatformAnalyticsFn({ data: { accessToken } })
      .then((res) => {
        if (cancelled) return;
        if (res.ok) setPlatforms(res.platforms);
        else setError(res.error);
      })
      .catch(() => !cancelled && setError("Couldn't load platform analytics."));
    return () => {
      cancelled = true;
    };
  }, [accessToken, refreshStamp]);

  const shown = useMemo(
    () => (platforms ?? []).filter((p) => !selected || selected.includes(p.id)),
    [platforms, selected],
  );
  const all = platforms ?? [];
  const toggle = (id: string) =>
    setSelected((cur) => {
      const base = cur ?? all.map((p) => p.id);
      const next = base.includes(id) ? base.filter((x) => x !== id) : [...base, id];
      return next.length === all.length ? null : next;
    });
  const label = !selected
    ? `All platforms (${all.length})`
    : selected.length === 0
      ? "No platforms selected"
      : `${selected.length} of ${all.length} platforms`;

  return (
    <section className="mt-8" aria-labelledby="platform-analytics-title">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="platform-analytics-title" className="text-base font-semibold">
            Platform analytics
          </h2>
          <p className="text-xs text-muted-foreground">
            Numbers from each platform you've connected. Choose which to view.
          </p>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              disabled={all.length === 0}
              className="inline-flex items-center gap-2 rounded-full bg-white/[0.08] px-4 py-2 text-xs hover:bg-white/12 disabled:opacity-50"
            >
              {label}
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64 p-2">
            <button
              type="button"
              className="mb-1 w-full rounded-lg px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-white/8"
              onClick={() => setSelected(null)}
            >
              Select all
            </button>
            {all.map((p) => {
              const checked = !selected || selected.includes(p.id);
              return (
                <label
                  key={p.id}
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 text-sm hover:bg-white/8"
                >
                  <Checkbox checked={checked} onCheckedChange={() => toggle(p.id)} />
                  <span className="flex-1">{p.name}</span>
                  {p.health ? <HealthBadge state={p.health.state} /> : null}
                </label>
              );
            })}
          </PopoverContent>
        </Popover>
      </div>

      {error ? <p className="text-xs text-muted-foreground">{error}</p> : null}
      {!platforms && !error ? (
        <div className="h-40 animate-pulse rounded-3xl bg-white/[0.05]" aria-hidden />
      ) : null}
      {platforms && platforms.length === 0 ? (
        <GlassCard hover={false} className="text-sm text-muted-foreground">
          No platforms connected yet.{" "}
          <Link to="/settings" className="text-foreground underline underline-offset-4">
            Connect one in Settings
          </Link>{" "}
          or upload a file above — numbers appear here.
        </GlassCard>
      ) : null}
      {platforms && platforms.length > 0 && shown.length === 0 ? (
        <p className="text-xs text-muted-foreground">Pick at least one platform from the list.</p>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-2">
        {shown.map((p) => (
          <PlatformCard key={p.id} p={p} />
        ))}
      </div>
    </section>
  );
}
