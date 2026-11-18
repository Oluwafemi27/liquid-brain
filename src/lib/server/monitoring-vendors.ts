import "@tanstack/react-start/server-only";
import { redactText } from "@/lib/monitoring/scrub";

// Sentry and Datadog clients for the admin Monitoring page (see monitoring-dashboard.ts).
// The admin Monitoring page. It asks Sentry and Datadog for what they hold, checks that each key
// really works, and adds the health of the rest of the platform. Admin-only, read-only, cached for a
// minute so the page can't burn the vendors' rate limits, and no key or token ever reaches the browser.

export type Tone = "ok" | "warn" | "bad" | "off";

export interface Check {
  label: string;
  /** true = passed, false = failed, null = not applicable / couldn't tell. */
  ok: boolean | null;
  detail: string;
}

export interface ServiceStatus {
  id: "sentry" | "datadog";
  name: string;
  tone: Tone;
  headline: string;
  checks: Check[];
  /** Environment variables that are still missing for the full picture. */
  missing: string[];
  /** Where to open the vendor's own dashboard, when we know it. */
  href: string | null;
}

export interface SentryIssue {
  id: string;
  title: string;
  culprit: string;
  level: string;
  count: number;
  users: number;
  firstSeen: string;
  lastSeen: string;
  href: string | null;
}

export interface SentryData {
  issues: SentryIssue[];
  /** Errors received per hour over the last 24 hours. */
  perHour: Array<{ at: string; count: number }>;
  total24h: number | null;
}

export interface DatadogMonitor {
  id: number;
  name: string;
  state: string;
  type: string;
  href: string;
}

export interface DatadogData {
  monitors: { total: number; byState: Record<string, number>; attention: DatadogMonitor[] } | null;
  logs: {
    byStatus: Record<string, number>;
    errorsPerHour: Array<{ at: string; count: number }>;
    recentErrors: Array<{ at: string; message: string }>;
  } | null;
}

export type Fetch = typeof fetch;
const TIMEOUT_MS = 8000;

// ---------------------------------------------------------------- configuration (pure)

const DD_SITES = /^(?:[a-z0-9-]+\.)?(?:datadoghq\.(?:com|eu)|ddog-gov\.com)$/;

/** Only real Datadog regions are allowed, so a mistyped or malicious DD_SITE can't aim our
 *  requests, and the API key, at another server. */
export function datadogSite(raw: string | undefined): string | null {
  const site = (raw || "datadoghq.com").trim().toLowerCase();
  return DD_SITES.test(site) ? site : null;
}

export interface SentryConfig {
  base: string;
  token: string;
  org: string;
  project: string;
}

const SLUG = /^[a-z0-9][a-z0-9._-]{0,99}$/i;

export function sentryConfig(env: NodeJS.ProcessEnv = process.env): SentryConfig | null {
  const token = env["SENTRY_AUTH_TOKEN"];
  const org = env["SENTRY_ORG"];
  const project = env["SENTRY_PROJECT"];
  if (!token || !org || !project || !SLUG.test(org) || !SLUG.test(project)) return null;
  let base = (env["SENTRY_API_BASE"] || "https://sentry.io").replace(/\/+$/, "");
  try {
    const u = new URL(base);
    if (u.protocol !== "https:") return null;
    base = u.origin;
  } catch {
    return null;
  }
  return { base, token, org, project };
}

// ---------------------------------------------------------------- parsing (pure, unit-tested)

const num = (v: unknown): number => {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : 0;
};
const str = (v: unknown): string => (typeof v === "string" ? v : "");
const clean = (v: unknown, max: number): string =>
  redactText(str(v)).replace(/\s+/g, " ").slice(0, max);

export function parseSentryIssues(raw: unknown): SentryIssue[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 20).map((r) => {
    const o = (r ?? {}) as Record<string, unknown>;
    const link = str(o["permalink"]);
    return {
      id: str(o["id"]),
      title: clean(o["title"], 160),
      culprit: clean(o["culprit"], 120),
      level: str(o["level"]) || "error",
      count: num(o["count"]),
      users: num(o["userCount"]),
      firstSeen: str(o["firstSeen"]),
      lastSeen: str(o["lastSeen"]),
      href: link.startsWith("https://") ? link : null,
    };
  });
}

