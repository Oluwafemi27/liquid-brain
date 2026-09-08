import { useEffect } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { fetchInsightsFn } from "@/lib/server-fns";
import { useAduf } from "@/store/aduf-store";
import type { InsightSeverity } from "@/lib/aduf-types";

/** Raw shape of a Supabase realtime row for `insights` — snake_case, as
 *  Postgres sends it, before mapping onto the camelCase Insight type the
 *  rest of the app uses. */
interface InsightRealtimeRow {
  id: string;
  title: string;
  body: string;
  severity: InsightSeverity;
  source: string;
  read: boolean;
  created_at: string;
}

/** Mounted once in AppShell. Loads the notification feed from Supabase on
 *  first render, then keeps it live via Supabase Realtime — any insight
 *  logged from this tab, another tab, or another session (a goal hit, an
 *  automation run, a source connected, an event scheduled, ...) shows up
 *  here within moments, no manual refetch needed. Renders nothing. */
export function NotificationsBootstrap() {
  const { setInsights, upsertInsight, removeInsight } = useAduf();

  useEffect(() => {
    let cancelled = false;
    fetchInsightsFn()
      .then((insights) => {
        if (!cancelled) setInsights(insights);
      })
      .catch(() => {
        // No backend configured yet — insights stay whatever local state has.
      });
    return () => {
      cancelled = true;
    };
  }, [setInsights]);

  useEffect(() => {
    const client = getSupabaseBrowser();
    if (!client) return;

    const channel = client
      .channel("insights-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "insights" },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const oldId = (payload.old as { id?: string })["id"];
            if (oldId) removeInsight(oldId);
            return;
          }
          const row = payload.new as InsightRealtimeRow;
          upsertInsight({
            id: row.id,
            title: row.title,
            body: row.body,
            severity: row.severity,
            source: row.source,
            read: row.read,
            createdAt: new Date(row.created_at).getTime(),
          });
        },
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [upsertInsight, removeInsight]);

  return null;
}
