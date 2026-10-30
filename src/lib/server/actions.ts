import "@tanstack/react-start/server-only";
import { z } from "zod";
import type {
  ActionPreview,
  ActionRecord,
  ActionRisk,
  ActionStatus,
  ActionTier,
  Confidence,
  OwnerSettings,
} from "@/lib/aduf-types";
import { ACTIONS, riskFor, tierFor, type ActionType, isActionType } from "@/lib/action-registry";
import { SIM_DISCLAIMER, simulateAdChange } from "@/lib/simulation";
import { makeSource } from "@/lib/sources";
import {
  deleteAutomation,
  createAutomation,
  setAutomationEnabled,
  listAutomations,
} from "./automations";
import { usdRates } from "./business-data";
import { createGoal, deleteGoal } from "./goals";
import { createSafeModeDeployment } from "./n8n-deployments";
import { getOwnerSettings } from "./owner-settings";
import { createScheduleEvent, deleteScheduleEvent } from "./schedule";
import { getSupabaseAdmin } from "./supabase";

export class ActionError extends Error {
  constructor(
    message: string,
    public readonly code: "not_found" | "over_limit" | "bad_state" | "invalid" | "no_backend",
  ) {
    super(message);
    this.name = "ActionError";
  }
}

/** Proposals nobody answers within a week are dropped, not left lurking. */
export const PROPOSAL_TTL_DAYS = 7;

const CHANNELS = ["website", "whatsapp", "crm", "payments", "ads", "email"] as const;
const CHANNEL_LABEL: Record<string, string> = {
  website: "Website",
  whatsapp: "WhatsApp",
  crm: "CRM",
  payments: "Payments",
  ads: "Ads",
  email: "Email",
};
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

const SCHEMAS = {
  create_reminder: z.object({
    title: z.string().min(1).max(120),
    day: z.enum(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]),
    startTime: hhmm,
    endTime: hhmm,
  }),
  create_goal: z.object({
    title: z.string().min(1).max(120),
    target: z.number().positive(),
    currency: z.string().max(3).optional().default(""),
  }),
  toggle_automation: z.object({ channelId: z.enum(CHANNELS), enabled: z.boolean() }),
  create_automation: z.object({
    name: z.string().min(1).max(80),
    trigger: z.string().min(1).max(200),
    action: z.string().min(1).max(200),
    goalTitle: z.string().max(120).optional(),
  }),
  deploy_n8n_workflow: z.object({
    name: z.string().min(1).max(120),
    templateId: z.string().uuid().optional(),
    buildBrief: z.string().max(1000).optional(),
    goalTitle: z.string().max(120).optional(),
  }),
  change_ad_budget: z.object({
    platform: z.string().min(1).max(40),
    changeUsdPerDay: z.number().min(-100_000).max(100_000),
  }),
} as const;

export function validateParams(type: ActionType, params: unknown): Record<string, unknown> {
  const parsed = SCHEMAS[type].safeParse(params);
  if (!parsed.success)
    throw new ActionError(
      `Invalid ${type} details: ${parsed.error.issues[0]?.message ?? "bad input"}`,
      "invalid",
    );
  return parsed.data as Record<string, unknown>;
}

const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

export function titleFor(type: ActionType, p: Record<string, unknown>): string {
  switch (type) {
    case "create_reminder":
      return `Add reminder “${p["title"]}” (${p["day"]} ${p["startTime"]})`;
    case "create_goal":
      return `Create goal “${p["title"]}” — target ${p["currency"] ?? ""}${Number(p["target"]).toLocaleString()}`;
    case "toggle_automation":
      return `Turn ${p["enabled"] ? "on" : "off"} the ${CHANNEL_LABEL[String(p["channelId"])] ?? p["channelId"]} automation`;
    case "create_automation":
      return `Create automation “${p["name"]}”`;
    case "deploy_n8n_workflow":
      return `Build “${p["name"]}” in n8n (switched off)`;
    case "change_ad_budget": {
      const c = Number(p["changeUsdPerDay"]);
      return `${c >= 0 ? "Raise" : "Cut"} ${p["platform"]} ad budget by ${money(Math.abs(c))}/day`;
    }
  }
}

