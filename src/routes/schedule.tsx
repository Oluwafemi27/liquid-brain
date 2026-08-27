import { createFileRoute } from "@tanstack/react-router";
import { addDays, format, startOfWeek } from "date-fns";
import { motion } from "framer-motion";
import {
  CalendarClock,
  Check,
  Clock,
  Megaphone,
  PenLine,
  Phone,
  Plus,
  Trash2,
  Users,
  Waves,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell, PageHeader } from "@/components/aduf/app-shell";
import { GlassCard } from "@/components/aduf/liquid";
import { cn } from "@/lib/utils";
import type { ScheduleCategory, ScheduleEvent, Weekday } from "@/lib/aduf-types";
import { useAduf } from "@/store/aduf-store";

export const Route = createFileRoute("/schedule")({
  head: () => ({
    meta: [
      { title: "Schedule — ADUF AI" },
      {
        name: "description",
        content:
          "Plan your business week — meetings, content, campaigns and automations — laid out by day and time.",
      },
      { property: "og:title", content: "Schedule — ADUF AI" },
      {
        property: "og:description",
        content: "A day-by-day, time-blocked schedule for everything ADUF is helping you run.",
      },
    ],
  }),
  component: SchedulePage,
});

const WEEKDAYS: Weekday[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const CATEGORY_META: Record<
  ScheduleCategory,
  { label: string; color: string; icon: LucideIcon }
> = {
  meeting: { label: "Meeting", color: "var(--chart-2)", icon: Users },
  content: { label: "Content", color: "var(--chart-3)", icon: PenLine },
  campaign: { label: "Campaign", color: "var(--chart-1)", icon: Megaphone },
  automation: { label: "Automation", color: "var(--cyan)", icon: Waves },
  followup: { label: "Follow-up", color: "var(--chart-4)", icon: Phone },
  other: { label: "Other", color: "var(--chart-5)", icon: CalendarClock },
};

/** "14:05" -> "2:05 PM" */
function formatTime(t: string) {
  const [hStr, mStr] = t.split(":");
  let h = Number(hStr);
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${(mStr ?? "00").padStart(2, "0")} ${ampm}`;
}

function minutesOf(t: string) {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

const inputClass =
  "min-w-0 rounded-full bg-white/8 px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring [color-scheme:dark]";

function SchedulePage() {
  const { scheduleEvents, addScheduleEvent, toggleScheduleEventDone, removeScheduleEvent } =
    useAduf();

  const weekStart = useMemo(() => startOfWeek(new Date(), { weekStartsOn: 1 }), []);
  const weekDates = useMemo(
    () => WEEKDAYS.map((_, i) => addDays(weekStart, i)),
    [weekStart],
  );
  const todayLabel = format(new Date(), "EEE") as Weekday;

  const [selectedDay, setSelectedDay] = useState<Weekday>(todayLabel);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [day, setDay] = useState<Weekday>(todayLabel);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [category, setCategory] = useState<ScheduleCategory>("meeting");
  const [notes, setNotes] = useState("");

  const eventsByDay = useMemo(() => {
    const map = new Map<Weekday, ScheduleEvent[]>();
    for (const d of WEEKDAYS) map.set(d, []);
    for (const e of scheduleEvents) map.get(e.day)?.push(e);
    for (const d of WEEKDAYS) map.get(d)?.sort((a, b) => minutesOf(a.startTime) - minutesOf(b.startTime));
    return map;
  }, [scheduleEvents]);

  const dayEvents = eventsByDay.get(selectedDay) ?? [];

  /** Nearest upcoming event across the whole week from right now. */
  const upNext = useMemo(() => {
    if (scheduleEvents.length === 0) return null;
    const todayIdx = WEEKDAYS.indexOf(todayLabel);
    const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
    let best: { event: ScheduleEvent; rank: number } | null = null;
    for (const e of scheduleEvents) {
      if (e.done) continue;
      const idx = WEEKDAYS.indexOf(e.day);
      let daysAhead = (idx - todayIdx + 7) % 7;
      if (daysAhead === 0 && minutesOf(e.startTime) < nowMinutes) daysAhead = 7;
      const rank = daysAhead * 1440 + minutesOf(e.startTime);
      if (!best || rank < best.rank) best = { event: e, rank };
    }
    return best?.event ?? null;
  }, [scheduleEvents, todayLabel]);

  function resetForm() {
    setTitle("");
    setNotes("");
    setDay(selectedDay);
    setStartTime("09:00");
    setEndTime("10:00");
    setCategory("meeting");
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:py-8">
        <PageHeader eyebrow="Schedule" title="Your Week">
          <button
            onClick={() => {
              setDay(selectedDay);
              setCreating((c) => !c);
            }}
            className="flex items-center gap-1.5 rounded-full px-4 py-2.5 text-xs font-medium text-background transition-transform hover:scale-[1.03]"
            style={{ background: "var(--gradient-accent)" }}
          >
            <Plus className={cn("h-4 w-4 transition-transform", creating && "rotate-45")} />
            New Event
          </button>
        </PageHeader>

        {creating ? (
          <GlassCard hover={false} className="mb-6">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!title.trim() || !startTime || !endTime) return;
                addScheduleEvent({
                  title: title.trim(),
                  day,
                  startTime,
                  endTime,
                  category,
                  notes: notes.trim(),
                });
                resetForm();
                setCreating(false);
              }}
              className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6"
            >
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. WhatsApp campaign review"
                className={cn(inputClass, "sm:col-span-2 lg:col-span-2")}
              />
              <select
                value={day}
                onChange={(e) => setDay(e.target.value as Weekday)}
                className={inputClass}
              >
                {WEEKDAYS.map((d) => (
                  <option key={d} value={d} className="bg-[oklch(0.19_0.02_258)]">
                    {d}
                  </option>
                ))}
              </select>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className={inputClass}
              />
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className={inputClass}
              />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ScheduleCategory)}
                className={inputClass}
              >
                {(Object.keys(CATEGORY_META) as ScheduleCategory[]).map((c) => (
                  <option key={c} value={c} className="bg-[oklch(0.19_0.02_258)]">
                    {CATEGORY_META[c].label}
                  </option>
                ))}
              </select>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes (optional)"
                className={cn(inputClass, "sm:col-span-2 lg:col-span-5")}
              />
              <button
                type="submit"
                className="rounded-full px-5 py-2.5 text-xs font-medium text-background"
                style={{ background: "var(--gradient-accent)" }}
              >
                Add to schedule
              </button>
            </form>
          </GlassCard>
        ) : null}

        {upNext ? (
          <GlassCard hover={false} className="mb-6 flex items-center gap-4">
            <div
              className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl"
              style={{ background: "var(--gradient-accent)" }}
            >
              <Clock className="h-5 w-5 text-background" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Up next
              </p>
              <p className="truncate text-sm font-semibold">{upNext.title}</p>
            </div>
            <p className="shrink-0 text-xs text-muted-foreground">
              {upNext.day} · {formatTime(upNext.startTime)}
            </p>
          </GlassCard>
        ) : null}

        {/* Week strip — day + date tabs */}
        <GlassCard hover={false} className="mb-6 overflow-x-auto p-2 sm:p-3">
          <div className="grid min-w-[560px] grid-cols-7 gap-1.5 sm:gap-2">
            {WEEKDAYS.map((d, i) => {
              const date = weekDates[i];
              const count = eventsByDay.get(d)?.length ?? 0;
              const isToday = d === todayLabel;
              const isSelected = d === selectedDay;
              return (
                <button
                  key={d}
                  onClick={() => setSelectedDay(d)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-2xl px-2 py-3 text-center transition-colors",
                    isSelected
                      ? "bg-white/12 text-foreground shadow-[var(--glow-cyan)]"
                      : "text-muted-foreground hover:bg-white/8 hover:text-foreground",
                  )}
                >
                  <span className="text-[10px] uppercase tracking-wider">{d}</span>
                  <span
                    className={cn(
                      "grid h-7 w-7 place-items-center rounded-full font-display text-xs font-semibold",
                      isToday && "text-background",
                    )}
                    style={isToday ? { background: "var(--gradient-accent)" } : undefined}
                  >
                    {date ? format(date, "d") : ""}
                  </span>
                  <span className="text-[9px] text-muted-foreground">
                    {count > 0 ? `${count} event${count > 1 ? "s" : ""}` : "—"}
                  </span>
                </button>
              );
            })}
          </div>
        </GlassCard>

        {/* Selected day agenda */}
        <GlassCard hover={false} className="p-0">
          <div className="flex items-center justify-between gap-3 border-b border-border p-5">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                {selectedDay === todayLabel ? "Today" : "Agenda"}
              </p>
              <h2 className="mt-0.5 text-base font-semibold">
                {selectedDay}
                {weekDates[WEEKDAYS.indexOf(selectedDay)]
                  ? `, ${format(weekDates[WEEKDAYS.indexOf(selectedDay)]!, "MMMM d")}`
                  : ""}
              </h2>
            </div>
            <span className="glass rounded-full px-3 py-1 text-[10px] text-muted-foreground">
              {dayEvents.length} scheduled
            </span>
          </div>

          {dayEvents.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
              <p className="text-sm text-muted-foreground">Nothing on {selectedDay} yet.</p>
              <button
                onClick={() => {
                  setDay(selectedDay);
                  setCreating(true);
                }}
                className="rounded-full px-4 py-2 text-xs font-medium text-background"
                style={{ background: "var(--gradient-accent)" }}
              >
                Add an event
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {dayEvents.map((e, i) => {
                const meta = CATEGORY_META[e.category];
                const Icon = meta.icon;
                return (
                  <motion.li
                    key={e.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.03 }}
                    className="flex items-start gap-3 p-4 sm:gap-4 sm:p-5"
                  >
                    <div className="w-16 shrink-0 pt-0.5 text-right sm:w-20">
                      <p className="text-xs font-medium tabular-nums">
                        {formatTime(e.startTime)}
                      </p>
                      <p className="text-[10px] text-muted-foreground tabular-nums">
                        {formatTime(e.endTime)}
                      </p>
                    </div>

                    <div
                      className="mt-1 h-full w-px shrink-0 self-stretch rounded-full"
                      style={{ background: "var(--border)" }}
                      aria-hidden
                    />

                    <div
                      className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl"
                      style={{
                        background: `color-mix(in oklab, ${meta.color} 22%, transparent)`,
                      }}
                    >
                      <Icon className="h-4 w-4" style={{ color: meta.color }} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "truncate text-sm font-medium",
                          e.done && "text-muted-foreground line-through",
                        )}
                      >
                        {e.title}
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2">
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                          style={{
                            background: `color-mix(in oklab, ${meta.color} 16%, transparent)`,
                            color: meta.color,
                          }}
                        >
                          {meta.label}
                        </span>
                        {e.notes ? (
                          <span className="truncate text-[11px] text-muted-foreground">
                            {e.notes}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        onClick={() => toggleScheduleEventDone(e.id)}
                        aria-label={e.done ? "Mark as not done" : "Mark as done"}
                        className={cn(
                          "grid h-8 w-8 place-items-center rounded-full border transition-colors",
                          e.done
                            ? "border-cyan/50 bg-cyan/15 text-cyan"
                            : "border-border text-muted-foreground hover:bg-white/8 hover:text-foreground",
                        )}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => removeScheduleEvent(e.id)}
                        aria-label="Delete event"
                        className="grid h-8 w-8 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </motion.li>
                );
              })}
            </ul>
          )}
        </GlassCard>
      </div>
    </AppShell>
  );
}
