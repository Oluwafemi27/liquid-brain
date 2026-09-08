import "@tanstack/react-start/server-only";
import type { Insight, InsightSeverity } from "@/lib/aduf-types";
import { DEFAULT_WORKSPACE_ID, getSupabaseAdmin } from "./supabase";

interface InsightRow {
  id: string;
  title: string;
  body: string;
  severity: InsightSeverity;
  source: string;
  read: boolean;
  created_at: string;
}

const SELECT_COLUMNS = "id, title, body, severity, source, read, created_at";

function fromRow(row: InsightRow): Insight {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    severity: row.severity,
    source: row.source,
    read: row.read,
    createdAt: new Date(row.created_at).getTime(),
  };
}

/** Every insight for the workspace, newest first. Returns [] if no backend
 *  is configured — the app runs fine without persistence, notifications
 *  just won't survive a reload. */
export async function listInsights(): Promise<Insight[]> {
  const db = getSupabaseAdmin();
  if (!db) return [];

  const { data, error } = await db
    .from("insights")
    .select(SELECT_COLUMNS)
    .eq("workspace_id", DEFAULT_WORKSPACE_ID)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[insights] failed to list insights", error);
    return [];
  }
  return (data ?? []).map(fromRow);
}

/** Logs a new insight to the feed. Called from every place in the app that
 *  used to splice a locally-generated insight into Zustand directly (goal
 *  hit, automation ran, source connected, workflow deployed, event
 *  scheduled, ...) — now every one of those goes through here so the
 *  Notifications page (and any other open tab/device) picks it up via the
 *  realtime subscription in NotificationsBootstrap. */
export async function createInsight(input: {
  title: string;
  body: string;
  severity: InsightSeverity;
  source: string;
}): Promise<Insight | null> {
  const db = getSupabaseAdmin();
  if (!db) return null;

  const { data, error } = await db
    .from("insights")
    .insert({
      workspace_id: DEFAULT_WORKSPACE_ID,
      title: input.title,
      body: input.body,
      severity: input.severity,
      source: input.source,
    })
    .select(SELECT_COLUMNS)
    .single();
  if (error || !data) {
    console.error("[insights] failed to create insight", error);
    return null;
  }
  return fromRow(data);
}

export async function markInsightRead(id: string): Promise<Insight | null> {
  const db = getSupabaseAdmin();
  if (!db) return null;

  const { data, error } = await db
    .from("insights")
    .update({ read: true })
    .eq("workspace_id", DEFAULT_WORKSPACE_ID)
    .eq("id", id)
    .select(SELECT_COLUMNS)
    .single();
  if (error || !data) {
    console.error("[insights] failed to mark insight read", error);
    return null;
  }
  return fromRow(data);
}

export async function markAllInsightsRead(): Promise<boolean> {
  const db = getSupabaseAdmin();
  if (!db) return false;

  const { error } = await db
    .from("insights")
    .update({ read: true })
    .eq("workspace_id", DEFAULT_WORKSPACE_ID)
    .eq("read", false);
  if (error) {
    console.error("[insights] failed to mark all insights read", error);
    return false;
  }
  return true;
}

export async function dismissInsight(id: string): Promise<boolean> {
  const db = getSupabaseAdmin();
  if (!db) return false;

  const { error } = await db
    .from("insights")
    .delete()
    .eq("workspace_id", DEFAULT_WORKSPACE_ID)
    .eq("id", id);
  if (error) {
    console.error("[insights] failed to dismiss insight", error);
    return false;
  }
  return true;
}
