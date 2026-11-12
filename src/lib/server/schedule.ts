import "@tanstack/react-start/server-only";
import type { ScheduleCategory, ScheduleEvent, Weekday } from "@/lib/aduf-types";
import { getSupabaseAdmin } from "./supabase";

interface ScheduleEventRow {
  id: string;
  title: string;
  day: Weekday;
  start_time: string;
  end_time: string;
  category: ScheduleCategory;
  notes: string;
  done: boolean;
}

const SELECT_COLUMNS = "id, title, day, start_time, end_time, category, notes, done";

function fromRow(row: ScheduleEventRow): ScheduleEvent {
  return {
    id: row.id,
    title: row.title,
    day: row.day,
    startTime: row.start_time,
    endTime: row.end_time,
    category: row.category,
    notes: row.notes,
    done: row.done,
  };
}

/** Every event belonging to this user. Returns [] if no backend is
 *  configured — the app runs fine without persistence, the week just
 *  won't survive a reload. */
export async function listScheduleEvents(userId: string): Promise<ScheduleEvent[]> {
  const db = getSupabaseAdmin();
  if (!db) return [];

  const { data, error } = await db
    .from("schedule_events")
    .select(SELECT_COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("[schedule] failed to list schedule events", error);
    return [];
  }
  return (data ?? []).map(fromRow);
}

export async function createScheduleEvent(
  userId: string,
  input: {
    title: string;
    day: Weekday;
    startTime: string;
    endTime: string;
    category: ScheduleCategory;
    notes: string;
  },
): Promise<ScheduleEvent | null> {
  const db = getSupabaseAdmin();
  if (!db) return null;

  const { data, error } = await db
    .from("schedule_events")
    .insert({
      user_id: userId,
      title: input.title,
      day: input.day,
      start_time: input.startTime,
      end_time: input.endTime,
      category: input.category,
      notes: input.notes,
    })
    .select(SELECT_COLUMNS)
    .single();
  if (error || !data) {
    console.error("[schedule] failed to create schedule event", error);
    return null;
  }
  return fromRow(data);
}

export async function toggleScheduleEventDone(
  userId: string,
  id: string,
): Promise<ScheduleEvent | null> {
  const db = getSupabaseAdmin();
  if (!db) return null;

  const { data: existing, error: readError } = await db
    .from("schedule_events")
    .select("done")
    .eq("user_id", userId)
    .eq("id", id)
    .single();
  if (readError || !existing) {
    console.error("[schedule] failed to read event before toggle", readError);
    return null;
  }

  const { data, error } = await db
    .from("schedule_events")
    .update({ done: !existing["done"], updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("id", id)
    .select(SELECT_COLUMNS)
    .single();
  if (error || !data) {
    console.error("[schedule] failed to toggle event done", error);
    return null;
  }
  return fromRow(data);
}

export async function deleteScheduleEvent(userId: string, id: string): Promise<boolean> {
  const db = getSupabaseAdmin();
  if (!db) return false;

  const { error } = await db.from("schedule_events").delete().eq("user_id", userId).eq("id", id);
  if (error) {
    console.error("[schedule] failed to delete schedule event", error);
    return false;
  }
  return true;
}
