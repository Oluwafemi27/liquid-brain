import { useCallback, useEffect, useRef } from "react";
import { useLiveRefresh } from "@/hooks/use-live-refresh";
import { fetchAnalyticsSummaryFn } from "@/lib/server-fns";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { useAduf } from "@/store/aduf-store";
import { useAuth } from "@/store/auth-store";

// Everything the live-activity analytics are computed from.
const WATCHED_TABLES = ["automation_runs", "automations", "goals"] as const;

/** Mounted once in AppShell. Loads this user's analytics summary, then
 *  recomputes it whenever a run, automation or goal changes (Supabase
 *  Realtime, scoped to the signed-in user) — with a focus/interval refresh
 *  underneath as a safety net. Renders nothing. */
export function AnalyticsBootstrap() {
  const setAnalytics = useAduf((s) => s.setAnalytics);
  const { user, accessToken } = useAuth();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(() => {
    fetchAnalyticsSummaryFn({ data: { accessToken } })
      .then((summary) => {
        if (summary) setAnalytics(summary);
      })
      .catch((err) => console.error("[analytics] refresh failed", err));
  }, [accessToken, setAnalytics]);

  useLiveRefresh(refresh, 60_000, Boolean(user && accessToken));

  useEffect(() => {
    const client = getSupabaseBrowser();
    if (!client || !user) return;

    const schedule = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(refresh, 600);
    };

    const channel = client.channel(`analytics-realtime-${user.id}`);
    for (const table of WATCHED_TABLES) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `user_id=eq.${user.id}` },
        schedule,
      );
    }
    channel.subscribe();

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      client.removeChannel(channel);
    };
  }, [user, refresh]);

  return null;
}