// ------------------------------------------------------------------- limits

export interface LimitCheck {
  exceeded: boolean;
  note: string;
  spendUsd: number | null;
}

/** Pure: does this action break an owner-set cap? Only INCREASES in ad spend count. */
export function evaluateLimits(
  type: ActionType,
  params: Record<string, unknown>,
  settings: Pick<OwnerSettings, "adChangeCapUsd" | "dailyMessageCap">,
): LimitCheck {
  if (type === "change_ad_budget") {
    const change = Number(params["changeUsdPerDay"]);
    if (change <= 0)
      return {
        exceeded: false,
        note: "This lowers spend, so it isn't counted against your limit.",
        spendUsd: 0,
      };
    const cap = settings.adChangeCapUsd;
    return change > cap
      ? {
          exceeded: true,
          note: `This raises daily ad spend by ${money(change)}, over your ${money(cap)} per-change limit.`,
          spendUsd: change,
        }
      : { exceeded: false, note: `Within your ${money(cap)} per-change limit.`, spendUsd: change };
  }
  if (riskFor(type, params) === "messages") {
    return {
      exceeded: false,
      note: `Customer messages are capped at ${settings.dailyMessageCap} per day (Settings → Safety limits).`,
      spendUsd: null,
    };
  }
  return { exceeded: false, note: "", spendUsd: null };
}

// ----------------------------------------------------------------- previews

const confidenceFromSample = (n: number): Confidence =>
  n >= 20 ? "high" : n >= 5 ? "medium" : "low";

