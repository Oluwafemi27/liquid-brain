import { createServerFn } from "@tanstack/react-start";
import { getConnectorStatuses } from "@/lib/server/connectors";
import { bumpGoal, createGoal, deleteGoal, listGoals, toggleGoalSubTask } from "@/lib/server/goals";
import { getSurvey, saveSurvey, verifyAccessToken, type BusinessSurvey } from "@/lib/server/survey";

export const fetchConnectorStatuses = createServerFn({ method: "GET" }).handler(async () => {
  return getConnectorStatuses();
});

export const fetchGoals = createServerFn({ method: "GET" }).handler(async () => {
  return listGoals();
});

export const createGoalFn = createServerFn({ method: "POST" })
  .validator((data: { title: string; target: number; currency: string }) => data)
  .handler(async ({ data }) => {
    return createGoal(data.title, data.target, data.currency);
  });

export const bumpGoalFn = createServerFn({ method: "POST" })
  .validator((data: { goalId: string; amount: number }) => data)
  .handler(async ({ data }) => {
    return bumpGoal(data.goalId, data.amount);
  });

export const toggleGoalSubTaskFn = createServerFn({ method: "POST" })
  .validator((data: { goalId: string; taskId: string }) => data)
  .handler(async ({ data }) => {
    return toggleGoalSubTask(data.goalId, data.taskId);
  });

export const deleteGoalFn = createServerFn({ method: "POST" })
  .validator((data: { goalId: string }) => data)
  .handler(async ({ data }) => {
    return { ok: await deleteGoal(data.goalId) };
  });

/** Returns "unconfigured" | "pending" | "done" — never trusts a userId the
 *  client claims; it re-derives identity from the access token itself. */
export const fetchSurveyStatus = createServerFn({ method: "POST" })
  .validator((data: { accessToken: string }) => data)
  .handler(async ({ data }) => {
    const user = await verifyAccessToken(data.accessToken);
    if (!user) return { status: "signed-out" as const };
    const survey = await getSurvey(user.id);
    if (survey === null) return { status: "unconfigured" as const };
    return { status: survey ? ("done" as const) : ("pending" as const) };
  });

export const submitSurvey = createServerFn({ method: "POST" })
  .validator((data: { accessToken: string; survey: BusinessSurvey }) => data)
  .handler(async ({ data }) => {
    const user = await verifyAccessToken(data.accessToken);
    if (!user) throw new Error("Not signed in.");
    await saveSurvey(user.id, user.email, data.survey);
    return { ok: true as const };
  });
