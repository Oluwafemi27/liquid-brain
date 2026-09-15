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
import {
  activateDeployment,
  createSafeModeDeployment,
  deactivateDeployment,
  listN8nDeployments,
} from "@/lib/server/n8n-deployments";
import { searchN8nTemplates } from "@/lib/server/n8n-templates";
import { getMemoryGraph } from "@/lib/server/memory";
import { getAdminAnalytics } from "@/lib/server/admin-analytics";
import {
  createInsight,
  dismissInsight,
  listInsights,
  markAllInsightsRead,
  markInsightRead,
} from "@/lib/server/insights";
import {
  createScheduleEvent,
  deleteScheduleEvent,
  listScheduleEvents,
  toggleScheduleEventDone,
} from "@/lib/server/schedule";

export const fetchConnectorStatuses = createServerFn({ method: "GET" }).handler(async () => {
  return getConnectorStatuses();
});

/** Business Memory graph — real counts only, see lib/server/memory.ts. */
export const fetchMemoryGraphFn = createServerFn({ method: "GET" }).handler(async () => {
  return getMemoryGraph();
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

export const adminAnalyticsFn = createServerFn({ method: "POST" })
  .validator((data: { accessToken: string }) => data)
  .handler(async ({ data }) => {
    return getAdminAnalytics(data.accessToken);
  });

// === n8n integration ===

export const fetchN8nDeployments = createServerFn({ method: "GET" }).handler(async () => {
  return listN8nDeployments();
});

export const searchN8nTemplatesFn = createServerFn({ method: "POST" })
  .validator((data: { query: string }) => data)
  .handler(async ({ data }) => {
    return searchN8nTemplates(data.query);
  });

/** Deploys a workflow to the owner's n8n — always inactive (Safe Mode).
 *  Called both from the chat approval flow (deploy_n8n_workflow
 *  proposedAction) and from a manual "Deploy from library" action. */
export const deployN8nWorkflowFn = createServerFn({ method: "POST" })
  .validator(
    (data: {
      name: string;
      reasoning: string;
      automationId?: string | undefined;
      templateId?: string | undefined;
      buildBrief?: string | undefined;
    }) => data,
  )
  .handler(async ({ data }) => {
    return createSafeModeDeployment(data);
  });

/** The only path that turns a deployed workflow on — always an explicit,
 *  separate owner action after "I built it. Want me to turn it on?". */
export const activateN8nDeploymentFn = createServerFn({ method: "POST" })
  .validator((data: { deploymentId: string }) => data)
  .handler(async ({ data }) => {
    return activateDeployment(data.deploymentId);
  });

export const deactivateN8nDeploymentFn = createServerFn({ method: "POST" })
  .validator((data: { deploymentId: string }) => data)
  .handler(async ({ data }) => {
    return deactivateDeployment(data.deploymentId);
  });

// === Notifications (insights) ===

export const fetchInsightsFn = createServerFn({ method: "GET" }).handler(async () => {
  return listInsights();
});

/** Logs a new insight — every "goal hit", "automation ran", "source
 *  connected" etc. moment in the app calls this instead of splicing a
 *  locally-generated one into Zustand, so it persists and syncs live to
 *  every open tab/device via NotificationsBootstrap's realtime subscription. */
export const createInsightFn = createServerFn({ method: "POST" })
  .validator(
    (data: { title: string; body: string; severity: "info" | "success" | "warning"; source: string }) =>
      data,
  )
  .handler(async ({ data }) => {
    return createInsight(data);
  });

export const markInsightReadFn = createServerFn({ method: "POST" })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    return markInsightRead(data.id);
  });

export const markAllInsightsReadFn = createServerFn({ method: "POST" }).handler(async () => {
  return { ok: await markAllInsightsRead() };
});

export const dismissInsightFn = createServerFn({ method: "POST" })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    return { ok: await dismissInsight(data.id) };
  });

// === Schedule ===

export const fetchScheduleEventsFn = createServerFn({ method: "GET" }).handler(async () => {
  return listScheduleEvents();
});

export const createScheduleEventFn = createServerFn({ method: "POST" })
  .validator(
    (data: {
      title: string;
      day: "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";
      startTime: string;
      endTime: string;
      category: "meeting" | "content" | "campaign" | "automation" | "followup" | "other";
      notes: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    return createScheduleEvent(data);
  });

export const toggleScheduleEventDoneFn = createServerFn({ method: "POST" })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    return toggleScheduleEventDone(data.id);
  });

export const deleteScheduleEventFn = createServerFn({ method: "POST" })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    return { ok: await deleteScheduleEvent(data.id) };
  });
