import { createFileRoute } from "@tanstack/react-router";
import { runAlertCycle, sendDigest } from "@/lib/server/alerts";
import { checkConnections } from "@/lib/server/connection-health";
import { resyncDue } from "@/lib/server/import-sync";
import { getSupabaseAdmin } from "@/lib/server/supabase";

/** Daily housekeeping (Vercel Cron, see vercel.json): re-check connections, re-sync imports,
 *  raise alerts and send daily summaries. Protected by CRON_SECRET — Vercel sends it as a
 *  Bearer token automatically when the env var is set. */
export const Route = createFileRoute("/api/cron/daily")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const secret = process.env["CRON_SECRET"];
        if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
          return new Response("Unauthorized", { status: 401 });
        }
        const db = getSupabaseAdmin();
        if (!db) return Response.json({ ok: false, error: "no backend" }, { status: 503 });

        const summary = {
          health: 0,
          sync: { attempted: 0, failed: 0 },
          alerts: 0,
          digests: 0,
          errors: 0,
        };
        try {
          summary.health = (await checkConnections({ force: true })).length;
          summary.sync = await resyncDue(10);
        } catch (e) {
          summary.errors += 1;
          console.error("[cron] housekeeping failed", e);
        }
        const { data: owners } = await db
          .from("owner_settings")
          .select("user_id, alerts_enabled, digest_enabled")
          .or("alerts_enabled.eq.true,digest_enabled.eq.true")
          .limit(25);
        for (const o of owners ?? []) {
          const uid = o["user_id"] as string;
          try {
            if (o["alerts_enabled"])
              summary.alerts += (await runAlertCycle(uid, { push: true })).created;
            if (o["digest_enabled"] && (await sendDigest(uid)).ok) summary.digests += 1;
          } catch (e) {
            summary.errors += 1;
            console.error("[cron] user cycle failed", uid, e);
          }
        }
        return Response.json({ ok: true, ...summary });
      },
    },
  },
});
