//#region node_modules/.nitro/vite/services/ssr/assets/__23tanstack-start-server-fn-resolver-CESYHpSE.js
var manifest = {
	"253efa051317895311e9f26ce13938b7c75a91b2d290d12a4043ddc8cdaad334": {
		functionName: "submitSurvey_createServerFn_handler",
		importer: () => import("./_ssr/server-fns-BdWofbt7.mjs")
	},
	"314b5d564f37628f5080a28c45b6a32c4c3cc9edb0c1d024f1c7b2508d5b1016": {
		functionName: "bumpGoalFn_createServerFn_handler",
		importer: () => import("./_ssr/server-fns-BdWofbt7.mjs")
	},
	"3344e03ba8cb0e7a49eeb91d8ef38b1f3d14574ed36407709c15b8288f0a9989": {
		functionName: "toggleGoalSubTaskFn_createServerFn_handler",
		importer: () => import("./_ssr/server-fns-BdWofbt7.mjs")
	},
	"500a88227a705844576527860dcf631ec7036b09c2c92a00003ab4b9a7b283e8": {
		functionName: "fetchSurveyStatus_createServerFn_handler",
		importer: () => import("./_ssr/server-fns-BdWofbt7.mjs")
	},
	"6aa4601de618649c0557cd19a0e021db192ac7a774021d6f3d86a7d2d51aa8c7": {
		functionName: "setAutomationEnabledFn_createServerFn_handler",
		importer: () => import("./_ssr/server-fns-BdWofbt7.mjs")
	},
	"863c6881819a89073d67706b473992052eb2b1ebcb8db674b3bdf377d99c628d": {
		functionName: "createGoalFn_createServerFn_handler",
		importer: () => import("./_ssr/server-fns-BdWofbt7.mjs")
	},
	"ccb5f43d9b5f16bc209684b0b39118e358c1115588be86490f95f0867723dc8f": {
		functionName: "fetchAutomations_createServerFn_handler",
		importer: () => import("./_ssr/server-fns-BdWofbt7.mjs")
	},
	"cdf2289d974805f0b50f709d93d6770a68c7bb8b187f5b251d88348598899290": {
		functionName: "fetchConnectorStatuses_createServerFn_handler",
		importer: () => import("./_ssr/server-fns-BdWofbt7.mjs")
	},
	"f44eb82f7bd67a16b74a9711804545b5fb5ebd9337bc31c353c7ab055183d896": {
		functionName: "fetchGoals_createServerFn_handler",
		importer: () => import("./_ssr/server-fns-BdWofbt7.mjs")
	},
	"fcf653d8b6e63db849c13fdd1087755ce92dc967bcc7d3a4eb04ea0533422053": {
		functionName: "deleteGoalFn_createServerFn_handler",
		importer: () => import("./_ssr/server-fns-BdWofbt7.mjs")
	}
};
async function getServerFnById(id, access) {
	const serverFnInfo = manifest[id];
	if (!serverFnInfo) throw new Error("Server function info not found for " + id);
	const fnModule = serverFnInfo.module ?? await serverFnInfo.importer();
	if (!fnModule) throw new Error("Server function module not resolved for " + id);
	const action = fnModule[serverFnInfo.functionName];
	if (!action) throw new Error("Server function module export not resolved for serverFn ID: " + id);
	return action;
}
//#endregion
export { getServerFnById as t };
