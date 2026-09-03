import "@tanstack/react-start/server-only";
import type { Automation, AutomationRun, AutomationStep, ChannelId } from "@/lib/aduf-types";
import { DEFAULT_WORKSPACE_ID, getSupabaseAdmin } from "./supabase";
import { bumpGoal } from "./goals";

interface AutomationRow {
  id: string;
  name: string;
  enabled: boolean;
  trigger: string;
  action: string;
  goal: string;
  runs: number;
  channel: ChannelId | null;
  source: "builtin" | "ai";
  steps: AutomationStep[] | null;
  goal_id: string | null;
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
    channel: row.channel ?? undefined,
    source: row.source,
    steps: row.steps ?? undefined,
    goalId: row.goal_id ?? undefined,
  };
}

const SELECT_COLS =
  "id, name, enabled, trigger, action, goal, runs, channel, source, steps, goal_id";

export async function listAutomations(): Promise<Automation[]> {
  const db = getSupabaseAdmin();
  if (!db) return [];

  const { data, error } = await db
    .from("automations")
    .select(SELECT_COLS)
    .eq("workspace_id", DEFAULT_WORKSPACE_ID)
    .order("created_at");
  if (error) {
    console.error("[automations] failed to list automations", error);
    return [];
  }
  return (data ?? []).map((row) => fromRow(row as AutomationRow));
}

export async function setAutomationEnabled(
  id: string,
  enabled: boolean,
): Promise<Automation | null> {
  const db = getSupabaseAdmin();
  if (!db) return null;

  const { data, error } = await db
    .from("automations")
    .update({ enabled, updated_at: new Date().toISOString() })
    .eq("workspace_id", DEFAULT_WORKSPACE_ID)
    .eq("id", id)
    .select(SELECT_COLS)
    .single();
  if (error || !data) {
    console.error("[automations] failed to update automation", error);
    return null;
  }
  return fromRow(data as AutomationRow);
}

/** Inserts a brand-new automation — this is what an approved
 *  `create_automation` proposed action calls, letting the agent add a real
 *  automation to the Grid instead of only toggling one of the 6 built-ins.
 *  If `goalTitle` matches an existing goal, its id is linked so future runs
 *  of this automation feed that goal's progress directly. */
export async function createAutomation(input: {
  name: string;
  trigger: string;
  action: string;
  goalTitle?: string | undefined;
}): Promise<Automation | null> {
  const db = getSupabaseAdmin();
  if (!db) return null;

  let goalId: string | null = null;
  let goalLabel = "";
  if (input.goalTitle) {
    const { data: goalRow } = await db
      .from("goals")
      .select("id, title")
      .eq("workspace_id", DEFAULT_WORKSPACE_ID)
      .ilike("title", input.goalTitle)
      .maybeSingle();
    if (goalRow) {
      goalId = goalRow["id"] as string;
      goalLabel = goalRow["title"] as string;
    }
  }

  const steps: AutomationStep[] = [
    { kind: "get_data", label: `Watch for: ${input.trigger}` },
    { kind: "process_data", label: "Extract the relevant numbers/details" },
    { kind: "send_action", label: input.action },
  ];

  const id = `auto-${typeof crypto !== "undefined" ? crypto.randomUUID() : Date.now()}`;
  const { data, error } = await db
    .from("automations")
    .insert({
      id,
      workspace_id: DEFAULT_WORKSPACE_ID,
      name: input.name,
      enabled: true,
      trigger: input.trigger,
      action: input.action,
      goal: goalLabel,
      runs: 0,
      channel: null,
      source: "ai",
      steps,
      goal_id: goalId,
    })
    .select(SELECT_COLS)
    .single();
  if (error || !data) {
    console.error("[automations] failed to create automation", error);
    return null;
  }
  return fromRow(data as AutomationRow);
}

/** Runs one automation through its get-data -> process-data -> send-action
 *  pipeline, logs the run, bumps its run count, and — if it's linked to a
 *  goal and produced a numeric value (e.g. revenue detected) — records
 *  that value straight into the goal's progress via the same bumpGoal path
 *  the Goals page itself uses. This is a lightweight stand-in for a real
 *  n8n workflow: it doesn't call external services yet, but the shape
 *  (fetch -> transform -> act, logged, goal-linked) is the same one a real
 *  webhook-triggered run would follow once connectors are wired up. */
export async function runAutomation(automationId: string): Promise<AutomationRun | null> {
  const db = getSupabaseAdmin();
  if (!db) return null;

  const { data: automationRow, error: readError } = await db
    .from("automations")
    .select(SELECT_COLS)
    .eq("workspace_id", DEFAULT_WORKSPACE_ID)
    .eq("id", automationId)
    .single();
  if (readError || !automationRow) {
    console.error("[automations] run: automation not found", readError);
    return null;
  }
  const automation = fromRow(automationRow as AutomationRow);

  // Stand-in "get data" step: in production this is where a connector
  // (Stripe, WhatsApp, ads API, etc.) would be called. Marked clearly so
  // it's obvious where to plug in the real fetch.
  const simulatedValue = automation.goalId ? Math.round(Math.random() * 5000) / 100 : undefined;

  let status: "success" | "error" = "success";
  let summary = `Ran "${automation.name}": ${automation.action}`;
  if (automation.goalId && simulatedValue !== undefined) {
    const updated = await bumpGoal(automation.goalId, simulatedValue);
    if (!updated) {
      status = "error";
      summary = `Ran "${automation.name}" but failed to record the result to its linked goal`;
    } else {
      summary = `Ran "${automation.name}": recorded ${simulatedValue} to goal "${updated.title}"`;
    }
  }

  const { data: runRow, error: runError } = await db
    .from("automation_runs")
    .insert({
      workspace_id: DEFAULT_WORKSPACE_ID,
      automation_id: automationId,
      status,
      summary,
      value: simulatedValue ?? null,
    })
    .select("id, automation_id, started_at, status, summary, value")
    .single();
  if (runError || !runRow) {
    console.error("[automations] failed to log run", runError);
    return null;
  }

  await db
    .from("automations")
    .update({ runs: automation.runs + 1, updated_at: new Date().toISOString() })
    .eq("workspace_id", DEFAULT_WORKSPACE_ID)
    .eq("id", automationId);

  return {
    id: runRow["id"] as string,
    automationId: runRow["automation_id"] as string,
    startedAt: runRow["started_at"] as string,
    status: runRow["status"] as "success" | "error",
    summary: runRow["summary"] as string,
    value: (runRow["value"] as number | null) ?? undefined,
  };
}

export async function listAutomationRuns(automationId: string): Promise<AutomationRun[]> {
  const db = getSupabaseAdmin();
  if (!db) return [];
  const { data, error } = await db
    .from("automation_runs")
    .select("id, automation_id, started_at, status, summary, value")
    .eq("workspace_id", DEFAULT_WORKSPACE_ID)
    .eq("automation_id", automationId)
    .order("started_at", { ascending: false })
    .limit(20);
  if (error) {
    console.error("[automations] failed to list runs", error);
    return [];
  }
  return (data ?? []).map((row) => ({
    id: row["id"] as string,
    automationId: row["automation_id"] as string,
    startedAt: row["started_at"] as string,
    status: row["status"] as "success" | "error",
    summary: row["summary"] as string,
    value: (row["value"] as number | null) ?? undefined,
  }));
}
