import "@tanstack/react-start/server-only";
import type { Goal, SubTask } from "@/lib/aduf-types";
import { DEFAULT_WORKSPACE_ID, getSupabaseAdmin } from "./supabase";

interface GoalRow {
  id: string;
  title: string;
  target: number;
  current: number;
  currency: string;
  due: string;
  sub_tasks: SubTask[];
}

function fromRow(row: GoalRow): Goal {
  return {
    id: row.id,
    title: row.title,
    target: row.target,
    current: row.current,
    currency: row.currency,
    due: row.due,
    subTasks: row.sub_tasks ?? [],
  };
}

/** Every goal for the workspace, newest first. Returns [] if no backend is
 *  configured — the app runs fine without persistence, it just won't have
 *  goals survive a reload. */
export async function listGoals(): Promise<Goal[]> {
  const db = getSupabaseAdmin();
  if (!db) return [];

  const { data, error } = await db
    .from("goals")
    .select("id, title, target, current, currency, due, sub_tasks")
    .eq("workspace_id", DEFAULT_WORKSPACE_ID)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("[goals] failed to list goals", error);
    return [];
  }
  return (data ?? []).map(fromRow);
}

export async function createGoal(
  title: string,
  target: number,
  currency: string,
): Promise<Goal | null> {
  const db = getSupabaseAdmin();
  if (!db) return null;

  const { data, error } = await db
    .from("goals")
    .insert({ workspace_id: DEFAULT_WORKSPACE_ID, title, target, currency })
    .select("id, title, target, current, currency, due, sub_tasks")
    .single();
  if (error || !data) {
    console.error("[goals] failed to create goal", error);
    return null;
  }
  return fromRow(data);
}

/** Adds `amount` to a goal's current progress (clamped to >= 0). */
export async function bumpGoal(goalId: string, amount: number): Promise<Goal | null> {
  const db = getSupabaseAdmin();
  if (!db) return null;

  const { data: existing, error: readError } = await db
    .from("goals")
    .select("current")
    .eq("workspace_id", DEFAULT_WORKSPACE_ID)
    .eq("id", goalId)
    .single();
  if (readError || !existing) {
    console.error("[goals] failed to read goal before bump", readError);
    return null;
  }

  const nextCurrent = Math.max(0, Number(existing["current"]) + amount);
  const { data, error } = await db
    .from("goals")
    .update({ current: nextCurrent, updated_at: new Date().toISOString() })
    .eq("workspace_id", DEFAULT_WORKSPACE_ID)
    .eq("id", goalId)
    .select("id, title, target, current, currency, due, sub_tasks")
    .single();
  if (error || !data) {
    console.error("[goals] failed to bump goal", error);
    return null;
  }
  return fromRow(data);
}

/** Edits a goal's editable fields directly (title, target, currency, due
 *  date). Unlike bumpGoal, this sets values rather than adding to them —
 *  it's what the "Edit Plan" button on the Goals page calls. Only fields
 *  actually passed in are updated. */
export async function updateGoal(
  goalId: string,
  patch: { title?: string; target?: number; currency?: string; due?: string },
): Promise<Goal | null> {
  const db = getSupabaseAdmin();
  if (!db) return null;

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.title !== undefined) updates["title"] = patch.title;
  if (patch.target !== undefined) updates["target"] = patch.target;
  if (patch.currency !== undefined) updates["currency"] = patch.currency;
  if (patch.due !== undefined) updates["due"] = patch.due;

  const { data, error } = await db
    .from("goals")
    .update(updates)
    .eq("workspace_id", DEFAULT_WORKSPACE_ID)
    .eq("id", goalId)
    .select("id, title, target, current, currency, due, sub_tasks")
    .single();
  if (error || !data) {
    console.error("[goals] failed to update goal", error);
    return null;
  }
  return fromRow(data);
}

export async function toggleGoalSubTask(goalId: string, taskId: string): Promise<Goal | null> {
  const db = getSupabaseAdmin();
  if (!db) return null;

  const { data: existing, error: readError } = await db
    .from("goals")
    .select("sub_tasks")
    .eq("workspace_id", DEFAULT_WORKSPACE_ID)
    .eq("id", goalId)
    .single();
  if (readError || !existing) {
    console.error("[goals] failed to read goal before subtask toggle", readError);
    return null;
  }

  const subTasks: SubTask[] = (existing["sub_tasks"] as SubTask[]) ?? [];
  const nextSubTasks = subTasks.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t));

  const { data, error } = await db
    .from("goals")
    .update({ sub_tasks: nextSubTasks, updated_at: new Date().toISOString() })
    .eq("workspace_id", DEFAULT_WORKSPACE_ID)
    .eq("id", goalId)
    .select("id, title, target, current, currency, due, sub_tasks")
    .single();
  if (error || !data) {
    console.error("[goals] failed to toggle subtask", error);
    return null;
  }
  return fromRow(data);
}

export async function deleteGoal(goalId: string): Promise<boolean> {
  const db = getSupabaseAdmin();
  if (!db) return false;

  const { error } = await db
    .from("goals")
    .delete()
    .eq("workspace_id", DEFAULT_WORKSPACE_ID)
    .eq("id", goalId);
  if (error) {
    console.error("[goals] failed to delete goal", error);
    return false;
  }
  return true;
}
