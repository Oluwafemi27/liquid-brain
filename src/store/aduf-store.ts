import { create } from "zustand";
import type {
  Automation,
  ChannelId,
  ChatMessage,
  ChannelRevenue,
  CrmDeal,
  DataSource,
  FunnelStage,
  Goal,
  Insight,
  MemoryEdge,
  MemoryNode,
  ScheduleEvent,
  SeriesPoint,
  TopCustomer,
} from "@/lib/aduf-types";
import { initialDataSources, initialInsights, initialScheduleEvents } from "@/lib/initial-data";
import { useAuth } from "@/store/auth-store";
import {
  bumpGoalFn,
  createGoalFn,
  createAutomationFn,
  fetchChatHistoryFn,
  runAutomationFn,
  setAutomationEnabledFn,
  toggleGoalSubTaskFn,
  updateGoalFn,
} from "@/lib/server-fns";

export const SESSION_STORAGE_KEY = "aduf-chat-session-id";

function generateSessionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `session-${Date.now()}-${Math.round(Math.random() * 1e9)}`;
}

/** Reuses the session id saved from last time (so a page reload keeps
 *  showing the same conversation instead of silently starting a fresh,
 *  empty one) or creates and saves a new one. SSR-safe: falls back to a
 *  throwaway id when window/localStorage aren't available. */
function makeSessionId() {
  if (typeof window === "undefined") return generateSessionId();
  try {
    const existing = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (existing) return existing;
    const fresh = generateSessionId();
    window.localStorage.setItem(SESSION_STORAGE_KEY, fresh);
    return fresh;
  } catch {
    return generateSessionId();
  }
}

const MONEY_GOAL_PATTERN = /[₦$€£]|\b(sales|revenue|mrr|income|earn(ings)?|profit)\b/i;

/** Detects whether a goal is money-denominated from its title, since the
 *  form only collects a title + a bare number — "100 bookings" and
 *  "₦5,000,000 in Sales" both arrive the same shape otherwise. Money goals
 *  get a currency (shown converted to USD); everything else is a plain count. */
function inferGoalCurrency(title: string): string {
  return MONEY_GOAL_PATTERN.test(title) ? "₦" : "";
}

interface AdufState {
  userName: string;
  series: SeriesPoint[];
  deals: CrmDeal[];
  topCustomers: TopCustomer[];
  channelRevenue: ChannelRevenue[];
  funnel: FunnelStage[];
  goals: Goal[];
  automations: Automation[];
  memoryNodes: MemoryNode[];
  memoryEdges: MemoryEdge[];
  sources: DataSource[];
  messages: ChatMessage[];
  thinking: boolean;
  sessionId: string;
  insights: Insight[];
  scheduleEvents: ScheduleEvent[];
  setUserName: (name: string) => void;
  toggleAutomation: (id: string) => void;
  setAutomations: (automations: Automation[]) => void;
  upsertAutomation: (automation: Automation) => void;
  removeAutomation: (id: string) => void;
  /** Creates a brand-new automation (not one of the 6 built-ins) — used by
   *  approved "create_automation" proposed actions from the agent. */
  createAutomation: (input: {
    name: string;
    trigger: string;
    action: string;
    goalTitle?: string | undefined;
  }) => void;
  /** Runs an automation's get-data -> process-data -> send-action pipeline
   *  right now, logging the result and (if goal-linked) recording it into
   *  that goal's progress. */
  runAutomation: (automationId: string) => void;
  toggleSubTask: (goalId: string, taskId: string) => void;
  bumpGoal: (goalId: string, amount: number) => void;
  addGoal: (title: string, target: number) => void;
  /** Edits a goal's title/target/due date directly — what the Goals page's
   *  "Edit Plan" button calls. */
  updateGoal: (
    goalId: string,
    patch: { title?: string; target?: number; currency?: string; due?: string },
  ) => void;
  /** Replaces the whole goals list — used to hydrate from Supabase on load. */
  setGoals: (goals: Goal[]) => void;
  /** Inserts or replaces a single goal by id — used by the realtime subscription. */
  upsertGoal: (goal: Goal) => void;
  removeGoal: (goalId: string) => void;
  connectSource: (id: string) => void;
  setSourceConnected: (id: string, connected: boolean) => void;
  sendMessage: (text: string) => void;
  /** Replaces the whole messages list — used to hydrate a session's saved
   *  history from Supabase on load. */
  setMessages: (messages: ChatMessage[]) => void;
  /** Starts a brand-new conversation: generates a fresh session id, saves
   *  it as the current one, and clears the visible message list. The old
   *  conversation isn't deleted — it stays in Supabase under its old
   *  session id and can be reopened via the chat history switcher. */
  startNewChat: () => void;
  /** Records the user's pick(s) for a questionnaire message, then sends
   *  their choice back into the conversation as the next user turn. */
  answerQuestion: (messageId: string, values: string[], label: string) => void;
  markInsightRead: (id: string) => void;
  markAllInsightsRead: () => void;
  dismissInsight: (id: string) => void;
  /** Executes a pending proposedAction (creates the goal / flips the
   *  automation) through the exact same paths the Goals and Automation
   *  Grid pages use themselves, then marks the chat message approved. */
  approveProposedAction: (messageId: string) => void;
  dismissProposedAction: (messageId: string) => void;
  addScheduleEvent: (event: Omit<ScheduleEvent, "id" | "done">) => void;
  toggleScheduleEventDone: (id: string) => void;
  removeScheduleEvent: (id: string) => void;
}

