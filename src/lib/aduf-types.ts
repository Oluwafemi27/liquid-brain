// Shapes mirror the future FastAPI response payloads (snake-free, camelCase DTOs).
export type Trend = "up" | "down" | "flat";

export interface SubTask {
  id: string;
  label: string;
  done: boolean;
}

export interface Goal {
  id: string;
  title: string;
  target: number;
  current: number;
  currency: string;
  due: string;
  subTasks: SubTask[];
}

export type ChannelId = "website" | "whatsapp" | "crm" | "payments" | "ads" | "email";

export interface Automation {
  /** Stable identifier. The original 6 built-in channel automations use
   *  their ChannelId directly (e.g. "website"); AI-created automations get
   *  a generated id (e.g. "auto-<uuid>") since they aren't tied to one of
   *  the fixed channels. */
  id: string;
  name: string;
  enabled: boolean;
  trigger: string;
  action: string;
  goal: string;
  runs: number;
  /** Which of the 6 built-in channels this automation belongs to, purely
   *  for icon selection on the Grid page. Undefined for AI-created
   *  automations that don't map to one — they fall back to a generic icon. */
  channel?: ChannelId | undefined;
  /** "builtin" automations are the 6 seeded channel toggles; "ai" ones were
   *  created by the agent after the owner approved a proposed action. */
  source: "builtin" | "ai";
  /** How this automation actually runs when triggered: fetch data, run it
   *  through a transform, then take an action — the n8n-style pipeline. */
  steps?: AutomationStep[] | undefined;
  /** id of the goal this automation's results feed into, if any — set when
   *  the automation's action updates a goal's progress. */
  goalId?: string | undefined;
}

export interface AutomationStep {
  kind: "get_data" | "process_data" | "send_action";
  label: string;
}

export interface AutomationRun {
  id: string;
  automationId: string;
  startedAt: string;
  status: "success" | "error";
  summary: string;
  /** Value extracted from this run (e.g. revenue detected), if any — this
   *  is what gets written into the linked goal's progress. */
  value?: number | undefined;
}

export interface MemoryNode {
  id: string;
  label: string;
  group: "customers" | "products" | "revenue" | "traffic" | "core";
  facts: number;
  x: number; // normalised layout 0-100
  y: number;
}

export interface MemoryEdge {
  from: string;
  to: string;
}

export interface DataSource {
  id: string;
  name: string;
  category: string;
  connected: boolean;
}

export interface SeriesPoint {
  month: string;
  sales: number;
  leads: number;
  retention: number;
}

export interface ChatQuestionOption {
  id: string;
  label: string;
  value: string;
}

/** A questionnaire-style prompt the agent can attach to a reply instead of
 *  (or alongside) free text — rendered as tappable option chips. */
export interface ChatQuestion {
  prompt: string;
  options: ChatQuestionOption[];
  multi?: boolean;
}

export type AgentTraceStatus = "running" | "done" | "error";

/** One step of the agent's visible working — shown inside the collapsible
 *  "agent is working" panel under a reply. */
export interface AgentTraceStep {
  id: string;
  label: string;
  detail?: string;
  status: AgentTraceStatus;
}

export interface ChatAttachment {
  id: string;
  filename: string;
  format: "txt" | "md" | "docx" | "pdf";
  mimeType: string;
  sizeBytes: number;
  previewText?: string | null;
}

/** A goal the agent drafted for the owner to review — nothing is created
 *  until the owner taps Approve, at which point the app calls the same
 *  addGoal() path the manual "New Goal" form uses, so it lands on the
 *  Goals page (and Supabase) exactly like a hand-created goal would. */
export interface ProposedGoalAction {
  type: "create_goal";
  title: string;
  target: number;
  currency: string;
  reasoning: string;
}

/** A channel automation the agent wants turned on/off — approving it calls
 *  the same toggleAutomation() the Automation Grid's own toggle uses. */
export interface ProposedAutomationAction {
  type: "toggle_automation";
  channelId: ChannelId;
  enabled: boolean;
  reasoning: string;
}

/** A brand-new automation the agent wants to create — not one of the 6
 *  built-in channels. Approving it inserts a real row into `automations`
 *  so it shows up on the Grid page like any other, and can optionally be
 *  wired to a goal so its runs feed that goal's progress. */
