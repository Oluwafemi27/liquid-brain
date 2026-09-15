import { useEffect } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { fetchGoals } from "@/lib/server-fns";
import { useAduf } from "@/store/aduf-store";
import type { Goal } from "@/lib/aduf-types";

/** Mounted once in AppShell. Loads goals from Supabase on first render, then
 *  keeps them live via Supabase Realtime — any insert/update/delete on the
 *  `goals` table (from this tab, another tab, or another session) is
 *  reflected here within moments, no manual refetch needed. Renders nothing. */
export function GoalsBootstrap() {
  const { setGoals, upsertGoal, removeGoal } = useAduf();

  useEffect(() => {
    let cancelled = false;
    fetchGoals()
      .then((goals) => {
        if (!cancelled) setGoals(goals);
      })
      .catch(() => {
        // No backend configured yet — goals stay whatever local state has.
      });
    return () => {
      cancelled = true;
    };
  }, [setGoals]);

  useEffect(() => {
    const client = getSupabaseBrowser();
    if (!client) return;

    const channel = client
      .channel("goals-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "goals" }, (payload) => {
        if (payload.eventType === "DELETE") {
          const oldId = (payload.old as { id?: string })["id"];
          if (oldId) removeGoal(oldId);
          return;
        }
        const row = payload.new as {
          id: string;
          title: string;
          target: number;
          current: number;
          currency: string;
          due: string;
          sub_tasks: Goal["subTasks"];
        };
        upsertGoal({
          id: row.id,
          title: row.title,
          target: row.target,
          current: row.current,
          currency: row.currency,
          due: row.due,
          subTasks: row.sub_tasks ?? [],
        });
      })
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [upsertGoal, removeGoal]);

  return null;
}