// The Business Memory graph is built from real connected data sources —
// there is no fabricated placeholder graph. A fresh/disconnected account
// simply starts with an empty graph (see memoryNodes/memoryEdges below).

function makeInsight(partial: Omit<Insight, "id" | "createdAt" | "read">): Insight {
  return {
    ...partial,
    id: `insight-${Date.now()}-${Math.round(Math.random() * 1e4)}`,
    createdAt: Date.now(),
    read: false,
  };
}

export const useAduf = create<AdufState>((set, get) => ({
  userName: "",
  series: [],
  deals: [],
  topCustomers: [],
  channelRevenue: [],
  funnel: [],
  goals: [],
  automations: [],
  memoryNodes: [],
  memoryEdges: [],
  sources: initialDataSources,
  messages: [],
  thinking: false,
  sessionId: makeSessionId(),
  insights: initialInsights,
  scheduleEvents: initialScheduleEvents,

  setUserName: (name) => set({ userName: name }),

  toggleAutomation: (id) => {
    const automation = get().automations.find((item) => item.id === id);
    if (!automation) return;
    setAutomationEnabledFn({ data: { id, enabled: !automation.enabled } })
      .then((updated) => {
        if (updated) get().upsertAutomation(updated);
      })
      .catch((err) => console.error("[automations] toggle failed", err));
  },

  setAutomations: (automations) => set({ automations }),

  createAutomation: (input) => {
    createAutomationFn({ data: input })
      .then((automation) => {
        if (!automation) return;
        get().upsertAutomation(automation);
        set((s) => ({
          insights: [
            makeInsight({
              title: `New automation live: ${automation.name}`,
              body: `ADUF set this up on the Automation Grid. It'll run on: ${automation.trigger}.`,
              severity: "success",
              source: "Automations",
            }),
            ...s.insights,
          ],
        }));
      })
      .catch((err) => console.error("[automations] createAutomation failed", err));
  },

  runAutomation: (automationId) => {
    runAutomationFn({ data: { automationId } })
      .then((run) => {
        if (!run) return;
        // Refresh the automation itself (run count, and its linked goal's
        // progress will already have moved server-side) via the realtime
        // subscription — nothing else to do client-side here beyond
        // surfacing what happened.
        set((s) => ({
          insights: [
            makeInsight({
              title: run.status === "success" ? "Automation ran" : "Automation run failed",
              body: run.summary,
              severity: run.status === "success" ? "success" : "warning",
              source: "Automations",
            }),
            ...s.insights,
          ],
        }));
      })
      .catch((err) => console.error("[automations] runAutomation failed", err));
  },

  upsertAutomation: (automation) =>
    set((s) => {
      const exists = s.automations.some((item) => item.id === automation.id);
      return {
        automations: exists
          ? s.automations.map((item) => (item.id === automation.id ? automation : item))
          : [...s.automations, automation],
      };
    }),

  removeAutomation: (id) =>
    set((s) => ({ automations: s.automations.filter((item) => item.id !== id) })),

  // Goals are persisted server-side (Supabase) — these actions fire the
  // request and let the response (or the realtime subscription in
  // GoalsBootstrap) update local state, rather than mutating optimistic
  // local-only state that a reload would lose.

  toggleSubTask: (goalId, taskId) => {
    toggleGoalSubTaskFn({ data: { goalId, taskId } })
      .then((goal) => {
        if (goal) get().upsertGoal(goal);
      })
      .catch((err) => console.error("[goals] toggleSubTask failed", err));
  },

  bumpGoal: (goalId, amount) => {
    const before = get().goals.find((g) => g.id === goalId);
    bumpGoalFn({ data: { goalId, amount } })
      .then((after) => {
        if (!after) return;
        get().upsertGoal(after);
        if (before && before.current < before.target && after.current >= after.target) {
          set((s) => ({
            insights: [
              makeInsight({
                title: `Goal reached: ${after.title}`,
                body: `You hit your target of ${after.currency}${after.target.toLocaleString()}. Nice work.`,
                severity: "success",
                source: "Goals",
              }),
              ...s.insights,
            ],
          }));
        }
      })
      .catch((err) => console.error("[goals] bumpGoal failed", err));
  },

  updateGoal: (goalId, patch) => {
    updateGoalFn({ data: { goalId, ...patch } })
      .then((updated) => {
        if (updated) get().upsertGoal(updated);
      })
      .catch((err) => console.error("[goals] updateGoal failed", err));
  },

  addGoal: (title, target) => {
    createGoalFn({ data: { title, target, currency: inferGoalCurrency(title) } })
      .then((goal) => {
        if (!goal) return;
        get().upsertGoal(goal);
        set((s) => ({
          insights: [
            makeInsight({
              title: `New goal set: ${title}`,
              body: `ADUF will track progress toward this goal and flag anything worth knowing here.`,
              severity: "info",
              source: "Goals",
            }),
            ...s.insights,
          ],
        }));
      })
      .catch((err) => console.error("[goals] addGoal failed", err));
  },

  setGoals: (goals) => set({ goals }),

  upsertGoal: (goal) =>
    set((s) => {
      const exists = s.goals.some((g) => g.id === goal.id);
      return {
        goals: exists ? s.goals.map((g) => (g.id === goal.id ? goal : g)) : [...s.goals, goal],
      };
    }),

  removeGoal: (goalId) => set((s) => ({ goals: s.goals.filter((g) => g.id !== goalId) })),

  connectSource: (id) =>
    set((s) => {
      const sources = s.sources.map((d) => (d.id === id ? { ...d, connected: true } : d));
      const src = sources.find((x) => x.id === id);
      if (!src) return { sources };
      return {
        sources,
        insights: [
          makeInsight({
            title: `${src.name} connected`,
            body: `ADUF is now syncing data from ${src.name}.`,
            severity: "success",
            source: "Data",
          }),
          ...s.insights,
        ],
      };
    }),

  setSourceConnected: (id, connected) =>
    set((s) => ({ sources: s.sources.map((d) => (d.id === id ? { ...d, connected } : d)) })),

  setMessages: (messages) => set({ messages }),

  startNewChat: () => {
    const fresh = generateSessionId();
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(SESSION_STORAGE_KEY, fresh);
      } catch {
        // Ignore storage failures (e.g. private browsing) — the new
        // session id still works for this tab even if it won't persist.
      }
    }
    set({ sessionId: fresh, messages: [] });
  },

  sendMessage: (text) => {
    const trimmed = text.trim();
    if (!trimmed || get().thinking) return;

    // Any attempt to prompt the AI — including the suggestion chips and
    // "answer a question" replies, which both funnel through here — is
    // gated on being signed in. requireAuth() opens the Google sign-in
    // overlay itself when it isn't, so there's nothing else to do here.
    if (!useAuth.getState().requireAuth()) return;

    const history = get().messages;
    set((s) => ({
      messages: [...s.messages, { id: `u-${Date.now()}`, role: "user", text: trimmed }],
      thinking: true,
    }));

    const accessToken = useAuth.getState().accessToken;

    fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        message: trimmed,
        history,
        sessionId: get().sessionId,
        accessToken,
      }),
    })
      .then(async (res) => {
        if (res.status === 401) {
          useAuth.getState().openSignIn();
          throw new Error("sign_in_required");
        }
        if (!res.ok) throw new Error(`chat request failed (${res.status})`);
        return (await res.json()) as {
          reply: string;
          question: ChatMessage["question"] | null;
          trace?: ChatMessage["trace"];
          attachments?: ChatMessage["attachments"];
          analysis?: ChatMessage["analysis"] | null;
          proposedAction?: ChatMessage["proposedAction"] | null;
        };
      })
      .then((data) => {
        set((s) => ({
          messages: [
            ...s.messages,
            {
              id: `a-${Date.now()}`,
              role: "aduf",
              text: data.reply,
              ...(data.question ? { question: data.question } : {}),
              ...(data.trace?.length ? { trace: data.trace } : {}),
              ...(data.attachments?.length ? { attachments: data.attachments } : {}),
              ...(data.analysis ? { analysis: data.analysis } : {}),
              ...(data.proposedAction
                ? { proposedAction: data.proposedAction, proposedActionStatus: "pending" as const }
                : {}),
            },
          ],
          thinking: false,
        }));
      })
      .catch((err) => {
        if (err instanceof Error && err.message === "sign_in_required") {
          // Roll back the optimistic user turn — it never actually reached
          // ADUF, and the sign-in modal is already open.
          set((s) => ({ messages: s.messages.slice(0, -1), thinking: false }));
          return;
        }
        set((s) => ({
          messages: [
            ...s.messages,
            {
              id: `a-${Date.now()}`,
              role: "aduf",
              text: "Couldn't reach the brain just now — check your connection and try again.",
            },
          ],
          thinking: false,
        }));
      });
  },

  answerQuestion: (messageId, values, label) => {
    set((s) => ({
      messages: s.messages.map((m) => (m.id === messageId ? { ...m, answeredValues: values } : m)),
    }));
    get().sendMessage(label);
  },

  markInsightRead: (id) =>
    set((s) => ({
      insights: s.insights.map((i) => (i.id === id ? { ...i, read: true } : i)),
    })),

  markAllInsightsRead: () =>
    set((s) => ({ insights: s.insights.map((i) => ({ ...i, read: true })) })),

  dismissInsight: (id) => set((s) => ({ insights: s.insights.filter((i) => i.id !== id) })),

  approveProposedAction: (messageId) => {
    const message = get().messages.find((m) => m.id === messageId);
    const action = message?.proposedAction;
    if (!action || message?.proposedActionStatus !== "pending") return;

    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === messageId ? { ...m, proposedActionStatus: "approved" as const } : m,
      ),
    }));

    if (action.type === "create_goal") {
      // Same call the "New Goal" form makes — persists to Supabase and the
      // Goals page picks it up via the realtime subscription in
      // GoalsBootstrap, with no extra plumbing needed here.
      get().addGoal(action.title, action.target);
    } else if (action.type === "toggle_automation") {
      const current = get().automations.find((a) => a.id === action.channelId);
      if (current && current.enabled !== action.enabled) {
        get().toggleAutomation(action.channelId);
      }
    } else if (action.type === "create_automation") {
      // Inserts a real, brand-new automation — this is the path that was
      // entirely missing before: the agent could only toggle one of the 6
      // built-in channels, never create something new. The Grid page picks
      // it up automatically via its realtime subscription.
      get().createAutomation({
        name: action.name,
        trigger: action.trigger,
        action: action.action,
        goalTitle: action.goalTitle,
      });
    }
  },

  dismissProposedAction: (messageId) =>
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === messageId ? { ...m, proposedActionStatus: "dismissed" as const } : m,
      ),
    })),

  addScheduleEvent: (event) =>
    set((s) => ({
      scheduleEvents: [
        ...s.scheduleEvents,
        { ...event, id: `sched-${Date.now()}-${Math.round(Math.random() * 1e4)}`, done: false },
      ],
      insights: [
        makeInsight({
          title: `Scheduled: ${event.title}`,
          body: `Booked for ${event.day} ${event.startTime}–${event.endTime}. ADUF will remind you when it's close.`,
          severity: "info",
          source: "Schedule",
        }),
        ...s.insights,
      ],
    })),

  toggleScheduleEventDone: (id) =>
    set((s) => ({
      scheduleEvents: s.scheduleEvents.map((e) => (e.id === id ? { ...e, done: !e.done } : e)),
    })),

  removeScheduleEvent: (id) =>
    set((s) => ({ scheduleEvents: s.scheduleEvents.filter((e) => e.id !== id) })),
}));