export interface ProposedCreateAutomationAction {
  type: "create_automation";
  name: string;
  trigger: string;
  action: string;
  /** Title of an existing goal to link this automation's output to, or
   *  undefined if it isn't tied to a specific goal. */
  goalTitle?: string | undefined;
  reasoning: string;
}

/** A real n8n workflow the agent wants to stand up for the owner — either
 *  picked from the imported template library (templateId set) or built
 *  fresh (generatedJson set). Approving this deploys it to the owner's own
 *  n8n instance via n8n-deployments.ts's createSafeModeDeployment(), which
 *  ALWAYS creates it inactive — "Safe Mode". The owner still has to tap a
 *  separate "Turn it on" on the resulting card before it can run against
 *  real customers; approving this proposedAction only builds it. */
export interface ProposedDeployN8nWorkflowAction {
  type: "deploy_n8n_workflow";
  name: string;
  /** Library template id to deploy as-is (or its starred correction, if
   *  one is on file) — set when search_n8n_templates found a good match. */
  templateId?: string | undefined;
  /** A short, human-readable description of what the fresh workflow would
   *  do, used only when no suitable template exists — the actual n8n JSON
   *  is built server-side from this plus the platform knowledge base, not
   *  authored by the chat model inline. */
  buildBrief?: string | undefined;
  goalTitle?: string | undefined;
  reasoning: string;
}

/** A reminder on the Schedule page — low-risk and internal, so it runs
 *  immediately (and can be undone) instead of waiting for approval. */
export interface ProposedReminderAction {
  type: "create_reminder";
  title: string;
  day: Weekday;
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  reasoning: string;
}

/** A change to an ad budget. ADUF has read-only access to ad accounts, so
 *  approving records the decision (and checks it against the owner's cap) —
 *  the owner makes the change in their ad platform. */
export interface ProposedAdBudgetAction {
  type: "change_ad_budget";
  platform: string;
  /** Daily budget change in USD (positive = increase). */
  changeUsdPerDay: number;
  reasoning: string;
}

export type ProposedAction = (
  | ProposedGoalAction
  | ProposedAutomationAction
  | ProposedCreateAutomationAction
  | ProposedDeployN8nWorkflowAction
  | ProposedReminderAction
  | ProposedAdBudgetAction
) & {
  /** Set by the server once the proposal is recorded in the action ledger. */
  actionId?: string | undefined;
};

export type N8nDeploymentStatus = "draft" | "inactive" | "active" | "error" | "archived";

/** Client-facing shape of a row in n8n_deployments — see
 *  src/lib/server/n8n-deployments.ts for the source of truth. */
export interface N8nDeployment {
  id: string;
  automationId: string | null;
  templateId: string | null;
  n8nWorkflowId: string | null;
  name: string;
  status: N8nDeploymentStatus;
  safeMode: boolean;
  builtFrom: "template" | "generated";
  reasoning: string;
  lastError: string | null;
  deployedAt: string;
  activatedAt: string | null;
}

export type ProposedActionStatus = "pending" | "approved" | "dismissed";

export interface ChatMessage {
  id: string;
  role: "user" | "aduf";
  text: string;
  /** Present when the agent wants the user to pick from options. */
  question?: ChatQuestion | undefined;
  /** Option value(s) the user already picked, once a question is answered. */
  answeredValues?: string[] | undefined;
  /** Visible-on-demand trace of what the agent did to produce this reply. */
  trace?: AgentTraceStep[] | undefined;
  /** Files the agent created while producing this reply — previewable and
   *  downloadable from the chat. */
  attachments?: ChatAttachment[] | undefined;
  /** Present when this reply is a structured ADUF business diagnosis. */
  analysis?: AdufAnalysis | undefined;
  /** Present when the agent is proposing a concrete change to another page
   *  (a goal to create, an automation to flip) that needs the owner's
   *  explicit approval before it takes effect anywhere. */
  proposedAction?: ProposedAction | undefined;
  proposedActionStatus?: ProposedActionStatus;
  /** The data this answer was based on, with freshness. Empty = ADUF used no stored data. */
  sources?: SourceRef[] | undefined;
  /** Data ADUF knows it is missing or that is out of date (shown so it never guesses silently). */
  dataGaps?: string[] | undefined;
}