async function buildPreview(
  userId: string,
  type: ActionType,
  p: Record<string, unknown>,
  risk: ActionRisk,
  limit: LimitCheck,
): Promise<ActionPreview> {
  const db = getSupabaseAdmin();
  const limitInfo = limit.note ? { exceeded: limit.exceeded, note: limit.note } : undefined;
  const none = ["Your money", "Your ad accounts", "Messages to your customers"];

  switch (type) {
    case "create_reminder":
      return {
        headline: `If you approve: a reminder appears on your Schedule for ${p["day"]} ${p["startTime"]}–${p["endTime"]}.`,
        effects: [`Adds “${p["title"]}” to Schedule`],
        unchanged: none,
        confidence: "high",
        confidenceNote: "Nothing to predict — it only adds a reminder.",
        sources: [],
      };
    case "create_goal":
      return {
        headline: `If you approve: “${p["title"]}” is added to Goals with progress starting at 0.`,
        effects: [
          `New goal with target ${p["currency"] ?? ""}${Number(p["target"]).toLocaleString()}`,
          "You can edit or delete it any time",
        ],
        unchanged: none,
        confidence: "high",
        confidenceNote: "Nothing to predict — it only adds a goal.",
        sources: [],
      };
    case "toggle_automation": {
      const turningOn = Boolean(p["enabled"]);
      let runs = 0,
        failed = 0,
        last: string | null = null,
        name = `${CHANNEL_LABEL[String(p["channelId"])]} automation`;
      if (db) {
        const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
        const [a, r] = await Promise.all([
          db
            .from("automations")
            .select("name")
            .eq("user_id", userId)
            .eq("id", String(p["channelId"]))
            .maybeSingle(),
          db
            .from("automation_runs")
            .select("status, started_at")
            .eq("user_id", userId)
            .eq("automation_id", String(p["channelId"]))
            .gte("started_at", since)
            .order("started_at", { ascending: false })
            .limit(500),
        ]);
        if (a.data?.["name"]) name = a.data["name"] as string;
        runs = r.data?.length ?? 0;
        failed = (r.data ?? []).filter((x) => x["status"] !== "success").length;
        last = (r.data?.[0]?.["started_at"] as string | undefined) ?? null;
      }
      const effects = [
        turningOn
          ? `“${name}” starts running again`
          : `“${name}” stops — no new runs until you turn it back on`,
      ];
      if (risk === "messages")
        effects.push(`It can message your customers (limit: see Safety limits)`);
      if (risk === "ads") effects.push("It acts on your advertising");
      if (risk === "money") effects.push("It touches payments");
      return {
        headline: `If you approve: ${effects[0]}.`,
        effects,
        unchanged: ["Everything else on your Automation Grid"],
        estimate:
          runs > 0
            ? [
                {
                  label: "Last 30 days",
                  value: `${runs} run${runs === 1 ? "" : "s"}, ${runs - failed} succeeded`,
                },
                {
                  label: "Expect roughly",
                  value: `${Math.max(1, Math.round((runs / 30) * 7))} run(s) a week if you turn it on`,
                },
              ]
            : undefined,
        confidence: confidenceFromSample(runs),
        confidenceNote:
          runs === 0
            ? "No run history yet, so there's nothing to base an estimate on."
            : `Based on ${runs} run${runs === 1 ? "" : "s"} in the last 30 days${runs < 20 ? " — a small sample" : ""}.`,
        sources: [
          makeSource(
            "Automation run history",
            "/automations",
            last,
            30,
            runs === 0 ? "No runs recorded" : undefined,
          ),
        ],
        limit: limitInfo,
      };
    }
    case "create_automation":
      return {
        headline: `If you approve: “${p["name"]}” is added to your Automation Grid and starts running right away.`,
        effects: [
          `Trigger: ${p["trigger"]}`,
          `Action: ${p["action"]}`,
          ...(risk !== "internal" ? ["It acts outside ADUF, so check the action line above"] : []),
        ],
        unchanged: ["Your other automations"],
        confidence: "low",
        confidenceNote:
          "A brand-new automation has no history, so ADUF can't say what it will achieve.",
        sources: [],
        limit: limitInfo,
      };
    case "deploy_n8n_workflow":
      return {
        headline:
          "If you approve: the workflow is built in your n8n switched off — nothing runs until you turn it on.",
        effects: [
          `Creates “${p["name"]}” in n8n`,
          "Safe Mode: inactive until you tap “Turn it on”",
        ],
        unchanged: [...none, "Nothing runs automatically"],
        confidence: "high",
        confidenceNote: "How it's built is certain. What it will achieve isn't predicted.",
        sources: [],
      };
    case "change_ad_budget": {
      const change = Number(p["changeUsdPerDay"]);
      const rates = await usdRates().catch(() => ({}) as Record<string, number>);
      const sim = simulateAdChange(change, rates["NGN"] ?? 1500);
      return {
        headline: `If you approve: this is recorded as approved. ADUF can't change your ad account — you apply ${change >= 0 ? "+" : "-"}${money(Math.abs(change))}/day in ${p["platform"]}.`,
        effects: ["Recorded in your activity log as approved", "No ad account is changed by ADUF"],
        unchanged: ["Your ad accounts (until you change them yourself)"],
        estimate: [
          { label: "Extra spend over 30 days", value: money(sim.extraSpendUsd) },
          { label: "Possible extra leads (rough)", value: `~${Math.max(0, sim.leads)}` },
          { label: "Possible extra sales (rough)", value: `~${money(Math.max(0, sim.salesUsd))}` },
        ],
        confidence: "low",
        confidenceNote: SIM_DISCLAIMER,
        sources: [
          makeSource(
            "Ad results from your ad account",
            "/settings",
            null,
            7,
            "Not connected for ad spend history",
          ),
        ],
        limit: limitInfo,
      };
    }
  }
}

// --------------------------------------------------------------- persistence

