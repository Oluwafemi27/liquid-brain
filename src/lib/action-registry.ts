// Client-safe. The ONE place that decides what ADUF may do on its own and what
// needs the owner's tap. The server enforces it (lib/server/actions.ts); the UI
// only displays it — so the browser can never talk its way past a tier.
import type { ActionRisk, ActionTier } from "@/lib/aduf-types";

export type ActionType =
  | "create_reminder"
  | "create_goal"
  | "update_goal"
  | "delete_goal"
  | "update_event"
  | "delete_event"
  | "ui_open_page"
  | "toggle_automation"
  | "create_automation"
  | "deploy_n8n_workflow"
  | "change_ad_budget"
  | "dropship_create_product"
  | "dropship_update_price"
  | "dropship_place_supplier_order"
  | "dropship_update_supplier_order"
  | "composio_run_tool";

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
  update_goal: {
    type: "update_goal",
    label: "Edit a goal",
    plain: "Changing a goal's title, target or progress",
    baseTier: "approve",
    undoHours: 24,
    undoNote: "Puts the goal back how it was.",
  },
  delete_goal: {
    type: "delete_goal",
    label: "Delete a goal",
    plain: "Deleting a goal",
    baseTier: "approve",
    undoHours: null,
    undoNote: "A deleted goal can't be brought back.",
  },
  update_event: {
    type: "update_event",
    label: "Edit a Schedule event",
    plain: "Moving or renaming events on your Schedule",
    baseTier: "approve",
    undoHours: 24,
    undoNote: "Puts the event back how it was.",
  },
  delete_event: {
    type: "delete_event",
    label: "Delete a Schedule event",
    plain: "Removing events from your Schedule",
    baseTier: "approve",
    undoHours: null,
    undoNote: "A deleted event can't be brought back.",
  },
  ui_open_page: {
    type: "ui_open_page",
    label: "Open a page for you",
    plain: "Pointing you to the right page (it never changes anything)",
    baseTier: "auto",
    undoHours: null,
    undoNote: "Nothing changed, so there is nothing to undo.",
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
  dropship_create_product: {
    type: "dropship_create_product",
    label: "Add a product to your Medusa store (as a draft)",
    plain: "Adding draft products to your store (never published automatically)",
    baseTier: "approve",
    undoHours: 24,
    undoNote: "Deletes the draft product, as long as you haven't published it.",
  },
  dropship_update_price: {
    type: "dropship_update_price",
    label: "Change a product price in your Medusa store",
    plain: "Store price changes (never below break-even)",
    baseTier: "approve",
    undoHours: 24,
    undoNote: "Puts the previous price back.",
  },
  dropship_place_supplier_order: {
    type: "dropship_place_supplier_order",
    label: "Buy from your supplier for a customer order",
    plain: "Supplier orders for paid customer orders (CJ orders are created unpaid)",
    baseTier: "approve",
    undoHours: 24,
    undoNote:
      "Cancels a not-yet-placed to-do. An order already created at CJ must be cancelled inside CJ.",
  },
  dropship_update_supplier_order: {
    type: "dropship_update_supplier_order",
    label: "Update a supplier order's tracking",
    plain:
      "Tracking numbers and status on supplier orders (delivered, refunded and cancelled need approval)",
    baseTier: "auto",
    undoHours: 24,
    undoNote: "Puts the previous tracking record back.",
  },
  composio_run_tool: {
    type: "composio_run_tool",
    label: "Do something in one of your connected apps",
    plain:
      "Actions inside apps you connected (sending, creating or changing things always needs approval)",
    baseTier: "approve",
    undoHours: null,
    undoNote: "ADUF can't undo what happens inside another app. Reverse it there if needed.",
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
    case "update_goal":
    case "delete_goal":
    case "update_event":
    case "delete_event":
    case "ui_open_page":
      return "internal";
    case "change_ad_budget":
      return "ads";
    case "dropship_create_product":
    case "composio_run_tool":
      return "external";
    case "dropship_update_price":
      return "money";
    case "dropship_place_supplier_order":
      return params["supplier"] === "cj" ? "external" : "internal";
    case "dropship_update_supplier_order":
      return params["status"] === "delivered" || params["status"] === "refunded"
        ? "money"
        : params["status"] === "cancelled"
          ? "external"
          : "internal";
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
