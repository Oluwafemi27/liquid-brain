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
	"/robots.txt": {
		"type": "text/plain; charset=utf-8",
		"etag": "\"a0-CKGXSIe7TSsqDTmGm/nY1t/o5d0\"",
		"mtime": "2026-09-01T10:53:04.330Z",
		"size": 160,
		"path": "../public/robots.txt"
	},
	"/assets/arrow-up-right-DWerd3xh.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"a0-kyeFxW5YscRqq9ZQbeFo1/D0s5E\"",
		"mtime": "2026-09-01T10:53:01.928Z",
		"size": 160,
		"path": "../public/assets/arrow-up-right-DWerd3xh.js"
	},
	"/assets/analytics-DO1aV_sa.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"fb4a-GHZyC1UNHDf5TlenK215FF79Km0\"",
		"mtime": "2026-09-01T10:53:01.928Z",
		"size": 64330,
		"path": "../public/assets/analytics-DO1aV_sa.js"
	},
	"/assets/automations-CEB2X5OI.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"3f34-F1JqhgxzVMNmCIAryBkPryuT8I4\"",
		"mtime": "2026-09-01T10:53:01.928Z",
		"size": 16180,
		"path": "../public/assets/automations-CEB2X5OI.js"
	},
	"/favicon.ico": {
		"type": "image/vnd.microsoft.icon",
		"etag": "\"4f95-3RXc3p2mhEAs1WBwaIvE0Y0uu0Y\"",
		"mtime": "2026-09-01T10:53:04.330Z",
		"size": 20373,
		"path": "../public/favicon.ico"
	},
	"/assets/automation-core-DCCNTH0x.png": {
		"type": "image/png",
		"etag": "\"220b4-QKetSWQn02TFTTjpi7U3R33qvj0\"",
		"mtime": "2026-09-01T10:53:01.929Z",
		"size": 139444,
		"path": "../public/assets/automation-core-DCCNTH0x.png"
	},
	"/assets/goals-DctBNhAW.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"378c-0gzqIlLZmvuV/bu3Zsm7K+jQAQ0\"",
		"mtime": "2026-09-01T10:53:01.929Z",
		"size": 14220,
		"path": "../public/assets/goals-DctBNhAW.js"
	},
	"/assets/database-9Ttny6aK.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"ec-2dy0g1xfIw+OiDDU7f2+eX+crWg\"",
		"mtime": "2026-09-01T10:53:01.929Z",
		"size": 236,
		"path": "../public/assets/database-9Ttny6aK.js"
	},
	"/assets/circle-check-CZbijUTE.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"11c2-vHS7lGIcJ2ijfO451cVh4xOik/k\"",
		"mtime": "2026-09-01T10:53:01.928Z",
		"size": 4546,
		"path": "../public/assets/circle-check-CZbijUTE.js"
	},
	"/assets/insight-feed-CdGiMdJ2.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"a6b-WP0lRJLjM1eut6HGhtSjhmSRYs8\"",
		"mtime": "2026-09-01T10:53:01.929Z",
		"size": 2667,
		"path": "../public/assets/insight-feed-CdGiMdJ2.js"
	},
	"/assets/automation-live-feed-kJhTzXV8.webp": {
		"type": "image/webp",
		"etag": "\"350e8-pSOdILiT6mkPuldXnSOBCrMmgxs\"",
		"mtime": "2026-09-01T10:53:01.929Z",
		"size": 217320,
		"path": "../public/assets/automation-live-feed-kJhTzXV8.webp"
	},
	"/assets/loader-circle-6SuvEnmo.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"89-tXkkCKpMr4KI9QHCkgQvwZCqq5g\"",
		"mtime": "2026-09-01T10:53:01.929Z",
		"size": 137,
		"path": "../public/assets/loader-circle-6SuvEnmo.js"
	},
	"/assets/megaphone-CfyDvAkE.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"153-Bx5Gb9/yDSHiG0RPpTtZjW8+PKI\"",
		"mtime": "2026-09-01T10:53:01.929Z",
		"size": 339,
		"path": "../public/assets/megaphone-CfyDvAkE.js"
	},
	"/assets/memory-ZE09KB1U.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2ce3-5tQ9VL0pq4C7fgSxBO9JYsqPifc\"",
		"mtime": "2026-09-01T10:53:01.929Z",
		"size": 11491,
		"path": "../public/assets/memory-ZE09KB1U.js"
	},
	"/assets/notifications-CISaA_wV.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"aa0-BI6yJC4xcF2BwLsidndH3yvPVsU\"",
		"mtime": "2026-09-01T10:53:01.929Z",
		"size": 2720,
		"path": "../public/assets/notifications-CISaA_wV.js"
	},
	"/assets/plus-B4W6dYGC.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"92-qMQx+qHk6WZThawqsdk8SCVXoMc\"",
		"mtime": "2026-09-01T10:53:01.929Z",
		"size": 146,
		"path": "../public/assets/plus-B4W6dYGC.js"
	},
	"/assets/routes-3cditIri.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"9642-Wy0qt21gkCPOM1VlbPbE7dCc5JY\"",
		"mtime": "2026-09-01T10:53:01.929Z",
		"size": 38466,
		"path": "../public/assets/routes-3cditIri.js"
	},
	"/assets/currency-CAtWriOw.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"5d04f-Qkq/IVD5mpaAWYqd0MXgEJQfwSY\"",
		"mtime": "2026-09-01T10:53:01.928Z",
		"size": 381007,
		"path": "../public/assets/currency-CAtWriOw.js"
	},
	"/assets/schedule-UJQX_5qe.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"7e33-U2TyRCRMbGMvUz5zqoEk19YMw0Y\"",
		"mtime": "2026-09-01T10:53:01.929Z",
		"size": 32307,
		"path": "../public/assets/schedule-UJQX_5qe.js"
	},
	"/assets/settings-DWFUrZIG.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"5d88-V6yVXnAs7K5LiHZOKN8QfYPNsag\"",
		"mtime": "2026-09-01T10:53:01.929Z",
		"size": 23944,
		"path": "../public/assets/settings-DWFUrZIG.js"
	},
	"/assets/trash-2-BxHCivgg.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"141-18DqEzcRtg1tLqY/UL/fHWgKDLU\"",
		"mtime": "2026-09-01T10:53:01.929Z",
		"size": 321,
		"path": "../public/assets/trash-2-BxHCivgg.js"
	},
	"/assets/app-shell-BL0btWDT.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"7c576-YoPYB1M3JfE3rRs3WY3Vk4RxahM\"",
		"mtime": "2026-09-01T10:53:01.928Z",
		"size": 509302,
		"path": "../public/assets/app-shell-BL0btWDT.js"
	},
	"/assets/styles-DVfStP7e.css": {
		"type": "text/css; charset=utf-8",
		"etag": "\"17b88-hMz8CAOXAy4wS1ZJkpSM8tEZDQ4\"",
		"mtime": "2026-09-01T10:53:01.929Z",
		"size": 97160,
		"path": "../public/assets/styles-DVfStP7e.css"
	},
	"/assets/index-D01_2MPh.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"8bade-w8+Uw5ujLfPaOaHCD+tqrpmFhvs\"",
		"mtime": "2026-09-01T10:53:01.927Z",
		"size": 572126,
		"path": "../public/assets/index-D01_2MPh.js"
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
