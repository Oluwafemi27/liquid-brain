import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronDown,
  Minus,
  ShoppingBag,
  Trophy,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell, PageHeader } from "@/components/aduf/app-shell";
import { ActivityLogSection } from "@/components/aduf/activity-log-section";
import { FirstLookCard } from "@/components/aduf/first-look-card";
import { ImportDataPanel } from "@/components/aduf/import-data-panel";
import { PlatformAnalyticsSection } from "@/components/aduf/platform-analytics-section";
import { GlassCard, WaterBar } from "@/components/aduf/liquid";
import type { CrmDeal, DealStage, Trend } from "@/lib/aduf-types";
import { formatUsdCompact, toUsd, useUsdRates } from "@/lib/currency";
import { SIM_DISCLAIMER, simulateSlider } from "@/lib/simulation";
import { useAduf } from "@/store/aduf-store";

const stageOrder: DealStage[] = ["New", "Contacted", "Negotiation", "Won"];
/** Cards shown per pipeline column — the rest collapse into "+N more". */
const STAGE_CARD_LIMIT = 6;
const stageColor: Record<DealStage, string> = {
  New: "var(--chart-4)",
  Contacted: "var(--chart-3)",
  Negotiation: "var(--chart-2)",
  Won: "var(--chart-1)",
};

function TrendIcon({ trend }: { trend: Trend }) {
  if (trend === "up") return <ArrowUpRight className="h-3.5 w-3.5 text-cyan" />;
  if (trend === "down") return <ArrowDownRight className="h-3.5 w-3.5 text-destructive" />;
  return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
}

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics & What-If Simulator — ADUF AI" },
      {
        name: "description",
        content:
          "Liquid reports for sales, leads and retention plus a what-if simulator that predicts the impact of extra ad spend before you commit.",
      },
      { property: "og:title", content: "Analytics & What-If Simulator — ADUF AI" },
      {
        property: "og:description",
        content: "Model the outcome of a spend change before you spend a naira.",
      },
    ],
  }),
  component: AnalyticsPage,
});

function EmptyPanel({ label }: { label: string }) {
  return (
    <div className="flex h-full min-h-[120px] items-center justify-center text-center text-xs text-muted-foreground">
      {label}
    </div>
  );
}

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 14,
  color: "var(--foreground)",
};

/** Real, live numbers: everything here is computed in Supabase from rows ADUF
 *  actually recorded (automation runs, goals) and refreshes by itself — see
 *  AnalyticsBootstrap. Nothing on this card is simulated. */
