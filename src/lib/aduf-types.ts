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

export type ProposedAction =
  ProposedGoalAction | ProposedAutomationAction | ProposedCreateAutomationAction;

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
