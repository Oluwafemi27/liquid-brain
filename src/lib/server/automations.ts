import "@tanstack/react-start/server-only";
import type { Automation, AutomationRun, AutomationStep, ChannelId } from "@/lib/aduf-types";
import { getSupabaseAdmin } from "./supabase";
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

/** The 6 built-in channel automations every account starts with — used to
 *  live in a one-time schema seed when the app was single-tenant; now
 *  seeded per-user (idempotently, via the `slug` unique index) the first
 *  time a signed-in user's automation list is fetched. */
const BUILTIN_AUTOMATIONS: Array<{
  slug: string;
  name: string;
  trigger: string;
  action: string;
  channel: ChannelId;
  steps: AutomationStep[];
}> = [
  {
    slug: "website",
    name: "Website",
    trigger: "New form submission on your site",
    action: "Send lead straight to your CRM and notify you on WhatsApp",
    channel: "website",
    steps: [
      { kind: "get_data", label: "Watch website form submissions" },
      { kind: "process_data", label: "Extract contact + intent" },
      { kind: "send_action", label: "Push lead to CRM and notify WhatsApp" },
    ],
  },
  {
    slug: "whatsapp",
    name: "WhatsApp",
    trigger: "Customer messages your WhatsApp number",
    action: "Auto-reply with business hours and hand off to you for anything complex",
    channel: "whatsapp",
    steps: [
      { kind: "get_data", label: "Watch incoming WhatsApp messages" },
      { kind: "process_data", label: "Classify intent (FAQ vs needs human)" },
      { kind: "send_action", label: "Auto-reply or escalate to owner" },
    ],
  },
  {
    slug: "crm",
    name: "CRM",
    trigger: "Deal stage changes in your CRM",
    action: "Update revenue forecast and flag stalled deals",
    channel: "crm",
    steps: [
      { kind: "get_data", label: "Poll CRM deal stages" },
      { kind: "process_data", label: "Recompute forecast + find stalled deals" },
      { kind: "send_action", label: "Alert owner on stalled high-value deals" },
    ],
  },
  {
    slug: "payments",
    name: "Payments",
    trigger: "Payment received or failed",
    action: "Log revenue against the linked goal and retry failed charges",
    channel: "payments",
    steps: [
      { kind: "get_data", label: "Watch payment events" },
      { kind: "process_data", label: "Sum successful revenue, flag failures" },
      { kind: "send_action", label: "Log revenue to goal + retry failed charge" },
    ],
  },
  {
    slug: "ads",
    name: "Ads",
    trigger: "Daily ad spend/performance refresh",
    action: "Pause underperforming ads and reallocate budget",
    channel: "ads",
    steps: [
      { kind: "get_data", label: "Pull daily ad spend + conversions" },
      { kind: "process_data", label: "Compute cost per result per campaign" },
      { kind: "send_action", label: "Pause worst performer, note reallocation" },
    ],
  },
  {
    slug: "email",
    name: "Email",
    trigger: "New subscriber or abandoned checkout",
    action: "Send the right lifecycle email automatically",
    channel: "email",
    steps: [
      { kind: "get_data", label: "Watch subscriber + checkout events" },
      { kind: "process_data", label: "Match event to lifecycle stage" },
      { kind: "send_action", label: "Send the matching email" },
    ],
  },
];

/** Ensures this user's 6 built-in channel automations exist — a no-op after
 *  the first call for any given user, since the (user_id, slug) unique
 *  index makes the insert idempotent. */
async function ensureBuiltinAutomations(userId: string): Promise<void> {
  const db = getSupabaseAdmin();
  if (!db) return;
  const rows = BUILTIN_AUTOMATIONS.map((b) => ({
    id: `auto-${b.slug}-${userId}`,
    user_id: userId,
    slug: b.slug,
    name: b.name,
    enabled: false,
    trigger: b.trigger,
    action: b.action,
    goal: "",
    runs: 0,
    channel: b.channel,
    source: "builtin" as const,
    steps: b.steps,
  }));
  const { error } = await db
    .from("automations")
    .upsert(rows, { onConflict: "user_id,slug", ignoreDuplicates: true });
  if (error) console.error("[automations] failed to seed builtins", error);
}

/** Every automation belonging to this user, newest first. Seeds the 6
 *  built-in channel automations on first call for a brand-new user. */
export async function listAutomations(userId: string): Promise<Automation[]> {
  const db = getSupabaseAdmin();
  if (!db) return [];

  await ensureBuiltinAutomations(userId);

  const { data, error } = await db
    .from("automations")
    .select(SELECT_COLS)
    .eq("user_id", userId)
    .order("created_at");
  if (error) {
    console.error("[automations] failed to list automations", error);
    return [];
  }
  return (data ?? []).map((row) => fromRow(row as AutomationRow));
}

export async function setAutomationEnabled(
  userId: string,
  id: string,
  enabled: boolean,
): Promise<Automation | null> {
  const db = getSupabaseAdmin();
  if (!db) return null;

  const { data, error } = await db
    .from("automations")
    .update({ enabled, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("id", id)
    .select(SELECT_COLS)
    .single();
  if (error || !data) {
    console.error("[automations] failed to update automation", error);
    return null;
  }
  return fromRow(data as AutomationRow);
}

/** Inserts a brand-new automation for this user — this is what an approved
 *  `create_automation` proposed action calls, letting the agent add a real
 *  automation to the Grid instead of only toggling one of the 6 built-ins.
 *  If `goalTitle` matches an existing goal of this user's, its id is linked
 *  so future runs of this automation feed that goal's progress directly. */
export async function createAutomation(
  userId: string,
  input: {
    name: string;
    trigger: string;
    action: string;
    goalTitle?: string | undefined;
  },
): Promise<Automation | null> {
  const db = getSupabaseAdmin();
  if (!db) return null;

  let goalId: string | null = null;
  let goalLabel = "";
  if (input.goalTitle) {
    const { data: goalRow } = await db
      .from("goals")
      .select("id, title")
      .eq("user_id", userId)
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
      user_id: userId,
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
export async function runAutomation(
  userId: string,
  automationId: string,
): Promise<AutomationRun | null> {
  const db = getSupabaseAdmin();
  if (!db) return null;

  const { data: automationRow, error: readError } = await db
    .from("automations")
    .select(SELECT_COLS)
    .eq("user_id", userId)
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
    const updated = await bumpGoal(userId, automation.goalId, simulatedValue);
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
      user_id: userId,
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
    .eq("user_id", userId)
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

export async function listAutomationRuns(
  userId: string,
  automationId: string,
): Promise<AutomationRun[]> {
  const db = getSupabaseAdmin();
  if (!db) return [];
  const { data, error } = await db
    .from("automation_runs")
    .select("id, automation_id, started_at, status, summary, value")
    .eq("user_id", userId)
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