/** Sentry's stats endpoint returns [[unixSeconds, count], ...]. */
export function parseSentryStats(raw: unknown): {
  perHour: SentryData["perHour"];
  total: number | null;
} {
  if (!Array.isArray(raw)) return { perHour: [], total: null };
  const perHour = raw
    .filter((p): p is [number, number] => Array.isArray(p) && p.length >= 2)
    .map(([t, c]) => ({ at: new Date(num(t) * 1000).toISOString(), count: num(c) }));
  return { perHour, total: perHour.reduce((s, p) => s + p.count, 0) };
}

export function parseDatadogMonitors(raw: unknown, site: string): DatadogData["monitors"] {
  if (!Array.isArray(raw)) return null;
  const byState: Record<string, number> = {};
  const attention: DatadogMonitor[] = [];
  for (const r of raw) {
    const o = (r ?? {}) as Record<string, unknown>;
    const state = str(o["overall_state"]) || "Unknown";
    byState[state] = (byState[state] ?? 0) + 1;
    if (state !== "OK" && state !== "Ignored" && state !== "Skipped" && attention.length < 8) {
      attention.push({
        id: num(o["id"]),
        name: clean(o["name"], 120),
        state,
        type: str(o["type"]),
        href: `https://app.${site}/monitors/${num(o["id"])}`,
      });
    }
  }
  return { total: raw.length, byState, attention };
}

export function parseDatadogStatusCounts(raw: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  const buckets = ((raw as { data?: { buckets?: unknown[] } } | null)?.data?.buckets ??
    []) as Array<Record<string, unknown>>;
  for (const b of buckets) {
    const status = str((b["by"] as Record<string, unknown> | undefined)?.["status"]) || "unknown";
    const c0 = (b["computes"] as Record<string, unknown> | undefined)?.["c0"];
    out[status] = (out[status] ?? 0) + num(c0);
  }
  return out;
}

export function parseDatadogTimeseries(raw: unknown): Array<{ at: string; count: number }> {
  const buckets = ((raw as { data?: { buckets?: unknown[] } } | null)?.data?.buckets ??
    []) as Array<Record<string, unknown>>;
  const series = (buckets[0]?.["computes"] as Record<string, unknown> | undefined)?.["c0"];
  if (!Array.isArray(series)) return [];
  return series.map((p) => {
    const o = (p ?? {}) as Record<string, unknown>;
    return { at: str(o["time"]), count: num(o["value"]) };
  });
}

export function parseDatadogLogs(raw: unknown): Array<{ at: string; message: string }> {
  const data = ((raw as { data?: unknown[] } | null)?.data ?? []) as Array<Record<string, unknown>>;
  return data.slice(0, 8).map((d) => {
    const a = (d["attributes"] ?? {}) as Record<string, unknown>;
    return { at: str(a["timestamp"]), message: clean(a["message"], 200) };
  });
}

/** Turns what we learned into one traffic-light for the card. */
export function overallTone(checks: Check[], configured: boolean): Tone {
  if (!configured) return "off";
  if (checks.some((c) => c.ok === false)) return "bad";
  if (checks.some((c) => c.ok === null)) return "warn";
  return "ok";
}

// ---------------------------------------------------------------- HTTP

class VendorError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
  ) {
    super(message);
  }
}

