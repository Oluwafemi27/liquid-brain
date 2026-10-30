import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { MAX_IMPORT_ROWS, type Mapping } from "@/lib/import-mapping";
import {
  deleteImport,
  getBusinessData,
  importGaMonths,
  importGmailLeads,
  importTable,
} from "@/lib/server/business-data";
import {
  ActionError,
  decideAction,
  getActions,
  listPendingActions,
  undoAction,
} from "@/lib/server/actions";
import {
  adminAudit,
  adminRemoveUser,
  adminSecurityChecks,
  adminTrustSummary,
  adminUserDetail,
  adminWorkspaceHealth,
} from "@/lib/server/admin-trust";
import { listActivity } from "@/lib/server/activity";
import { sendDigest } from "@/lib/server/alerts";
import { checkConnections } from "@/lib/server/connection-health";
import { deleteUserData, type DeletionScope } from "@/lib/server/data-deletion";
import { ImportError } from "@/lib/server/google-auth";
import { resyncImport } from "@/lib/server/import-sync";
import { emailConfigured } from "@/lib/server/notify";
import { getOwnerSettings, saveOwnerSettings } from "@/lib/server/owner-settings";
import { getPlatformAnalytics } from "@/lib/server/platform-analytics";
import { getDailyVerdict } from "@/lib/server/verdict";
import {
  fetchGaMonths,
  fetchGmailLeads,
  listGaProperties,
  listGoogleFiles,
  loadGoogleTable,
} from "@/lib/server/google-sources";
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
import { getAnalyticsSummary } from "@/lib/server/analytics";
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

/** Connection state is workspace-wide (one set of connected integrations),
 *  but still only readable by a signed-in user. Returns null when signed out
 *  so callers keep whatever they last knew instead of resetting to "off". */
export const fetchConnectorStatuses = createServerFn({ method: "POST" })
  .validator((data: { accessToken: string | null }) => data)
  .handler(async ({ data }) => {
    const user = await verifyAccessToken(data.accessToken);
    if (!user) return null;
    return getConnectorStatuses();
  });

/** Business Memory graph — real counts only, scoped to the signed-in user,
 *  see lib/server/memory.ts. */
export const fetchMemoryGraphFn = createServerFn({ method: "POST" })
  .validator((data: { accessToken: string | null }) => data)
  .handler(async ({ data }) => {
    const user = await verifyAccessToken(data.accessToken);
    if (!user) return null;
    return getMemoryGraph(user.id);
  });

/** Live analytics for the Analytics page — see lib/server/analytics.ts. */
export const fetchAnalyticsSummaryFn = createServerFn({ method: "POST" })
  .validator((data: { accessToken: string | null }) => data)
  .handler(async ({ data }) => {
    const user = await verifyAccessToken(data.accessToken);
    if (!user) return null;
    return getAnalyticsSummary(user.id);
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

// ---------------------------------------------------------------------------
// Business data import (sales / leads / customers / deals / traffic).
// Replaces the old "importing … isn't built yet" placeholder on Analytics.
// Every function verifies the caller's token and scopes rows to that user.
// Import actions return { ok, … } instead of throwing so the owner always
// sees the real reason (API not enabled, bad column, …) rather than a
// generic server error.
// ---------------------------------------------------------------------------

type Result<T> = ({ ok: true } & T) | { ok: false; error: string };

async function guarded<T extends object>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, ...(await fn()) };
  } catch (err) {
    if (err instanceof ImportError || err instanceof ActionError)
      return { ok: false, error: err.message };
    console.error("[import] unexpected failure", err);
    return { ok: false, error: "Something went wrong while importing. Check the server logs." };
  }
}

const NOT_SIGNED_IN = "You're signed out. Sign in again and retry.";

export const fetchBusinessDataFn = createServerFn({ method: "POST" })
  .validator((data: { accessToken: string | null }) => data)
  .handler(async ({ data }) => {
    const user = await verifyAccessToken(data.accessToken);
    if (!user) return null;
    return getBusinessData(user.id);
  });

export const listGoogleFilesFn = createServerFn({ method: "POST" })
  .validator((data: { accessToken: string | null; query?: string }) => data)
  .handler(async ({ data }) =>
    guarded(async () => {
      const user = await verifyAccessToken(data.accessToken);
      if (!user) throw new ImportError(NOT_SIGNED_IN, "reauth");
      return { files: await listGoogleFiles(data.query) };
    }),
  );

