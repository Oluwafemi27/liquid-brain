import "@tanstack/react-start/server-only";
import { DEFAULT_WORKSPACE_ID, getSupabaseAdmin } from "./supabase";
import { isAdminEmail } from "./admin";
import { verifyAccessToken } from "./survey";

export interface DayCount {
  date: string; // YYYY-MM-DD
  count: number;
}

export interface AdminAnalytics {
  signupsByDay: DayCount[];
  chatMessagesByDay: DayCount[];
  automationOutcomes: { success: number; error: number };
  automationsByRuns: { name: string; runs: number }[];
  goalsStatus: { completed: number; inProgress: number; notStarted: number };
}

const TREND_DAYS = 14;

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

/** Builds the last `days` YYYY-MM-DD keys ending today, oldest first, so a
 *  day with zero events still shows as a 0 rather than a gap in the chart. */
function emptyTrend(days: number): DayCount[] {
  const out: DayCount[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    out.push({ date: d.toISOString().slice(0, 10), count: 0 });
  }
  return out;
}

function bucketByDay(timestamps: string[], days: number): DayCount[] {
  const trend = emptyTrend(days);
  const index = new Map(trend.map((t, i) => [t.date, i]));
  for (const ts of timestamps) {
    const i = index.get(dayKey(ts));
    if (i !== undefined) {
      const bucket = trend[i];
      if (bucket) bucket.count += 1;
    }
  }
  return trend;
}

/** Every number here is a real aggregate over existing Supabase rows — no
 *  synthetic time series or placeholder categories. Admin-only: re-verifies
 *  the access token and allowlist itself rather than trusting the caller. */
export async function getAdminAnalytics(accessToken: string): Promise<AdminAnalytics | null> {
  const requester = await verifyAccessToken(accessToken);
  if (!(await isAdminEmail(requester?.email))) return null;
  const db = getSupabaseAdmin();
  if (!db) return null;

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - (TREND_DAYS - 1));
  since.setUTCHours(0, 0, 0, 0);

  const [{ data: authData }, chatRows, runRows, automationRows, goalRows] = await Promise.all([
    db.auth.admin.listUsers({ perPage: 200 }),
    db
      .from("chat_messages")
      .select("created_at")
      .eq("workspace_id", DEFAULT_WORKSPACE_ID)
      .gte("created_at", since.toISOString()),
    db.from("automation_runs").select("status").eq("workspace_id", DEFAULT_WORKSPACE_ID),
    db
      .from("automations")
      .select("name, runs")
      .eq("workspace_id", DEFAULT_WORKSPACE_ID)
      .order("runs", { ascending: false })
      .limit(6),
    db.from("goals").select("current, target").eq("workspace_id", DEFAULT_WORKSPACE_ID),
  ]);

  const signups = (authData?.users ?? [])
    .map((u) => u.created_at)
    .filter((ts): ts is string => Boolean(ts));

  const chatTimestamps = ((chatRows.data ?? []) as Array<{ created_at: string }>).map(
    (r) => r.created_at,
  );

  const runStatuses = (runRows.data ?? []) as Array<{ status: "success" | "error" }>;
  const automationOutcomes = {
    success: runStatuses.filter((r) => r.status === "success").length,
    error: runStatuses.filter((r) => r.status === "error").length,
  };

  const automationsByRuns = ((automationRows.data ?? []) as Array<{ name: string; runs: number }>)
    .filter((a) => a.runs > 0)
    .map((a) => ({ name: a.name, runs: a.runs }));

  const goals = (goalRows.data ?? []) as Array<{ current: number; target: number }>;
  const pct = (g: { current: number; target: number }) =>
    g.target > 0 ? Math.min(999, Math.round((g.current / g.target) * 100)) : 0;
  const goalsStatus = {
    completed: goals.filter((g) => pct(g) >= 100).length,
    inProgress: goals.filter((g) => pct(g) > 0 && pct(g) < 100).length,
    notStarted: goals.filter((g) => pct(g) <= 0).length,
  };

  return {
    signupsByDay: bucketByDay(signups, TREND_DAYS),
    chatMessagesByDay: bucketByDay(chatTimestamps, TREND_DAYS),
    automationOutcomes,
    automationsByRuns,
    goalsStatus,
  };
}
