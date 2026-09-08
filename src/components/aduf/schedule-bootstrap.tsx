import { useEffect } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { fetchScheduleEventsFn } from "@/lib/server-fns";
import { useAduf } from "@/store/aduf-store";
import type { ScheduleCategory, Weekday } from "@/lib/aduf-types";

/** Raw shape of a Supabase realtime row for `schedule_events`. */
interface ScheduleEventRealtimeRow {
  id: string;
  title: string;
  day: Weekday;
  start_time: string;
  end_time: string;
  category: ScheduleCategory;
  notes: string;
  done: boolean;
}

/** Mounted once in AppShell. Loads the week's events from Supabase on first
 *  render, then keeps them live via Supabase Realtime — any event added,
 *  completed, or removed (from this tab, another tab, or another session)
 *  is reflected here within moments, no manual refetch needed. Renders
 *  nothing. */
export function ScheduleBootstrap() {
  const { setScheduleEvents, upsertScheduleEvent, removeScheduleEvent } = useAduf();

  useEffect(() => {
    let cancelled = false;
    fetchScheduleEventsFn()
      .then((events) => {
        if (!cancelled) setScheduleEvents(events);
      })
      .catch(() => {
        // No backend configured yet — events stay whatever local state has.
      });
    return () => {
      cancelled = true;
    };
  }, [setScheduleEvents]);

  useEffect(() => {
    const client = getSupabaseBrowser();
    if (!client) return;

    const channel = client
      .channel("schedule-events-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "schedule_events" },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const oldId = (payload.old as { id?: string })["id"];
            if (oldId) removeScheduleEvent(oldId);
            return;
          }
          const row = payload.new as ScheduleEventRealtimeRow;
          upsertScheduleEvent({
            id: row.id,
            title: row.title,
            day: row.day,
            startTime: row.start_time,
            endTime: row.end_time,
            category: row.category,
            notes: row.notes,
            done: row.done,
          });
        },
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [upsertScheduleEvent, removeScheduleEvent]);

  return null;
}
