import "@tanstack/react-start/server-only";
import type { ActionStatus, ActionTier, ActivityItem } from "@/lib/aduf-types";
import { PLATFORM_NAMES } from "@/lib/permissions-catalog";
import { getSupabaseAdmin } from "./supabase";

/** Records something that happened on a platform / in ADUF. Never throws —
 *  logging must not break the thing being logged. */
export async function logEvent(
  userId: string,
  e: {
    platform: string;
    kind: ActivityItem["kind"];
    title: string;
    detail?: string;
    status?: ActivityItem["status"];
  },
): Promise<void> {
  const db = getSupabaseAdmin();
  if (!db) return;
  const { error } = await db.from("platform_events").insert({
    user_id: userId,
    platform: e.platform,
    kind: e.kind,
    title: e.title.slice(0, 200),
    detail: (e.detail ?? "").slice(0, 600),
    status: e.status ?? "info",
  });
  if (error) console.error("[activity] failed to log event", error.message);
}

const ACTION_VERB: Record<ActionStatus, string> = {
  proposed: "Suggested",
  auto_executed: "Did automatically",
  approved: "Approved",
  declined: "Declined",
  undone: "Undone",
  expired: "Expired",
  failed: "Failed",
};

/** Builds one readable line per ADUF action, including who decided. */
export function describeActionRow(r: {
  title: string;
  status: ActionStatus;
  tier: ActionTier;
  decidedBy: "auto" | "owner" | null;
  overLimit: boolean;
  error: string | null;
}): { title: string; detail: string; status: ActivityItem["status"] } {
  const title = `${ACTION_VERB[r.status]}: ${r.title}`;
  const who =
    r.status === "proposed"
      ? "Waiting for your approval"
      : r.status === "expired"
        ? "Nobody approved it in time, so it was dropped"
        : r.decidedBy === "auto"
          ? "Ran on its own (low-risk, internal only)"
          : r.decidedBy === "owner"
            ? r.status === "declined"
              ? "Declined by you"
              : "Approved by you"
            : "";
  const extra = r.overLimit ? " · Over your limit (approved anyway)" : "";
  const detail = r.status === "failed" && r.error ? `${r.error}` : `${who}${extra}`;
  return {
    title,
    detail,
    status:
      r.status === "failed"
        ? "error"
        : r.status === "proposed"
          ? "warn"
          : r.status === "undone"
            ? "info"
            : "ok",
  };
}

export async function listActivity(
  userId: string,
  opts: {
    platform?: string | undefined;
    status?: string | undefined;
    limit?: number;
    before?: string | undefined;
  } = {},
): Promise<ActivityItem[]> {
  const db = getSupabaseAdmin();
  if (!db) return [];
  const limit = Math.min(Math.max(opts.limit ?? 30, 1), 100);
  const platform = opts.platform && opts.platform !== "all" ? opts.platform : null;
  const before = opts.before ?? null;
  const items: ActivityItem[] = [];

  // 1. Platform events (syncs, health changes, messages, alerts, disconnects…)
  {
    let q = db
      .from("platform_events")
      .select("id, platform, kind, title, detail, status, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (platform) q = q.eq("platform", platform);
    if (before) q = q.lt("created_at", before);
    const { data } = await q;
    for (const r of data ?? []) {
      items.push({
        id: `e-${r["id"] as string}`,
        at: r["created_at"] as string,
        platform: r["platform"] as string,
        kind: r["kind"] as ActivityItem["kind"],
        title: r["title"] as string,
        detail: (r["detail"] as string) ?? "",
        status: r["status"] as ActivityItem["status"],
      });
    }
  }

  // 2. Imports — derived straight from the import ledger so history before this log existed still shows.
  {
    let q = db
      .from("data_imports")
      .select("id, source, kind, label, rows_imported, rows_skipped, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (platform) q = q.eq("source", platform);
    if (before) q = q.lt("created_at", before);
    const { data } = await q;
    for (const r of data ?? []) {
      const skipped = Number(r["rows_skipped"]);
      items.push({
        id: `i-${r["id"] as string}`,
        at: r["created_at"] as string,
        platform: r["source"] as string,
        kind: "import",
        title: `Imported ${Number(r["rows_imported"]).toLocaleString()} ${r["kind"] as string} record${Number(r["rows_imported"]) === 1 ? "" : "s"} from ${r["label"] as string}`,
        detail: skipped
          ? `${skipped} row${skipped === 1 ? "" : "s"} skipped (couldn't be read)`
          : "",
        status: skipped ? "warn" : "ok",
      });
    }
  }

  // 3. ADUF's own actions — suggestions, approvals, declines, undos.
  if (!platform || platform === "aduf") {
    let q = db
      .from("agent_actions")
      .select(
        "id, title, tier, status, decided_by, over_limit, error, undo_until, created_at, decided_at, undone_at",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (before) q = q.lt("created_at", before);
    const { data } = await q;
    const now = Date.now();
    for (const r of data ?? []) {
      const status = r["status"] as ActionStatus;
      const d = describeActionRow({
        title: r["title"] as string,
        status,
        tier: r["tier"] as ActionTier,
        decidedBy: (r["decided_by"] as "auto" | "owner" | null) ?? null,
        overLimit: Boolean(r["over_limit"]),
        error: (r["error"] as string | null) ?? null,
      });
      const undoUntil = (r["undo_until"] as string | null) ?? null;
      items.push({
        id: `a-${r["id"] as string}`,
        at:
          (r["undone_at"] as string | null) ??
          (r["decided_at"] as string | null) ??
          (r["created_at"] as string),
        platform: "aduf",
        kind: "action",
        title: d.title,
        detail: d.detail,
        status: d.status,
        action: {
          id: r["id"] as string,
          status,
          tier: r["tier"] as ActionTier,
          decidedBy: (r["decided_by"] as "auto" | "owner" | null) ?? null,
          undoUntil,
          canUndo:
            (status === "auto_executed" || status === "approved") &&
            undoUntil !== null &&
            new Date(undoUntil).getTime() > now,
        },
      });
    }
  }

  const wantStatus = opts.status && opts.status !== "all" ? opts.status : null;
  return items
    .filter((i) => !wantStatus || i.status === wantStatus)
    .sort((a, b) => (a.at < b.at ? 1 : -1))
    .slice(0, limit);
}

export const platformLabel = (id: string) => PLATFORM_NAMES[id] ?? id;
