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
import { GlassCard } from "@/components/aduf/liquid";
import type { AdminAnalytics } from "@/lib/server/admin-analytics";

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

/** Workspace-wide usage charts (signups, chat activity, automation outcomes, goal status). */
export function AdminAnalyticsSection({
  analytics,
  loading,
}: {
  analytics: AdminAnalytics | null;
  loading: boolean;
}) {
  return loading && !analytics ? (
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
          <p className="mt-3 text-xs text-muted-foreground">No automation runs recorded yet.</p>
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
  );
}
