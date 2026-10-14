import "@tanstack/react-start/server-only";
import type { AnalyticsSummary, ActivityMonth } from "@/lib/aduf-types";
import { getSupabaseAdmin } from "./supabase";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WINDOW_MONTHS = 6;

function emptySummary(): AnalyticsSummary {
  return {
    months: lastMonths().map((m) => ({ month: m.label, runs: 0, success: 0, failed: 0 })),
    totalRuns: 0,
    successRate: null,
    topAutomations: [],
    goals: { total: 0, completed: 0, avgProgress: 0 },
    generatedAt: new Date().toISOString(),
  };
}

/** The last WINDOW_MONTHS calendar months (UTC), oldest first. */
function lastMonths() {
  const now = new Date();
  const out: { key: string; label: string }[] = [];
  for (let i = WINDOW_MONTHS - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    out.push({
      key: `${d.getUTCFullYear()}-${d.getUTCMonth()}`,
      label: MONTHS[d.getUTCMonth()]!,
    });
  }
  return out;
}

/** Real analytics for one user, computed only from rows ADUF recorded:
 *  automation runs (count + success/failure — the run `value` column is
 *  deliberately ignored because it's a simulated stand-in) and goal
 *  progress. Returns an empty-but-well-formed summary with no backend. */
export async function getAnalyticsSummary(userId: string): Promise<AnalyticsSummary> {
  const db = getSupabaseAdmin();
  if (!db) return emptySummary();

  const months = lastMonths();
  const first = months[0]!;
  const [fy, fm] = first.key.split("-").map(Number) as [number, number];
  const since = new Date(Date.UTC(fy, fm, 1)).toISOString();

  const [runsRes, automationsRes, goalsRes] = await Promise.all([
    db
      .from("automation_runs")
      .select("automation_id, started_at, status")
      .eq("user_id", userId)
      .gte("started_at", since)
      .limit(10000),
    db.from("automations").select("id, name").eq("user_id", userId),
    db.from("goals").select("target, current").eq("user_id", userId),
  ]);
  if (runsRes.error) console.error("[analytics] runs query failed", runsRes.error);
  if (automationsRes.error)
    console.error("[analytics] automations query failed", automationsRes.error);
  if (goalsRes.error) console.error("[analytics] goals query failed", goalsRes.error);

  const buckets = new Map<string, ActivityMonth>(
    months.map((m) => [m.key, { month: m.label, runs: 0, success: 0, failed: 0 }]),
  );
  const perAutomation = new Map<string, { runs: number; failed: number }>();
  let success = 0;
  let total = 0;

  for (const row of runsRes.data ?? []) {
    const d = new Date(row["started_at"] as string);
    const bucket = buckets.get(`${d.getUTCFullYear()}-${d.getUTCMonth()}`);
    if (!bucket) continue;
    const ok = row["status"] === "success";
    bucket.runs += 1;
    if (ok) bucket.success += 1;
    else bucket.failed += 1;
    total += 1;
    if (ok) success += 1;
    const id = row["automation_id"] as string;
    const agg = perAutomation.get(id) ?? { runs: 0, failed: 0 };
    agg.runs += 1;
    if (!ok) agg.failed += 1;
    perAutomation.set(id, agg);
  }

  const names = new Map(
    (automationsRes.data ?? []).map((a) => [a["id"] as string, a["name"] as string]),
  );
  const topAutomations = [...perAutomation.entries()]
    .map(([id, v]) => ({ id, name: names.get(id) ?? "Removed automation", ...v }))
    .sort((a, b) => b.runs - a.runs)
    .slice(0, 6);

  const goals = goalsRes.data ?? [];
  const progress = goals.map((g) => {
    const target = Number(g["target"]);
    return target > 0 ? Math.min(100, (Number(g["current"]) / target) * 100) : 0;
  });

  return {
    months: [...buckets.values()],
    totalRuns: total,
    successRate: total > 0 ? Math.round((success / total) * 100) : null,
    topAutomations,
    goals: {
      total: goals.length,
      completed: progress.filter((p) => p >= 100).length,
      avgProgress: progress.length
        ? Math.round(progress.reduce((a, b) => a + b, 0) / progress.length)
        : 0,
    },
    generatedAt: new Date().toISOString(),
  };
}
