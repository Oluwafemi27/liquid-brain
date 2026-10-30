import { useCallback, useEffect, useRef } from "react";
import { useLiveRefresh } from "@/hooks/use-live-refresh";
import { fetchMemoryGraphFn } from "@/lib/server-fns";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { useAduf } from "@/store/aduf-store";
import { useAuth } from "@/store/auth-store";

// Tables that feed a Business Memory cluster (see lib/server/memory.ts) and
// carry a user_id, so realtime can be filtered to the signed-in user.
// (agent_documents has no user_id and isn't in the realtime publication — the
// focus/interval refresh below is what keeps that cluster current.)
const WATCHED_TABLES = ["chat_messages", "goals", "automation_runs"] as const;

/** Mounted once in AppShell. Loads this user's Business Memory graph from
 *  Supabase, then keeps it live: any real change ADUF records — a chat
 *  message, a goal, an automation run — triggers a lightweight recount over
 *  Realtime, and a focus/interval refresh covers everything else. Renders
 *  nothing. */
export function MemoryBootstrap() {
  const setMemoryGraph = useAduf((s) => s.setMemoryGraph);
  const { user, accessToken } = useAuth();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(() => {
    fetchMemoryGraphFn({ data: { accessToken } })
      .then((graph) => {
        if (graph) setMemoryGraph(graph.nodes, graph.edges);
      })
      .catch((err) => console.error("[memory] graph refresh failed", err));
  }, [accessToken, setMemoryGraph]);

  useLiveRefresh(refresh, 60_000, Boolean(user && accessToken));

  useEffect(() => {
    const client = getSupabaseBrowser();
    if (!client || !user) return;

    const schedule = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(refresh, 500);
    };

    const channel = client.channel(`memory-graph-realtime-${user.id}`);
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
