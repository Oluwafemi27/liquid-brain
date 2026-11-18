import { stripUrl } from "./scrub";
import { scrubEvent } from "./scrub";

// Browser-side monitoring. Loaded lazily from router.tsx so it never slows first paint, and does
// nothing at all until the matching VITE_ keys are set. Public keys only: a Sentry DSN and a
// Datadog client token are designed to be visible in the browser.

let started = false;

export async function initClientMonitoring(): Promise<void> {
  if (started || typeof window === "undefined") return;
  started = true;
  const env = (import.meta.env["VITE_APP_ENV"] as string | undefined) ?? import.meta.env.MODE;

  const dsn = import.meta.env["VITE_SENTRY_DSN"] as string | undefined;
  if (dsn) {
    try {
      const Sentry = await import("@sentry/react");
      Sentry.init({
        dsn,
        environment: env,
        tracesSampleRate: 0,
        // Browser noise that is never our bug.
        ignoreErrors: [
          "ResizeObserver loop",
          "Non-Error promise rejection captured",
          "Load failed",
          "Failed to fetch",
          // The browser (or an extension / in-app browser) injecting its own script via eval(); our
          // security policy rightly blocks it. Nothing in ADUF's code calls eval.
          /Refused to evaluate a string as JavaScript/,
        ],
        beforeSend: (event) => scrubEvent(event),
      });
      // lib/error-reporting.ts already calls this hook from the app's error boundary.
      window.__errorMonitor = {
        captureException: (error, context, options) => {
          Sentry.captureException(error, {
            extra: context ?? {},
            ...(options?.severity ? { level: options.severity } : {}),
          });
        },
      };
    } catch (e) {
      console.warn("[monitoring] Sentry failed to start", e);
    }
  }

  const applicationId = import.meta.env["VITE_DD_APPLICATION_ID"] as string | undefined;
  const clientToken = import.meta.env["VITE_DD_CLIENT_TOKEN"] as string | undefined;
  if (applicationId && clientToken) {
    try {
      const { datadogRum } = await import("@datadog/browser-rum");
      datadogRum.init({
        applicationId,
        clientToken,
        site: ((import.meta.env["VITE_DD_SITE"] as string | undefined) ??
          "datadoghq.com") as "datadoghq.com",
        service: "aduf-web",
        env,
        sessionSampleRate: 100,
        sessionReplaySampleRate: 0, // no screen recordings: pages show customers' data
        trackUserInteractions: true,
        trackResources: true,
        trackLongTasks: true,
        defaultPrivacyLevel: "mask",
        enablePrivacyForActionName: true,
        beforeSend: (event) => {
          event.view.url = stripUrl(event.view.url);
          if (event.view.referrer) event.view.referrer = stripUrl(event.view.referrer);
          if (event.type === "resource") event.resource.url = stripUrl(event.resource.url);
          return true;
        },
      });
    } catch (e) {
      console.warn("[monitoring] Datadog failed to start", e);
    }
  }
}