export const loadGoogleTableFn = createServerFn({ method: "POST" })
  .validator((data: { accessToken: string | null; file: string; tab?: string }) => data)
  .handler(async ({ data }) =>
    guarded(async () => {
      const user = await verifyAccessToken(data.accessToken);
      if (!user) throw new ImportError(NOT_SIGNED_IN, "reauth");
      return { table: await loadGoogleTable(data.file, data.tab) };
    }),
  );

const importTableSchema = z.object({
  accessToken: z.string().nullable(),
  source: z.enum(["csv", "sheets", "drive"]),
  sourceRef: z.string().min(1).max(300),
  label: z.string().min(1).max(200),
  kind: z.enum(["sale", "lead", "customer", "deal"]),
  currency: z.string().regex(/^[A-Z]{3}$/),
  dateOrder: z.enum(["auto", "dmy", "mdy"]),
  fileRef: z.string().max(300).nullable().optional(),
  tab: z.string().max(200).nullable().optional(),
  mapping: z.record(z.string(), z.number().int().min(0).max(200)),
  rows: z.array(z.array(z.string().max(2000)).max(201)).max(MAX_IMPORT_ROWS + 5),
});

export const importTableFn = createServerFn({ method: "POST" })
  .validator((data: z.infer<typeof importTableSchema>) => importTableSchema.parse(data))
  .handler(async ({ data }) =>
    guarded(async () => {
      const user = await verifyAccessToken(data.accessToken);
      if (!user) throw new ImportError(NOT_SIGNED_IN, "reauth");
      const outcome = await importTable(user.id, {
        source: data.source,
        sourceRef: data.sourceRef,
        label: data.label,
        kind: data.kind,
        currency: data.currency,
        dateOrder: data.dateOrder,
        mapping: data.mapping as Mapping,
        rows: data.rows,
        config:
          data.source !== "csv" && data.fileRef
            ? {
                fileRef: data.fileRef,
                tab: data.tab ?? null,
                kind: data.kind,
                mapping: data.mapping,
                dateOrder: data.dateOrder,
                currency: data.currency,
                label: data.label,
              }
            : null,
      });
      return { outcome };
    }),
  );

export const listGaPropertiesFn = createServerFn({ method: "POST" })
  .validator((data: { accessToken: string | null }) => data)
  .handler(async ({ data }) =>
    guarded(async () => {
      const user = await verifyAccessToken(data.accessToken);
      if (!user) throw new ImportError(NOT_SIGNED_IN, "reauth");
      return { properties: await listGaProperties() };
    }),
  );

export const importGaFn = createServerFn({ method: "POST" })
  .validator((data: { accessToken: string | null; propertyId: string; propertyName: string }) => {
    if (!/^\d{3,20}$/.test(data.propertyId)) throw new Error("Invalid GA4 property id");
    return data;
  })
  .handler(async ({ data }) =>
    guarded(async () => {
      const user = await verifyAccessToken(data.accessToken);
      if (!user) throw new ImportError(NOT_SIGNED_IN, "reauth");
      const { months, currency } = await fetchGaMonths(data.propertyId);
      const outcome = await importGaMonths(user.id, {
        propertyId: data.propertyId,
        propertyName: data.propertyName.slice(0, 120) || `Property ${data.propertyId}`,
        currency,
        months,
      });
      return { outcome };
    }),
  );

export const importGmailLeadsFn = createServerFn({ method: "POST" })
  .validator((data: { accessToken: string | null }) => data)
  .handler(async ({ data }) =>
    guarded(async () => {
      const user = await verifyAccessToken(data.accessToken);
      if (!user) throw new ImportError(NOT_SIGNED_IN, "reauth");
      const found = await fetchGmailLeads();
      const outcome = await importGmailLeads(user.id, found);
      return { outcome };
    }),
  );

export const deleteImportFn = createServerFn({ method: "POST" })
  .validator((data: { accessToken: string | null; importId: string }) => data)
  .handler(async ({ data }) =>
    guarded(async () => {
      const user = await verifyAccessToken(data.accessToken);
      if (!user) throw new ImportError(NOT_SIGNED_IN, "reauth");
      await deleteImport(user.id, data.importId);
      return {};
    }),
  );

