import { useEffect } from "react";
import type { Automation } from "@/lib/aduf-types";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { fetchAutomations } from "@/lib/server-fns";
import { useAduf } from "@/store/aduf-store";

/** Raw shape of a Supabase realtime row for `automations` — snake_case, as
 *  Postgres sends it, before mapping onto the camelCase Automation type the
 *  rest of the app uses. */
interface AutomationRealtimeRow {
  id: string;
  name: string;
  enabled: boolean;
  trigger: string;
  action: string;
  goal: string;
  runs: number;
  channel: Automation["channel"] | null;
  source: Automation["source"];
  steps: Automation["steps"] | null;
  goal_id: string | null;
}

function mapRow(row: AutomationRealtimeRow): Automation {
  return {
    id: row.id,
    name: row.name,
    enabled: row.enabled,
    trigger: row.trigger,
    action: row.action,
    goal: row.goal,
    runs: row.runs,
    channel: row.channel ?? undefined,
    source: row.source,
    steps: row.steps ?? undefined,
    goalId: row.goal_id ?? undefined,
  };
}

export function AutomationsBootstrap() {
  const { setAutomations, upsertAutomation, removeAutomation } = useAduf();

  useEffect(() => {
    let cancelled = false;
    fetchAutomations()
      .then((automations) => {
        if (!cancelled) setAutomations(automations);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [setAutomations]);

  useEffect(() => {
    const client = getSupabaseBrowser();
    if (!client) return;

    const channel = client
      .channel("automations-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "automations" }, (payload) => {
        if (payload.eventType === "DELETE") {
          const id = (payload.old as { id?: string }).id;
          if (id) removeAutomation(id);
          return;
        }
        upsertAutomation(mapRow(payload.new as AutomationRealtimeRow));
      })
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [upsertAutomation, removeAutomation]);

  return null;
}