export type AdufSeverity = "low" | "medium" | "high" | "critical";

export type AdufArea =
  | "visibility"
  | "credibility"
  | "customer_journey"
  | "conversion"
  | "sales"
  | "retention"
  | "operations"
  | "local_presence"
  | "search_ai_visibility";

export interface AdufFinding {
  area: AdufArea;
  problem: string;
  severity: AdufSeverity;
  rootCauses: string[];
  opportunities: string[];
  recommendedActions: string[];
  estimatedImpact: string;
  automationPossible: boolean;
  automationNotes?: string | undefined;
  expertRequired: boolean;
  expertType?: string | undefined;
}

export interface AdufAnalysis {
  summary: string;
  findings: AdufFinding[];
}

export type InsightSeverity = "info" | "success" | "warning";

export interface Insight {
  id: string;
  title: string;
  body: string;
  severity: InsightSeverity;
  source: string;
  createdAt: number;
  read: boolean;
}

export type DealStage = "New" | "Contacted" | "Negotiation" | "Won";

export interface CrmDeal {
  id: string;
  name: string;
  company: string;
  value: number;
  stage: DealStage;
  owner: string;
  probability: number; // 0-100
}

export interface TopCustomer {
  id: string;
  name: string;
  segment: string;
  ltv: number;
  orders: number;
  lastOrder: string;
  trend: Trend;
}

export interface ChannelRevenue {
  channel: string;
  value: number;
  color: string;
}

export interface FunnelStage {
  label: string;
  value: number;
}

export type Weekday = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";

export type ScheduleCategory =
  "meeting" | "content" | "campaign" | "automation" | "followup" | "other";

export interface ScheduleEvent {
  id: string;
  title: string;
  day: Weekday;
  startTime: string; // 24h "HH:MM"
  endTime: string; // 24h "HH:MM"
  category: ScheduleCategory;
  notes: string;
  done: boolean;
}

/** One month of real automation activity, from the `automation_runs` table. */
export interface ActivityMonth {
  month: string;
  runs: number;
  success: number;
  failed: number;
}

export interface AutomationActivity {
  id: string;
  name: string;
  runs: number;
  failed: number;
}

/** Live analytics computed server-side from rows ADUF actually recorded for
 *  this user — never from simulated or placeholder numbers. */
export interface AnalyticsSummary {
  months: ActivityMonth[];
  totalRuns: number;
  successRate: number | null; // 0-100, null when there are no runs yet
  topAutomations: AutomationActivity[];
  goals: { total: number; completed: number; avgProgress: number };
  generatedAt: string;
}

// ---- Business data import (sales / leads / customers / deals / traffic) ----

export type ImportSource = "csv" | "sheets" | "drive" | "ga" | "gmail";
export type ImportRecordKind = "sale" | "lead" | "customer" | "deal" | "traffic";

/** One completed import, as listed under "Imported data" on Analytics. */
export interface ImportSummary {
  id: string;
  source: ImportSource;
  kind: ImportRecordKind;
  label: string;
  currency: string;
  rowsImported: number;
  rowsSkipped: number;
  note: string;
  createdAt: string;
  /** Last time this was (re)fetched from its source. */
  syncedAt: string;
  /** Why the last automatic sync failed, if it did. */
  lastError: string | null;
  /** True when ADUF can refresh it from the source (everything except file uploads). */
  canSync: boolean;
}

/** Everything the Analytics business panels render, computed server-side
 *  from imported rows (see lib/server/business-data.ts). Money is in USD. */
export interface BusinessData {
  series: SeriesPoint[];
  deals: CrmDeal[];
  /** Deals beyond the 200 returned (so the board can say "+N more"). */
  dealsTotal: number;
  topCustomers: TopCustomer[];
  channelRevenue: ChannelRevenue[];
  /** "Last 30 days" or the wider window used when the last 30 days were empty. */
  channelPeriod: string;
  funnel: FunnelStage[];
  /** Where the sales / leads series came from, so the UI can say so honestly. */
  salesFrom: "records" | "ga" | null;
  leadsFrom: "records" | "ga" | null;
  /** True when data was imported but none of it falls in the last 6 months. */
  outsideWindow: boolean;
  counts: { sales: number; leads: number; customers: number; deals: number; trafficMonths: number };
  imports: ImportSummary[];
  generatedAt: string;
}

