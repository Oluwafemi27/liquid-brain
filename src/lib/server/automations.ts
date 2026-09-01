import type { Automation, ChannelId } from "@/lib/aduf-types";
import { DEFAULT_WORKSPACE_ID, getSupabaseAdmin } from "./supabase";

interface AutomationRow {
  id: ChannelId;
  name: string;
  enabled: boolean;
  trigger: string;
  action: string;
  goal: string;
  runs: number;
}

function fromRow(row: AutomationRow): Automation {
  return {
    id: row.id,
    name: row.name,
    enabled: row.enabled,
    trigger: row.trigger,
    action: row.action,
    goal: row.goal,
    runs: row.runs,
  };
}

export async function listAutomations(): Promise<Automation[]> {
  const db = getSupabaseAdmin();
  if (!db) return [];

  const { data, error } = await db
    .from("automations")
    .select("id, name, enabled, trigger, action, goal, runs")
    .eq("workspace_id", DEFAULT_WORKSPACE_ID)
    .order("name");
  if (error) {
    console.error("[automations] failed to list automations", error);
    return [];
  }
  return (data ?? []).map((row) => fromRow(row as AutomationRow));
}

export async function setAutomationEnabled(
  id: ChannelId,
  enabled: boolean,
): Promise<Automation | null> {
  const db = getSupabaseAdmin();
  if (!db) return null;

  const { data, error } = await db
    .from("automations")
    .update({ enabled, updated_at: new Date().toISOString() })
    .eq("workspace_id", DEFAULT_WORKSPACE_ID)
    .eq("id", id)
    .select("id, name, enabled, trigger, action, goal, runs")
    .single();
  if (error || !data) {
    console.error("[automations] failed to update automation", error);
    return null;
  }
  return fromRow(data as AutomationRow);
}