// ---------------------------------------------------------------------------
// Trust layer: verdict, approvals, undo, activity, health, limits, privacy.
// ---------------------------------------------------------------------------

export const fetchVerdictFn = createServerFn({ method: "POST" })
  .validator((data: { accessToken: string | null; refreshHealth?: boolean }) => data)
  .handler(async ({ data }) =>
    guarded(async () => {
      const user = await verifyAccessToken(data.accessToken);
      if (!user) throw new ImportError(NOT_SIGNED_IN, "reauth");
      const [verdict, pending] = await Promise.all([
        getDailyVerdict(user.id, { forceHealth: Boolean(data.refreshHealth) }),
        listPendingActions(user.id),
      ]);
      return { verdict, pending };
    }),
  );

export const fetchActionsFn = createServerFn({ method: "POST" })
  .validator((data: { accessToken: string | null; ids: string[] }) => data)
  .handler(async ({ data }) =>
    guarded(async () => {
      const user = await verifyAccessToken(data.accessToken);
      if (!user) throw new ImportError(NOT_SIGNED_IN, "reauth");
      return { actions: await getActions(user.id, data.ids) };
    }),
  );

export const decideActionFn = createServerFn({ method: "POST" })
  .validator(
    (data: {
      accessToken: string | null;
      id: string;
      decision: "approve" | "decline";
      overrideLimit?: boolean;
    }) =>
      z
        .object({
          accessToken: z.string().nullable(),
          id: z.string().uuid(),
          decision: z.enum(["approve", "decline"]),
          overrideLimit: z.boolean().optional(),
        })
        .parse(data),
  )
  .handler(async ({ data }) =>
    guarded(async () => {
      const user = await verifyAccessToken(data.accessToken);
      if (!user) throw new ImportError(NOT_SIGNED_IN, "reauth");
      return {
        action: await decideAction(user.id, data.id, data.decision, {
          overrideLimit: Boolean(data.overrideLimit),
        }),
      };
    }),
  );

export const undoActionFn = createServerFn({ method: "POST" })
  .validator((data: { accessToken: string | null; id: string }) =>
    z.object({ accessToken: z.string().nullable(), id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data }) =>
    guarded(async () => {
      const user = await verifyAccessToken(data.accessToken);
      if (!user) throw new ImportError(NOT_SIGNED_IN, "reauth");
      return { action: await undoAction(user.id, data.id) };
    }),
  );

export const fetchActivityFn = createServerFn({ method: "POST" })
  .validator(
    (data: {
      accessToken: string | null;
      platform?: string;
      status?: string;
      before?: string;
      limit?: number;
    }) => data,
  )
  .handler(async ({ data }) =>
    guarded(async () => {
      const user = await verifyAccessToken(data.accessToken);
      if (!user) throw new ImportError(NOT_SIGNED_IN, "reauth");
      return {
        items: await listActivity(user.id, {
          platform: data.platform,
          status: data.status,
          before: data.before,
          limit: data.limit ?? 30,
        }),
      };
    }),
  );

export const fetchPlatformAnalyticsFn = createServerFn({ method: "POST" })
  .validator((data: { accessToken: string | null }) => data)
  .handler(async ({ data }) =>
    guarded(async () => {
      const user = await verifyAccessToken(data.accessToken);
      if (!user) throw new ImportError(NOT_SIGNED_IN, "reauth");
      return { platforms: await getPlatformAnalytics(user.id) };
    }),
  );

export const fetchConnectionHealthFn = createServerFn({ method: "POST" })
  .validator((data: { accessToken: string | null; force?: boolean }) => data)
  .handler(async ({ data }) =>
    guarded(async () => {
      const user = await verifyAccessToken(data.accessToken);
      if (!user) throw new ImportError(NOT_SIGNED_IN, "reauth");
      return { health: await checkConnections({ force: Boolean(data.force) }) };
    }),
  );

export const fetchOwnerSettingsFn = createServerFn({ method: "POST" })
  .validator((data: { accessToken: string | null }) => data)
  .handler(async ({ data }) =>
    guarded(async () => {
      const user = await verifyAccessToken(data.accessToken);
      if (!user) throw new ImportError(NOT_SIGNED_IN, "reauth");
      return { settings: await getOwnerSettings(user.id), emailAvailable: emailConfigured() };
    }),
  );

