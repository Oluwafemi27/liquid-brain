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
import {
  initialAutomations,
  initialDataSources,
  initialInsights,
  initialScheduleEvents,
  noBackendReply,
} from "@/lib/initial-data";

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
  insights: Insight[];
  scheduleEvents: ScheduleEvent[];
  setUserName: (name: string) => void;
  toggleAutomation: (id: ChannelId) => void;
  toggleSubTask: (goalId: string, taskId: string) => void;
  bumpGoal: (goalId: string, amount: number) => void;
  addGoal: (title: string, target: number) => void;
  connectSource: (id: string) => void;
  sendMessage: (text: string) => void;
  markInsightRead: (id: string) => void;
  markAllInsightsRead: () => void;
  dismissInsight: (id: string) => void;
  addScheduleEvent: (event: Omit<ScheduleEvent, "id" | "done">) => void;
  toggleScheduleEventDone: (id: string) => void;
  removeScheduleEvent: (id: string) => void;
}

const previewMemoryNodes: MemoryNode[] = [
  { id: "aduf", label: "ADUF", group: "core", facts: 1248, x: 50, y: 50 },
  { id: "customers", label: "Customers", group: "customers", facts: 486, x: 23, y: 28 },
  { id: "repeat-buyers", label: "Repeat buyers", group: "customers", facts: 184, x: 17, y: 67 },
  { id: "catalog", label: "Product catalog", group: "products", facts: 312, x: 72, y: 24 },
  { id: "best-sellers", label: "Best sellers", group: "products", facts: 96, x: 84, y: 55 },
  { id: "sales", label: "Sales", group: "revenue", facts: 228, x: 76, y: 75 },
  { id: "checkout", label: "Checkout", group: "revenue", facts: 74, x: 45, y: 87 },
  { id: "website", label: "Website traffic", group: "traffic", facts: 268, x: 25, y: 78 },
];

const previewMemoryEdges: MemoryEdge[] = [
  { from: "aduf", to: "customers" },
  { from: "aduf", to: "catalog" },
  { from: "aduf", to: "sales" },
  { from: "aduf", to: "website" },
  { from: "customers", to: "repeat-buyers" },
  { from: "catalog", to: "best-sellers" },
  { from: "best-sellers", to: "sales" },
  { from: "website", to: "checkout" },
  { from: "checkout", to: "sales" },
];

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
  automations: initialAutomations,
  memoryNodes: previewMemoryNodes,
  memoryEdges: previewMemoryEdges,
  sources: initialDataSources.map((source) => ({
    ...source,
    connected: ["shopify", "ga", "paystack"].includes(source.id),
  })),
  messages: [],
  thinking: false,
  insights: initialInsights,
  scheduleEvents: initialScheduleEvents,

  setUserName: (name) => set({ userName: name }),

  toggleAutomation: (id) =>
    set((s) => {
      const automations = s.automations.map((a) =>
        a.id === id ? { ...a, enabled: !a.enabled } : a,
      );
      const a = automations.find((x) => x.id === id);
      if (!a) return { automations };
      const insight = makeInsight({
        title: a.enabled ? `${a.name} automation turned on` : `${a.name} automation paused`,
        body: a.enabled
          ? `ADUF is now running the ${a.name} automation and will report results here.`
          : `${a.name} automation is paused — double-tap its node in the Command Center to resume.`,
        severity: a.enabled ? "success" : "info",
        source: "Automations",
      });
      return { automations, insights: [insight, ...s.insights] };
    }),

  toggleSubTask: (goalId, taskId) =>
    set((s) => ({
      goals: s.goals.map((g) =>
        g.id === goalId
          ? {
              ...g,
              subTasks: g.subTasks.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t)),
            }
          : g,
      ),
    })),

  bumpGoal: (goalId, amount) =>
    set((s) => {
      const before = s.goals.find((g) => g.id === goalId);
      const goals = s.goals.map((g) =>
        g.id === goalId ? { ...g, current: Math.min(g.target, g.current + amount) } : g,
      );
      const after = goals.find((g) => g.id === goalId);
      let insights = s.insights;
      if (before && after && before.current < before.target && after.current >= after.target) {
        insights = [
          makeInsight({
            title: `Goal reached: ${after.title}`,
            body: `You hit your target of ${after.currency}${after.target.toLocaleString()}. Nice work.`,
            severity: "success",
            source: "Goals",
          }),
          ...s.insights,
        ];
      }
      return { goals, insights };
    }),

  addGoal: (title, target) =>
    set((s) => ({
      goals: [
        ...s.goals,
        {
          id: `goal-${Date.now()}`,
          title,
          target,
          current: 0,
          currency: "₦",
          due: "Not set",
          subTasks: [],
        },
      ],
      insights: [
        makeInsight({
          title: `New goal set: ${title}`,
          body: `ADUF will track progress toward this goal and flag anything worth knowing here.`,
          severity: "info",
          source: "Goals",
        }),
        ...s.insights,
      ],
    })),

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

  sendMessage: (text) => {
    const trimmed = text.trim();
    if (!trimmed || get().thinking) return;
    set((s) => ({
      messages: [...s.messages, { id: `u-${Date.now()}`, role: "user", text: trimmed }],
      thinking: true,
    }));
    setTimeout(() => {
      set((s) => ({
        messages: [...s.messages, { id: `a-${Date.now()}`, role: "aduf", text: noBackendReply }],
        thinking: false,
      }));
    }, 900);
  },

  markInsightRead: (id) =>
    set((s) => ({
      insights: s.insights.map((i) => (i.id === id ? { ...i, read: true } : i)),
    })),

  markAllInsightsRead: () =>
    set((s) => ({ insights: s.insights.map((i) => ({ ...i, read: true })) })),

  dismissInsight: (id) =>
    set((s) => ({ insights: s.insights.filter((i) => i.id !== id) })),

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
      scheduleEvents: s.scheduleEvents.map((e) =>
        e.id === id ? { ...e, done: !e.done } : e,
      ),
    })),

  removeScheduleEvent: (id) =>
    set((s) => ({ scheduleEvents: s.scheduleEvents.filter((e) => e.id !== id) })),
}));
