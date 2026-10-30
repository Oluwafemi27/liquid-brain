// Client-safe. The ONE place that decides what ADUF may do on its own and what
// needs the owner's tap. The server enforces it (lib/server/actions.ts); the UI
// only displays it — so the browser can never talk its way past a tier.
import type { ActionRisk, ActionTier } from "@/lib/aduf-types";

export type ActionType =
  | "create_reminder"
  | "create_goal"
  | "toggle_automation"
  | "create_automation"
  | "deploy_n8n_workflow"
  | "change_ad_budget";

export interface ActionDef {
  type: ActionType;
  label: string;
  /** Plain-language one-liner shown in Settings and on the landing page. */
  plain: string;
  /** The tier this action type starts at. Only internal-risk actions may be "auto". */
  baseTier: ActionTier;
  /** Hours the owner can reverse it after it runs (null = can't be undone). */
  undoHours: number | null;
  undoNote: string;
}

export const ACTIONS: Record<ActionType, ActionDef> = {
  create_reminder: {
    type: "create_reminder",
    label: "Add a reminder to your Schedule",
    plain: "Reminders and internal notes",
    baseTier: "auto",
    undoHours: 24,
    undoNote: "Removes the reminder.",
  },
  create_goal: {
    type: "create_goal",
    label: "Create a goal",
    plain: "New goals on your Goals page",
    baseTier: "approve",
    undoHours: 24,
    undoNote: "Deletes the goal.",
  },
  toggle_automation: {
    type: "toggle_automation",
    label: "Turn an automation on or off",
    plain: "Switching a channel automation on or off",
    baseTier: "approve",
    undoHours: 24,
    undoNote: "Puts the automation back how it was.",
  },
  create_automation: {
    type: "create_automation",
    label: "Create a new automation",
    plain: "New automations",
    baseTier: "approve",
    undoHours: 24,
    undoNote: "Deletes the automation.",
  },
  deploy_n8n_workflow: {
    type: "deploy_n8n_workflow",
    label: "Build a workflow in n8n",
    plain: "Building workflows in your n8n (created switched off)",
    baseTier: "approve",
    undoHours: null,
    undoNote: "It's created switched off. Delete it in n8n if you don't want it.",
  },
  change_ad_budget: {
    type: "change_ad_budget",
    label: "Change an ad budget",
    plain: "Ad budget changes (checked against your limit)",
    baseTier: "approve",
    undoHours: null,
    undoNote: "ADUF can't change ad accounts, so you make (and can reverse) this yourself.",
  },
};

export const isActionType = (t: string): t is ActionType => t in ACTIONS;

const MESSAGE_WORDS =
  /\b(whatsapp|email|e-mail|sms|message|messages|dm|dms|reply|replies|send|text|notify|newsletter)\b/i;
const ADS_WORDS = /\b(ad|ads|campaign|campaigns|budget|spend|boost|promote)\b/i;
const MONEY_WORDS =
  /\b(payment|payments|invoice|invoices|refund|refunds|charge|payout|discount|price|pricing)\b/i;

/** What an action touches. Anything other than "internal" can never run without approval. */
export function riskFor(type: ActionType, params: Record<string, unknown>): ActionRisk {
  switch (type) {
    case "create_reminder":
    case "create_goal":
      return "internal";
    case "change_ad_budget":
      return "ads";
    case "deploy_n8n_workflow":
      return "external";
    case "toggle_automation": {
      const ch = String(params["channelId"] ?? "");
      if (ch === "ads") return "ads";
      if (ch === "whatsapp" || ch === "email") return "messages";
      if (ch === "payments") return "money";
      return "internal";
    }
    case "create_automation": {
      const text = `${params["name"] ?? ""} ${params["trigger"] ?? ""} ${params["action"] ?? ""}`;
      if (MONEY_WORDS.test(text)) return "money";
      if (ADS_WORDS.test(text)) return "ads";
      if (MESSAGE_WORDS.test(text)) return "messages";
      return "internal";
    }
  }
}

/** The tier that actually applies: auto ONLY for internal-risk actions whose type allows it. */
export function tierFor(type: ActionType, params: Record<string, unknown>): ActionTier {
  return ACTIONS[type].baseTier === "auto" && riskFor(type, params) === "internal"
    ? "auto"
    : "approve";
}

export const RISK_LABEL: Record<ActionRisk, string> = {
  internal: "Internal only",
  ads: "Touches ads",
  messages: "Touches customer messages",
  money: "Touches money",
  external: "Acts outside ADUF",
};

/** Rows for the "what runs on its own" table (Settings, landing page). */
export const APPROVAL_RULES: { plain: string; tier: ActionTier; undo: string }[] = Object.values(
  ACTIONS,
).map((a) => ({
  plain: a.plain,
  tier: a.baseTier,
  undo: a.undoHours ? `Undo for ${a.undoHours}h` : "Can't be undone",
}));
