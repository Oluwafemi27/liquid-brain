import { useEffect } from "react";
import type { Automation, N8nDeployment } from "@/lib/aduf-types";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { fetchAutomations, fetchN8nDeployments } from "@/lib/server-fns";
import { useAduf } from "@/store/aduf-store";
import { useAuth } from "@/store/auth-store";

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

/** Raw shape of a Supabase realtime row for `n8n_deployments`. */
interface N8nDeploymentRealtimeRow {
  id: string;
  automation_id: string | null;
  template_id: string | null;
  n8n_workflow_id: string | null;
  name: string;
  status: N8nDeployment["status"];
  safe_mode: boolean;
  built_from: N8nDeployment["builtFrom"];
  reasoning: string;
  last_error: string | null;
  deployed_at: string;
  activated_at: string | null;
}

function mapDeploymentRow(row: N8nDeploymentRealtimeRow): N8nDeployment {
  return {
    id: row.id,
    automationId: row.automation_id,
    templateId: row.template_id,
    n8nWorkflowId: row.n8n_workflow_id,
    name: row.name,
    status: row.status,
    safeMode: row.safe_mode,
    builtFrom: row.built_from,
    reasoning: row.reasoning,
    lastError: row.last_error,
    deployedAt: row.deployed_at,
    activatedAt: row.activated_at,
  };
}

export function AutomationsBootstrap() {
  const {
    setAutomations,
    upsertAutomation,
    removeAutomation,
    setN8nDeployments,
    upsertN8nDeployment,
  } = useAduf();
  const { user, accessToken } = useAuth();

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetchAutomations({ data: { accessToken } })
      .then((automations) => {
        if (!cancelled) setAutomations(automations);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user, accessToken, setAutomations]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetchN8nDeployments({ data: { accessToken } })
      .then((deployments) => {
        if (!cancelled) setN8nDeployments(deployments);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user, accessToken, setN8nDeployments]);

  useEffect(() => {
    const client = getSupabaseBrowser();
    if (!client || !user) return;

    const channel = client
      .channel(`automations-realtime-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "automations", filter: `user_id=eq.${user.id}` },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const id = (payload.old as { id?: string }).id;
            if (id) removeAutomation(id);
            return;
          }
          upsertAutomation(mapRow(payload.new as AutomationRealtimeRow));
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "n8n_deployments", filter: `user_id=eq.${user.id}` },
        (payload) => {
          // Deployments aren't removed from the UI on delete — an archived
          // workflow still has history worth keeping visible; only insert
          // and update matter here.
          if (payload.eventType === "DELETE") return;
          upsertN8nDeployment(mapDeploymentRow(payload.new as N8nDeploymentRealtimeRow));
        },
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [user, upsertAutomation, removeAutomation, upsertN8nDeployment]);

  return null;
}
