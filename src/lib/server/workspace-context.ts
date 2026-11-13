import "@tanstack/react-start/server-only";
import { listGoals } from "./goals";
import { listScheduleEvents } from "./schedule";

/** The signed-in owner's own goals and Schedule events, with ids, so ADUF can edit or remove the right one
 *  instead of guessing. Built only from this user's rows (every query is scoped to their id). */
export async function workspaceContext(userId: string): Promise<string | undefined> {
  const [goals, events] = await Promise.all([listGoals(userId), listScheduleEvents(userId)]);
  if (goals.length === 0 && events.length === 0) return undefined;
  const g = goals
    .slice(0, 30)
    .map(
      (x) =>
        `- goalId ${x.id}: “${x.title}” ${x.current}/${x.target}${x.currency ? ` ${x.currency}` : ""}`,
    );
  const e = events
    .slice(0, 40)
    .map(
      (x) =>
        `- eventId ${x.id}: “${x.title}” ${x.day} ${x.startTime}–${x.endTime}${x.done ? " (done)" : ""}`,
    );
  return [
    "=== Your goals and schedule (this owner only; use these ids for update_goal, delete_goal, update_event, delete_event) ===",
    g.length ? `Goals:\n${g.join("\n")}` : "Goals: none yet.",
    e.length ? `Schedule events:\n${e.join("\n")}` : "Schedule: empty.",
  ].join("\n");
}
