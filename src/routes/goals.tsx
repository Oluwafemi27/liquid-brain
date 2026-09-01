import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { BarChart3, Check, Plus, Target, Trophy } from "lucide-react";
import { useMemo, useState } from "react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AppShell, PageHeader } from "@/components/aduf/app-shell";
import { GlassCard, WaterOrb } from "@/components/aduf/liquid";
import { formatUsd, toUsd, useUsdRates } from "@/lib/currency";
import { useAduf } from "@/store/aduf-store";

export const Route = createFileRoute("/goals")({
  head: () => ({
    meta: [
      { title: "Goals Engine — ADUF AI" },
      {
        name: "description",
        content:
          "Set business KPIs and watch progress fill live goal orbs — sales targets, lead volume and retention, each broken into sub-tasks ADUF works on.",
      },
      { property: "og:title", content: "Goals Engine — ADUF AI" },
      {
        property: "og:description",
        content: "Track every business KPI as a liquid goal orb that fills as you progress.",
      },
    ],
  }),
  component: GoalsPage,
});

function GoalsPage() {
  const { goals, toggleSubTask, bumpGoal, addGoal } = useAduf();
  const { rates } = useUsdRates();
  const formatGoalAmount = (amount: number, currency: string) =>
    currency ? formatUsd(toUsd(amount, currency, rates)) : amount.toLocaleString();
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("100");

  // Every number below is derived from the real `goals` array — no
  // fabricated business figures. A fresh account with zero goals shows
  // zero everywhere, honestly, rather than a seeded-looking dashboard.
  const goalPct = (g: (typeof goals)[number]) =>
    g.target > 0 ? Math.min(999, Math.round((g.current / g.target) * 100)) : 0;
  const completed = goals.filter((g) => goalPct(g) >= 100);
  const inProgress = goals.filter((g) => goalPct(g) > 0 && goalPct(g) < 100);
  const notStarted = goals.filter((g) => goalPct(g) <= 0);
  const avgCompletion = goals.length
    ? Math.round(goals.reduce((sum, g) => sum + Math.min(100, goalPct(g)), 0) / goals.length)
    : 0;
  const healthBuckets = [
    { label: "Completed", count: completed.length, color: "bg-emerald-300" },
    { label: "In progress", count: inProgress.length, color: "bg-cyan-300" },
    { label: "Not started", count: notStarted.length, color: "bg-white/25" },
  ].filter((b) => b.count > 0);
  const goalAnalytics = useMemo(
    () =>
      goals.map((goal) => ({
        label: goal.title,
        progress: Math.min(100, goalPct(goal)),
        current: goal.current,
        target: goal.target,
      })),
    [goals],
  );

  return (
    <AppShell>
      <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:py-8">
        <PageHeader eyebrow="Goals Engine" title="What we're chasing">
          <button
            onClick={() => setCreating((c) => !c)}
            className="flex items-center gap-1.5 rounded-full px-4 py-2.5 text-xs font-medium text-background transition-transform hover:scale-[1.03]"
            style={{ background: "var(--gradient-accent)" }}
          >
            <Plus className="h-4 w-4" /> New Goal
          </button>
        </PageHeader>

        {creating ? (
          <GlassCard hover={false} className="mb-6">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!title.trim()) return;
                addGoal(title.trim(), Number(target) || 100);
                setTitle("");
                setCreating(false);
              }}
              className="flex flex-col gap-3 sm:flex-row"
            >
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Goal name, e.g. ₦5,000,000 in Sales"
                className="min-w-0 flex-1 rounded-full bg-white/8 px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
              />
              <input
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                inputMode="numeric"
                placeholder="Target"
                className="w-full rounded-full bg-white/8 px-4 py-2.5 text-sm outline-none sm:w-32 focus:ring-2 focus:ring-ring"
              />
              <button
                type="submit"
                className="rounded-full px-5 py-2.5 text-xs font-medium text-background"
                style={{ background: "var(--gradient-accent)" }}
              >
                Create
              </button>
            </form>
          </GlassCard>
        ) : null}

        {goals.length > 0 ? (
          <GlassCard hover={false} className="mb-6 min-w-0 p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  Live analytics
                </p>
                <h2 className="mt-1 text-base font-semibold">Goal completion</h2>
              </div>
              <p className="text-xs text-muted-foreground">Updates as progress is logged</p>
            </div>
            <div className="h-52 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={goalAnalytics} layout="vertical" margin={{ left: 0, right: 12 }}>
                  <XAxis type="number" domain={[0, 100]} hide />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={88}
                    tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                    tickFormatter={(value: string) =>
                      value.length > 14 ? `${value.slice(0, 14)}…` : value
                    }
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(255,255,255,0.04)" }}
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      color: "var(--foreground)",
                    }}
                    formatter={(value: number, _name, item) => [
                      `${value}% · ${item.payload.current.toLocaleString()} of ${item.payload.target.toLocaleString()}`,
                      "Progress",
                    ]}
                  />
                  <Bar dataKey="progress" radius={[0, 8, 8, 0]} animationDuration={600}>
                    {goalAnalytics.map((goal) => (
                      <Cell
                        key={goal.label}
                        fill={goal.progress >= 100 ? "var(--chart-1)" : "var(--cyan)"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>
        ) : null}

        <div className="grid gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
          {goals.length === 0 ? (
            <p className="col-span-full py-10 text-center text-sm text-muted-foreground">
              No goals yet — set one with "New Goal" and ADUF will help you track it.
            </p>
          ) : null}
          {goals.map((goal, i) => {
            const pct = goalPct(goal);
            const complete = pct >= 100;
            return (
              <GlassCard key={goal.id} delay={i * 0.06} className="flex flex-col">
                <div className="flex flex-col items-center text-center">
                  <WaterOrb fill={pct} size={144} burst={complete}>
                    <span className="font-display text-2xl font-semibold sm:text-3xl">{pct}%</span>
                    <span className="mt-0.5 text-[11px] text-muted-foreground">due {goal.due}</span>
                  </WaterOrb>
                  <h3 className="mt-4 text-base font-semibold">{goal.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatGoalAmount(goal.current, goal.currency)} of{" "}
                    {formatGoalAmount(goal.target, goal.currency)}
                  </p>
                </div>

                <ul className="mt-5 flex-1 space-y-2">
                  {goal.subTasks.length === 0 ? (
                    <li className="text-xs text-muted-foreground">
                      No sub-tasks yet — ADUF will propose a plan.
                    </li>
                  ) : null}
                  {goal.subTasks.map((t) => (
                    <li key={t.id}>
                      <button
                        onClick={() => toggleSubTask(goal.id, t.id)}
                        className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left text-sm transition-colors hover:bg-white/8"
                      >
                        <span
                          className="grid h-5 w-5 shrink-0 place-items-center rounded-md border border-border"
                          style={t.done ? { background: "var(--gradient-accent)" } : undefined}
                        >
                          {t.done ? <Check className="h-3.5 w-3.5 text-background" /> : null}
                        </span>
                        <span className={t.done ? "text-muted-foreground line-through" : undefined}>
                          {t.label}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => bumpGoal(goal.id, Math.round(goal.target * 0.1))}
                    className="flex-1 rounded-full border border-border px-3 py-2 text-xs text-muted-foreground hover:bg-white/8 hover:text-foreground"
                  >
                    Log progress
                  </button>
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    className="flex-1 rounded-full px-3 py-2 text-xs font-medium text-background"
                    style={{ background: "var(--gradient-accent)" }}
                  >
                    Edit Plan
                  </motion.button>
                </div>
              </GlassCard>
            );
          })}
        </div>

        {goals.length > 0 ? (
          <section className="mt-8 space-y-4" aria-labelledby="momentum-heading">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Momentum</p>
              <h2 id="momentum-heading" className="mt-1 text-xl font-semibold">
                Where you stand
              </h2>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <GlassCard className="flex items-center gap-4 p-5">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-amber-400/15 text-amber-300">
                  <Trophy className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{completed.length}</p>
                  <p className="text-xs text-muted-foreground">
                    {completed.length === 1 ? "Goal completed" : "Goals completed"}
                  </p>
                </div>
              </GlassCard>
              <GlassCard className="flex items-center gap-4 p-5">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-400/15 text-emerald-300">
                  <Target className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{avgCompletion}%</p>
                  <p className="text-xs text-muted-foreground">Average goal completion</p>
                </div>
              </GlassCard>
              <GlassCard className="flex items-center gap-4 p-5">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-cyan-400/15 text-cyan-300">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{goals.length}</p>
                  <p className="text-xs text-muted-foreground">Active goals</p>
                </div>
              </GlassCard>
            </div>

            {completed.length > 0 ? (
              <GlassCard className="grid gap-4 p-5 sm:grid-cols-3">
                {completed.slice(0, 6).map((g) => (
                  <div key={g.id} className="flex items-center gap-3 rounded-2xl bg-white/5 p-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-cyan-300/35 text-cyan-300">
                      <Check className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{g.title}</p>
                      <p className="text-[11px] text-muted-foreground">Target reached</p>
                    </div>
                  </div>
                ))}
              </GlassCard>
            ) : null}

            {healthBuckets.length > 0 ? (
              <GlassCard className="p-5">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-violet-300" />
                  <h3 className="text-sm font-semibold">Goal breakdown</h3>
                </div>
                <div className="mt-5 space-y-5">
                  {healthBuckets.map((bucket) => {
                    const width = `${Math.round((bucket.count / goals.length) * 100)}%`;
                    return (
                      <div key={bucket.label}>
                        <div className="mb-2 flex justify-between text-xs">
                          <span>{bucket.label}</span>
                          <span className="text-muted-foreground">
                            {bucket.count} {bucket.count === 1 ? "goal" : "goals"}
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-white/8">
                          <div
                            className={`h-full rounded-full ${bucket.color}`}
                            style={{ width }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </GlassCard>
            ) : null}
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}