async function getJson(f: Fetch, url: string, init: RequestInit, who: string): Promise<unknown> {
  let res: Response;
  try {
    res = await f(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch {
    throw new VendorError(`Couldn't reach ${who}.`, null);
  }
  if (res.status === 401 || res.status === 403) {
    throw new VendorError(`${who} rejected the key or token (${res.status}).`, res.status);
  }
  if (res.status === 404)
    throw new VendorError(`${who} says that wasn't found (404): check the names.`, 404);
  if (res.status === 429)
    throw new VendorError(`${who} is rate limiting us. Try again in a minute.`, 429);
  if (!res.ok) throw new VendorError(`${who} answered with an error (${res.status}).`, res.status);
  try {
    return await res.json();
  } catch {
    throw new VendorError(`${who} sent something unreadable.`, res.status);
  }
}

// ---------------------------------------------------------------- Sentry

export async function loadSentry(
  f: Fetch = fetch,
  env: NodeJS.ProcessEnv = process.env,
): Promise<{ status: ServiceStatus; data: SentryData | null; notes: string[] }> {
  const dsn = Boolean(env["SENTRY_DSN"]);
  const cfg = sentryConfig(env);
  const missing = [
    ...(dsn ? [] : ["SENTRY_DSN"]),
    ...(env["SENTRY_AUTH_TOKEN"] ? [] : ["SENTRY_AUTH_TOKEN"]),
    ...(env["SENTRY_ORG"] ? [] : ["SENTRY_ORG"]),
    ...(env["SENTRY_PROJECT"] ? [] : ["SENTRY_PROJECT"]),
  ];
  const checks: Check[] = [
    {
      label: "Server sends errors",
      ok: dsn ? true : false,
      detail: dsn
        ? "SENTRY_DSN is set on the server."
        : "SENTRY_DSN is not set, so server errors are not reported.",
    },
  ];
  const notes: string[] = [];
  let data: SentryData | null = null;
  const href = cfg
    ? `https://${new URL(cfg.base).host}/organizations/${cfg.org}/issues/?project=`
    : null;

  if (!cfg) {
    checks.push({
      label: "Dashboard access",
      ok: null,
      detail: "Add SENTRY_AUTH_TOKEN, SENTRY_ORG and SENTRY_PROJECT to see issues here.",
    });
  } else {
    const headers = { authorization: `Bearer ${cfg.token}` };
    const root = `${cfg.base}/api/0/projects/${encodeURIComponent(cfg.org)}/${encodeURIComponent(cfg.project)}`;
    try {
      await getJson(f, `${root}/`, { headers }, "Sentry");
      checks.push({
        label: "Dashboard access",
        ok: true,
        detail: `Token works for ${cfg.org}/${cfg.project}.`,
      });
      const since = Math.floor(Date.now() / 1000) - 24 * 3600;
      const [issues, stats] = await Promise.all([
        getJson(
          f,
          `${root}/issues/?statsPeriod=24h&query=${encodeURIComponent("is:unresolved")}&sort=date&limit=10`,
          { headers },
          "Sentry",
        ),
        getJson(
          f,
          `${root}/stats/?stat=received&resolution=1h&since=${since}&until=${since + 24 * 3600}`,
          { headers },
          "Sentry",
        ).catch(() => null),
      ]);
      const s = parseSentryStats(stats);
      data = { issues: parseSentryIssues(issues), perHour: s.perHour, total24h: s.total };
    } catch (e) {
      const msg = e instanceof VendorError ? e.message : "Sentry check failed.";
      checks.push({ label: "Dashboard access", ok: false, detail: msg });
      notes.push(msg);
    }
  }

  const tone = overallTone(checks, dsn || Boolean(cfg));
  return {
    status: {
      id: "sentry",
      name: "Sentry",
      tone,
      headline:
        tone === "off"
          ? "Not connected"
          : tone === "bad"
            ? "Problem found"
            : data
              ? `${data.issues.length} open ${data.issues.length === 1 ? "issue" : "issues"} in the last 24 hours`
              : "Sending errors",
      checks,
      missing,
      href: href ? href.replace(/project=$/, "") : null,
    },
    data,
    notes,
  };
}

// ---------------------------------------------------------------- Datadog

export async function loadDatadog(
  f: Fetch = fetch,
  env: NodeJS.ProcessEnv = process.env,
): Promise<{ status: ServiceStatus; data: DatadogData | null; notes: string[] }> {
  const apiKey = env["DD_API_KEY"];
  const appKey = env["DD_APP_KEY"];
  const site = datadogSite(env["DD_SITE"]);
  const service = (env["DD_SERVICE"] || "aduf-api").replace(/[^a-zA-Z0-9_.-]/g, "");
  const missing = [...(apiKey ? [] : ["DD_API_KEY"]), ...(appKey ? [] : ["DD_APP_KEY"])];
  const checks: Check[] = [];
  const notes: string[] = [];
  let data: DatadogData | null = null;

  if (!site) {
    checks.push({
      label: "Region",
      ok: false,
      detail:
        "DD_SITE isn't a Datadog region (use datadoghq.com, datadoghq.eu, us3.datadoghq.com ...).",
    });
  } else if (!apiKey) {
    checks.push({
      label: "Server sends logs",
      ok: false,
      detail: "DD_API_KEY is not set, so server logs are not sent.",
    });
  } else {
    const api = `https://api.${site}`;
    try {
      const v = (await getJson(
        f,
        `${api}/api/v1/validate`,
        { headers: { "DD-API-KEY": apiKey } },
        "Datadog",
      )) as { valid?: boolean };
      checks.push({
        label: "Server sends logs",
        ok: v.valid === true,
        detail:
          v.valid === true
            ? `API key accepted by ${site}.`
            : "Datadog says this API key isn't valid.",
      });
    } catch (e) {
      const msg = e instanceof VendorError ? e.message : "Datadog check failed.";
      checks.push({
        label: "Server sends logs",
        ok: false,
        detail: msg.includes("rejected") ? `${msg} Check DD_API_KEY and DD_SITE match.` : msg,
      });
    }

    if (!appKey) {
      checks.push({
        label: "Dashboard access",
        ok: null,
        detail: "Add DD_APP_KEY (an Application key) to see monitors and logs here.",
      });
    } else if (checks[0]?.ok) {
      const headers = {
        "DD-API-KEY": apiKey,
        "DD-APPLICATION-KEY": appKey,
        "content-type": "application/json",
      };
      const post = (path: string, body: unknown) =>
        getJson(
          f,
          `${api}${path}`,
          { method: "POST", headers, body: JSON.stringify(body) },
          "Datadog",
        );
      const query = `service:${service}`;
      const filter = { from: "now-24h", to: "now" };
      try {
        const [monitors, byStatus, errSeries, recent] = await Promise.all([
          getJson(f, `${api}/api/v1/monitor?page_size=100`, { headers }, "Datadog"),
          post("/api/v2/logs/analytics/aggregate", {
            filter: { ...filter, query },
            compute: [{ aggregation: "count", type: "total" }],
            group_by: [{ facet: "status", limit: 6 }],
          }).catch(() => null),
          post("/api/v2/logs/analytics/aggregate", {
            filter: { ...filter, query: `${query} status:error` },
            compute: [{ aggregation: "count", type: "timeseries", interval: "1h" }],
          }).catch(() => null),
          post("/api/v2/logs/events/search", {
            filter: { ...filter, query: `${query} status:error` },
            sort: "-timestamp",
            page: { limit: 8 },
          }).catch(() => null),
        ]);
        checks.push({ label: "Dashboard access", ok: true, detail: "Application key works." });
        data = {
          monitors: parseDatadogMonitors(monitors, site),
          logs:
            byStatus || errSeries || recent
              ? {
                  byStatus: parseDatadogStatusCounts(byStatus),
                  errorsPerHour: parseDatadogTimeseries(errSeries),
                  recentErrors: parseDatadogLogs(recent),
                }
              : null,
        };
      } catch (e) {
        const msg = e instanceof VendorError ? e.message : "Datadog check failed.";
        checks.push({
          label: "Dashboard access",
          ok: false,
          detail: msg.includes("rejected") ? `${msg} Check DD_APP_KEY.` : msg,
        });
        notes.push(msg);
      }
    }
  }

  const tone = overallTone(checks, Boolean(apiKey));
  const alerting = data?.monitors?.attention.length ?? 0;
  return {
    status: {
      id: "datadog",
      name: "Datadog",
      tone: tone === "ok" && alerting > 0 ? "warn" : tone,
      headline:
        tone === "off"
          ? "Not connected"
          : tone === "bad"
            ? "Problem found"
            : data?.monitors
              ? alerting > 0
                ? `${alerting} ${alerting === 1 ? "monitor needs" : "monitors need"} attention`
                : "All monitors OK"
              : "Receiving logs",
      checks,
      missing,
      href: site ? `https://app.${site}/` : null,
    },
    data,
    notes,
  };
}
