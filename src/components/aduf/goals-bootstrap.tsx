import { useEffect } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { fetchGoals } from "@/lib/server-fns";
import { useAduf } from "@/store/aduf-store";
import { useAuth } from "@/store/auth-store";
import type { Goal } from "@/lib/aduf-types";

/** Mounted once in AppShell (only while signed in). Loads *this user's*
 *  goals from Supabase on first render, then keeps them live via Supabase
 *  Realtime — any insert/update/delete on the `goals` table for this user
 *  (from this tab, another tab, or another session of theirs) is reflected
 *  here within moments, no manual refetch needed. Both the initial fetch
 *  and the realtime subscription are scoped to the signed-in user's id, so
 *  one account never sees another account's goals. Renders nothing. */
export function GoalsBootstrap() {
  const { setGoals, upsertGoal, removeGoal } = useAduf();
  const { user, accessToken } = useAuth();

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetchGoals({ data: { accessToken } })
      .then((goals) => {
        if (!cancelled) setGoals(goals);
      })
      .catch(() => {
        // No backend configured yet — goals stay whatever local state has.
      });
    return () => {
      cancelled = true;
    };
  }, [user, accessToken, setGoals]);

  useEffect(() => {
    const client = getSupabaseBrowser();
    if (!client || !user) return;

    const channel = client
      .channel(`goals-realtime-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "goals", filter: `user_id=eq.${user.id}` },
        (payload) => {
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
        },
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [user, upsertGoal, removeGoal]);

  return null;
}
