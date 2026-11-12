import { CheckCircle2, ExternalLink, MinusCircle, RefreshCw, Send, XCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { GlassCard } from "@/components/aduf/liquid";
import { Badge, KpiCard } from "@/components/admin/ui";
import { adminMonitoringFn, adminMonitoringTestFn } from "@/lib/server-fns";
import type {
  Check,
  MonitoringReport,
  ServiceStatus,
  Tone,
} from "@/lib/server/monitoring-dashboard";

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  color: "var(--foreground)",
} as const;

const TONE: Record<Tone, { badge: "good" | "warn" | "bad" | "neutral"; label: string }> = {
  ok: { badge: "good", label: "Working" },
  warn: { badge: "warn", label: "Needs attention" },
  bad: { badge: "bad", label: "Not working" },
  off: { badge: "neutral", label: "Not connected" },
};

const hour = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: "numeric" });
const when = (iso: string) =>
  iso
    ? new Date(iso).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "";

function CheckRow({ c }: { c: Check }) {
  const Icon = c.ok === true ? CheckCircle2 : c.ok === false ? XCircle : MinusCircle;
  const color =
    c.ok === true ? "text-emerald-300" : c.ok === false ? "text-red-300" : "text-amber-300";
  return (
    <li className="flex items-start gap-2 text-sm">
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${color}`} aria-hidden />
      <span>
        <span className="font-medium">{c.label}.</span>{" "}
        <span className="text-muted-foreground">{c.detail}</span>
      </span>
    </li>
  );
}

function ServiceCard({ s }: { s: ServiceStatus }) {
  const t = TONE[s.tone];
  return (
    <GlassCard className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold">{s.name}</h3>
          <p className="text-sm text-muted-foreground">{s.headline}</p>
        </div>
        <Badge tone={t.badge}>{t.label}</Badge>
      </div>
      <ul className="mt-4 space-y-2">
        {s.checks.map((c) => (
          <CheckRow key={c.label} c={c} />
        ))}
      </ul>
      {s.missing.length > 0 ? (
        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-xs text-muted-foreground">
          <p>
            To switch on the rest, add these settings where the app runs (Vercel Environment
            Variables, or the Azure Container App), then redeploy:
          </p>
          <p className="mt-2 flex flex-wrap gap-1.5">
            {s.missing.map((m) => (
              <code key={m} className="rounded bg-white/10 px-1.5 py-0.5 text-foreground">
                {m}
              </code>
            ))}
          </p>
        </div>
      ) : null}
      {s.href ? (
        <a
          href={s.href}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-1.5 text-sm text-cyan hover:underline"
        >
          Open {s.name} <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        </a>
      ) : null}
    </GlassCard>
  );
}

function HourBars({ data, label }: { data: Array<{ at: string; count: number }>; label: string }) {
  if (data.length === 0)
    return <p className="mt-3 text-sm text-muted-foreground">No data for the last 24 hours yet.</p>;
  return (
    <div className="mt-3 h-40" role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeOpacity={0.08} vertical={false} />
          <XAxis
            dataKey="at"
            tickFormatter={hour}
            tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
            interval="preserveStartEnd"
          />
          <YAxis
            allowDecimals={false}
            width={28}
            tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
          />
          <Tooltip contentStyle={tooltipStyle} labelFormatter={(v) => when(String(v))} />
          <Bar dataKey="count" name="Errors" fill="var(--cyan)" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

const STATE_TONE: Record<string, "good" | "warn" | "bad" | "neutral"> = {
  OK: "good",
  Warn: "warn",
  Alert: "bad",
  "No Data": "warn",
  live: "good",
  delayed: "warn",
  broken: "bad",
};

function SentryPanel({ r }: { r: MonitoringReport }) {
  const d = r.sentry;
  if (!d) return null;
  return (
    <GlassCard className="p-5">
      <h3 className="text-base font-semibold">Sentry: errors</h3>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <KpiCard
          label="Errors, last 24 hours"
          value={d.total24h ?? "n/a"}
          tone={d.total24h && d.total24h > 50 ? "warn" : undefined}
        />
        <KpiCard
          label="Open issues"
          value={d.issues.length}
          tone={d.issues.length > 0 ? "warn" : undefined}
        />
        <KpiCard label="People affected" value={d.issues.reduce((s, i) => s + i.users, 0)} />
      </div>
      <HourBars data={d.perHour} label="Errors per hour over the last 24 hours" />
      {d.issues.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          No unresolved issues in the last 24 hours.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-white/10">
          {d.issues.map((i) => (
            <li key={i.id} className="py-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={i.level === "fatal" || i.level === "error" ? "bad" : "warn"}>
                  {i.level}
                </Badge>
                {i.href ? (
                  <a
                    href={i.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium hover:underline"
                  >
                    {i.title || "Untitled issue"}
                  </a>
                ) : (
                  <span className="text-sm font-medium">{i.title || "Untitled issue"}</span>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {i.culprit ? `${i.culprit} · ` : ""}
                {i.count} {i.count === 1 ? "time" : "times"} · {i.users}{" "}
                {i.users === 1 ? "person" : "people"} · last seen {when(i.lastSeen)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </GlassCard>
  );
}

function DatadogPanel({ r }: { r: MonitoringReport }) {
  const d = r.datadog;
  if (!d) return null;
  const by = d.logs?.byStatus ?? {};
  const total = Object.values(by).reduce((s, n) => s + n, 0);
  return (
    <GlassCard className="p-5">
      <h3 className="text-base font-semibold">Datadog: monitors and logs</h3>
      {d.monitors ? (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard label="Monitors" value={d.monitors.total} />
          <KpiCard label="OK" value={d.monitors.byState["OK"] ?? 0} />
          <KpiCard
            label="Warning"
            value={d.monitors.byState["Warn"] ?? 0}
            tone={(d.monitors.byState["Warn"] ?? 0) > 0 ? "warn" : undefined}
          />
          <KpiCard
            label="Alerting"
            value={d.monitors.byState["Alert"] ?? 0}
            tone={(d.monitors.byState["Alert"] ?? 0) > 0 ? "bad" : undefined}
          />
        </div>
      ) : null}
      {d.monitors && d.monitors.attention.length > 0 ? (
        <ul className="mt-4 divide-y divide-white/10">
          {d.monitors.attention.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-2 py-2.5">
              <Badge tone={STATE_TONE[m.state] ?? "neutral"}>{m.state}</Badge>
              <a
                href={m.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm hover:underline"
              >
                {m.name}
              </a>
            </li>
          ))}
        </ul>
      ) : d.monitors ? (
        <p className="mt-4 text-sm text-muted-foreground">
          {d.monitors.total === 0
            ? "No monitors yet. Create alerts in Datadog and they'll show here."
            : "Every monitor is OK."}
        </p>
      ) : null}
      {d.logs ? (
        <>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KpiCard label="Log lines, 24 hours" value={total} />
            <KpiCard
              label="Errors"
              value={by["error"] ?? 0}
              tone={(by["error"] ?? 0) > 0 ? "warn" : undefined}
            />
            <KpiCard label="Warnings" value={by["warn"] ?? 0} />
            <KpiCard label="Info" value={by["info"] ?? 0} />
          </div>
          <HourBars
            data={d.logs.errorsPerHour}
            label="Error log lines per hour over the last 24 hours"
          />
          {d.logs.recentErrors.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {d.logs.recentErrors.map((l, i) => (
                <li
                  key={`${l.at}-${i}`}
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs"
                >
                  <span className="text-muted-foreground">{when(l.at)}</span> {l.message}
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : null}
    </GlassCard>
  );
}

function PlatformPanel({ r }: { r: MonitoringReport }) {
  const p = r.platform;
  const up = p.uptimeSeconds;
  const uptime =
    up >= 86400
      ? `${Math.floor(up / 86400)}d ${Math.floor((up % 86400) / 3600)}h`
      : up >= 3600
        ? `${Math.floor(up / 3600)}h ${Math.floor((up % 3600) / 60)}m`
        : `${Math.floor(up / 60)}m`;
  return (
    <GlassCard className="p-5">
      <h3 className="text-base font-semibold">This server</h3>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          label="Database"
          value={p.database.ok ? "OK" : "Down"}
          hint={p.database.ms !== null ? `${p.database.ms} ms` : undefined}
          tone={p.database.ok ? undefined : "bad"}
        />
        <KpiCard label="Running for" value={uptime} hint="since last restart" />
        <KpiCard label="Memory" value={`${p.memoryMb} MB`} />
        <KpiCard
          label="Cache"
          value={p.cache === "redis" ? "Redis" : "Memory"}
          hint={p.cache === "redis" ? "shared by all servers" : "one server only"}
        />
      </div>
      <ul className="mt-4 divide-y divide-white/10">
        {p.integrations.map((i) => (
          <li
            key={i.id}
            className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm"
          >
            <span>
              {i.name} <span className="text-xs text-muted-foreground">{i.detail}</span>
            </span>
            <Badge tone={i.ok === false ? "bad" : i.configured ? "good" : "neutral"}>
              {i.ok === false ? "Not working" : i.configured ? "Set" : "Not set"}
            </Badge>
          </li>
        ))}
      </ul>
    </GlassCard>
  );
}

function ConnectionsPanel({ r }: { r: MonitoringReport }) {
  return (
    <GlassCard className="p-5">
      <h3 className="text-base font-semibold">Connected platforms</h3>
      {r.connections.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No platforms connected yet.</p>
      ) : (
        <ul className="mt-3 divide-y divide-white/10">
          {r.connections.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <div>
                <p className="text-sm font-medium">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.message}</p>
              </div>
              <Badge tone={STATE_TONE[c.state] ?? "neutral"}>
                {c.state === "live" ? "Working" : c.state === "delayed" ? "Delayed" : "Not working"}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </GlassCard>
  );
}

export function MonitoringSection({ accessToken }: { accessToken: string }) {
  const [report, setReport] = useState<MonitoringReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [testMsg, setTestMsg] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  const load = useCallback(
    async (force = false) => {
      setLoading(true);
      setFailed(false);
      try {
        const r = await adminMonitoringFn({
          data: {
            accessToken,
            force,
            sentryBrowser: Boolean(import.meta.env["VITE_SENTRY_DSN"]),
            datadogBrowser: Boolean(
              import.meta.env["VITE_DD_APPLICATION_ID"] && import.meta.env["VITE_DD_CLIENT_TOKEN"],
            ),
          },
        });
        setReport(r);
        if (!r) setFailed(true);
      } catch {
        setFailed(true);
      } finally {
        setLoading(false);
      }
    },
    [accessToken],
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  const sendTest = async () => {
    setTesting(true);
    try {
      const r = await adminMonitoringTestFn({ data: { accessToken } });
      setTestMsg(r.message);
    } catch {
      setTestMsg("The test couldn't be sent. Try again in a moment.");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Monitoring</h2>
          <p className="text-xs text-muted-foreground">
            {report
              ? `Updated ${when(report.generatedAt)}. Results are cached for a minute.`
              : "Checking your connections…"}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void sendTest()}
            disabled={testing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/6 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" aria-hidden /> {testing ? "Sending…" : "Send test event"}
          </button>
          <button
            type="button"
            onClick={() => void load(true)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/6 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} aria-hidden />{" "}
            Refresh
          </button>
        </div>
      </div>

      {testMsg ? (
        <p
          role="status"
          className="mb-4 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm"
        >
          {testMsg}
        </p>
      ) : null}

      {failed && !report ? (
        <p className="text-sm text-muted-foreground">
          Couldn't load monitoring. Check you're signed in as an admin, then press Refresh.
        </p>
      ) : null}
      {loading && !report ? (
        <div className="h-40 animate-pulse rounded-2xl bg-white/6" aria-busy="true" />
      ) : null}

      {report ? (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {report.services.map((s) => (
              <ServiceCard key={s.id} s={s} />
            ))}
          </div>
          {report.notes.length > 0 ? (
            <ul className="space-y-1 rounded-xl border border-amber-400/30 bg-amber-400/[0.06] p-3 text-sm">
              {report.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          ) : null}
          <SentryPanel r={report} />
          <DatadogPanel r={report} />
          <div className="grid gap-4 lg:grid-cols-2">
            <PlatformPanel r={report} />
            <ConnectionsPanel r={report} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
