import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Check, Plus } from "lucide-react";
import { useState } from "react";
import { AppShell, PageHeader } from "@/components/aduf/app-shell";
import { GlassCard, WaterOrb } from "@/components/aduf/liquid";
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
                    {goal.currency}
                    {goal.current.toLocaleString()} of {goal.currency}
                    {goal.target.toLocaleString()}
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
      </div>
    </AppShell>
  );
}
