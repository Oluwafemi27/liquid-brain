import { createFileRoute } from "@tanstack/react-router";
import { azureEndpoint } from "@/lib/server/model-providers";
import {
  captureServerError,
  datadogEnabled,
  ddLog,
  flushDatadog,
  sentryEnabled,
} from "@/lib/server/monitoring";
import { aiGate } from "@/lib/server/load-gate";
import { getKv, redisConfig } from "@/lib/server/kv";
import { getSupabaseAdmin } from "@/lib/server/supabase";
import { safeEqual } from "@/lib/server/signed-links";

/** Liveness check for Azure / uptime monitors. Public, and returns no secrets: only whether each
 *  optional service is switched on. `?probe=1` with the CRON_SECRET bearer sends one test error and
 *  one test log so you can confirm Sentry and Datadog are really receiving data. */
export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        let probed = false;
        if (url.searchParams.get("probe")) {
          const secret = process.env["CRON_SECRET"];
          if (!secret || !safeEqual(request.headers.get("authorization"), `Bearer ${secret}`)) {
            return new Response("Unauthorized", { status: 401 });
          }
          await captureServerError(new Error("ADUF monitoring test (safe to ignore)"), {
            where: "health-probe",
          });
          ddLog("info", "monitoring_probe", { where: "health-probe" });
          await flushDatadog();
          probed = true;
        }
        return Response.json({
          ok: true,
          time: new Date().toISOString(),
          database: getSupabaseAdmin() ? "configured" : "missing",
          sentry: sentryEnabled(),
          datadog: datadogEnabled(),
          azureOpenAI: azureEndpoint() !== null,
          probed,
          load: { inflightAi: aiGate.inflight(), maxAi: aiGate.max },
          cache: (await getKv()).kind,
          redis: redisConfig()?.mode ?? "none",
        });
      },
    },
  },
});
