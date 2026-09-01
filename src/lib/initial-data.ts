import type { Automation, ChannelId, DataSource, Insight, ScheduleEvent } from "./aduf-types";

// Empty/neutral starting state for a fresh account — no fabricated business
// numbers. Swap the getters that read this for real fetches against the
// FastAPI backend when it lands; the shapes are already the DTOs.

/** The six channels ADUF can automate. Structural (part of the product's
 *  fixed feature set), not business data — every account starts with all
 *  six present but disconnected and unconfigured. */
export const initialAutomations: Automation[] = (
  [
    ["website", "Website"],
    ["whatsapp", "WhatsApp"],
    ["crm", "CRM"],
    ["payments", "Payments"],
    ["ads", "Ads"],
    ["email", "Email"],
  ] as [ChannelId, string][]
).map(([id, name]) => ({
  id,
  name,
  enabled: false,
  trigger: "Not configured yet",
  action: "Not configured yet",
  goal: "",
  runs: 0,
}));

/** Data sources ADUF can connect to. A product catalog, not business data —
 *  every account starts fully disconnected. */
export const initialDataSources: DataSource[] = [
  { id: "shopify", name: "Shopify", category: "Commerce", connected: false },
  { id: "ga", name: "Google Analytics", category: "Traffic", connected: false },
  { id: "whatsapp", name: "WhatsApp Business", category: "Messaging", connected: false },
  { id: "paystack", name: "Paystack", category: "Payments", connected: false },
  { id: "meta", name: "Meta Ads", category: "Advertising", connected: false },
  { id: "sheets", name: "Google Sheets", category: "Ops", connected: false },
];

/** Fresh accounts start with an empty week — no fabricated meetings. */
export const initialScheduleEvents: ScheduleEvent[] = [];

/** Shown once if the user messages Brain Chat before a backend is connected. */
export const noBackendReply =
  "I'm not connected to a live backend yet, so I can't answer that. Once ADUF is wired up to your data, I'll reply here for real.";

/** The one insight every fresh account starts with — onboarding guidance,
 *  not a fabricated business figure. Everything after this is generated
 *  live from real state changes (an automation flipped on, a goal hit). */
export const initialInsights: Insight[] = [
  {
    id: "welcome",
    title: "Welcome to ADUF",
    body: "Connect a data source or set your first goal and I'll start surfacing real insights here as things happen.",
    severity: "info",
    source: "ADUF",
    createdAt: Date.now(),
    read: false,
  },
];
