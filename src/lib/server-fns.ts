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
  adminDeleteGoal,
  adminListAllAutomations,
  adminListAllGoals,
  adminSetAutomationEnabled,
} from "@/lib/server/admin";
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

/** Every function below that touches per-user data (chats, automations,
 *  goals, insights, schedule, n8n deployments) requires an `accessToken`
 *  from the caller and re-derives the real user id from it via
 *  verifyAccessToken — the same "never trust what the client claims"
 *  pattern already used by the survey/admin functions. A missing or
 *  invalid token means "not signed in", so reads quietly return empty
 *  results and writes throw — there is no per-user data to leak or write
 *  to without a verified identity. */

export const fetchConnectorStatuses = createServerFn({ method: "GET" }).handler(async () => {
  return getConnectorStatuses();
});

/** Business Memory graph — real counts only, see lib/server/memory.ts. */
export const fetchMemoryGraphFn = createServerFn({ method: "GET" }).handler(async () => {
  return getMemoryGraph();
});

export const fetchGoals = createServerFn({ method: "POST" })
  .validator((data: { accessToken: string | null }) => data)
  .handler(async ({ data }) => {
    const user = await verifyAccessToken(data.accessToken);
    if (!user) return [];
    return listGoals(user.id);
  });

export const fetchAutomations = createServerFn({ method: "POST" })
  .validator((data: { accessToken: string | null }) => data)
  .handler(async ({ data }) => {
    const user = await verifyAccessToken(data.accessToken);
    if (!user) return [];
    return listAutomations(user.id);
  });

export const setAutomationEnabledFn = createServerFn({ method: "POST" })
  .validator((data: { accessToken: string | null; id: string; enabled: boolean }) => data)
  .handler(async ({ data }) => {
    const user = await verifyAccessToken(data.accessToken);
    if (!user) return null;
    return setAutomationEnabled(user.id, data.id, data.enabled);
  });

export const createAutomationFn = createServerFn({ method: "POST" })
  .validator(
    (data: {
      accessToken: string | null;
      name: string;
      trigger: string;
      action: string;
      goalTitle?: string | undefined;
    }) => data,
  )
  .handler(async ({ data }) => {
    const user = await verifyAccessToken(data.accessToken);
    if (!user) return null;
    const { accessToken: _accessToken, ...input } = data;
    return createAutomation(user.id, input);
  });

export const runAutomationFn = createServerFn({ method: "POST" })
  .validator((data: { accessToken: string | null; automationId: string }) => data)
  .handler(async ({ data }) => {
    const user = await verifyAccessToken(data.accessToken);
    if (!user) return null;
    return runAutomation(user.id, data.automationId);
  });

export const listAutomationRunsFn = createServerFn({ method: "POST" })
  .validator((data: { accessToken: string | null; automationId: string }) => data)
  .handler(async ({ data }) => {
    const user = await verifyAccessToken(data.accessToken);
    if (!user) return [];
    return listAutomationRuns(user.id, data.automationId);
  });

export const createGoalFn = createServerFn({ method: "POST" })
  .validator(
    (data: { accessToken: string | null; title: string; target: number; currency: string }) => data,
  )
  .handler(async ({ data }) => {
    const user = await verifyAccessToken(data.accessToken);
    if (!user) return null;
    return createGoal(user.id, data.title, data.target, data.currency);
  });

export const bumpGoalFn = createServerFn({ method: "POST" })
  .validator((data: { accessToken: string | null; goalId: string; amount: number }) => data)
  .handler(async ({ data }) => {
    const user = await verifyAccessToken(data.accessToken);
    if (!user) return null;
    return bumpGoal(user.id, data.goalId, data.amount);
  });

