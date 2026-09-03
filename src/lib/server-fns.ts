import { createServerFn } from "@tanstack/react-start";
import {
  setAutomationEnabled,
  listAutomations,
  createAutomation,
  runAutomation,
  listAutomationRuns,
} from "@/lib/server/automations";
import { getConnectorStatuses } from "@/lib/server/connectors";
import {
  bumpGoal,
  createGoal,
  deleteGoal,
  listGoals,
  toggleGoalSubTask,
  updateGoal,
} from "@/lib/server/goals";
import {
  fetchChatHistory as fetchChatHistoryImpl,
  listChatSessions as listChatSessionsImpl,
} from "@/lib/server/chat-history";
import { getSurvey, saveSurvey, verifyAccessToken, type BusinessSurvey } from "@/lib/server/survey";
import { getAdminOverview, isAdminEmail, listAllUsers, setAdminStatus } from "@/lib/server/admin";

export const fetchConnectorStatuses = createServerFn({ method: "GET" }).handler(async () => {
  return getConnectorStatuses();
});

export const fetchGoals = createServerFn({ method: "GET" }).handler(async () => {
  return listGoals();
});

export const fetchAutomations = createServerFn({ method: "GET" }).handler(async () => {
  return listAutomations();
});

export const setAutomationEnabledFn = createServerFn({ method: "POST" })
  .validator((data: { id: string; enabled: boolean }) => data)
  .handler(async ({ data }) => {
    return setAutomationEnabled(data.id, data.enabled);
  });

export const createAutomationFn = createServerFn({ method: "POST" })
  .validator(
    (data: { name: string; trigger: string; action: string; goalTitle?: string | undefined }) =>
      data,
  )
  .handler(async ({ data }) => {
    return createAutomation(data);
  });

export const runAutomationFn = createServerFn({ method: "POST" })
  .validator((data: { automationId: string }) => data)
  .handler(async ({ data }) => {
    return runAutomation(data.automationId);
  });

export const listAutomationRunsFn = createServerFn({ method: "POST" })
  .validator((data: { automationId: string }) => data)
  .handler(async ({ data }) => {
    return listAutomationRuns(data.automationId);
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

export const updateGoalFn = createServerFn({ method: "POST" })
  .validator(
    (data: { goalId: string; title?: string; target?: number; currency?: string; due?: string }) =>
      data,
  )
  .handler(async ({ data }) => {
    const { goalId, ...patch } = data;
    return updateGoal(goalId, patch);
  });

export const fetchChatHistoryFn = createServerFn({ method: "POST" })
  .validator((data: { sessionId: string }) => data)
  .handler(async ({ data }) => {
    return fetchChatHistoryImpl(data.sessionId);
  });

export const listChatSessionsFn = createServerFn({ method: "GET" }).handler(async () => {
  return listChatSessionsImpl();
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

export const checkIsAdminFn = createServerFn({ method: "POST" })
  .validator((data: { accessToken: string }) => data)
  .handler(async ({ data }) => {
    const user = await verifyAccessToken(data.accessToken);
    return { isAdmin: await isAdminEmail(user?.email) };
  });

export const adminListUsersFn = createServerFn({ method: "POST" })
  .validator((data: { accessToken: string }) => data)
  .handler(async ({ data }) => {
    return listAllUsers(data.accessToken);
  });

export const adminOverviewFn = createServerFn({ method: "POST" })
  .validator((data: { accessToken: string }) => data)
  .handler(async ({ data }) => {
    return getAdminOverview(data.accessToken);
  });

export const adminSetAdminStatusFn = createServerFn({ method: "POST" })
  .validator((data: { accessToken: string; targetEmail: string; makeAdmin: boolean }) => data)
  .handler(async ({ data }) => {
    return setAdminStatus(data.accessToken, data.targetEmail, data.makeAdmin);
  });
