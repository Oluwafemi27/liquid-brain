import { c as createServerFn, i as TSS_SERVER_FUNCTION } from "./createServerFn-Dp-V928M.mjs";
import { a as isOAuth, c as verifyAccessToken, i as getSurvey, n as getProvider, o as saveSurvey, r as getSupabaseAdmin, t as DEFAULT_WORKSPACE_ID } from "./survey-BYFoAF1g.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/server-fns-BdWofbt7.js
var createServerRpc = (serverFnMeta, splitImportFn) => {
	const url = "/_serverFn/" + serverFnMeta.id;
	return Object.assign(splitImportFn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
function fromRow$1(row) {
	return {
		id: row.id,
		name: row.name,
		enabled: row.enabled,
		trigger: row.trigger,
		action: row.action,
		goal: row.goal,
		runs: row.runs
	};
}
async function listAutomations() {
	const db = getSupabaseAdmin();
	if (!db) return [];
	const { data, error } = await db.from("automations").select("id, name, enabled, trigger, action, goal, runs").eq("workspace_id", DEFAULT_WORKSPACE_ID).order("name");
	if (error) {
		console.error("[automations] failed to list automations", error);
		return [];
	}
	return (data ?? []).map((row) => fromRow$1(row));
}
async function setAutomationEnabled(id, enabled) {
	const db = getSupabaseAdmin();
	if (!db) return null;
	const { data, error } = await db.from("automations").update({
		enabled,
		updated_at: (/* @__PURE__ */ new Date()).toISOString()
	}).eq("workspace_id", DEFAULT_WORKSPACE_ID).eq("id", id).select("id, name, enabled, trigger, action, goal, runs").single();
	if (error || !data) {
		console.error("[automations] failed to update automation", error);
		return null;
	}
	return fromRow$1(data);
}
/** Real connection state for every known provider, merging Supabase rows
*  (if a backend is configured) with which providers have OAuth app
*  credentials set at all. Never throws — callers always get a full map. */
async function getConnectorStatuses() {
	const ids = [
		"shopify",
		"ga",
		"whatsapp",
		"paystack",
		"meta",
		"sheets"
	];
	const base = {};
	for (const id of ids) {
		const provider = getProvider(id);
		base[id] = {
			id,
			connected: false,
			configured: Boolean(provider && isOAuth(provider) && provider.clientId && provider.clientSecret)
		};
	}
	const db = getSupabaseAdmin();
	if (!db) return base;
	const { data, error } = await db.from("connectors").select("id, connected").eq("workspace_id", DEFAULT_WORKSPACE_ID);
	if (error) {
		console.error("[connectors] failed to read connector status", error);
		return base;
	}
	for (const row of data ?? []) {
		const entry = base[row.id];
		if (entry) entry.connected = Boolean(row.connected);
	}
	return base;
}
function fromRow(row) {
	return {
		id: row.id,
		title: row.title,
		target: row.target,
		current: row.current,
		currency: row.currency,
		due: row.due,
		subTasks: row.sub_tasks ?? []
	};
}
/** Every goal for the workspace, newest first. Returns [] if no backend is
*  configured — the app runs fine without persistence, it just won't have
*  goals survive a reload. */
async function listGoals() {
	const db = getSupabaseAdmin();
	if (!db) return [];
	const { data, error } = await db.from("goals").select("id, title, target, current, currency, due, sub_tasks").eq("workspace_id", DEFAULT_WORKSPACE_ID).order("created_at", { ascending: true });
	if (error) {
		console.error("[goals] failed to list goals", error);
		return [];
	}
	return (data ?? []).map(fromRow);
}
async function createGoal(title, target, currency) {
	const db = getSupabaseAdmin();
	if (!db) return null;
	const { data, error } = await db.from("goals").insert({
		workspace_id: DEFAULT_WORKSPACE_ID,
		title,
		target,
		currency
	}).select("id, title, target, current, currency, due, sub_tasks").single();
	if (error || !data) {
		console.error("[goals] failed to create goal", error);
		return null;
	}
	return fromRow(data);
}
/** Adds `amount` to a goal's current progress (clamped to >= 0). */
async function bumpGoal(goalId, amount) {
	const db = getSupabaseAdmin();
	if (!db) return null;
	const { data: existing, error: readError } = await db.from("goals").select("current").eq("workspace_id", DEFAULT_WORKSPACE_ID).eq("id", goalId).single();
	if (readError || !existing) {
		console.error("[goals] failed to read goal before bump", readError);
		return null;
	}
	const nextCurrent = Math.max(0, Number(existing["current"]) + amount);
	const { data, error } = await db.from("goals").update({
		current: nextCurrent,
		updated_at: (/* @__PURE__ */ new Date()).toISOString()
	}).eq("workspace_id", DEFAULT_WORKSPACE_ID).eq("id", goalId).select("id, title, target, current, currency, due, sub_tasks").single();
	if (error || !data) {
		console.error("[goals] failed to bump goal", error);
		return null;
	}
	return fromRow(data);
}
async function toggleGoalSubTask(goalId, taskId) {
	const db = getSupabaseAdmin();
	if (!db) return null;
	const { data: existing, error: readError } = await db.from("goals").select("sub_tasks").eq("workspace_id", DEFAULT_WORKSPACE_ID).eq("id", goalId).single();
	if (readError || !existing) {
		console.error("[goals] failed to read goal before subtask toggle", readError);
		return null;
	}
	const nextSubTasks = (existing["sub_tasks"] ?? []).map((t) => t.id === taskId ? {
		...t,
		done: !t.done
	} : t);
	const { data, error } = await db.from("goals").update({
		sub_tasks: nextSubTasks,
		updated_at: (/* @__PURE__ */ new Date()).toISOString()
	}).eq("workspace_id", DEFAULT_WORKSPACE_ID).eq("id", goalId).select("id, title, target, current, currency, due, sub_tasks").single();
	if (error || !data) {
		console.error("[goals] failed to toggle subtask", error);
		return null;
	}
	return fromRow(data);
}
async function deleteGoal(goalId) {
	const db = getSupabaseAdmin();
	if (!db) return false;
	const { error } = await db.from("goals").delete().eq("workspace_id", DEFAULT_WORKSPACE_ID).eq("id", goalId);
	if (error) {
		console.error("[goals] failed to delete goal", error);
		return false;
	}
	return true;
}
var fetchConnectorStatuses_createServerFn_handler = createServerRpc({
	id: "cdf2289d974805f0b50f709d93d6770a68c7bb8b187f5b251d88348598899290",
	name: "fetchConnectorStatuses",
	filename: "src/lib/server-fns.ts"
}, (opts) => fetchConnectorStatuses.__executeServer(opts));
var fetchConnectorStatuses = createServerFn({ method: "GET" }).handler(fetchConnectorStatuses_createServerFn_handler, async () => {
	return getConnectorStatuses();
});
var fetchGoals_createServerFn_handler = createServerRpc({
	id: "f44eb82f7bd67a16b74a9711804545b5fb5ebd9337bc31c353c7ab055183d896",
	name: "fetchGoals",
	filename: "src/lib/server-fns.ts"
}, (opts) => fetchGoals.__executeServer(opts));
var fetchGoals = createServerFn({ method: "GET" }).handler(fetchGoals_createServerFn_handler, async () => {
	return listGoals();
});
var fetchAutomations_createServerFn_handler = createServerRpc({
	id: "ccb5f43d9b5f16bc209684b0b39118e358c1115588be86490f95f0867723dc8f",
	name: "fetchAutomations",
	filename: "src/lib/server-fns.ts"
}, (opts) => fetchAutomations.__executeServer(opts));
var fetchAutomations = createServerFn({ method: "GET" }).handler(fetchAutomations_createServerFn_handler, async () => {
	return listAutomations();
});
var setAutomationEnabledFn_createServerFn_handler = createServerRpc({
	id: "6aa4601de618649c0557cd19a0e021db192ac7a774021d6f3d86a7d2d51aa8c7",
	name: "setAutomationEnabledFn",
	filename: "src/lib/server-fns.ts"
}, (opts) => setAutomationEnabledFn.__executeServer(opts));
var setAutomationEnabledFn = createServerFn({ method: "POST" }).validator((data) => data).handler(setAutomationEnabledFn_createServerFn_handler, async ({ data }) => {
	return setAutomationEnabled(data.id, data.enabled);
});
var createGoalFn_createServerFn_handler = createServerRpc({
	id: "863c6881819a89073d67706b473992052eb2b1ebcb8db674b3bdf377d99c628d",
	name: "createGoalFn",
	filename: "src/lib/server-fns.ts"
}, (opts) => createGoalFn.__executeServer(opts));
var createGoalFn = createServerFn({ method: "POST" }).validator((data) => data).handler(createGoalFn_createServerFn_handler, async ({ data }) => {
	return createGoal(data.title, data.target, data.currency);
});
var bumpGoalFn_createServerFn_handler = createServerRpc({
	id: "314b5d564f37628f5080a28c45b6a32c4c3cc9edb0c1d024f1c7b2508d5b1016",
	name: "bumpGoalFn",
	filename: "src/lib/server-fns.ts"
}, (opts) => bumpGoalFn.__executeServer(opts));
var bumpGoalFn = createServerFn({ method: "POST" }).validator((data) => data).handler(bumpGoalFn_createServerFn_handler, async ({ data }) => {
	return bumpGoal(data.goalId, data.amount);
});
var toggleGoalSubTaskFn_createServerFn_handler = createServerRpc({
	id: "3344e03ba8cb0e7a49eeb91d8ef38b1f3d14574ed36407709c15b8288f0a9989",
	name: "toggleGoalSubTaskFn",
	filename: "src/lib/server-fns.ts"
}, (opts) => toggleGoalSubTaskFn.__executeServer(opts));
var toggleGoalSubTaskFn = createServerFn({ method: "POST" }).validator((data) => data).handler(toggleGoalSubTaskFn_createServerFn_handler, async ({ data }) => {
	return toggleGoalSubTask(data.goalId, data.taskId);
});
var deleteGoalFn_createServerFn_handler = createServerRpc({
	id: "fcf653d8b6e63db849c13fdd1087755ce92dc967bcc7d3a4eb04ea0533422053",
	name: "deleteGoalFn",
	filename: "src/lib/server-fns.ts"
}, (opts) => deleteGoalFn.__executeServer(opts));
var deleteGoalFn = createServerFn({ method: "POST" }).validator((data) => data).handler(deleteGoalFn_createServerFn_handler, async ({ data }) => {
	return { ok: await deleteGoal(data.goalId) };
});
var fetchSurveyStatus_createServerFn_handler = createServerRpc({
	id: "500a88227a705844576527860dcf631ec7036b09c2c92a00003ab4b9a7b283e8",
	name: "fetchSurveyStatus",
	filename: "src/lib/server-fns.ts"
}, (opts) => fetchSurveyStatus.__executeServer(opts));
var fetchSurveyStatus = createServerFn({ method: "POST" }).validator((data) => data).handler(fetchSurveyStatus_createServerFn_handler, async ({ data }) => {
	const user = await verifyAccessToken(data.accessToken);
	if (!user) return { status: "signed-out" };
	const survey = await getSurvey(user.id);
	if (survey === null) return { status: "unconfigured" };
	return { status: survey ? "done" : "pending" };
});
var submitSurvey_createServerFn_handler = createServerRpc({
	id: "253efa051317895311e9f26ce13938b7c75a91b2d290d12a4043ddc8cdaad334",
	name: "submitSurvey",
	filename: "src/lib/server-fns.ts"
}, (opts) => submitSurvey.__executeServer(opts));
var submitSurvey = createServerFn({ method: "POST" }).validator((data) => data).handler(submitSurvey_createServerFn_handler, async ({ data }) => {
	const user = await verifyAccessToken(data.accessToken);
	if (!user) throw new Error("Not signed in.");
	await saveSurvey(user.id, user.email, data.survey);
	return { ok: true };
});
//#endregion
export { bumpGoalFn_createServerFn_handler, createGoalFn_createServerFn_handler, deleteGoalFn_createServerFn_handler, fetchAutomations_createServerFn_handler, fetchConnectorStatuses_createServerFn_handler, fetchGoals_createServerFn_handler, fetchSurveyStatus_createServerFn_handler, setAutomationEnabledFn_createServerFn_handler, submitSurvey_createServerFn_handler, toggleGoalSubTaskFn_createServerFn_handler };