export const updateGoalFn = createServerFn({ method: "POST" })
  .validator(
    (data: {
      accessToken: string | null;
      goalId: string;
      title?: string;
      target?: number;
      currency?: string;
      due?: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    const user = await verifyAccessToken(data.accessToken);
    if (!user) return null;
    const { goalId, accessToken: _accessToken, ...patch } = data;
    return updateGoal(user.id, goalId, patch);
  });

export const fetchChatHistoryFn = createServerFn({ method: "POST" })
  .validator((data: { accessToken: string | null; sessionId: string }) => data)
  .handler(async ({ data }) => {
    const user = await verifyAccessToken(data.accessToken);
    if (!user) return [];
    return fetchChatHistoryImpl(user.id, data.sessionId);
  });

export const listChatSessionsFn = createServerFn({ method: "POST" })
  .validator((data: { accessToken: string | null }) => data)
  .handler(async ({ data }) => {
    const user = await verifyAccessToken(data.accessToken);
    if (!user) return [];
    return listChatSessionsImpl(user.id);
  });

export const toggleGoalSubTaskFn = createServerFn({ method: "POST" })
  .validator((data: { accessToken: string | null; goalId: string; taskId: string }) => data)
  .handler(async ({ data }) => {
    const user = await verifyAccessToken(data.accessToken);
    if (!user) return null;
    return toggleGoalSubTask(user.id, data.goalId, data.taskId);
  });

export const deleteGoalFn = createServerFn({ method: "POST" })
  .validator((data: { accessToken: string | null; goalId: string }) => data)
  .handler(async ({ data }) => {
    const user = await verifyAccessToken(data.accessToken);
    if (!user) return { ok: false };
    return { ok: await deleteGoal(user.id, data.goalId) };
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

/** Admin-only, cross-user. Distinct from fetchAutomations/fetchGoals above,
 *  which are correctly scoped to the caller's own data now that
 *  automations/goals are per-user — the admin panel needs everyone's, each
 *  tagged with its real owner, which is what these return instead. */
export const adminListAutomationsFn = createServerFn({ method: "POST" })
  .validator((data: { accessToken: string }) => data)
  .handler(async ({ data }) => {
    return adminListAllAutomations(data.accessToken);
  });

export const adminSetAutomationEnabledFn = createServerFn({ method: "POST" })
  .validator(
    (data: { accessToken: string; ownerId: string; automationId: string; enabled: boolean }) =>
      data,
  )
  .handler(async ({ data }) => {
    return adminSetAutomationEnabled(
      data.accessToken,
      data.ownerId,
      data.automationId,
      data.enabled,
    );
  });

export const adminListGoalsFn = createServerFn({ method: "POST" })
  .validator((data: { accessToken: string }) => data)
  .handler(async ({ data }) => {
    return adminListAllGoals(data.accessToken);
  });

export const adminDeleteGoalFn = createServerFn({ method: "POST" })
  .validator((data: { accessToken: string; ownerId: string; goalId: string }) => data)
  .handler(async ({ data }) => {
    return adminDeleteGoal(data.accessToken, data.ownerId, data.goalId);
  });

// === n8n integration ===

export const fetchN8nDeployments = createServerFn({ method: "POST" })
  .validator((data: { accessToken: string | null }) => data)
  .handler(async ({ data }) => {
    const user = await verifyAccessToken(data.accessToken);
    if (!user) return [];
    return listN8nDeployments(user.id);
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
      accessToken: string | null;
      name: string;
      reasoning: string;
      automationId?: string | undefined;
      templateId?: string | undefined;
      buildBrief?: string | undefined;
    }) => data,
  )
  .handler(async ({ data }) => {
    const user = await verifyAccessToken(data.accessToken);
    if (!user) throw new Error("Not signed in.");
    const { accessToken: _accessToken, ...input } = data;
    return createSafeModeDeployment(user.id, input);
  });

/** The only path that turns a workflow on — always an explicit, separate
 *  owner action after "I built it. Want me to turn it on?". */
export const activateN8nDeploymentFn = createServerFn({ method: "POST" })
  .validator((data: { accessToken: string | null; deploymentId: string }) => data)
  .handler(async ({ data }) => {
    const user = await verifyAccessToken(data.accessToken);
    if (!user) throw new Error("Not signed in.");
    return activateDeployment(user.id, data.deploymentId);
  });

export const deactivateN8nDeploymentFn = createServerFn({ method: "POST" })
  .validator((data: { accessToken: string | null; deploymentId: string }) => data)
  .handler(async ({ data }) => {
    const user = await verifyAccessToken(data.accessToken);
    if (!user) throw new Error("Not signed in.");
    return deactivateDeployment(user.id, data.deploymentId);
  });

// === Notifications (insights) ===

export const fetchInsightsFn = createServerFn({ method: "POST" })
  .validator((data: { accessToken: string | null }) => data)
  .handler(async ({ data }) => {
    const user = await verifyAccessToken(data.accessToken);
    if (!user) return [];
    return listInsights(user.id);
  });

/** Logs a new insight — every "goal hit", "automation ran", "source
 *  connected" etc. moment in the app calls this instead of splicing a
 *  locally-generated one into Zustand, so it persists and syncs live to
 *  every open tab/device (of this same user) via NotificationsBootstrap's
 *  realtime subscription. */
export const createInsightFn = createServerFn({ method: "POST" })
  .validator(
    (data: {
      accessToken: string | null;
      title: string;
      body: string;
      severity: "info" | "success" | "warning";
      source: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    const user = await verifyAccessToken(data.accessToken);
    if (!user) return null;
    const { accessToken: _accessToken, ...input } = data;
    return createInsight(user.id, input);
  });

export const markInsightReadFn = createServerFn({ method: "POST" })
  .validator((data: { accessToken: string | null; id: string }) => data)
  .handler(async ({ data }) => {
    const user = await verifyAccessToken(data.accessToken);
    if (!user) return null;
    return markInsightRead(user.id, data.id);
  });

export const markAllInsightsReadFn = createServerFn({ method: "POST" })
  .validator((data: { accessToken: string | null }) => data)
  .handler(async ({ data }) => {
    const user = await verifyAccessToken(data.accessToken);
    if (!user) return { ok: false };
    return { ok: await markAllInsightsRead(user.id) };
  });

export const dismissInsightFn = createServerFn({ method: "POST" })
  .validator((data: { accessToken: string | null; id: string }) => data)
  .handler(async ({ data }) => {
    const user = await verifyAccessToken(data.accessToken);
    if (!user) return { ok: false };
    return { ok: await dismissInsight(user.id, data.id) };
  });

// === Schedule ===

export const fetchScheduleEventsFn = createServerFn({ method: "POST" })
  .validator((data: { accessToken: string | null }) => data)
  .handler(async ({ data }) => {
    const user = await verifyAccessToken(data.accessToken);
    if (!user) return [];
    return listScheduleEvents(user.id);
  });

export const createScheduleEventFn = createServerFn({ method: "POST" })
  .validator(
    (data: {
      accessToken: string | null;
      title: string;
      day: "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";
      startTime: string;
      endTime: string;
      category: "meeting" | "content" | "campaign" | "automation" | "followup" | "other";
      notes: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    const user = await verifyAccessToken(data.accessToken);
    if (!user) return null;
    const { accessToken: _accessToken, ...input } = data;
    return createScheduleEvent(user.id, input);
  });

export const toggleScheduleEventDoneFn = createServerFn({ method: "POST" })
  .validator((data: { accessToken: string | null; id: string }) => data)
  .handler(async ({ data }) => {
    const user = await verifyAccessToken(data.accessToken);
    if (!user) return null;
    return toggleScheduleEventDone(user.id, data.id);
  });

export const deleteScheduleEventFn = createServerFn({ method: "POST" })
  .validator((data: { accessToken: string | null; id: string }) => data)
  .handler(async ({ data }) => {
    const user = await verifyAccessToken(data.accessToken);
    if (!user) return { ok: false };
    return { ok: await deleteScheduleEvent(user.id, data.id) };
  });
