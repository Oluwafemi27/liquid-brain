import type { DataSource, Insight, ScheduleEvent } from "./aduf-types";
import { CONNECTORS } from "./connector-registry";

// Empty/neutral starting state for a fresh account — no fabricated business
// numbers. Swap the getters that read this for real fetches against the
// FastAPI backend when it lands; the shapes are already the DTOs.

/** Data sources ADUF can connect to. A product catalog, not business data —
 *  every account starts fully disconnected. */
export const initialDataSources: DataSource[] = CONNECTORS.map((c) => ({
  id: c.id,
  name: c.name,
  category: c.category,
  connected: false,
}));

/** Fresh accounts start with an empty week — no fabricated meetings. */
export const initialScheduleEvents: ScheduleEvent[] = [];

/** Shown once if the user messages Brain Chat before a backend is connected. */
export const noBackendReply =
  "I'm not connected to a live backend yet, so I can't answer that. Once ADUF is wired up to your data, I'll reply here for real.";

/** Notifications start empty and fill only from real events (loaded from the database on sign-in). */
export const initialInsights: Insight[] = [];
