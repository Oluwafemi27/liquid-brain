import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  BarChart3,
  CalendarCheck2,
  Check,
  Plus,
  Target,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { useState } from "react";
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

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {goals.length === 0 ? (
            <p className="col-span-full py-10 text-center text-sm text-muted-foreground">
              No goals yet — set one with "New Goal" and ADUF will help you track it.
            </p>
          ) : null}
          {goals.map((goal, i) => {
            const pct = Math.round((goal.current / goal.target) * 100);
            const complete = pct >= 100;
            return (
              <GlassCard key={goal.id} delay={i * 0.06} className="flex flex-col">
                <div className="flex flex-col items-center text-center">
                  <WaterOrb fill={pct} size={160} burst={complete}>
                    <span className="font-display text-3xl font-semibold">{pct}%</span>
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

        <section className="mt-8 space-y-4" aria-labelledby="achievements-heading">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Momentum</p>
              <h2 id="achievements-heading" className="mt-1 text-xl font-semibold">
                Achievements
              </h2>
            </div>
            <span className="text-xs text-muted-foreground">This quarter</span>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <GlassCard className="flex items-center gap-4 p-5">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-amber-400/15 text-amber-300">
                <Trophy className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-semibold">12</p>
                <p className="text-xs text-muted-foreground">Milestones reached</p>
              </div>
            </GlassCard>
            <GlassCard className="flex items-center gap-4 p-5">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-400/15 text-emerald-300">
                <Target className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-semibold">86%</p>
                <p className="text-xs text-muted-foreground">Average goal completion</p>
              </div>
            </GlassCard>
            <GlassCard className="flex items-center gap-4 p-5">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-cyan-400/15 text-cyan-300">
                <CalendarCheck2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-semibold">9 days</p>
                <p className="text-xs text-muted-foreground">Current streak</p>
              </div>
            </GlassCard>
          </div>
          <GlassCard className="grid gap-4 p-5 sm:grid-cols-3">
            {[
              ["First $1,000 month", "Revenue", "Achieved Jun 12"],
              ["100 new customers", "Growth", "Achieved Jun 18"],
              ["Zero overdue tasks", "Execution", "Achieved Jun 24"],
            ].map(([title, category, date]) => (
              <div key={title} className="flex items-center gap-3 rounded-2xl bg-white/5 p-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-cyan-300/35 text-cyan-300">
                  <Check className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {category} · {date}
                  </p>
                </div>
              </div>
            ))}
          </GlassCard>
        </section>

        <section className="mt-8 space-y-4" aria-labelledby="analytics-heading">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Performance view
              </p>
              <h2 id="analytics-heading" className="mt-1 text-xl font-semibold">
                Goal Analytics
              </h2>
            </div>
            <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              View report <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <GlassCard className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-cyan-300" />
                  <h3 className="text-sm font-semibold">Progress velocity</h3>
                </div>
                <span className="flex items-center gap-1 text-xs text-emerald-300">
                  <TrendingUp className="h-3.5 w-3.5" /> 18.4%
                </span>
              </div>
              <div className="mt-6 flex h-40 items-end gap-2 sm:gap-4">
                {[42, 56, 48, 68, 62, 78, 91, 84, 100, 94, 108, 118].map((height, i) => (
                  <div
                    key={i}
                    className="group flex h-full flex-1 flex-col items-center justify-end gap-2"
                  >
                    <div
                      className="w-full rounded-t-lg bg-gradient-to-t from-cyan-400/25 to-cyan-200/90 transition-all group-hover:from-cyan-400/50"
                      style={{ height: `${height}px` }}
                    />
                    <span className="text-[10px] text-muted-foreground">
                      {["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"][i]}
                    </span>
                  </div>
                ))}
              </div>
            </GlassCard>
            <GlassCard className="p-5">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-violet-300" />
                <h3 className="text-sm font-semibold">Goal health</h3>
              </div>
              <div className="mt-5 space-y-5">
                {[
                  ["On track", "68%", "bg-emerald-300", "6 goals"],
                  ["Needs attention", "22%", "bg-amber-300", "2 goals"],
                  ["At risk", "10%", "bg-rose-300", "1 goal"],
                ].map(([label, width, color, count]) => (
                  <div key={label}>
                    <div className="mb-2 flex justify-between text-xs">
                      <span>{label}</span>
                      <span className="text-muted-foreground">
                        {count} · {width}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-white/8">
                      <div className={`h-full rounded-full ${color}`} style={{ width }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 rounded-2xl border border-border bg-white/5 p-3 text-xs text-muted-foreground">
                Your team is completing goals{" "}
                <span className="font-medium text-foreground">24% faster</span> than last quarter.
              </div>
            </GlassCard>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