export const saveOwnerSettingsFn = createServerFn({ method: "POST" })
  .validator((data: { accessToken: string | null; patch: Record<string, unknown> }) => data)
  .handler(async ({ data }) =>
    guarded(async () => {
      const user = await verifyAccessToken(data.accessToken);
      if (!user) throw new ImportError(NOT_SIGNED_IN, "reauth");
      try {
        return { settings: await saveOwnerSettings(user.id, data.patch) };
      } catch (e) {
        throw new ImportError(
          e instanceof z.ZodError
            ? (e.issues[0]?.message ?? "Invalid value")
            : e instanceof Error
              ? e.message
              : "Couldn't save",
          "bad_data",
        );
      }
    }),
  );

export const resyncImportFn = createServerFn({ method: "POST" })
  .validator((data: { accessToken: string | null; importId: string }) =>
    z.object({ accessToken: z.string().nullable(), importId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data }) =>
    guarded(async () => {
      const user = await verifyAccessToken(data.accessToken);
      if (!user) throw new ImportError(NOT_SIGNED_IN, "reauth");
      const out = await resyncImport(user.id, data.importId);
      if (!out.ok) throw new ImportError(out.message, "api");
      return { message: out.message };
    }),
  );

export const sendDigestNowFn = createServerFn({ method: "POST" })
  .validator((data: { accessToken: string | null }) => data)
  .handler(async ({ data }) =>
    guarded(async () => {
      const user = await verifyAccessToken(data.accessToken);
      if (!user) throw new ImportError(NOT_SIGNED_IN, "reauth");
      const res = await sendDigest(user.id);
      if (!res.ok) throw new ImportError(res.message, "api");
      return { message: res.message };
    }),
  );

export const deleteMyDataFn = createServerFn({ method: "POST" })
  .validator((data: { accessToken: string | null; scope: DeletionScope; confirm: string }) =>
    z
      .object({
        accessToken: z.string().nullable(),
        scope: z.enum(["imports", "activity", "chats", "everything"]),
        confirm: z.string(),
      })
      .parse(data),
  )
  .handler(async ({ data }) =>
    guarded(async () => {
      const user = await verifyAccessToken(data.accessToken);
      if (!user) throw new ImportError(NOT_SIGNED_IN, "reauth");
      if (data.confirm !== "DELETE") throw new ImportError("Type DELETE to confirm.", "bad_data");
      try {
        return await deleteUserData(user.id, data.scope);
      } catch (e) {
        throw new ImportError(e instanceof Error ? e.message : "Couldn't delete your data.", "api");
      }
    }),
  );

// ---- Admin (every one of these re-verifies the caller is an admin server-side) ----

export const adminTrustSummaryFn = createServerFn({ method: "POST" })
  .validator((data: { accessToken: string | null }) => data)
  .handler(async ({ data }) => adminTrustSummary(data.accessToken));

export const adminWorkspaceHealthFn = createServerFn({ method: "POST" })
  .validator((data: { accessToken: string | null; force?: boolean }) => data)
  .handler(async ({ data }) => adminWorkspaceHealth(data.accessToken, Boolean(data.force)));

export const adminAuditFn = createServerFn({ method: "POST" })
  .validator((data: { accessToken: string | null; status?: string }) => data)
  .handler(async ({ data }) => adminAudit(data.accessToken, data.status ?? null));

export const adminUserDetailFn = createServerFn({ method: "POST" })
  .validator((data: { accessToken: string | null; userId: string }) =>
    z.object({ accessToken: z.string().nullable(), userId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data }) => adminUserDetail(data.accessToken, data.userId));

export const adminRemoveUserFn = createServerFn({ method: "POST" })
  .validator((data: { accessToken: string | null; userId: string; confirmEmail: string }) =>
    z
      .object({
        accessToken: z.string().nullable(),
        userId: z.string().uuid(),
        confirmEmail: z.string().max(200),
      })
      .parse(data),
  )
  .handler(async ({ data }) => adminRemoveUser(data.accessToken, data.userId, data.confirmEmail));

export const adminSecurityChecksFn = createServerFn({ method: "POST" })
  .validator((data: { accessToken: string | null }) => data)
  .handler(async ({ data }) => adminSecurityChecks(data.accessToken));