// ---- Trust layer: verdict, approvals, activity, connection health --------

export type VerdictStatus = "green" | "amber" | "red" | "unknown";
export type Confidence = "high" | "medium" | "low";
export type SourceState = "fresh" | "stale" | "missing";

/** The exact data behind a statement. `state` is how much to trust it. */
export interface SourceRef {
  label: string;
  /** In-app page where the underlying numbers can be seen. */
  href: string;
  /** When that data was last updated (null = never / unknown). */
  asOf: string | null;
  state: SourceState;
  note?: string | undefined;
}

export interface VerdictItem {
  id: string;
  level: "ok" | "watch" | "act";
  text: string;
  /** One line: why this matters, in plain words. */
  why: string;
  suggestion?: string | undefined;
  confidence: Confidence;
  sources: SourceRef[];
  href?: string | undefined;
}

export interface DailyVerdict {
  status: VerdictStatus;
  headline: string;
  subline: string;
  items: VerdictItem[];
  pendingApprovals: number;
  confidence: Confidence;
  confidenceNote: string;
  generatedAt: string;
  /** False when there's nothing to judge yet (no data, goals or automations). */
  hasData: boolean;
}

export type ActionTier = "auto" | "approve";
export type ActionRisk = "internal" | "ads" | "messages" | "money" | "external";
export type ActionStatus =
  "proposed" | "auto_executed" | "approved" | "declined" | "undone" | "expired" | "failed";

export interface ActionPreview {
  /** "If you approve: …" */
  headline: string;
  effects: string[];
  unchanged: string[];
  estimate?: { label: string; value: string }[] | undefined;
  confidence: Confidence;
  confidenceNote: string;
  sources: SourceRef[];
  limit?: { exceeded: boolean; note: string } | undefined;
}

export interface ActionRecord {
  id: string;
  type: string;
  title: string;
  reasoning: string;
  tier: ActionTier;
  risk: ActionRisk;
  status: ActionStatus;
  source: string;
  preview: ActionPreview | null;
  result: { note?: string; manual?: boolean } | null;
  overLimit: boolean;
  decidedBy: "auto" | "owner" | null;
  error: string | null;
  undoUntil: string | null;
  createdAt: string;
  decidedAt: string | null;
  undoneAt: string | null;
}

export interface ActivityItem {
  id: string;
  at: string;
  /** Platform id (ga, sheets, gmail, shopify…), "csv" for uploads, "aduf" for ADUF itself. */
  platform: string;
  kind: "action" | "import" | "sync" | "health" | "connect" | "alert" | "message" | "system";
  title: string;
  detail: string;
  status: "ok" | "warn" | "error" | "info";
  /** Present for ADUF actions: who decided and whether it can still be undone. */
  action?: {
    id: string;
    status: ActionStatus;
    tier: ActionTier;
    decidedBy: "auto" | "owner" | null;
    undoUntil: string | null;
    canUndo: boolean;
  };
}

export type HealthState = "live" | "delayed" | "broken" | "off";

export interface ConnectionHealth {
  id: string;
  name: string;
  state: HealthState;
  message: string;
  actionLabel?: string | undefined;
  actionHref?: string | undefined;
  /** "live-check" = we called the provider just now; "token-only" = we only inspected the saved login. */
  method: "live-check" | "token-only";
  checkedAt: string | null;
  lastOkAt: string | null;
}

export interface OwnerSettings {
  adChangeCapUsd: number;
  dailyMessageCap: number;
  alertsEnabled: boolean;
  salesDropPct: number;
  failedRunsThreshold: number;
  quietStart: string; // "HH:MM"
  quietEnd: string;
  timezone: string;
  digestEnabled: boolean;
  digestChannel: "email" | "telegram";
}

export interface PlatformAnalytics {
  id: string;
  name: string;
  health: ConnectionHealth | null;
  hasData: boolean;
  lastSyncAt: string | null;
  kpis: { label: string; value: string; hint?: string }[];
  months: { month: string; a: number; b?: number }[];
  seriesLabels: { a: string; b?: string };
  breakdown: { name: string; value: number }[];
  breakdownLabel: string;
  note?: string | undefined;
}