type Row = Record<string, unknown>;
const toRecord = (r: Row): ActionRecord => ({
  id: r["id"] as string,
  type: r["type"] as string,
  title: r["title"] as string,
  reasoning: (r["reasoning"] as string) ?? "",
  tier: r["tier"] as ActionTier,
  risk: r["risk"] as ActionRisk,
  status: r["status"] as ActionStatus,
  source: r["source"] as string,
  preview: (r["preview"] as ActionPreview | null) ?? null,
  result: (r["result"] as ActionRecord["result"]) ?? null,
  overLimit: Boolean(r["over_limit"]),
  decidedBy: (r["decided_by"] as "auto" | "owner" | null) ?? null,
  error: (r["error"] as string | null) ?? null,
  undoUntil: (r["undo_until"] as string | null) ?? null,
  createdAt: r["created_at"] as string,
  decidedAt: (r["decided_at"] as string | null) ?? null,
  undoneAt: (r["undone_at"] as string | null) ?? null,
});

function requireDb() {
  const db = getSupabaseAdmin();
  if (!db) throw new ActionError("The backend isn't configured.", "no_backend");
  return db;
}

async function load(userId: string, id: string): Promise<Row> {
  const { data } = await requireDb()
    .from("agent_actions")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) throw new ActionError("That action doesn't exist.", "not_found");
  return data as Row;
}

// ---------------------------------------------------------------- executors

interface ExecResult {
  result: Record<string, unknown>;
  changed: boolean;
}

async function execute(
  userId: string,
  type: ActionType,
  p: Record<string, unknown>,
  reasoning: string,
): Promise<ExecResult> {
  switch (type) {
    case "create_reminder": {
      const ev = await createScheduleEvent(userId, {
        title: String(p["title"]),
        day: p["day"] as "Mon",
        startTime: String(p["startTime"]),
        endTime: String(p["endTime"]),
        category: "other",
        notes: reasoning.slice(0, 300),
      });
      if (!ev) throw new Error("Couldn't add the reminder.");
      return { result: { entityId: ev.id, note: "Added to your Schedule." }, changed: true };
    }
    case "create_goal": {
      const g = await createGoal(
        userId,
        String(p["title"]),
        Number(p["target"]),
        String(p["currency"] ?? ""),
      );
      if (!g) throw new Error("Couldn't create the goal.");
      return { result: { entityId: g.id, note: "Added to Goals." }, changed: true };
    }
    case "toggle_automation": {
      const id = String(p["channelId"]);
      const want = Boolean(p["enabled"]);
      const current = (await listAutomations(userId)).find((a) => a.id === id);
      if (!current) throw new Error(`The ${CHANNEL_LABEL[id]} automation doesn't exist.`);
      if (current.enabled === want)
        return {
          result: { note: `Already ${want ? "on" : "off"} — nothing changed.` },
          changed: false,
        };
      const updated = await setAutomationEnabled(userId, id, want);
      if (!updated) throw new Error("Couldn't change the automation.");
      return {
        result: { entityId: id, prev: current.enabled, note: `Turned ${want ? "on" : "off"}.` },
        changed: true,
      };
    }
    case "create_automation": {
      const a = await createAutomation(userId, {
        name: String(p["name"]),
        trigger: String(p["trigger"]),
        action: String(p["action"]),
        goalTitle: p["goalTitle"] ? String(p["goalTitle"]) : undefined,
      });
      if (!a) throw new Error("Couldn't create the automation.");
      return { result: { entityId: a.id, note: "Added to your Automation Grid." }, changed: true };
    }
    case "deploy_n8n_workflow": {
      const d = await createSafeModeDeployment(userId, {
        name: String(p["name"]),
        reasoning,
        templateId: p["templateId"] ? String(p["templateId"]) : undefined,
        buildBrief: p["buildBrief"] ? String(p["buildBrief"]) : undefined,
      });
      return {
        result: {
          entityId: d.id,
          note: "Built in n8n, switched off. Turn it on from the Automation Grid when ready.",
        },
        changed: true,
      };
    }
    case "change_ad_budget":
      return {
        result: {
          manual: true,
          note: `Recorded. Apply the change in ${p["platform"]} yourself — ADUF can't edit your ad account.`,
        },
        changed: false,
      };
  }
}

