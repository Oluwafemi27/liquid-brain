import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/server/supabase";
import {
  QuotaExceededError,
  EntitlementError,
  getBillingSettings,
  getEntitlements,
  listPacks,
  listPlans,
  usageByFeature,
} from "@/lib/server/billing";
import {
  BillingError,
  adminBillingOverview,
  adminGrantPlan,
  adminGrantTokens,
  cancelSubscription,
  listPayments,
  resumeSubscription,
  startCheckout,
  syncPaystackPlans,
  updateBillingSettings,
  createPack,
  updatePack,
  updatePlan,
  verifyByReference,
} from "@/lib/server/checkout";
import { PaystackError, paystackConfigured } from "@/lib/server/paystack";
import {
  PromoError,
  createPromoCodes,
  listPromoCodes,
  previewPromo,
  redeemGrantPromo,
  setPromoActive,
} from "@/lib/server/promos";
import { asAdmin } from "@/lib/server/admin-trust";
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
import { getMonitoringReport, sendMonitoringTest } from "@/lib/server/monitoring-dashboard";
import { deleteUserData, type DeletionScope } from "@/lib/server/data-deletion";
import { ImportError } from "@/lib/server/google-auth";
import { importFromConnector, resyncImport } from "@/lib/server/import-sync";
import { logEvent } from "@/lib/server/activity";
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
  setMessageFeedback,
  truncateFromMessage,
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
import { syncComposioConnections } from "@/lib/server/composio-sync";
import { getMemoryGraph } from "@/lib/server/memory";
import { getAdminAnalytics } from "@/lib/server/admin-analytics";
import {
  createInsight,
  dismissInsight,
  clearAllInsights,
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
    // Also notices apps connected or removed in Composio, so their notifications arrive within a minute
    // even if the Connectors panel is never opened.
    void syncComposioConnections(user.id);
    return getConnectorStatuses(user.id);
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

export const rateMessageFn = createServerFn({ method: "POST" })
  .validator(
    (data: {
      accessToken: string | null;
      sessionId: string;
      text: string;
      rating: "up" | "down" | null;
    }) => data,
  )
  .handler(async ({ data }) => {
    const user = await verifyAccessToken(data.accessToken);
    if (!user) return { ok: false };
    return { ok: await setMessageFeedback(user.id, data.sessionId, data.text, data.rating) };
  });

export const truncateChatFn = createServerFn({ method: "POST" })
  .validator((data: { accessToken: string | null; sessionId: string; text: string }) => data)
  .handler(async ({ data }) => {
    const user = await verifyAccessToken(data.accessToken);
    if (!user) return { ok: false };
    return { ok: await truncateFromMessage(user.id, data.sessionId, data.text) };
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

/** The signed-in user's own survey answers, for their profile page. */
export const fetchMySurveyFn = createServerFn({ method: "POST" })
  .validator((data: { accessToken: string }) => data)
  .handler(async ({ data }) => {
    const user = await verifyAccessToken(data.accessToken);
    if (!user) return { survey: null as BusinessSurvey | null };
    const survey = await getSurvey(user.id);
    return { survey: survey ?? null };
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
    return { isAdmin: Boolean(user?.emailVerified) && (await isAdminEmail(user?.email)) };
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

export const clearAllInsightsFn = createServerFn({ method: "POST" })
  .validator((data: { accessToken: string | null }) => data)
  .handler(async ({ data }) => {
    const user = await verifyAccessToken(data.accessToken);
    if (!user) return { ok: false };
    return { ok: await clearAllInsights(user.id) };
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
      return { files: await listGoogleFiles(user.id, data.query) };
    }),
  );

export const loadGoogleTableFn = createServerFn({ method: "POST" })
  .validator((data: { accessToken: string | null; file: string; tab?: string }) => data)
  .handler(async ({ data }) =>
    guarded(async () => {
      const user = await verifyAccessToken(data.accessToken);
      if (!user) throw new ImportError(NOT_SIGNED_IN, "reauth");
      return { table: await loadGoogleTable(user.id, data.file, data.tab) };
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
      return { properties: await listGaProperties(user.id) };
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
      const { months, currency } = await fetchGaMonths(user.id, data.propertyId);
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
      const found = await fetchGmailLeads(user.id);
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

export const adminMonitoringFn = createServerFn({ method: "POST" })
  .validator(
    (data: {
      accessToken: string;
      sentryBrowser: boolean;
      datadogBrowser: boolean;
      force?: boolean;
    }) => data,
  )
  .handler(async ({ data }) =>
    getMonitoringReport(
      data.accessToken,
      { sentryBrowser: Boolean(data.sentryBrowser), datadogBrowser: Boolean(data.datadogBrowser) },
      Boolean(data.force),
    ),
  );

export const adminMonitoringTestFn = createServerFn({ method: "POST" })
  .validator((data: { accessToken: string }) => data)
  .handler(async ({ data }) => sendMonitoringTest(data.accessToken));

export const fetchConnectionHealthFn = createServerFn({ method: "POST" })
  .validator((data: { accessToken: string | null; force?: boolean }) => data)
  .handler(async ({ data }) =>
    guarded(async () => {
      const user = await verifyAccessToken(data.accessToken);
      if (!user) throw new ImportError(NOT_SIGNED_IN, "reauth");
      return { health: await checkConnections(user.id, { force: Boolean(data.force) }) };
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

// ---------------------------------------------------------------------------
// Plans, tokens, payments (Paystack) and promo codes.
// ---------------------------------------------------------------------------

const tokenOnly = z.object({ accessToken: z.string().nullable() });
async function signedIn(accessToken: string | null) {
  const user = await verifyAccessToken(accessToken);
  if (!user) throw new BillingError(NOT_SIGNED_IN);
  return user;
}
async function adminOnly(accessToken: string | null) {
  const ctx = await asAdmin(accessToken);
  if (!ctx) throw new BillingError("Admins only.");
  return ctx;
}

/** Public: what the landing page shows. No sign-in needed; no secrets in it. */
export const fetchPublicPlansFn = createServerFn({ method: "POST" })
  .validator(() => ({}))
  .handler(async () => {
    try {
      return { plans: await listPlans(), packs: await listPacks() };
    } catch {
      return null; // the landing page falls back to its built-in defaults
    }
  });

export const fetchBillingFn = createServerFn({ method: "POST" })
  .validator((data: z.infer<typeof tokenOnly>) => tokenOnly.parse(data))
  .handler(async ({ data }) =>
    guarded(async () => {
      const user = await signedIn(data.accessToken);
      const [entitlements, plans, packs, payments, usage] = await Promise.all([
        getEntitlements(user.id),
        listPlans(),
        listPacks(),
        listPayments(user.id),
        usageByFeature(user.id),
      ]);
      return { entitlements, plans, packs, payments, usage, paymentsReady: paystackConfigured() };
    }),
  );

const checkoutSchema = z.object({
  accessToken: z.string().nullable(),
  planId: z.string().max(40).optional(),
  packId: z.string().max(40).optional(),
  interval: z.enum(["month", "year"]).optional(),
  promoCode: z.string().max(60).optional(),
  autoRenew: z.boolean().optional(),
  origin: z.string().max(200).optional(),
});
export const startCheckoutFn = createServerFn({ method: "POST" })
  .validator((data: z.infer<typeof checkoutSchema>) => checkoutSchema.parse(data))
  .handler(async ({ data }) =>
    guarded(async () => {
      const user = await signedIn(data.accessToken);
      const { accessToken: _t, ...input } = data;
      return await startCheckout({ id: user.id, email: user.email ?? null }, input);
    }),
  );

export const verifyPaymentFn = createServerFn({ method: "POST" })
  .validator((data: { accessToken: string | null; reference: string }) =>
    z
      .object({ accessToken: z.string().nullable(), reference: z.string().min(6).max(80) })
      .parse(data),
  )
  .handler(async ({ data }) =>
    guarded(async () => {
      const user = await signedIn(data.accessToken);
      return await verifyByReference(user.id, data.reference);
    }),
  );

/** One box for every kind of code: grants apply now, discounts are returned to be used at checkout. */
export const applyPromoFn = createServerFn({ method: "POST" })
  .validator((data: { accessToken: string | null; code: string }) =>
    z.object({ accessToken: z.string().nullable(), code: z.string().min(1).max(60) }).parse(data),
  )
  .handler(async ({ data }) =>
    guarded(async () => {
      const user = await signedIn(data.accessToken);
      const preview = await previewPromo(user.id, data.code);
      if (preview.kind === "percent_off")
        return {
          mode: "discount" as const,
          preview,
          message: `${preview.description} — it'll be applied when you check out.`,
        };
      const done = await redeemGrantPromo(user.id, data.code);
      return { mode: "granted" as const, preview, message: done.message };
    }),
  );

export const cancelSubscriptionFn = createServerFn({ method: "POST" })
  .validator((data: z.infer<typeof tokenOnly>) => tokenOnly.parse(data))
  .handler(async ({ data }) =>
    guarded(async () => ({
      message: await cancelSubscription((await signedIn(data.accessToken)).id),
    })),
  );
export const resumeSubscriptionFn = createServerFn({ method: "POST" })
  .validator((data: z.infer<typeof tokenOnly>) => tokenOnly.parse(data))
  .handler(async ({ data }) =>
    guarded(async () => ({
      message: await resumeSubscription((await signedIn(data.accessToken)).id),
    })),
  );

// ---- admin ----

export const adminBillingFn = createServerFn({ method: "POST" })
  .validator((data: z.infer<typeof tokenOnly>) => tokenOnly.parse(data))
  .handler(async ({ data }) =>
    guarded(async () => {
      await adminOnly(data.accessToken);
      const [overview, plans, packs, promos, settings] = await Promise.all([
        adminBillingOverview(),
        listPlans({ includeInactive: true }),
        listPacks({ includeInactive: true }),
        listPromoCodes(),
        getBillingSettings(),
      ]);
      return { overview, plans, packs, promos, settings, paymentsReady: paystackConfigured() };
    }),
  );

export const adminUpdatePlanFn = createServerFn({ method: "POST" })
  .validator(
    (data: { accessToken: string | null; id: string; patch: Record<string, unknown> }) => data,
  )
  .handler(async ({ data }) =>
    guarded(async () => {
      await adminOnly(data.accessToken);
      try {
        await updatePlan(data.id, data.patch);
      } catch (e) {
        if (e instanceof z.ZodError)
          throw new BillingError(e.issues[0]?.message ?? "Invalid value");
        throw e;
      }
      return {};
    }),
  );

export const adminSyncPaystackPlanFn = createServerFn({ method: "POST" })
  .validator((data: { accessToken: string | null; id: string }) => data)
  .handler(async ({ data }) =>
    guarded(async () => {
      await adminOnly(data.accessToken);
      return { message: await syncPaystackPlans(data.id) };
    }),
  );

export const adminUpdatePackFn = createServerFn({ method: "POST" })
  .validator(
    (data: {
      accessToken: string | null;
      id: string;
      patch: {
        name?: string;
        tokens?: number;
        bonusTokens?: number;
        priceNgn?: number;
        priceUsd?: number;
        active?: boolean;
      };
    }) => data,
  )
  .handler(async ({ data }) =>
    guarded(async () => {
      await adminOnly(data.accessToken);
      await updatePack(data.id, data.patch);
      return {};
    }),
  );

export const adminCreatePackFn = createServerFn({ method: "POST" })
  .validator(
    (data: {
      accessToken: string | null;
      pack: {
        name: string;
        tokens: number;
        bonusTokens: number;
        priceNgn: number;
        priceUsd: number;
      };
    }) => data,
  )
  .handler(async ({ data }) =>
    guarded(async () => {
      await adminOnly(data.accessToken);
      await createPack(data.pack);
      return {};
    }),
  );

export const adminBillingSettingsFn = createServerFn({ method: "POST" })
  .validator(
    (data: {
      accessToken: string | null;
      patch: {
        trialEnabled?: boolean;
        trialDays?: number;
        trialPlan?: string;
        tokensPerCredit?: number;
      };
    }) => data,
  )
  .handler(async ({ data }) =>
    guarded(async () => {
      await adminOnly(data.accessToken);
      await updateBillingSettings(data.patch);
      return {};
    }),
  );

const promoCreateSchema = z.object({
  accessToken: z.string().nullable(),
  kind: z.enum(["percent_off", "free_plan", "bonus_tokens"]),
  percent: z.number().int().min(1).max(100).optional(),
  planId: z.string().max(40).optional(),
  durationDays: z.number().int().min(1).max(3650).optional(),
  tokens: z.number().int().min(1).max(10_000_000_000).optional(),
  appliesTo: z.enum(["any", "subscription", "topup"]).optional(),
  maxRedemptions: z.number().int().min(1).max(1_000_000).optional(),
  expiresAt: z.string().max(40).optional(),
  note: z.string().max(200).optional(),
  prefix: z.string().max(12).optional(),
  customCode: z.string().max(40).optional(),
  quantity: z.number().int().min(1).max(200).optional(),
});
/** ONLY admins can generate promo codes — verified server-side on every call. */
export const adminCreatePromoFn = createServerFn({ method: "POST" })
  .validator((data: z.infer<typeof promoCreateSchema>) => promoCreateSchema.parse(data))
  .handler(async ({ data }) =>
    guarded(async () => {
      const ctx = await adminOnly(data.accessToken);
      const { accessToken: _t, ...input } = data;
      return { codes: await createPromoCodes(ctx.user.id, input) };
    }),
  );

export const adminSetPromoActiveFn = createServerFn({ method: "POST" })
  .validator((data: { accessToken: string | null; id: string; active: boolean }) =>
    z
      .object({ accessToken: z.string().nullable(), id: z.string().uuid(), active: z.boolean() })
      .parse(data),
  )
  .handler(async ({ data }) =>
    guarded(async () => {
      await adminOnly(data.accessToken);
      await setPromoActive(data.id, data.active);
      return {};
    }),
  );

export const adminGrantPlanFn = createServerFn({ method: "POST" })
  .validator((data: { accessToken: string | null; userId: string; planId: string; days: number }) =>
    z
      .object({
        accessToken: z.string().nullable(),
        userId: z.string().uuid(),
        planId: z.string().max(40),
        days: z.number().int().min(1).max(3650),
      })
      .parse(data),
  )
  .handler(async ({ data }) =>
    guarded(async () => {
      await adminOnly(data.accessToken);
      await adminGrantPlan(data.userId, data.planId, data.days);
      return {};
    }),
  );

export const adminGrantTokensFn = createServerFn({ method: "POST" })
  .validator((data: { accessToken: string | null; userId: string; tokens: number; note: string }) =>
    z
      .object({
        accessToken: z.string().nullable(),
        userId: z.string().uuid(),
        tokens: z.number().int().min(1).max(10_000_000_000),
        note: z.string().max(120),
      })
      .parse(data),
  )
  .handler(async ({ data }) =>
    guarded(async () => {
      await adminOnly(data.accessToken);
      await adminGrantTokens(data.userId, data.tokens, data.note);
      return {};
    }),
  );

/** "Import now" on a connected platform (Paystack, Stripe, Flutterwave, WooCommerce, HubSpot, Pipedrive). */
export const importFromConnectorFn = createServerFn({ method: "POST" })
  .validator((data: { accessToken: string | null; connectorId: string }) =>
    z
      .object({
        accessToken: z.string().nullable(),
        connectorId: z.enum([
          "paystack",
          "stripe",
          "flutterwave",
          "woocommerce",
          "hubspot",
          "pipedrive",
        ]),
      })
      .parse(data),
  )
  .handler(async ({ data }) =>
    guarded(async () => {
      const user = await verifyAccessToken(data.accessToken);
      if (!user) throw new ImportError(NOT_SIGNED_IN, "reauth");
      const imported = await importFromConnector(user.id, data.connectorId);
      await logEvent(user.id, {
        platform: data.connectorId,
        kind: "import",
        title: `Imported ${imported.toLocaleString()} records`,
        status: "ok",
      });
      return { imported };
    }),
  );

// ---- Connector hub helpers ----

/** The owner's own survey answers, used only to suggest where to start. */
export const fetchBusinessProfileFn = createServerFn({ method: "POST" })
  .validator((data: { accessToken: string | null }) => data)
  .handler(async ({ data }) => {
    const user = await verifyAccessToken(data.accessToken);
    if (!user) return { profile: "" };
    const s = await getSurvey(user.id);
    return { profile: s ? `${s.businessType} ${s.profession} ${s.goal}` : "" };
  });

export const requestConnectorFn = createServerFn({ method: "POST" })
  .validator((data: { accessToken: string | null; name: string; note?: string }) =>
    z
      .object({
        accessToken: z.string().nullable(),
        name: z.string().trim().min(2).max(60),
        note: z.string().max(300).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) =>
    guarded(async () => {
      const user = await verifyAccessToken(data.accessToken);
      if (!user) throw new ImportError(NOT_SIGNED_IN, "reauth");
      const db = getSupabaseAdmin();
      if (!db) throw new ImportError("The backend isn't configured.", "no_backend");
      // Keep it from becoming a spam channel: 5 requests a day per person.
      const since = new Date(Date.now() - 86_400_000).toISOString();
      const { count } = await db
        .from("connector_requests")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", since);
      if ((count ?? 0) >= 5)
        throw new ImportError(
          "You've sent a few requests today already — thanks! Try again tomorrow.",
          "bad_data",
        );
      const { error } = await db
        .from("connector_requests")
        .insert({ user_id: user.id, name: data.name, note: data.note ?? "" });
      if (error) throw new ImportError("Couldn't send that request. Try again.", "api");
      return {};
    }),
  );

export const adminConnectorRequestsFn = createServerFn({ method: "POST" })
  .validator((data: { accessToken: string | null }) => data)
  .handler(async ({ data }) => {
    const ctx = await asAdmin(data.accessToken);
    if (!ctx) return null;
    const { data: rows } = await ctx.db
      .from("connector_requests")
      .select("name, note, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    // Count how many times each platform was asked for — that's the build-next list.
    const tally = new Map<string, { name: string; count: number; last: string; notes: string[] }>();
    for (const r of rows ?? []) {
      const key = String(r["name"]).trim().toLowerCase();
      const t = tally.get(key) ?? {
        name: String(r["name"]).trim(),
        count: 0,
        last: r["created_at"] as string,
        notes: [],
      };
      t.count += 1;
      if (r["note"] && t.notes.length < 3) t.notes.push(String(r["note"]));
      tally.set(key, t);
    }
    return [...tally.values()].sort((a, b) => b.count - a.count);
  });

/** Light version of fetchBillingFn for chips and summaries: just the plan and token balance. */
export const fetchWalletFn = createServerFn({ method: "POST" })
  .validator((data: z.infer<typeof tokenOnly>) => tokenOnly.parse(data))
  .handler(async ({ data }) =>
    guarded(async () => ({
      entitlements: await getEntitlements((await signedIn(data.accessToken)).id),
    })),
  );