function LiveActivity() {
  const analytics = useAduf((s) => s.analytics);

  if (!analytics) {
    return (
      <GlassCard hover={false} className="mb-6 min-h-40">
        <EmptyPanel label="Loading your live activity…" />
      </GlassCard>
    );
  }

  const { months, totalRuns, successRate, topAutomations, goals } = analytics;
  const tiles = [
    { label: "Automation runs", value: totalRuns.toLocaleString(), hint: "Last 6 months" },
    {
      label: "Success rate",
      value: successRate === null ? "—" : `${successRate}%`,
      hint: successRate === null ? "No runs yet" : "Runs that finished cleanly",
    },
    { label: "Goal progress", value: `${goals.avgProgress}%`, hint: "Average across goals" },
    {
      label: "Goals completed",
      value: `${goals.completed}/${goals.total}`,
      hint: goals.total === 0 ? "No goals yet" : "Hit their target",
    },
  ];

  return (
    <div className="mb-6 space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map((t, i) => (
          <GlassCard key={t.label} delay={i * 0.05} hover={false} className="p-4">
            <p className="text-xs text-muted-foreground">{t.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{t.value}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{t.hint}</p>
          </GlassCard>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <GlassCard hover={false} className="min-w-0">
          <h2 className="text-base font-semibold">Automation activity</h2>
          <p className="mb-4 text-xs text-muted-foreground">
            Runs per month · live from your workspace
          </p>
          <div className="h-56">
            {totalRuns === 0 ? (
              <EmptyPanel label="No automation runs yet — run one from the Automation Grid and it shows up here instantly." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={months}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} allowDecimals={false} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    cursor={{ fill: "rgba(255,255,255,0.05)" }}
                  />
                  <Bar dataKey="success" name="Succeeded" stackId="runs" fill="var(--chart-1)" />
                  <Bar
                    dataKey="failed"
                    name="Failed"
                    stackId="runs"
                    fill="var(--destructive)"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </GlassCard>

        <GlassCard hover={false} className="min-w-0">
          <h2 className="text-base font-semibold">Most active automations</h2>
          <p className="mb-4 text-xs text-muted-foreground">Share of runs · last 6 months</p>
          {topAutomations.length === 0 ? (
            <div className="h-56">
              <EmptyPanel label="Nothing has run yet." />
            </div>
          ) : (
            <div className="space-y-4">
              {topAutomations.map((a) => (
                <div key={a.id}>
                  <WaterBar value={(a.runs / totalRuns) * 100} label={a.name} />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {a.runs} {a.runs === 1 ? "run" : "runs"}
                    {a.failed > 0 ? ` · ${a.failed} failed` : ""}
                  </p>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}

function AnalyticsPage() {
  const { series, deals, topCustomers, channelRevenue, funnel, sources, businessMeta } = useAduf();
  const connectedSources = sources.filter((s) => s.connected);
  const noBusinessData =
    series.length === 0 && deals.length === 0 && topCustomers.length === 0 && funnel.length === 0;
  const importCount = businessMeta?.imports.length ?? 0;
  const [importOpen, setImportOpen] = useState(false);
  // With nothing imported yet the import panel is the whole point of the page.
  const showImport = importOpen || (noBusinessData && importCount === 0);
  const [spend, setSpend] = useState(50);
  const { rates } = useUsdRates();
  // All mock/business figures in this app are entered in Naira — this is
  // the single place that turns any of them into a USD display figure.
  const usd = (ngnAmount: number) => formatUsdCompact(toUsd(ngnAmount, "NGN", rates));
  // Imported business data arrives already converted to USD by the server.
  const money = (usdAmount: number) => formatUsdCompact(usdAmount);
  const axisMoney = (v: number) => (Math.abs(v) >= 1000 ? `$${v / 1000}k` : `$${v}`);
  const salesFrom = businessMeta?.salesFrom ?? null;
  const leadsFrom = businessMeta?.leadsFrom ?? null;

  const dealsByStage = useMemo(() => {
    const grouped: Record<DealStage, CrmDeal[]> = {
      New: [],
      Contacted: [],
      Negotiation: [],
      Won: [],
    };
    for (const d of deals) grouped[d.stage].push(d);
    return grouped;
  }, [deals]);

  const pipelineValue = useMemo(
    () => deals.filter((d) => d.stage !== "Won").reduce((sum, d) => sum + d.value, 0),
    [deals],
  );
  const wonValue = useMemo(
    () => deals.filter((d) => d.stage === "Won").reduce((sum, d) => sum + d.value, 0),
    [deals],
  );

  const { leads: predictedLeads, salesNgn: predictedSales } = simulateSlider(spend);

  const simulated = useMemo(
    () =>
      series.map((p, i) => ({
        ...p,
        projected: Math.round(p.sales * (1 + (spend / 1000) * (i / series.length))),
      })),
    [series, spend],
  );

  return (
    <AppShell>
      <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:py-8">
        <PageHeader eyebrow="Analytics" title="Reports & Simulation" />

        <LiveActivity />

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {importCount > 0
              ? `Built from ${importCount} import${importCount === 1 ? "" : "s"} · updated ${
                  businessMeta
                    ? new Date(businessMeta.generatedAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : ""
                }`
              : connectedSources.length > 0
                ? `${connectedSources.length} ${connectedSources.length === 1 ? "source is" : "sources are"} connected (${connectedSources
                    .map((s) => s.name)
                    .join(
                      ", ",
                    )}) — import from them below. Panels stay empty rather than showing made-up numbers.`
                : "Nothing imported yet — the panels below fill in from your own data and stay empty rather than showing made-up numbers."}
          </p>
          {importCount > 0 || !noBusinessData ? (
            <button
              type="button"
              onClick={() => setImportOpen((o) => !o)}
              aria-expanded={showImport}
              className="flex items-center gap-1.5 rounded-full bg-white/[0.07] px-3.5 py-1.5 text-xs transition-colors hover:bg-white/12"
            >
              {showImport ? "Hide import" : "Import / manage data"}
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${showImport ? "rotate-180" : ""}`}
              />
            </button>
          ) : null}
        </div>

        {showImport ? <ImportDataPanel /> : null}

        <FirstLookCard />

        {businessMeta?.outsideWindow ? (
          <GlassCard hover={false} className="mb-6 p-4 text-sm text-muted-foreground">
            Your imported data has nothing dated in the last 6 months, so the monthly charts stay
            empty. Check the date column mapping, or import a more recent export.
          </GlassCard>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-2">
          <GlassCard hover={false} className="min-w-0">
            <h2 className="text-base font-semibold">Sales trend</h2>
            <p className="mb-4 text-xs text-muted-foreground">
              Last 6 months · USD
              {salesFrom === "ga" ? " · purchase revenue from Google Analytics" : ""}
            </p>
            <div className="h-64">
              {series.length === 0 || salesFrom === null ? (
                <EmptyPanel label="No sales data imported yet." />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={series}>
                    <defs>
                      <linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="white" stopOpacity={0.45} />
                        <stop offset="100%" stopColor="white" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} />
                    <YAxis
                      stroke="var(--muted-foreground)"
                      fontSize={12}
                      tickFormatter={axisMoney}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value: number) => [formatUsdCompact(value), "Sales"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="sales"
                      stroke="white"
                      strokeWidth={2}
                      fill="url(#water)"
                      animationDuration={1400}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </GlassCard>

          <GlassCard hover={false} className="min-w-0">
            <h2 className="text-base font-semibold">Leads by month</h2>
            <p className="mb-4 text-xs text-muted-foreground">
              {leadsFrom === "ga"
                ? "Key events per month · Google Analytics"
                : "New leads per month"}
            </p>
            <div className="h-64">
              {series.length === 0 || leadsFrom === null ? (
                <EmptyPanel label="No lead data imported yet." />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={series}>
                    <defs>
                      <linearGradient id="waterBar" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="white" stopOpacity={0.75} />
                        <stop offset="100%" stopColor="white" stopOpacity={0.12} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={12} allowDecimals={false} />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      cursor={{ fill: "rgba(255,255,255,0.05)" }}
                    />
                    <Bar
                      dataKey="leads"
                      name="Leads"
                      fill="url(#waterBar)"
                      radius={[10, 10, 4, 4]}
                      animationDuration={1400}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </GlassCard>

          <GlassCard hover={false} className="min-w-0 lg:col-span-2">
            <h2 className="text-base font-semibold">What If Simulator</h2>
            <p className="mb-5 text-xs text-muted-foreground">
              Drag to model a change before you spend a dollar.
            </p>
            <p className="mb-4 rounded-xl bg-amber-400/10 p-3 text-xs text-amber-200">
              {SIM_DISCLAIMER}
            </p>

            <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
              <div>
                <label className="text-sm" htmlFor="spend">
                  Increase Ad Spend by{" "}
                  <span className="font-display font-semibold">{usd(spend * 1000)}</span>
                </label>
                <input
                  id="spend"
                  type="range"
                  min={0}
                  max={200}
                  step={5}
                  value={spend}
                  onChange={(e) => setSpend(Number(e.target.value))}
                  className="mt-3 w-full accent-white"
                />
                <div className="mt-5 space-y-4">
                  <div className="rounded-2xl bg-white/6 p-4">
                    <p className="text-xs text-muted-foreground">Predicted leads</p>
                    <motion.p
                      key={predictedLeads}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="font-display text-2xl font-semibold"
                    >
                      +{predictedLeads}
                    </motion.p>
                  </div>
                  <div className="rounded-2xl bg-white/6 p-4">
                    <p className="text-xs text-muted-foreground">Predicted sales lift</p>
                    <motion.p
                      key={predictedSales}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="font-display text-2xl font-semibold"
                    >
                      +{usd(predictedSales)}
                    </motion.p>
                  </div>
                  <WaterBar label="Model confidence" value={Math.max(30, 92 - spend / 4)} />
                </div>
              </div>

              <div className="h-72 min-w-0">
                {series.length === 0 || salesFrom === null ? (
                  <EmptyPanel label="Needs imported sales history to model against." />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={simulated}>
                      <CartesianGrid stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} />
                      <YAxis
                        stroke="var(--muted-foreground)"
                        fontSize={12}
                        tickFormatter={axisMoney}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "var(--popover)",
                          border: "1px solid var(--border)",
                          borderRadius: 14,
                          color: "var(--foreground)",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="sales"
                        stroke="var(--muted-foreground)"
                        strokeWidth={1.5}
                        fill="none"
                      />
                      <Area
                        type="monotone"
                        dataKey="projected"
                        stroke="white"
                        strokeWidth={2.5}
                        fill="url(#water)"
                        animationDuration={700}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </GlassCard>
        </div>

        <div className="mt-10">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold sm:text-xl">CRM Board</h2>
              <p className="text-xs text-muted-foreground">
                Pipeline, revenue mix and your best customers — from your imported data.
              </p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <GlassCard hover={false} className="min-w-0 lg:col-span-2">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold">Deal Pipeline</h3>
                  <p className="text-xs text-muted-foreground">
                    {(businessMeta?.dealsTotal ?? deals.length).toLocaleString()} deals ·{" "}
                    {money(pipelineValue)} in motion
                  </p>
                </div>
                <div className="flex items-center gap-1.5 rounded-full bg-white/6 px-3 py-1.5 text-[11px] text-muted-foreground">
                  <Trophy className="h-3.5 w-3.5 text-cyan" />
                  {money(wonValue)} won
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {deals.length === 0 ? (
                  <div className="sm:col-span-2 xl:col-span-4">
                    <EmptyPanel label="No deals imported yet." />
                  </div>
                ) : (
                  stageOrder.map((stage, colIdx) => {
                    const stageDeals = dealsByStage[stage];
                    const stageTotal = stageDeals.reduce((s, d) => s + d.value, 0);
                    return (
                      <motion.div
                        key={stage}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: colIdx * 0.06 }}
                        className="min-w-0 rounded-2xl bg-white/[0.04] p-2.5"
                      >
                        <div className="mb-2.5 flex items-center justify-between px-1">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ background: stageColor[stage] }}
                            />
                            <span className="text-xs font-medium">{stage}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            {stageDeals.length}
                          </span>
                        </div>
                        <p className="mb-2 px-1 text-[10px] text-muted-foreground">
                          {money(stageTotal)}
                        </p>
                        <div className="space-y-2">
                          {stageDeals.slice(0, STAGE_CARD_LIMIT).map((deal) => (
                            <div
                              key={deal.id}
                              className="glass-hover rounded-xl bg-white/[0.06] p-2.5"
                            >
                              <p className="truncate text-xs font-medium">{deal.company}</p>
                              <p className="truncate text-[10px] text-muted-foreground">
                                {deal.name}
                              </p>
                              <div className="mt-2 flex items-center justify-between">
                                <span className="text-[11px] font-semibold">
                                  {money(deal.value)}
                                </span>
                                <span
                                  className="rounded-full px-1.5 py-0.5 text-[9px]"
                                  style={{
                                    background: `color-mix(in oklab, ${stageColor[stage]} 22%, transparent)`,
                                  }}
                                >
                                  {deal.probability}%
                                </span>
                              </div>
                            </div>
                          ))}
                          {stageDeals.length > STAGE_CARD_LIMIT ? (
                            <p className="px-1 text-center text-[10px] text-muted-foreground">
                              +{stageDeals.length - STAGE_CARD_LIMIT} more
                            </p>
                          ) : null}
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </GlassCard>

            <GlassCard hover={false} className="min-w-0">
              <h3 className="text-base font-semibold">Revenue by Channel</h3>
              <p className="mb-2 text-xs text-muted-foreground">
                Share of revenue · {businessMeta?.channelPeriod ?? "Last 30 days"}
              </p>
              <div className="h-48">
                {channelRevenue.length === 0 ? (
                  <EmptyPanel label="No channel data yet." />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={channelRevenue}
                        dataKey="value"
                        nameKey="channel"
                        innerRadius={52}
                        outerRadius={78}
                        paddingAngle={3}
                        animationDuration={1000}
                      >
                        {channelRevenue.map((entry) => (
                          <Cell key={entry.channel} fill={entry.color} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "var(--popover)",
                          border: "1px solid var(--border)",
                          borderRadius: 14,
                          color: "var(--foreground)",
                        }}
                        formatter={(value: number) => [`${value}%`, ""]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="mt-1 grid grid-cols-2 gap-2">
                {channelRevenue.map((c) => (
                  <div key={c.channel} className="flex items-center gap-1.5 text-[11px]">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: c.color }}
                    />
                    <span className="truncate text-muted-foreground">{c.channel}</span>
                    <span className="ml-auto font-medium">{c.value}%</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <GlassCard hover={false} className="min-w-0 lg:col-span-2">
              <h3 className="text-base font-semibold">Top Customers</h3>
              <p className="mb-4 text-xs text-muted-foreground">Ranked by lifetime value</p>
              <div className="space-y-2.5">
                {topCustomers.length === 0 ? (
                  <EmptyPanel label="No customers imported yet." />
                ) : (
                  topCustomers.map((c, i) => (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-3 rounded-2xl bg-white/[0.04] p-3"
                    >
                      <div
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-semibold text-background"
                        style={{ background: "var(--gradient-accent)" }}
                      >
                        #{i + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-medium">{c.name}</p>
                          <p className="shrink-0 text-sm font-semibold">{money(c.ltv)}</p>
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                          <span className="truncate">{c.segment}</span>
                          <span>·</span>
                          <span className="flex items-center gap-0.5">
                            <ShoppingBag className="h-3 w-3" />
                            {c.orders} orders
                          </span>
                          <span>·</span>
                          <span className="truncate">{c.lastOrder}</span>
                        </div>
                      </div>
                      <TrendIcon trend={c.trend} />
                    </motion.div>
                  ))
                )}
              </div>
            </GlassCard>

            <GlassCard hover={false} className="min-w-0">
              <h3 className="text-base font-semibold">Conversion Funnel</h3>
              <p className="mb-4 text-xs text-muted-foreground">From your imported deals</p>
              <div className="space-y-4">
                {funnel.length === 0 ? (
                  <EmptyPanel label="No funnel data yet." />
                ) : (
                  funnel.map((stage, i) => {
                    const pct = Math.round((stage.value / funnel[0]!.value) * 100);
                    return (
                      <div key={stage.label}>
                        <WaterBar
                          label={`${stage.label} · ${stage.value.toLocaleString()}`}
                          value={pct}
                        />
                        {i < funnel.length - 1 ? (
                          <p className="mt-1 pl-1 text-[10px] text-muted-foreground">
                            {Math.round((funnel[i + 1]!.value / stage.value) * 100)}% moved forward
                          </p>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>
            </GlassCard>
          </div>
        </div>

        <PlatformAnalyticsSection />
        <ActivityLogSection />
      </div>
    </AppShell>
  );
}
