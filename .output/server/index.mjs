globalThis.__nitro_main__ = import.meta.url;
import { i as HTTPError, n as defineLazyEventHandler, t as H3Core } from "./_libs/h3+rou3+srvx.mjs";
import { t as HookableCore } from "./_libs/hookable.mjs";
import { t as FastResponse } from "./_libs/srvx.mjs";
//#region #nitro-vite-setup
function lazyService(loader) {
	let promise, mod;
	return { fetch(req) {
		if (mod) return mod.fetch(req);
		if (!promise) promise = loader().then((_mod) => mod = _mod.default || _mod);
		return promise.then((mod) => mod.fetch(req));
	} };
}
var services = { ["ssr"]: lazyService(() => import("./_ssr/ssr.mjs")) };
globalThis.__nitro_vite_envs__ = services;
//#endregion
//#region #nitro/virtual/public-assets-data
var public_assets_data_default = {
	"/favicon.ico": {
		"type": "image/vnd.microsoft.icon",
		"etag": "\"4f95-3RXc3p2mhEAs1WBwaIvE0Y0uu0Y\"",
		"mtime": "2026-09-01T11:02:20.036Z",
		"size": 20373,
		"path": "../public/favicon.ico"
	},
	"/robots.txt": {
		"type": "text/plain; charset=utf-8",
		"etag": "\"a0-CKGXSIe7TSsqDTmGm/nY1t/o5d0\"",
		"mtime": "2026-09-01T11:02:20.036Z",
		"size": 160,
		"path": "../public/robots.txt"
	},
	"/assets/automations-OjXml97y.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"3f34-VSCwXDFm2xZMSdCHNte6fSQfp8k\"",
		"mtime": "2026-09-01T11:02:17.855Z",
		"size": 16180,
		"path": "../public/assets/automations-OjXml97y.js"
	},
	"/assets/circle-check-L4ac3aFH.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"11c2-Z15kzAJg0la1PVJwxEWJMBw6p64\"",
		"mtime": "2026-09-01T11:02:17.855Z",
		"size": 4546,
		"path": "../public/assets/circle-check-L4ac3aFH.js"
	},
	"/assets/arrow-up-right-BNNn1Bqh.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"a0-3lW5GvS1H+dwKqVyi0DTFfVS9t4\"",
		"mtime": "2026-09-01T11:02:17.855Z",
		"size": 160,
		"path": "../public/assets/arrow-up-right-BNNn1Bqh.js"
	},
	"/assets/automation-core-DCCNTH0x.png": {
		"type": "image/png",
		"etag": "\"220b4-QKetSWQn02TFTTjpi7U3R33qvj0\"",
		"mtime": "2026-09-01T11:02:17.856Z",
		"size": 139444,
		"path": "../public/assets/automation-core-DCCNTH0x.png"
	},
	"/assets/analytics-DaWXOAO3.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"fb4a-2Wr9/PuKD1zvNLRgKs8RkPUJR9A\"",
		"mtime": "2026-09-01T11:02:17.855Z",
		"size": 64330,
		"path": "../public/assets/analytics-DaWXOAO3.js"
	},
	"/assets/database-CYn3-bEa.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"ec-d4bwHX7WHk1LSE6fks/cBGD605s\"",
		"mtime": "2026-09-01T11:02:17.856Z",
		"size": 236,
		"path": "../public/assets/database-CYn3-bEa.js"
	},
	"/assets/goals-DO8YXZKG.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"378c-v/74VFGK6OGAAsgQluxXRrHwl4k\"",
		"mtime": "2026-09-01T11:02:17.856Z",
		"size": 14220,
		"path": "../public/assets/goals-DO8YXZKG.js"
	},
	"/assets/automation-live-feed-kJhTzXV8.webp": {
		"type": "image/webp",
		"etag": "\"350e8-pSOdILiT6mkPuldXnSOBCrMmgxs\"",
		"mtime": "2026-09-01T11:02:17.857Z",
		"size": 217320,
		"path": "../public/assets/automation-live-feed-kJhTzXV8.webp"
	},
	"/assets/insight-feed-COA-rpdx.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"a6b-hOKhD7eBR7hE48Iu4E/eV5Mevik\"",
		"mtime": "2026-09-01T11:02:17.856Z",
		"size": 2667,
		"path": "../public/assets/insight-feed-COA-rpdx.js"
	},
	"/assets/loader-circle-4pzzrcC3.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"89-z+oZfRDN6TL8LVed54nRxs1kDdc\"",
		"mtime": "2026-09-01T11:02:17.856Z",
		"size": 137,
		"path": "../public/assets/loader-circle-4pzzrcC3.js"
	},
	"/assets/megaphone-8lybuTjL.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"153-GJVttyRqIAedEaundKAmLFkTurg\"",
		"mtime": "2026-09-01T11:02:17.856Z",
		"size": 339,
		"path": "../public/assets/megaphone-8lybuTjL.js"
	},
	"/assets/memory-JkCgN9AW.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2ce3-YAfGj4RaPINxCRqIf1mBQgV12R8\"",
		"mtime": "2026-09-01T11:02:17.856Z",
		"size": 11491,
		"path": "../public/assets/memory-JkCgN9AW.js"
	},
	"/assets/notifications-BMAIk9Cj.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"aa0-Jigd1t29WmijFXdILjVWFFebbPM\"",
		"mtime": "2026-09-01T11:02:17.856Z",
		"size": 2720,
		"path": "../public/assets/notifications-BMAIk9Cj.js"
	},
	"/assets/plus-DrkacWx1.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"92-gOL5bPUq1woxGKLcC/UdIruSVdI\"",
		"mtime": "2026-09-01T11:02:17.856Z",
		"size": 146,
		"path": "../public/assets/plus-DrkacWx1.js"
	},
	"/assets/routes-CqS9U3t8.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"9642-MpSWbH68Nx1vVcyVtHyunJU5dAw\"",
		"mtime": "2026-09-01T11:02:17.856Z",
		"size": 38466,
		"path": "../public/assets/routes-CqS9U3t8.js"
	},
	"/assets/schedule-Chuq7usB.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"7e33-IuHBHo52/O5hx60muEC5aKhIMy0\"",
		"mtime": "2026-09-01T11:02:17.856Z",
		"size": 32307,
		"path": "../public/assets/schedule-Chuq7usB.js"
	},
	"/assets/settings-HK5jyPad.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"5d9c-aeoVaMLxYf/m6XxmCWSRhXz4WX8\"",
		"mtime": "2026-09-01T11:02:17.856Z",
		"size": 23964,
		"path": "../public/assets/settings-HK5jyPad.js"
	},
	"/assets/styles-DxUbrxpV.css": {
		"type": "text/css; charset=utf-8",
		"etag": "\"17bb6-bNMJK4KK7kXiz1u3Unk2j1lYPdk\"",
		"mtime": "2026-09-01T11:02:17.857Z",
		"size": 97206,
		"path": "../public/assets/styles-DxUbrxpV.css"
	},
	"/assets/currency-BgQugjEG.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"5d04f-KTm5ML+EVj8MsKuXatuw6SOiVNU\"",
		"mtime": "2026-09-01T11:02:17.855Z",
		"size": 381007,
		"path": "../public/assets/currency-BgQugjEG.js"
	},
	"/assets/trash-2-CS9S_M8h.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"141-HbdLc92tVWsFZyi0vYk6/qf5+A0\"",
		"mtime": "2026-09-01T11:02:17.856Z",
		"size": 321,
		"path": "../public/assets/trash-2-CS9S_M8h.js"
	},
	"/assets/app-shell-DE0scVl3.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"7c586-aC8ck6BLO9XbmmZa8lYwt6k/Yp0\"",
		"mtime": "2026-09-01T11:02:17.855Z",
		"size": 509318,
		"path": "../public/assets/app-shell-DE0scVl3.js"
	},
	"/assets/index-CzbFEjf2.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"8bade-r2oTbmaUNYxB+h1C93vcZyXdKFE\"",
		"mtime": "2026-09-01T11:02:17.854Z",
		"size": 572126,
		"path": "../public/assets/index-CzbFEjf2.js"
	}
};
//#endregion
//#region #nitro/virtual/public-assets
var publicAssetBases = {};
function isPublicAssetURL(id = "") {
	if (public_assets_data_default[id]) return true;
	for (const base in publicAssetBases) if (id.startsWith(base)) return true;
	return false;
}
//#endregion
//#region node_modules/.pnpm/nitro@3.0.260603-beta_jiti@2.7.0_vite@8.1.5_@types+node@22.20.1_jiti@2.7.0_/node_modules/nitro/dist/runtime/internal/route-rules.mjs
var headers = ((m) => function headersRouteRule(event) {
	for (const [key, value] of Object.entries(m.options || {})) event.res.headers.set(key, value);
});
//#endregion
//#region #nitro/virtual/routing
var findRouteRules = /* @__PURE__ */ (() => {
	const $0 = [{
		name: "headers",
		route: "/assets/**",
		handler: headers,
		options: { "cache-control": "public, max-age=31536000, immutable" }
	}];
	return (m, p) => {
		let r = [];
		if (p.charCodeAt(p.length - 1) === 47) p = p.slice(0, -1) || "/";
		let s = p.split("/");
		if (s.length > 1) {
			if (s[1] === "assets") r.unshift({
				data: $0,
				params: { "_": s.slice(2).join("/") }
			});
		}
		return r;
	};
})();
var _lazy_BosjE7 = defineLazyEventHandler(() => import("./_chunks/ssr-renderer.mjs"));
var findRoute = /* @__PURE__ */ (() => {
	const data = {
		route: "/**",
		handler: _lazy_BosjE7
	};
	return ((_m, p) => {
		return {
			data,
			params: { "_": p.slice(1) }
		};
	});
})();
[].filter(Boolean);
//#endregion
//#region node_modules/.pnpm/nitro@3.0.260603-beta_jiti@2.7.0_vite@8.1.5_@types+node@22.20.1_jiti@2.7.0_/node_modules/nitro/dist/runtime/internal/error/prod.mjs
var errorHandler = (error, event) => {
	const res = defaultHandler(error, event);
	return new FastResponse(typeof res.body === "string" ? res.body : JSON.stringify(res.body, null, 2), res);
};
function defaultHandler(error, event) {
	const unhandled = error.unhandled ?? !HTTPError.isError(error);
	const { status = 500, statusText = "" } = unhandled ? {} : error;
	if (status === 404) {
		const url = event.url || new URL(event.req.url);
		const baseURL = "/";
		if (/^\/[^/]/.test(baseURL) && !url.pathname.startsWith(baseURL)) return {
			status: 302,
			headers: new Headers({ location: `${baseURL}${url.pathname.slice(1)}${url.search}` })
		};
	}
	const headers = new Headers(unhandled ? {} : error.headers);
	headers.set("content-type", "application/json; charset=utf-8");
	return {
		status,
		statusText,
		headers,
		body: {
			error: true,
			...unhandled ? {
				status,
				unhandled: true
			} : typeof error.toJSON === "function" ? error.toJSON() : {
				status,
				statusText,
				message: error.message
			}
		}
	};
}
//#endregion
//#region #nitro/virtual/error-handler
var errorHandlers = [errorHandler];
async function error_handler_default(error, event) {
	for (const handler of errorHandlers) try {
		const response = await handler(error, event, { defaultHandler });
		if (response) return response;
	} catch (error) {
		console.error(error);
	}
}
//#endregion
//#region #nitro/virtual/app
function createNitroApp() {
	const captureError = (error, errorCtx) => {
		if (errorCtx?.event) {
			const errors = errorCtx.event.req.context?.nitro?.errors;
			if (errors) errors.push({
				error,
				context: errorCtx
			});
		}
	};
	const h3App = createH3App({ onError(error, event) {
		return error_handler_default(error, event);
	} });
	let appHandler = (req) => {
		req.context ||= {};
		req.context.nitro = req.context.nitro || { errors: [] };
		return h3App.fetch(req);
	};
	return {
		fetch: appHandler,
		h3: h3App,
		hooks: void 0,
		captureError
	};
}
function createH3App(config) {
	const h3App = new H3Core(config);
	h3App["~findRoute"] = (event) => findRoute(event.req.method, event.url.pathname);
	h3App["~getMiddleware"] = (event, route) => {
		const pathname = event.url.pathname;
		const method = event.req.method;
		const middleware = [];
		const routeRules = getRouteRules(method, pathname);
		event.context.routeRules = routeRules?.routeRules;
		if (routeRules?.routeRuleMiddleware.length) middleware.push(...routeRules.routeRuleMiddleware);
		if (route?.data?.middleware?.length) middleware.push(...route.data.middleware);
		return middleware;
	};
	return h3App;
}
//#endregion
//#region node_modules/.pnpm/nitro@3.0.260603-beta_jiti@2.7.0_vite@8.1.5_@types+node@22.20.1_jiti@2.7.0_/node_modules/nitro/dist/runtime/internal/app.mjs
var APP_ID = "default";
function useNitroApp() {
	let instance = useNitroApp._instance;
	if (instance) return instance;
	instance = useNitroApp._instance = createNitroApp();
	globalThis.__nitro__ = globalThis.__nitro__ || {};
	globalThis.__nitro__[APP_ID] = instance;
	return instance;
}
function useNitroHooks() {
	const nitroApp = useNitroApp();
	const hooks = nitroApp.hooks;
	if (hooks) return hooks;
	return nitroApp.hooks = new HookableCore();
}
function getRouteRules(method, pathname) {
	const m = findRouteRules(method, pathname);
	if (!m?.length) return { routeRuleMiddleware: [] };
	const routeRules = {};
	for (const layer of m) for (const rule of layer.data) {
		const currentRule = routeRules[rule.name];
		if (currentRule) {
			if (rule.options === false) {
				delete routeRules[rule.name];
				continue;
			}
			if (typeof currentRule.options === "object" && typeof rule.options === "object") currentRule.options = {
				...currentRule.options,
				...rule.options
			};
			else currentRule.options = rule.options;
			currentRule.route = rule.route;
			currentRule.params = {
				...currentRule.params,
				...layer.params
			};
		} else if (rule.options !== false) routeRules[rule.name] = {
			...rule,
			params: layer.params
		};
	}
	const middleware = [];
	const orderedRules = Object.values(routeRules).sort((a, b) => (a.handler?.order || 0) - (b.handler?.order || 0));
	for (const rule of orderedRules) {
		if (rule.options === false || !rule.handler) continue;
		middleware.push(rule.handler(rule));
	}
	return {
		routeRules,
		routeRuleMiddleware: middleware
	};
}
//#endregion
//#region node_modules/.pnpm/nitro@3.0.260603-beta_jiti@2.7.0_vite@8.1.5_@types+node@22.20.1_jiti@2.7.0_/node_modules/nitro/dist/presets/cloudflare/runtime/_module-handler.mjs
function createHandler(hooks) {
	const nitroApp = useNitroApp();
	const nitroHooks = useNitroHooks();
	return {
		async fetch(request, env, context) {
			globalThis.__env__ = env;
			augmentReq(request, {
				env,
				context
			});
			const ctxExt = {};
			const url = new URL(request.url);
			if (hooks.fetch) {
				const res = await hooks.fetch(request, env, context, url, ctxExt);
				if (res) return res;
			}
			return await nitroApp.fetch(request);
		},
		scheduled(controller, env, context) {
			globalThis.__env__ = env;
			context.waitUntil(nitroHooks.callHook("cloudflare:scheduled", {
				controller,
				env,
				context
			}) || Promise.resolve());
		},
		email(message, env, context) {
			globalThis.__env__ = env;
			context.waitUntil(nitroHooks.callHook("cloudflare:email", {
				message,
				event: message,
				env,
				context
			}) || Promise.resolve());
		},
		queue(batch, env, context) {
			globalThis.__env__ = env;
			context.waitUntil(nitroHooks.callHook("cloudflare:queue", {
				batch,
				event: batch,
				env,
				context
			}) || Promise.resolve());
		},
		tail(traces, env, context) {
			globalThis.__env__ = env;
			context.waitUntil(nitroHooks.callHook("cloudflare:tail", {
				traces,
				env,
				context
			}) || Promise.resolve());
		},
		trace(traces, env, context) {
			globalThis.__env__ = env;
			context.waitUntil(nitroHooks.callHook("cloudflare:trace", {
				traces,
				env,
				context
			}) || Promise.resolve());
		}
	};
}
function augmentReq(cfReq, ctx) {
	const req = cfReq;
	req.ip = cfReq.headers.get("cf-connecting-ip") || void 0;
	req.runtime ??= { name: "cloudflare" };
	req.runtime.cloudflare = {
		...req.runtime.cloudflare,
		...ctx
	};
	req.waitUntil = ctx.context?.waitUntil.bind(ctx.context);
}
//#endregion
//#region node_modules/.pnpm/nitro@3.0.260603-beta_jiti@2.7.0_vite@8.1.5_@types+node@22.20.1_jiti@2.7.0_/node_modules/nitro/dist/presets/cloudflare/runtime/cloudflare-module.mjs
var cloudflare_module_default = createHandler({ fetch(cfRequest, env, context, url) {
	if (env.ASSETS && isPublicAssetURL(url.pathname)) return env.ASSETS.fetch(cfRequest);
} });
//#endregion
export { cloudflare_module_default as default };
