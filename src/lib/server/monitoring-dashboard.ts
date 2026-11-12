import "@tanstack/react-start/server-only";
import type { ConnectionHealth } from "@/lib/aduf-types";
import { composioConfigured, composioPing } from "@/connectors/composio-hub/client";
import { isAdminEmail } from "./admin";
import { checkAllConnections } from "./connection-health";
import { getKv } from "./kv";
import { azureEndpoint } from "./model-providers";
import {
  captureServerError,
  datadogEnabled,
  ddLog,
  flushDatadog,
  sentryEnabled,
} from "./monitoring";
import {
  loadDatadog,
  loadSentry,
  type Check,
  type DatadogData,
  type SentryData,
  type ServiceStatus,
} from "./monitoring-vendors";
import { getSupabaseAdmin } from "./supabase";
import { verifyAccessToken } from "./survey";

export type {
  Check,
  DatadogData,
  DatadogMonitor,
  SentryData,
  SentryIssue,
  ServiceStatus,
  Tone,
} from "./monitoring-vendors";

// The admin Monitoring page's report: Sentry and Datadog (monitoring-vendors.ts) plus the health of
// this server and of the connected platforms. Admin-only, read-only, cached for a minute so the page
// can't burn the vendors' rate limits, and no key or token ever reaches the browser.

export interface PlatformData {
  database: { ok: boolean; ms: number | null };
  cache: string;
  uptimeSeconds: number;
  memoryMb: number;
  node: string;
  env: string;
  integrations: Array<{
    id: string;
    name: string;
    configured: boolean;
    ok: boolean | null;
    detail: string;
  }>;
}

export interface MonitoringReport {
  generatedAt: string;
  services: ServiceStatus[];
  sentry: SentryData | null;
  datadog: DatadogData | null;
  platform: PlatformData;
  connections: ConnectionHealth[];
  /** Per-section problems, in plain words, so one vendor being down doesn't blank the page. */
  notes: string[];
}

export interface ClientFlags {
  sentryBrowser: boolean;
  datadogBrowser: boolean;
}

const CACHE_MS = 60_000;
const MIN_FORCE_GAP_MS = 15_000;

// ---------------------------------------------------------------- platform

async function loadPlatform(): Promise<PlatformData> {
  const db = getSupabaseAdmin();
  let database: PlatformData["database"] = { ok: false, ms: null };
  if (db) {
    const t0 = Date.now();
    try {
      const { error } = await db.from("admins").select("email").limit(1);
      database = { ok: !error, ms: Date.now() - t0 };
    } catch {
      database = { ok: false, ms: null };
    }
  }
  const composio = composioConfigured()
    ? await composioPing()
    : { ok: null as boolean | null, detail: "COMPOSIO_API_KEY is not set." };
  return {
    database,
    cache: (await getKv()).kind,
    uptimeSeconds: Math.round(process.uptime()),
    memoryMb: Math.round(process.memoryUsage().rss / 1048576),
    node: process.version,
    env: process.env["APP_ENV"] ?? process.env["NODE_ENV"] ?? "production",
    integrations: [
      {
        id: "composio",
        name: "Composio (connectors)",
        configured: composioConfigured(),
        ok: composio.ok,
        detail: composio.detail,
      },
      {
        id: "azure-openai",
        name: "Azure OpenAI",
        configured: azureEndpoint() !== null,
        ok: null,
        detail: azureEndpoint() ? "Endpoint set." : "Not set (optional).",
      },
      {
        id: "paystack",
        name: "Paystack",
        configured: Boolean(process.env["PAYSTACK_SECRET_KEY"]),
        ok: null,
        detail: process.env["PAYSTACK_SECRET_KEY"] ? "Key set." : "PAYSTACK_SECRET_KEY is not set.",
      },
      {
        id: "clamav",
        name: "ClamAV virus scanner",
        configured: Boolean(process.env["CLAMAV_HOST"]),
        ok: null,
        detail: process.env["CLAMAV_HOST"] ? "Host set." : "Using the built-in scanner only.",
      },
      {
        id: "redis",
        name: "Redis",
        configured: Boolean(process.env["REDIS_URL"]),
        ok: null,
        detail: process.env["REDIS_URL"]
          ? "URL set."
          : "Using in-memory cache (fine for one server).",
      },
    ],
  };
}

// ---------------------------------------------------------------- report

let cache: {
  at: number;
  report: Omit<MonitoringReport, "services"> & { services: ServiceStatus[] };
} | null = null;
let lastForced = 0;

/** Admin-only. Returns null for anyone else. `force` re-asks the vendors, at most every 15 seconds. */
export async function getMonitoringReport(
  accessToken: string,
  flags: ClientFlags,
  force = false,
): Promise<MonitoringReport | null> {
  const requester = await verifyAccessToken(accessToken);
  if (!requester?.emailVerified || !(await isAdminEmail(requester.email))) return null;

  const now = Date.now();
  const canForce = force && now - lastForced > MIN_FORCE_GAP_MS;
  if (canForce) lastForced = now;
  let base = cache && now - cache.at < CACHE_MS && !canForce ? cache.report : null;
  if (!base) {
    const [sentry, datadog, platform, connections] = await Promise.all([
      loadSentry(),
      loadDatadog(),
      loadPlatform(),
      checkAllConnections().catch(() => [] as ConnectionHealth[]),
    ]);
    base = {
      generatedAt: new Date(now).toISOString(),
      services: [sentry.status, datadog.status],
      sentry: sentry.data,
      datadog: datadog.data,
      platform,
      connections,
      notes: [...sentry.notes, ...datadog.notes],
    };
    cache = { at: now, report: base };
  }
  // Browser monitoring is decided when the app is built, so only the browser can say whether it is on.
  const services = base.services.map((s) => {
    const browserOn = s.id === "sentry" ? flags.sentryBrowser : flags.datadogBrowser;
    const check: Check = {
      label: "Browser reports problems",
      ok: browserOn ? true : null,
      detail: browserOn
        ? s.id === "sentry"
          ? "VITE_SENTRY_DSN was set when this build was made."
          : "Datadog browser keys were set when this build was made."
        : s.id === "sentry"
          ? "VITE_SENTRY_DSN wasn't set at build time (optional)."
          : "VITE_DD_APPLICATION_ID and VITE_DD_CLIENT_TOKEN weren't set at build time (optional).",
    };
    return { ...s, checks: [...s.checks, check] };
  });
  return { ...base, services };
}

/** Sends one harmless test error and one test log so the admin can watch them arrive. */
export async function sendMonitoringTest(
  accessToken: string,
): Promise<{ ok: boolean; message: string }> {
  const requester = await verifyAccessToken(accessToken);
  if (!requester?.emailVerified || !(await isAdminEmail(requester.email))) {
    return { ok: false, message: "Only an admin can send a test." };
  }
  if (!sentryEnabled() && !datadogEnabled()) {
    return {
      ok: false,
      message:
        "Neither SENTRY_DSN nor DD_API_KEY is set on the server, so there is nothing to send to.",
    };
  }
  await captureServerError(new Error("ADUF monitoring test (safe to ignore)"), {
    where: "monitoring-page",
  });
  ddLog("info", "monitoring_probe", { where: "monitoring-page" });
  await flushDatadog();
  const sent = [sentryEnabled() ? "Sentry" : null, datadogEnabled() ? "Datadog" : null]
    .filter(Boolean)
    .join(" and ");
  return {
    ok: true,
    message: `Test sent to ${sent}. It usually appears within a minute: press Refresh then.`,
  };
}
