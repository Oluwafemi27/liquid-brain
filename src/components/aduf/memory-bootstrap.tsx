import { useEffect, useRef } from "react";
import { fetchMemoryGraphFn } from "@/lib/server-fns";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { useAduf } from "@/store/aduf-store";

// Every table that feeds a Business Memory cluster (see lib/server/memory.ts).
// A change to any of these means the globe's counts are stale.
const WATCHED_TABLES = ["chat_messages", "agent_documents", "goals", "automation_runs"] as const;

/** Mounted once in AppShell. Loads the Business Memory graph from Supabase
 *  on first render, then keeps it live: any real change ADUF records — a
 *  new chat message, an uploaded document, a goal, an automation run —
 *  triggers a lightweight recount, so the globe updates within moments
 *  without a page reload, exactly like Goals and Automations already do.
 *  Renders nothing. */
export function MemoryBootstrap() {
  const setMemoryGraph = useAduf((s) => s.setMemoryGraph);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    function refresh() {
      fetchMemoryGraphFn()
        .then(({ nodes, edges }) => {
          if (!cancelled) setMemoryGraph(nodes, edges);
        })
        .catch(() => {
          // No backend configured yet — the globe stays core-only.
        });
    }

    refresh();

    const client = getSupabaseBrowser();
    if (!client) {
      return () => {
        cancelled = true;
      };
    }

    function scheduleRefresh() {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(refresh, 500);
    }

    const channel = client.channel("memory-graph-realtime");
    for (const table of WATCHED_TABLES) {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, scheduleRefresh);
    }
    channel.subscribe();

    return () => {
      cancelled = true;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      client.removeChannel(channel);
    };
  }, [setMemoryGraph]);

  return null;
}
