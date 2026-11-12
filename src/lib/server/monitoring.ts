import "@tanstack/react-start/server-only";
import { redactText, scrubEvent } from "@/lib/monitoring/scrub";

// Server-side monitoring: Sentry for errors, Datadog for logs and timings. Both are optional and
// both are best-effort: a monitoring failure must never break a request, and nothing is sent
// unless the matching env var is set. Only scrubbed data leaves the server (see monitoring/scrub.ts).

const appEnv = () => process.env["APP_ENV"] ?? process.env["NODE_ENV"] ?? "production";
export const sentryEnabled = (): boolean => Boolean(process.env["SENTRY_DSN"]);
export const datadogEnabled = (): boolean => Boolean(process.env["DD_API_KEY"]);

// ---------------------------------------------------------------- Sentry

type SentryNode = typeof import("@sentry/node");
let sentryPromise: Promise<SentryNode | null> | null = null;

function loadSentry(): Promise<SentryNode | null> {
  sentryPromise ??= import("@sentry/node")
    .then((S) => {
      S.init({
        dsn: process.env["SENTRY_DSN"],
        environment: appEnv(),
        tracesSampleRate: 0,
        beforeSend: (event) => scrubEvent(event),
      });
      return S;
    })
    .catch((e) => {
      console.warn("[monitoring] Sentry failed to start", e);
      return null;
    });
  return sentryPromise;
}

/** Reports an unexpected server error. Never throws. Pass only short, non-personal labels as context. */
export async function captureServerError(
  error: unknown,
  context: Record<string, string> = {},
): Promise<void> {
  try {
    if (sentryEnabled()) {
      const S = await loadSentry();
      if (S) {
        S.captureException(error instanceof Error ? error : new Error(String(error)), {
          extra: context,
        });
        await S.flush(2000);
      }
    }
    ddLog(
      "error",
      error instanceof Error ? `${error.name}: ${error.message}` : String(error),
      context,
    );
  } catch {
    // monitoring must never break the app
  }
}

// ---------------------------------------------------------------- Datadog logs

type Attr = string | number | boolean | null;
const RESERVED = new Set([
  "message",
  "status",
  "service",
  "ddsource",
  "ddtags",
  "hostname",
  "timestamp",
]);
const buffer: Record<string, unknown>[] = [];
let timer: ReturnType<typeof setTimeout> | undefined;

function cleanAttrs(attrs: Record<string, Attr>): Record<string, Attr> {
  const out: Record<string, Attr> = {};
  for (const [k, v] of Object.entries(attrs).slice(0, 20)) {
    if (!/^[a-z0-9_.]{1,40}$/.test(k) || RESERVED.has(k)) continue;
    out[k] = typeof v === "string" ? redactText(v).slice(0, 200) : v;
  }
  return out;
}

/** Queues one log line for Datadog. Attributes should be numbers, flags or short labels, never
 *  message text, addresses or other customer data. */
export function ddLog(
  status: "info" | "warn" | "error",
  message: string,
  attrs: Record<string, Attr> = {},
): void {
  if (!datadogEnabled()) return;
  buffer.push({
    ddsource: "aduf",
    service: process.env["DD_SERVICE"] ?? "aduf-api",
    ddtags: `env:${appEnv()}`,
    status,
    message: redactText(message).slice(0, 500),
    ...cleanAttrs(attrs),
  });
  if (buffer.length >= 50) {
    void flushDatadog();
  } else if (!timer) {
    timer = setTimeout(() => {
      timer = undefined;
      void flushDatadog();
    }, 2000);
    (timer as { unref?: () => void }).unref?.();
  }
}

export async function flushDatadog(): Promise<void> {
  if (!buffer.length || !datadogEnabled()) return;
  const batch = buffer.splice(0, 100);
  const site = process.env["DD_SITE"] || "datadoghq.com";
  try {
    await fetch(`https://http-intake.logs.${site}/api/v2/logs`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "DD-API-KEY": process.env["DD_API_KEY"] ?? "",
      },
      body: JSON.stringify(batch),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // dropped: logging is best-effort
  }
}

/** One line per AI call: how long it took and how many tokens it used. Never the prompt or reply. */
export function recordModelCall(info: {
  provider: string;
  model: string;
  ms: number;
  tokens: number;
  ok: boolean;
  status?: number;
}): void {
  ddLog(info.ok ? "info" : "warn", info.ok ? "model_call" : "model_call_failed", {
    provider: info.provider,
    model: info.model,
    duration_ms: info.ms,
    tokens: info.tokens,
    ok: info.ok,
    ...(info.status !== undefined ? { http_status: info.status } : {}),
  });
}
