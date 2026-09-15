import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  BarChart3,
  Power,
  Radio,
  Shield,
  ShieldOff,
  Target,
  Trash2,
  Users,
  Waves,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell, PageHeader } from "@/components/aduf/app-shell";
import { GlassCard } from "@/components/aduf/liquid";
import { useAuth } from "@/store/auth-store";
import {
  adminAnalyticsFn,
  adminListUsersFn,
  adminOverviewFn,
  adminSetAdminStatusFn,
  checkIsAdminFn,
  deleteGoalFn,
  fetchAutomations,
  fetchGoals,
  setAutomationEnabledFn,
} from "@/lib/server-fns";
import type { AdminAnalytics } from "@/lib/server/admin-analytics";
import type { AdminOverview, AdminUserRow } from "@/lib/server/admin";
import type { Automation, Goal } from "@/lib/aduf-types";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Panel — ADUF AI" },
      { name: "description", content: "Workspace-wide admin controls for ADUF AI." },
    ],
  }),
  component: AdminPage,
});

const TABS = ["Overview", "Users", "Analytics", "Automations", "Goals"] as const;
type Tab = (typeof TABS)[number];

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: number | string;
}) {
  return (
    <GlassCard className="flex items-center gap-4 p-5">
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-cyan/15 text-cyan">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-2xl font-semibold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </GlassCard>
  );
}

const chartTooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  color: "var(--foreground)",
} as const;