async function runUndo(
  userId: string,
  type: ActionType,
  result: Record<string, unknown>,
): Promise<void> {
  const id = String(result["entityId"] ?? "");
  switch (type) {
    case "create_reminder":
      if (!(await deleteScheduleEvent(userId, id)))
        throw new Error("Couldn't remove the reminder.");
      return;
    case "create_goal":
      if (!(await deleteGoal(userId, id))) throw new Error("Couldn't delete the goal.");
      return;
    case "toggle_automation":
      if (!(await setAutomationEnabled(userId, id, Boolean(result["prev"]))))
        throw new Error("Couldn't restore the automation.");
      return;
    case "create_automation":
      if (!(await deleteAutomation(userId, id))) throw new Error("Couldn't delete the automation.");
      return;
    default:
      throw new Error("This action can't be undone.");
  }
}

// ------------------------------------------------------------------- public

/** Records a proposal and, if (and only if) it's low-risk, internal and within limits, runs it now. */
export async function proposeAction(
  userId: string,
  input: { type: string; params: unknown; reasoning: string; source?: string },
): Promise<ActionRecord> {
  const db = requireDb();
  if (!isActionType(input.type))
    throw new ActionError(`Unknown action type “${input.type}”.`, "invalid");
  const type = input.type;
  const params = validateParams(type, input.params);
  const risk = riskFor(type, params);
  const tier = tierFor(type, params);
  const settings = await getOwnerSettings(userId);
  const limit = evaluateLimits(type, params, settings);
  const title = titleFor(type, params);

  // The same suggestion repeated in chat shouldn't stack up as duplicates.
  const { data: dup } = await db
    .from("agent_actions")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "proposed")
    .eq("title", title)
    .gte("created_at", new Date(Date.now() - PROPOSAL_TTL_DAYS * 86_400_000).toISOString())
    .limit(1)
    .maybeSingle();
  if (dup) return toRecord(dup as Row);

  const preview = await buildPreview(userId, type, params, risk, limit);
  const { data, error } = await db
    .from("agent_actions")
    .insert({
      user_id: userId,
      type,
      title,
      reasoning: input.reasoning.slice(0, 400),
      params,
      tier,
      risk,
      status: "proposed",
      source: input.source ?? "chat",
      preview,
      spend_usd: limit.spendUsd,
      over_limit: limit.exceeded,
    })
    .select("id")
    .single();
  if (error || !data)
    throw new ActionError(`Couldn't record the proposal: ${error?.message}`, "no_backend");

  // Auto-run only when nothing needs a human: low-risk tier AND inside every limit.
  if (tier === "auto" && !limit.exceeded) return claimAndRun(userId, data["id"] as string, "auto");
  return toRecord(await load(userId, data["id"] as string));
}

async function claimAndRun(
  userId: string,
  id: string,
  decidedBy: "auto" | "owner",
): Promise<ActionRecord> {
  const db = requireDb();
  const row = await load(userId, id);
  const type = row["type"] as ActionType;
  const def = ACTIONS[type];

  // Claim: only one caller can move a proposal out of "proposed" — double-taps can't run it twice.
  const finalStatus: ActionStatus = decidedBy === "auto" ? "auto_executed" : "approved";
  const { data: claimed } = await db
    .from("agent_actions")
    .update({ status: finalStatus, decided_by: decidedBy, decided_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId)
    .eq("status", "proposed")
    .select("id");
  if (!claimed?.length) return toRecord(await load(userId, id)); // someone else decided first

  try {
    const { result, changed } = await execute(
      userId,
      type,
      row["params"] as Record<string, unknown>,
      (row["reasoning"] as string) ?? "",
    );
    const undoable = changed && def.undoHours !== null;
    await db
      .from("agent_actions")
      .update({
        result,
        undo_until: undoable
          ? new Date(Date.now() + def.undoHours! * 3_600_000).toISOString()
          : null,
      })
      .eq("id", id)
      .eq("user_id", userId);
  } catch (e) {
    await db
      .from("agent_actions")
      .update({ status: "failed", error: e instanceof Error ? e.message : "Unknown error" })
      .eq("id", id)
      .eq("user_id", userId);
  }
  return toRecord(await load(userId, id));
}

export async function decideAction(
  userId: string,
  id: string,
  decision: "approve" | "decline",
  opts: { overrideLimit?: boolean } = {},
): Promise<ActionRecord> {
  const db = requireDb();
  let row = await load(userId, id);

  if (
    row["status"] === "proposed" &&
    Date.now() - new Date(row["created_at"] as string).getTime() > PROPOSAL_TTL_DAYS * 86_400_000
  ) {
    await db
      .from("agent_actions")
      .update({ status: "expired", decided_at: new Date().toISOString() })
      .eq("id", id)
      .eq("status", "proposed");
    row = await load(userId, id);
  }
  if (row["status"] !== "proposed") return toRecord(row); // already decided — idempotent

  if (decision === "decline") {
    await db
      .from("agent_actions")
      .update({ status: "declined", decided_by: "owner", decided_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", userId)
      .eq("status", "proposed");
    return toRecord(await load(userId, id));
  }

  // Re-check limits against the owner's CURRENT caps — they may have changed since the proposal.
  const type = row["type"] as ActionType;
  const limit = evaluateLimits(
    type,
    row["params"] as Record<string, unknown>,
    await getOwnerSettings(userId),
  );
  if (limit.exceeded && !opts.overrideLimit) {
    throw new ActionError(
      `${limit.note} Confirm “Approve anyway” to go over your limit.`,
      "over_limit",
    );
  }
  if (limit.exceeded !== Boolean(row["over_limit"])) {
    await db
      .from("agent_actions")
      .update({ over_limit: limit.exceeded })
      .eq("id", id)
      .eq("user_id", userId);
  }
  return claimAndRun(userId, id, "owner");
}

export async function undoAction(userId: string, id: string): Promise<ActionRecord> {
  const db = requireDb();
  const row = await load(userId, id);
  const status = row["status"] as ActionStatus;
  const undoUntil = row["undo_until"] as string | null;
  if (status === "undone") return toRecord(row);
  if ((status !== "auto_executed" && status !== "approved") || !undoUntil)
    throw new ActionError("This can't be undone.", "bad_state");
  if (new Date(undoUntil).getTime() < Date.now())
    throw new ActionError("The undo window for this has closed.", "bad_state");

  const { data: claimed } = await db
    .from("agent_actions")
    .update({ status: "undone", undone_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId)
    .in("status", ["auto_executed", "approved"])
    .select("id");
  if (!claimed?.length) return toRecord(await load(userId, id));

  try {
    await runUndo(
      userId,
      row["type"] as ActionType,
      (row["result"] as Record<string, unknown>) ?? {},
    );
  } catch (e) {
    // Put it back so the owner can retry and the log stays truthful.
    await db
      .from("agent_actions")
      .update({ status, undone_at: null })
      .eq("id", id)
      .eq("user_id", userId);
    throw new ActionError(e instanceof Error ? e.message : "Couldn't undo that.", "bad_state");
  }
  return toRecord(await load(userId, id));
}

export async function getActions(userId: string, ids: string[]): Promise<ActionRecord[]> {
  if (!ids.length) return [];
  const { data } = await requireDb()
    .from("agent_actions")
    .select("*")
    .eq("user_id", userId)
    .in("id", ids.slice(0, 50));
  return (data ?? []).map((r) => toRecord(r as Row));
}

/** Proposals waiting on the owner (oldest dropped after PROPOSAL_TTL_DAYS). */
export async function listPendingActions(userId: string): Promise<ActionRecord[]> {
  const db = getSupabaseAdmin();
  if (!db) return [];
  const cutoff = new Date(Date.now() - PROPOSAL_TTL_DAYS * 86_400_000).toISOString();
  await db
    .from("agent_actions")
    .update({ status: "expired", decided_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("status", "proposed")
    .lt("created_at", cutoff);
  const { data } = await db
    .from("agent_actions")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "proposed")
    .order("created_at", { ascending: false })
    .limit(20);
  return (data ?? []).map((r) => toRecord(r as Row));
}