function formatDayLabel(iso: string) {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function AdminPage() {
  const { status, accessToken, user } = useAuth();
  const [checked, setChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tab, setTab] = useState<Tab>("Overview");

  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [busyEmail, setBusyEmail] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const [automations, setAutomations] = useState<Automation[]>([]);
  const [automationsLoading, setAutomationsLoading] = useState(false);
  const [busyAutomationId, setBusyAutomationId] = useState<string | null>(null);

  const [goals, setGoals] = useState<Goal[]>([]);
  const [goalsLoading, setGoalsLoading] = useState(false);
  const [deletingGoalId, setDeletingGoalId] = useState<string | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (!accessToken) {
      setChecked(true);
      setIsAdmin(false);
      return;
    }
    checkIsAdminFn({ data: { accessToken } })
      .then((res) => {
        setIsAdmin(res.isAdmin);
        setChecked(true);
      })
      .catch(() => setChecked(true));
  }, [status, accessToken]);

  useEffect(() => {
    if (!isAdmin || !accessToken) return;
    adminOverviewFn({ data: { accessToken } })
      .then(setOverview)
      .catch((err) => console.error("[admin] overview failed", err));
    adminListUsersFn({ data: { accessToken } })
      .then(setUsers)
      .catch((err) => console.error("[admin] list users failed", err));
  }, [isAdmin, accessToken]);

  // Each secondary tab's data loads lazily, the first time it's opened, so
  // a plain "check access" visit to /admin doesn't fire five queries.
  useEffect(() => {
    if (!isAdmin || !accessToken) return;
    if (tab === "Analytics" && !analytics && !analyticsLoading) {
      setAnalyticsLoading(true);
      adminAnalyticsFn({ data: { accessToken } })
        .then(setAnalytics)
        .catch((err) => console.error("[admin] analytics failed", err))
        .finally(() => setAnalyticsLoading(false));
    }
    if (tab === "Automations" && automations.length === 0 && !automationsLoading) {
      setAutomationsLoading(true);
      fetchAutomations()
        .then(setAutomations)
        .catch((err) => console.error("[admin] automations failed", err))
        .finally(() => setAutomationsLoading(false));
    }
    if (tab === "Goals" && goals.length === 0 && !goalsLoading) {
      setGoalsLoading(true);
      fetchGoals()
        .then(setGoals)
        .catch((err) => console.error("[admin] goals failed", err))
        .finally(() => setGoalsLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, isAdmin, accessToken]);

  function toggleAdmin(target: AdminUserRow) {
    if (!accessToken || !target.email) return;
    setBusyEmail(target.email);
    setNotice(null);
    adminSetAdminStatusFn({
      data: { accessToken, targetEmail: target.email, makeAdmin: !target.isAdmin },
    })
      .then((res) => {
        if (res.ok) {
          setUsers((prev) =>
            prev.map((u) => (u.email === target.email ? { ...u, isAdmin: !u.isAdmin } : u)),
          );
        } else {
          setNotice(res.message ?? "Something went wrong.");
        }
      })
      .catch((err) => setNotice(err instanceof Error ? err.message : "Something went wrong."))
      .finally(() => setBusyEmail(null));
  }

  function toggleAutomationEnabled(automation: Automation) {
    setBusyAutomationId(automation.id);
    setAutomationEnabledFn({ data: { id: automation.id, enabled: !automation.enabled } })
      .then(() => {
        setAutomations((prev) =>
          prev.map((a) => (a.id === automation.id ? { ...a, enabled: !a.enabled } : a)),
        );
      })
      .catch((err) => console.error("[admin] toggle automation failed", err))
      .finally(() => setBusyAutomationId(null));
  }

  function confirmDeleteGoal(goalId: string) {
    setDeletingGoalId(null);
    setGoals((prev) => prev.filter((g) => g.id !== goalId));
    deleteGoalFn({ data: { goalId } }).catch((err) =>
      console.error("[admin] delete goal failed", err),
    );
  }

  if (!checked) {
    return (
      <AppShell>
        <div className="mx-auto max-w-[1200px] px-4 py-10 text-center text-sm text-muted-foreground">
          Checking access…
        </div>
      </AppShell>
    );
  }

  if (!isAdmin) {
    return (
      <AppShell>
        <div className="mx-auto max-w-[1200px] px-4 py-16 text-center">
          <ShieldOff className="mx-auto h-8 w-8 text-muted-foreground" />
          <h1 className="mt-4 text-lg font-semibold">Admins only</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {user?.email
              ? `${user.email} isn't on the admin allowlist for this workspace.`
              : "Sign in with an admin account to view this page."}
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6 lg:py-8">
        <PageHeader eyebrow="Admin" title="Workspace control panel">
          <div className="glass flex items-center gap-1.5 rounded-full px-4 py-2 text-xs text-muted-foreground">
            <Shield className="h-3.5 w-3.5 text-cyan" /> Signed in as admin
          </div>
        </PageHeader>

        <div className="mb-6 flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={
                tab === t
                  ? "rounded-full px-4 py-2 text-xs font-medium text-background"
                  : "rounded-full border border-border px-4 py-2 text-xs text-muted-foreground hover:bg-white/8 hover:text-foreground"
              }
              style={tab === t ? { background: "var(--gradient-accent)" } : undefined}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "Overview" ? (
          overview ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard icon={Users} label="Users" value={overview.totalUsers} />
              <StatCard icon={Target} label="Goals tracked" value={overview.totalGoals} />
              <StatCard
                icon={Waves}
                label="Automations (live / total)"
                value={`${overview.liveAutomations}/${overview.totalAutomations}`}
              />
              <StatCard
                icon={Activity}
                label="Automation runs"
                value={overview.totalAutomationRuns}
              />
              <StatCard icon={BarChart3} label="Chat messages" value={overview.totalChatMessages} />
              <StatCard icon={Radio} label="Status" value="All systems live" />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Loading workspace overview…</p>
          )
        ) : null}

        {tab === "Users" ? (
          <GlassCard hover={false} className="p-0">
            <div className="flex items-center justify-between gap-3 border-b border-border p-5">
              <div>
                <h2 className="text-base font-semibold">Users</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Grant or revoke admin access. There must always be at least one admin.
                </p>
              </div>
            </div>
            {notice ? (
              <p className="border-b border-border px-5 py-2 text-xs text-amber-300">{notice}</p>
            ) : null}
            <div className="divide-y divide-border">
              {users.length === 0 ? (
                <p className="px-5 py-6 text-sm text-muted-foreground">No users yet.</p>
              ) : (
                users.map((u) => (
                  <div key={u.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{u.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {u.email ?? "no email"}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {u.isAdmin ? (
                        <span className="rounded-full border border-cyan/40 px-2.5 py-1 text-[10px] uppercase tracking-wide text-cyan">
                          Admin
                        </span>
                      ) : null}
                      <button
                        onClick={() => toggleAdmin(u)}
                        disabled={busyEmail === u.email || !u.email}
                        className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-white/8 hover:text-foreground disabled:opacity-40"
                      >
                        {u.isAdmin ? "Revoke admin" : "Make admin"}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </GlassCard>
        ) : null}

        {tab === "Analytics" ? (
          analyticsLoading && !analytics ? (
            <p className="text-sm text-muted-foreground">Loading analytics…</p>
          ) : analytics ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <GlassCard className="p-5 lg:col-span-2">
                <h3 className="text-sm font-semibold">Chat activity — last 14 days</h3>
                <div className="mt-3 h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analytics.chatMessagesByDay}>
                      <defs>
                        <linearGradient id="chatFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--cyan)" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="var(--cyan)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeOpacity={0.08} vertical={false} />
                      <XAxis
                        dataKey="date"
                        tickFormatter={formatDayLabel}
                        tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                        width={28}
                      />
                      <Tooltip
                        contentStyle={chartTooltipStyle}
                        labelFormatter={(v: string) => formatDayLabel(v)}
                      />
                      <Area
                        type="monotone"
                        dataKey="count"
                        stroke="var(--cyan)"
                        fill="url(#chatFill)"
                        strokeWidth={2}
                        animationDuration={600}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </GlassCard>

              <GlassCard className="p-5">
                <h3 className="text-sm font-semibold">Signups — last 14 days</h3>
                <div className="mt-3 h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.signupsByDay}>
                      <CartesianGrid strokeOpacity={0.08} vertical={false} />
                      <XAxis
                        dataKey="date"
                        tickFormatter={formatDayLabel}
                        tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                        width={28}
                      />
                      <Tooltip
                        contentStyle={chartTooltipStyle}
                        labelFormatter={(v: string) => formatDayLabel(v)}
                      />
                      <Bar
                        dataKey="count"
                        radius={[6, 6, 0, 0]}
                        fill="var(--chart-2)"
                        animationDuration={600}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </GlassCard>

              <GlassCard className="p-5">
                <h3 className="text-sm font-semibold">Automation run outcomes</h3>
                {analytics.automationOutcomes.success + analytics.automationOutcomes.error === 0 ? (
                  <p className="mt-3 text-xs text-muted-foreground">
                    No automation runs recorded yet.
                  </p>
                ) : (
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: "Success", value: analytics.automationOutcomes.success },
                            { name: "Error", value: analytics.automationOutcomes.error },
                          ].filter((d) => d.value > 0)}
                          dataKey="value"
                          nameKey="name"
                          innerRadius="58%"
                          outerRadius="82%"
                          paddingAngle={3}
                          animationDuration={600}
                        >
                          <Cell fill="#6ee7b7" />
                          <Cell fill="#fb7185" />
                        </Pie>
                        <Tooltip contentStyle={chartTooltipStyle} />
                        <Legend
                          verticalAlign="bottom"
                          height={28}
                          formatter={(value: string) => (
                            <span className="text-xs text-muted-foreground">{value}</span>
                          )}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </GlassCard>

              <GlassCard className="p-5 lg:col-span-2">
                <h3 className="text-sm font-semibold">Most-run automations</h3>
                {analytics.automationsByRuns.length === 0 ? (
                  <p className="mt-3 text-xs text-muted-foreground">No automations have run yet.</p>
                ) : (
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={analytics.automationsByRuns}
                        layout="vertical"
                        margin={{ left: 0, right: 12 }}
                      >
                        <XAxis type="number" allowDecimals={false} hide />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={140}
                          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                          tickFormatter={(v: string) => (v.length > 20 ? `${v.slice(0, 20)}…` : v)}
                        />
                        <Tooltip contentStyle={chartTooltipStyle} />
                        <Bar
                          dataKey="runs"
                          radius={[0, 8, 8, 0]}
                          fill="var(--chart-1)"
                          animationDuration={600}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </GlassCard>

              <GlassCard className="p-5 lg:col-span-2">
                <h3 className="text-sm font-semibold">Goal status across the workspace</h3>
                {analytics.goalsStatus.completed +
                  analytics.goalsStatus.inProgress +
                  analytics.goalsStatus.notStarted ===
                0 ? (
                  <p className="mt-3 text-xs text-muted-foreground">No goals yet.</p>
                ) : (
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            {
                              name: "Completed",
                              value: analytics.goalsStatus.completed,
                              hex: "#6ee7b7",
                            },
                            {
                              name: "In progress",
                              value: analytics.goalsStatus.inProgress,
                              hex: "#67e8f9",
                            },
                            {
                              name: "Not started",
                              value: analytics.goalsStatus.notStarted,
                              hex: "rgba(255,255,255,0.25)",
                            },
                          ].filter((d) => d.value > 0)}
                          dataKey="value"
                          nameKey="name"
                          innerRadius="58%"
                          outerRadius="82%"
                          paddingAngle={3}
                          animationDuration={600}
                        >
                          {[
                            {
                              name: "Completed",
                              value: analytics.goalsStatus.completed,
                              hex: "#6ee7b7",
                            },
                            {
                              name: "In progress",
                              value: analytics.goalsStatus.inProgress,
                              hex: "#67e8f9",
                            },
                            {
                              name: "Not started",
                              value: analytics.goalsStatus.notStarted,
                              hex: "rgba(255,255,255,0.25)",
                            },
                          ]
                            .filter((d) => d.value > 0)
                            .map((d) => (
                              <Cell key={d.name} fill={d.hex} />
                            ))}
                        </Pie>
                        <Tooltip contentStyle={chartTooltipStyle} />
                        <Legend
                          verticalAlign="bottom"
                          height={28}
                          formatter={(value: string) => (
                            <span className="text-xs text-muted-foreground">{value}</span>
                          )}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </GlassCard>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Couldn't load analytics.</p>
          )
        ) : null}

        {tab === "Automations" ? (
          <GlassCard hover={false} className="p-0">
            <div className="border-b border-border p-5">
              <h2 className="text-base font-semibold">All automations</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Enable or disable any automation workspace-wide.
              </p>
            </div>
            <div className="divide-y divide-border">
              {automationsLoading ? (
                <p className="px-5 py-6 text-sm text-muted-foreground">Loading…</p>
              ) : automations.length === 0 ? (
                <p className="px-5 py-6 text-sm text-muted-foreground">No automations yet.</p>
              ) : (
                automations.map((a) => (
                  <div key={a.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{a.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {a.trigger} → {a.action} · {a.runs} {a.runs === 1 ? "run" : "runs"}
                      </p>
                    </div>
                    <button
                      onClick={() => toggleAutomationEnabled(a)}
                      disabled={busyAutomationId === a.id}
                      className={
                        a.enabled
                          ? "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-background disabled:opacity-40"
                          : "flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-white/8 hover:text-foreground disabled:opacity-40"
                      }
                      style={a.enabled ? { background: "var(--gradient-accent)" } : undefined}
                    >
                      <Power className="h-3.5 w-3.5" /> {a.enabled ? "Live" : "Off"}
                    </button>
                  </div>
                ))
              )}
            </div>
          </GlassCard>
        ) : null}

        {tab === "Goals" ? (
          <GlassCard hover={false} className="p-0">
            <div className="border-b border-border p-5">
              <h2 className="text-base font-semibold">All goals</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Workspace-wide view. Deleting here removes the goal for everyone.
              </p>
            </div>
            <div className="divide-y divide-border">
              {goalsLoading ? (
                <p className="px-5 py-6 text-sm text-muted-foreground">Loading…</p>
              ) : goals.length === 0 ? (
                <p className="px-5 py-6 text-sm text-muted-foreground">No goals yet.</p>
              ) : (
                goals.map((g) => {
                  const pct =
                    g.target > 0 ? Math.min(999, Math.round((g.current / g.target) * 100)) : 0;
                  return (
                    <div key={g.id} className="flex items-center justify-between gap-3 px-5 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{g.title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {pct}% · {g.current.toLocaleString()} of {g.target.toLocaleString()}{" "}
                          {g.currency}
                        </p>
                      </div>
                      {deletingGoalId === g.id ? (
                        <div className="flex shrink-0 items-center gap-2">
                          <button
                            onClick={() => setDeletingGoalId(null)}
                            aria-label="Cancel"
                            className="grid h-7 w-7 place-items-center rounded-full text-muted-foreground hover:bg-white/8"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => confirmDeleteGoal(g.id)}
                            className="rounded-full bg-rose-400/90 px-3 py-1.5 text-xs font-medium text-background hover:bg-rose-400"
                          >
                            Confirm delete
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeletingGoalId(g.id)}
                          aria-label={`Delete goal ${g.title}`}
                          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground/70 transition-colors hover:bg-rose-400/15 hover:text-rose-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </GlassCard>
        ) : null}
      </div>
    </AppShell>
  );
}
