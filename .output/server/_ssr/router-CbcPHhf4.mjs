import { a as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { c as lazyRouteComponent, d as Link, f as useRouter, i as HeadContent, l as createFileRoute, o as createRouter, r as Scripts, s as Outlet, u as createRootRouteWithContext } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as Sandbox } from "../_libs/@e2b/code-interpreter+[...].mjs";
import { t as require_jsx_dev_runtime } from "../_libs/react.mjs";
import { a as isOAuth, c as verifyAccessToken, i as getSurvey, n as getProvider, r as getSupabaseAdmin, s as surveyToContext, t as DEFAULT_WORKSPACE_ID } from "./survey-BYFoAF1g.mjs";
import { t as QueryClientProvider } from "../_libs/tanstack__react-query.mjs";
import { t as QueryClient } from "../_libs/tanstack__query-core.mjs";
import { a as enumType, c as objectType, i as discriminatedUnionType, l as stringType, n as arrayType, o as literalType, r as booleanType, s as numberType, t as anyType } from "../_libs/zod.mjs";
import { i as TextRun, n as Packer, r as Paragraph, t as File } from "../_libs/docx.mjs";
import { t as require_lib } from "../_libs/mammoth+[...].mjs";
import { n as StandardFonts, r as rgb, t as PDFDocument } from "../_libs/pdf-lib+tslib.mjs";
import processModule from "node:process";
import { Buffer } from "node:buffer";
import { randomBytes } from "node:crypto";
//#region node_modules/.nitro/vite/services/ssr/assets/router-CbcPHhf4.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_dev_runtime = require_jsx_dev_runtime();
var import_lib = /* @__PURE__ */ __toESM(require_lib());
var styles_default = "/assets/styles-DVfStP7e.css";
function reportAppError(error, context = {}) {
	if (typeof window === "undefined") return;
	window.__errorMonitor?.captureException?.(error, {
		source: "react_error_boundary",
		route: window.location.pathname,
		...context
	}, {
		mechanism: "react_error_boundary",
		handled: false,
		severity: "error"
	});
	const message = error instanceof Response ? `Response ${error.status}${error.url ? ` at ${error.url}` : ""}` : error instanceof Error ? error.message : String(error);
	const stack = error instanceof Error ? error.stack : void 0;
	window.__reportRuntimeError?.({
		message,
		...stack !== void 0 && { stack },
		filename: window.location.pathname
	});
}
var _jsxFileName = "/root/app/code/src/routes/__root.tsx";
function NotFoundComponent() {
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "flex min-h-screen items-center justify-center bg-background px-4",
		children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
			className: "max-w-md text-center",
			children: [
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h1", {
					className: "text-7xl font-bold text-foreground",
					children: "404"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 19,
					columnNumber: 9
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h2", {
					className: "mt-4 text-xl font-semibold text-foreground",
					children: "Page not found"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 20,
					columnNumber: 9
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
					className: "mt-2 text-sm text-muted-foreground",
					children: "The page you're looking for doesn't exist or has been moved."
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 21,
					columnNumber: 9
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "mt-6",
					children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Link, {
						to: "/",
						className: "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90",
						children: "Go home"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 25,
						columnNumber: 11
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 24,
					columnNumber: 9
				}, this)
			]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 18,
			columnNumber: 7
		}, this)
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 17,
		columnNumber: 5
	}, this);
}
function ErrorComponent({ error, reset }) {
	console.error(error);
	const router = useRouter();
	(0, import_react.useEffect)(() => {
		reportAppError(error, { boundary: "tanstack_root_error_component" });
	}, [error]);
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "flex min-h-screen items-center justify-center bg-background px-4",
		children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
			className: "max-w-md text-center",
			children: [
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h1", {
					className: "text-xl font-semibold tracking-tight text-foreground",
					children: "This page didn't load"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 47,
					columnNumber: 9
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
					className: "mt-2 text-sm text-muted-foreground",
					children: "Something went wrong on our end. You can try refreshing or head back home."
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 50,
					columnNumber: 9
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "mt-6 flex flex-wrap justify-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", {
						onClick: () => {
							router.invalidate();
							reset();
						},
						className: "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90",
						children: "Try again"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 54,
						columnNumber: 11
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("a", {
						href: "/",
						className: "inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent",
						children: "Go home"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 63,
						columnNumber: 11
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 53,
					columnNumber: 9
				}, this)
			]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 46,
			columnNumber: 7
		}, this)
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 45,
		columnNumber: 5
	}, this);
}
var Route$22 = createRootRouteWithContext()({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1"
			},
			{ title: "ADUF AI — The Business Brain for SMBs" },
			{
				name: "description",
				content: "ADUF AI is an always-on AI COO for small businesses."
			},
			{
				property: "og:title",
				content: "ADUF AI — The Business Brain for SMBs"
			},
			{
				property: "og:description",
				content: "ADUF AI is an always-on AI COO for small businesses."
			},
			{
				property: "og:type",
				content: "website"
			},
			{
				name: "twitter:card",
				content: "summary_large_image"
			}
		],
		links: [{
			rel: "stylesheet",
			href: styles_default
		}, {
			rel: "icon",
			href: "/favicon.ico",
			type: "image/x-icon"
		}]
	}),
	shellComponent: RootShell,
	component: RootComponent,
	notFoundComponent: NotFoundComponent,
	errorComponent: ErrorComponent
});
function RootShell({ children }) {
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("html", {
		lang: "en",
		children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("head", { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(HeadContent, {}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 111,
			columnNumber: 9
		}, this) }, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 110,
			columnNumber: 7
		}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("body", { children: [children, /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Scripts, {}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 115,
			columnNumber: 9
		}, this)] }, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 113,
			columnNumber: 7
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 109,
		columnNumber: 5
	}, this);
}
function RootComponent() {
	const { queryClient } = Route$22.useRouteContext();
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(QueryClientProvider, {
		client: queryClient,
		children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Outlet, {}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 127,
			columnNumber: 7
		}, this)
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 125,
		columnNumber: 5
	}, this);
}
var $$splitComponentImporter$7 = () => import("./routes-Bn26yD_n.mjs");
var Route$21 = createFileRoute("/")({
	head: () => ({ meta: [
		{ title: "ADUF AI — The Business Brain for SMBs" },
		{
			name: "description",
			content: "ADUF AI is an always-on COO for small businesses: chat with your brain to get live insight, KPI tracking, goals and no-code automations."
		},
		{
			property: "og:title",
			content: "ADUF AI — The Business Brain for SMBs"
		},
		{
			property: "og:description",
			content: "An always-on AI COO that watches your sales, leads and retention, then acts across WhatsApp, ads, CRM and payments."
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$7, "component")
});
/** Top-of-page dashboard: up to 3 goals as progress rings, with dashed
*  placeholder slots (linking to /goals) filling any remaining space. */
/** Compact insight/notification preview — the full history lives on
*  /notifications; this shows the freshest few inline on the Brain page. */
var $$splitComponentImporter$6 = () => import("./analytics-BstRKIkf.mjs");
var Route$20 = createFileRoute("/analytics")({
	head: () => ({ meta: [
		{ title: "Analytics & What-If Simulator — ADUF AI" },
		{
			name: "description",
			content: "Liquid reports for sales, leads and retention plus a what-if simulator that predicts the impact of extra ad spend before you commit."
		},
		{
			property: "og:title",
			content: "Analytics & What-If Simulator — ADUF AI"
		},
		{
			property: "og:description",
			content: "Model the outcome of a spend change before you spend a naira."
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$6, "component")
});
var $$splitComponentImporter$5 = () => import("./automations-CLRMPiLB.mjs");
/** Hexagon outline, drawn point-up so its six vertices line up with the six
*  orbiting channel nodes below. Pure decoration — no hit targets. */
var Route$19 = createFileRoute("/automations")({
	head: () => ({ meta: [
		{ title: "Automation Grid — ADUF AI" },
		{
			name: "description",
			content: "Toggle no-code automations across website, WhatsApp, CRM, payments, ads and email from one orbiting channel galaxy."
		},
		{
			property: "og:title",
			content: "Automation Grid — ADUF AI"
		},
		{
			property: "og:description",
			content: "No-code automations for every channel, wired straight into your goals."
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$5, "component")
});
var $$splitComponentImporter$4 = () => import("./goals-Bu7zVt-I.mjs");
var Route$18 = createFileRoute("/goals")({
	head: () => ({ meta: [
		{ title: "Goals Engine — ADUF AI" },
		{
			name: "description",
			content: "Set business KPIs and watch progress fill live goal orbs — sales targets, lead volume and retention, each broken into sub-tasks ADUF works on."
		},
		{
			property: "og:title",
			content: "Goals Engine — ADUF AI"
		},
		{
			property: "og:description",
			content: "Track every business KPI as a liquid goal orb that fills as you progress."
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$4, "component")
});
var $$splitComponentImporter$3 = () => import("./memory-BRLuxqbQ.mjs");
var Route$17 = createFileRoute("/memory")({
	head: () => ({ meta: [
		{ title: "Business Memory — ADUF AI" },
		{
			name: "description",
			content: "See everything ADUF knows about your business as a living knowledge graph of customers, products, revenue and traffic."
		},
		{
			property: "og:title",
			content: "Business Memory — ADUF AI"
		},
		{
			property: "og:description",
			content: "A living knowledge graph of every fact ADUF has learned about your business."
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$3, "component")
});
var $$splitComponentImporter$2 = () => import("./notifications-BRb1jI3A.mjs");
var Route$16 = createFileRoute("/notifications")({
	head: () => ({ meta: [
		{ title: "Notifications — ADUF AI" },
		{
			name: "description",
			content: "Every insight ADUF has surfaced — goals hit, automations toggled, sources connected — in one feed."
		},
		{
			property: "og:title",
			content: "Notifications — ADUF AI"
		},
		{
			property: "og:description",
			content: "The full history of what your business brain has noticed."
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$2, "component")
});
var $$splitComponentImporter$1 = () => import("./schedule-B04Y3jRT.mjs");
var Route$15 = createFileRoute("/schedule")({
	head: () => ({ meta: [
		{ title: "Schedule — ADUF AI" },
		{
			name: "description",
			content: "Plan your business week — meetings, content, campaigns and automations — laid out by day and time."
		},
		{
			property: "og:title",
			content: "Schedule — ADUF AI"
		},
		{
			property: "og:description",
			content: "A day-by-day, time-blocked schedule for everything ADUF is helping you run."
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$1, "component")
});
/** "14:05" -> "2:05 PM" */
var $$splitComponentImporter = () => import("./settings-DsVyOeVK.mjs");
/** Providers with a real OAuth redirect flow (see src/lib/server/oauth-providers.ts).
*  Everything else (currently just Paystack, which is key-based) keeps the
*  local demo "pour" animation until a real key-entry flow is built. */
var Route$14 = createFileRoute("/settings")({
	head: () => ({ meta: [
		{ title: "Settings & Integrations — ADUF AI" },
		{
			name: "description",
			content: "Manage your ADUF profile, autonomy level and connected integrations — commerce, payments, ads and messaging in one place."
		},
		{
			property: "og:title",
			content: "Settings & Integrations — ADUF AI"
		},
		{
			property: "og:description",
			content: "Control how much ADUF can act on its own, and what it is connected to."
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
/** Mirrors the `model_providers` table (see supabase/schema.sql) — kept in
*  code too so the app works even before/without a DB round trip. */
var MODEL_PROVIDERS = {
	openai: {
		id: "openai",
		displayName: "ChatGPT (OpenAI)",
		apiStyle: "openai_compatible",
		baseUrl: "https://api.openai.com/v1",
		defaultModel: "gpt-5-mini"
	},
	anthropic: {
		id: "anthropic",
		displayName: "Claude (Anthropic)",
		apiStyle: "anthropic",
		baseUrl: "https://api.anthropic.com/v1",
		defaultModel: "claude-sonnet-4-6"
	},
	gemini: {
		id: "gemini",
		displayName: "Gemini (Google)",
		apiStyle: "gemini",
		baseUrl: "https://generativelanguage.googleapis.com/v1beta",
		defaultModel: "gemini-2.5-flash"
	},
	deepseek: {
		id: "deepseek",
		displayName: "DeepSeek",
		apiStyle: "openai_compatible",
		baseUrl: "https://api.deepseek.com/v1",
		defaultModel: "deepseek-chat"
	},
	groq: {
		id: "groq",
		displayName: "Groq",
		apiStyle: "openai_compatible",
		baseUrl: "https://api.groq.com/openai/v1",
		defaultModel: "llama-3.3-70b-versatile"
	},
	grok: {
		id: "grok",
		displayName: "Grok (xAI)",
		apiStyle: "openai_compatible",
		baseUrl: "https://api.x.ai/v1",
		defaultModel: "grok-4"
	}
};
/** Calls whichever provider's chat endpoint, normalizing the very different
*  request/response shapes into plain text. Every branch throws a plain
*  Error with the provider's own error body on failure — the self-healing
*  harness (see agent-harness.ts) is what turns that into a retry. */
async function callProviderChat(provider, apiKey, args) {
	const model = args.model ?? provider.defaultModel;
	if (provider.apiStyle === "anthropic") {
		const res = await fetch(`${provider.baseUrl}/messages`, {
			method: "POST",
			headers: {
				"content-type": "application/json",
				"x-api-key": apiKey,
				"anthropic-version": "2023-06-01"
			},
			body: JSON.stringify({
				model,
				max_tokens: 1024,
				system: args.system,
				messages: args.messages.map((m) => ({
					role: m.role,
					content: m.content
				}))
			})
		});
		if (!res.ok) throw new Error(await providerError(provider.id, res));
		return { text: (await res.json()).content?.find((b) => b.type === "text")?.text ?? "" };
	}
	if (provider.apiStyle === "gemini") {
		const res = await fetch(`${provider.baseUrl}/models/${model}:generateContent?key=${apiKey}`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				systemInstruction: { parts: [{ text: args.system }] },
				contents: args.messages.map((m) => ({
					role: m.role === "assistant" ? "model" : "user",
					parts: [{ text: m.content }]
				}))
			})
		});
		if (!res.ok) throw new Error(await providerError(provider.id, res));
		return { text: (await res.json()).candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "" };
	}
	const res = await fetch(`${provider.baseUrl}/chat/completions`, {
		method: "POST",
		headers: {
			"content-type": "application/json",
			authorization: `Bearer ${apiKey}`
		},
		body: JSON.stringify({
			model,
			messages: [{
				role: "system",
				content: args.system
			}, ...args.messages]
		})
	});
	if (!res.ok) throw new Error(await providerError(provider.id, res));
	return { text: (await res.json()).choices?.[0]?.message?.content ?? "" };
}
async function providerError(providerId, res) {
	const body = await res.text().catch(() => "");
	return `${providerId} API error ${res.status}: ${body.slice(0, 300)}`;
}
/** Connection status for every known provider — never returns the secret
*  itself, only whether one is stored. Safe to send to the client. */
async function listModelKeyStatuses() {
	const db = getSupabaseAdmin();
	const rows = db ? (await db.from("user_model_keys").select("provider_id, label, is_default, is_active").eq("workspace_id", "default")).data ?? [] : [];
	const byProvider = new Map(rows.map((r) => [r.provider_id, r]));
	return Object.values(MODEL_PROVIDERS).map((p) => {
		const row = byProvider.get(p.id);
		return {
			providerId: p.id,
			displayName: p.displayName,
			connected: Boolean(row?.is_active),
			label: row?.label ?? null,
			isDefault: Boolean(row?.is_default)
		};
	});
}
/** Stores (or replaces) a provider's key, encrypted in Supabase Vault.
*  Throws if no backend is configured — callers should surface that as a
*  clear "connect a backend first" error, not a silent no-op. */
async function storeModelKey(providerId, secret, label, makeDefault) {
	const db = getSupabaseAdmin();
	if (!db) throw new Error("No backend configured — set SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY first.");
	const { error } = await db.rpc("store_model_key", {
		p_workspace_id: DEFAULT_WORKSPACE_ID,
		p_provider_id: providerId,
		p_secret: secret,
		p_label: label ?? null,
		p_make_default: makeDefault ?? false
	});
	if (error) throw new Error(`Failed to store key: ${error.message}`);
}
async function deleteModelKey(providerId) {
	const db = getSupabaseAdmin();
	if (!db) throw new Error("No backend configured.");
	const { error } = await db.rpc("delete_model_key", {
		p_workspace_id: DEFAULT_WORKSPACE_ID,
		p_provider_id: providerId
	});
	if (error) throw new Error(`Failed to delete key: ${error.message}`);
}
/** Switches which connected provider is the default, without needing the
*  secret again — a plain metadata update, not a Vault write. */
async function setDefaultModelKey(providerId) {
	const db = getSupabaseAdmin();
	if (!db) throw new Error("No backend configured.");
	const { error: clearError } = await db.from("user_model_keys").update({ is_default: false }).eq("workspace_id", DEFAULT_WORKSPACE_ID);
	if (clearError) throw new Error(`Failed to update default: ${clearError.message}`);
	const { error, data } = await db.from("user_model_keys").update({
		is_default: true,
		updated_at: (/* @__PURE__ */ new Date()).toISOString()
	}).eq("workspace_id", DEFAULT_WORKSPACE_ID).eq("provider_id", providerId).eq("is_active", true).select("id");
	if (error) throw new Error(`Failed to update default: ${error.message}`);
	if (!data || data.length === 0) throw new Error(`"${providerId}" isn't connected yet.`);
}
/** The key + provider the agent should use when the caller didn't ask for a
*  specific one: the workspace's default BYOK key if set, else the
*  server-wide ANTHROPIC_API_KEY env fallback so chat still works out of
*  the box. Returns null if neither is available. */
async function resolveDefaultModelKey() {
	const db = getSupabaseAdmin();
	if (db) {
		const { data, error } = await db.rpc("get_default_model_key", { p_workspace_id: DEFAULT_WORKSPACE_ID }).maybeSingle();
		const row = data;
		if (!error && row?.decrypted_secret) return {
			providerId: row.provider_id,
			apiKey: row.decrypted_secret
		};
	}
	if (processModule.env["ANTHROPIC_API_KEY"]) return {
		providerId: "anthropic",
		apiKey: processModule.env["ANTHROPIC_API_KEY"]
	};
	return null;
}
async function listSkills() {
	const db = getSupabaseAdmin();
	if (!db) return [];
	const { data, error } = await db.from("agent_skills").select("id, category, title, description, system_prompt, enabled").eq("workspace_id", DEFAULT_WORKSPACE_ID).order("sort_order");
	if (error) {
		console.error("[skills] failed to list skills", error);
		return [];
	}
	return (data ?? []).map((r) => ({
		id: r.id,
		category: r.category,
		title: r.title,
		description: r.description,
		systemPrompt: r.system_prompt,
		enabled: r.enabled
	}));
}
async function setSkillEnabled(id, enabled) {
	const db = getSupabaseAdmin();
	if (!db) throw new Error("No backend configured.");
	const { error } = await db.from("agent_skills").update({
		enabled,
		updated_at: (/* @__PURE__ */ new Date()).toISOString()
	}).eq("workspace_id", DEFAULT_WORKSPACE_ID).eq("id", id);
	if (error) throw new Error(`Failed to update skill: ${error.message}`);
}
/** Builds the block of instructions folded into the agent's system prompt
*  from every currently-enabled skill. Empty string if none are enabled or
*  no backend is configured — the core persona still works without it. */
function buildSkillsBlock(skills) {
	const enabled = skills.filter((s) => s.enabled);
	if (!enabled.length) return "";
	return "\n\nYou also have these business skills available — apply the relevant one(s) based on what's being asked, without announcing which skill you're using:\n\n" + enabled.map((s) => `### ${s.title}\n${s.systemPrompt}`).join("\n\n");
}
/** True once E2B_API_KEY is set on the server — checked before any sandbox
*  call so callers can degrade gracefully (skip code execution, tell the
*  owner it isn't configured yet) instead of throwing deep in a task run. */
function isSandboxConfigured() {
	return Boolean(processModule.env["E2B_API_KEY"]);
}
/** Runs a snippet of code in a fresh E2B cloud sandbox and returns its
*  stdout/stderr. Each call gets its own sandbox (created, used, torn down)
*  rather than a pooled/reused one — simplest correct behavior for
*  occasional agent-triggered runs; worth pooling later if this becomes a
*  hot path. Every run is logged to `sandbox_runs` (best-effort — a logging
*  failure never fails the run itself) so Brain Chat / the agent trace can
*  reference what actually executed.
*
*  Requires the `@e2b/code-interpreter` package (already a dependency) and
*  `E2B_API_KEY` — see .env.example. Throws if E2B_API_KEY isn't set; check
*  isSandboxConfigured() first if you want to degrade instead of throwing. */
async function runInSandbox(code, opts = {}) {
	const apiKey = processModule.env["E2B_API_KEY"];
	if (!apiKey) throw new Error("E2B isn't configured — set E2B_API_KEY on the server to let the agent run code in a sandbox.");
	const language = opts.language ?? "python";
	const runId = await logRunStart(opts.sessionId ?? "default", language, code);
	let outcome;
	try {
		const sandbox = await Sandbox.create({ apiKey });
		try {
			const execution = await sandbox.runCode(code, { language });
			const stdout = (execution.logs?.stdout ?? []).join("\n");
			const stderr = (execution.logs?.stderr ?? []).join("\n");
			const error = execution.error ? `${execution.error.name}: ${execution.error.value}` : null;
			outcome = {
				ok: !error,
				stdout,
				stderr,
				error
			};
		} finally {
			await sandbox.kill().catch(() => {});
		}
	} catch (error) {
		outcome = {
			ok: false,
			stdout: "",
			stderr: "",
			error: error instanceof Error ? error.message : "Sandbox execution failed"
		};
	}
	logRunFinish(runId, outcome);
	return outcome;
}
async function logRunStart(sessionId, language, code) {
	const db = getSupabaseAdmin();
	if (!db) return null;
	const { data, error } = await db.from("sandbox_runs").insert({
		workspace_id: DEFAULT_WORKSPACE_ID,
		session_id: sessionId,
		language,
		code,
		status: "running"
	}).select("id").single();
	if (error) {
		console.error("[sandbox] failed to log run start", error);
		return null;
	}
	return data?.id ?? null;
}
async function logRunFinish(runId, outcome) {
	if (!runId) return;
	const db = getSupabaseAdmin();
	if (!db) return;
	const { error } = await db.from("sandbox_runs").update({
		stdout: outcome.stdout,
		stderr: outcome.stderr,
		error: outcome.error,
		status: outcome.ok ? "ok" : "error",
		finished_at: (/* @__PURE__ */ new Date()).toISOString()
	}).eq("id", runId);
	if (error) console.error("[sandbox] failed to log run finish", error);
}
var adufFindingSchema = objectType({
	area: enumType([
		"visibility",
		"credibility",
		"customer_journey",
		"conversion",
		"sales",
		"retention",
		"operations",
		"local_presence",
		"search_ai_visibility"
	]),
	problem: stringType().min(1),
	severity: enumType([
		"low",
		"medium",
		"high",
		"critical"
	]),
	rootCauses: arrayType(stringType().min(1)).min(1).max(6),
	opportunities: arrayType(stringType().min(1)).min(1).max(6),
	recommendedActions: arrayType(stringType().min(1)).min(1).max(6),
	estimatedImpact: stringType().min(1),
	automationPossible: booleanType(),
	automationNotes: stringType().optional(),
	expertRequired: booleanType(),
	expertType: stringType().optional()
});
/** A concrete change to another page the agent wants to make — nothing is
*  applied anywhere until the owner taps Approve in chat. Keep this a
*  discriminated union so new action types (e.g. a settings change) can be
*  added later without touching existing ones. */
var proposedActionSchema = discriminatedUnionType("type", [objectType({
	type: literalType("create_goal"),
	title: stringType().min(1).max(120),
	target: numberType().positive(),
	currency: stringType().max(3).optional().default(""),
	reasoning: stringType().min(1).max(400)
}), objectType({
	type: literalType("toggle_automation"),
	channelId: enumType([
		"website",
		"whatsapp",
		"crm",
		"payments",
		"ads",
		"email"
	]),
	enabled: booleanType(),
	reasoning: stringType().min(1).max(400)
})]);
/** A tool the agent can invoke mid-reply instead of guessing — currently
*  just code execution in the E2B sandbox already wired for the tasks
*  pipeline. Kept as its own schema (not folded into proposedAction) since
*  it executes immediately, no owner approval needed — running a read-only
*  calculation in a throwaway sandbox isn't a change to the business, so
*  it doesn't need the same gate a real goal/automation change does. */
var toolCallSchema = objectType({
	type: literalType("run_code"),
	language: enumType([
		"python",
		"javascript",
		"bash"
	]).default("python"),
	code: stringType().min(1).max(2e4),
	/** One short phrase shown to the owner while it runs, e.g. "Checking the
	*  math on your margin scenario". */
	purpose: stringType().min(1).max(200)
});
var agentReplySchema = objectType({
	reply: stringType().min(1),
	question: objectType({
		prompt: stringType().min(1),
		multi: booleanType().optional(),
		options: arrayType(objectType({
			id: stringType().min(1),
			label: stringType().min(1),
			value: stringType().min(1)
		})).min(2).max(6)
	}).nullable().optional(),
	/** Set when the request calls for an actual deliverable file rather than
	*  just a chat answer — the server renders this into a real file and
	*  attaches it to the reply for preview/download. */
	document: objectType({
		filename: stringType().min(1).max(150),
		format: enumType([
			"txt",
			"md",
			"docx",
			"pdf"
		]),
		content: stringType().min(1).max(2e5)
	}).nullable().optional(),
	/** Set when the reply is (or includes) a genuine ADUF business audit —
	*  one or more structured findings across the nine analysis areas. Most
	*  replies (small talk, a single follow-up answer, a clarifying question)
	*  have no analysis and this stays null. */
	analysis: objectType({
		summary: stringType().min(1),
		findings: arrayType(adufFindingSchema).min(1).max(12)
	}).nullable().optional(),
	/** Set when the reply proposes a concrete, executable change to the Goals
	*  page or Automation Grid — the owner sees an Approve/Dismiss card and
	*  nothing happens until they tap Approve. Never combine with "question":
	*  ask first, propose once you actually know enough to be specific. */
	proposedAction: proposedActionSchema.nullable().optional(),
	/** Set when the model wants to actually run code before finishing its
	*  reply — see toolCallSchema. Executes immediately (no approval gate,
	*  unlike proposedAction) and its real result is fed back before the
	*  final reply. */
	toolCall: toolCallSchema.nullable().optional()
});
var BASE_SYSTEM_PROMPT = `You are ADUF, an always-on AI COO for a small/medium business, embedded in the
"Brain Chat" of the ADUF AI dashboard. Be direct, concrete and brief — you're
a COO giving a fast answer, not a chatty assistant.

=== Your core method: the ADUF Diagnostic ===
When the owner's request calls for actually analyzing their business (not
just a quick factual question), you diagnose across these nine areas —
only the ones relevant to what they asked, never pad with irrelevant ones:
- Visibility — do the right people know the business exists
- Credibility — trust signals: reviews, proof, professionalism, consistency
- Customer journey — the path from discovery to purchase to repeat
- Conversion — where interested people fail to become customers
- Sales — pipeline, pricing, close rate, deal velocity
- Retention — repeat purchase, churn, loyalty
- Operations — fulfillment, response time, internal workflow friction
- Local presence — for businesses with a physical/local footprint
- Search/AI visibility — findability in search engines and AI answer engines

For each real problem you find in a relevant area, work it through in full:
Problem -> Severity -> Root cause(s) -> Opportunity -> Recommended action(s)
-> Estimated impact -> whether it's automatable -> whether it needs a human
expert (and what kind — e.g. a photographer, a web developer, an accountant,
a paid-ads specialist). Put this in the "analysis" field, not buried in
prose. Severity is one of low/medium/high/critical, judged by how much it's
likely costing the business relative to the fix effort. Only set
"analysis" when you're actually delivering a diagnosis with at least one
real, specific finding — never invent findings to fill the shape, and never
attach it to a reply that's just conversation, a clarifying question, or a
single follow-up answer.

=== Stay accurate: ask before you diagnose ===
A generic-sounding audit is worse than useless — it's actively misleading.
Before producing (or substantially updating) an analysis, make sure you
actually have enough to go on: what the business does, what's already
known from their setup profile below, and specifically what they're asking
about right now. When you don't have enough — the request is vague, you're
guessing at facts, or a plausible answer depends on something only they
know — do NOT guess. Attach a "question" with 2-6 concrete, mutually
exclusive options instead of a free-text ask, and hold off on "analysis"
until you have what you need. This applies throughout the conversation, not
just the first message — keep narrowing with questions whenever precision
would otherwise suffer. Most short/simple replies still need no question at
all; use it when it actually changes what a good answer looks like.

When the request calls for an actual deliverable — a report, a draft
document, a written plan, a document to send someone — rather than just a
chat answer, attach a "document" with the full file content, a filename,
and the best format (txt for plain notes, md for anything with structure,
docx for something formatted to send/print, pdf for a finished
document/report). Put the real, complete content in it, not a summary of
what it would contain. Only do this when a file is actually the right
deliverable — most replies still need no document.

=== Acting on other pages: proposedAction ===
You are not limited to talking — when a reply calls for an actual change to
the Goals page or the Automation Grid, attach "proposedAction" with the
specific change. The owner always sees it as an Approve/Dismiss card first;
nothing is created or toggled anywhere until they tap Approve, so propose
freely whenever it's the right next step, but only when you actually have
what a real goal or automation needs (a concrete title and target; a
specific channel and on/off state) — if you don't, ask a "question" instead
and propose once you know. Never set "question" and "proposedAction" on the
same reply. Two shapes exist today:
- {"type": "create_goal", "title": string, "target": number, "currency": string, "reasoning": string} —
  currency is "₦" (or another symbol) for money goals, "" for a plain count
  (bookings, signups, etc). "reasoning" is one short sentence the owner
  reads on the approval card explaining why this goal, shown to them, not
  hidden reasoning.
- {"type": "toggle_automation", "channelId": "website"|"whatsapp"|"crm"|"payments"|"ads"|"email", "enabled": boolean, "reasoning": string} —
  propose this to turn a channel automation on or off with a clear reason.

=== Tool execution: toolCall ===
When actually getting the answer right requires running code — a real
calculation, checking a formula against real numbers, processing data the
owner pasted in — set "toolCall" instead of guessing. It runs for real in
a sandboxed environment and you'll see its actual stdout/stderr before you
give your final "reply"; you can do this a few times in one reply if the
first result tells you something you need to check further. Shape:
{"type": "run_code", "language": "python"|"javascript"|"bash", "code": string, "purpose": string} —
"purpose" is one short phrase the owner sees while it runs (e.g. "Checking
the math on your margin scenario"). Only set this when execution is
genuinely the right way to get it right — most replies need no tool call.
Never claim you ran or checked something unless you actually set toolCall
to do it; if the sandbox isn't configured or a run fails, say so plainly
in your reply rather than pretending it worked. This executes immediately
with no approval step (unlike proposedAction) — never use it to touch the
owner's real data, only to compute/verify something.

Respond with ONLY a single JSON object, no markdown fences, no prose outside
it, matching exactly:
{"reply": string, "question": {"prompt": string, "multi": boolean, "options": [{"id": string, "label": string, "value": string}]} | null, "document": {"filename": string, "format": "txt"|"md"|"docx"|"pdf", "content": string} | null, "analysis": {"summary": string, "findings": [{"area": "visibility"|"credibility"|"customer_journey"|"conversion"|"sales"|"retention"|"operations"|"local_presence"|"search_ai_visibility", "problem": string, "severity": "low"|"medium"|"high"|"critical", "rootCauses": string[], "opportunities": string[], "recommendedActions": string[], "estimatedImpact": string, "automationPossible": boolean, "automationNotes": string, "expertRequired": boolean, "expertType": string}]} | null, "proposedAction": {"type": "create_goal", "title": string, "target": number, "currency": string, "reasoning": string} | {"type": "toggle_automation", "channelId": "website"|"whatsapp"|"crm"|"payments"|"ads"|"email", "enabled": boolean, "reasoning": string} | null, "toolCall": {"type": "run_code", "language": "python"|"javascript"|"bash", "code": string, "purpose": string} | null}`;
/** Max code-execution round trips inside a single reply — bounds latency
*  and cost; almost every reply that needs a tool call needs it once. */
var MAX_TOOL_CALLS = 3;
var NoModelConfiguredError = class extends Error {
	constructor() {
		super("No AI model is connected yet — add a model API key in Settings, or set ANTHROPIC_API_KEY on the server.");
		this.name = "NoModelConfiguredError";
	}
};
/** Calls the agent's configured model with the ADUF persona plus every
*  enabled business skill, asking for a reply in the app's structured
*  reply-plus-optional-questionnaire-plus-analysis JSON shape. When the
*  model asks for a "toolCall", this actually runs it in the E2B sandbox
*  and feeds the real result back for another round before the final
*  reply — up to MAX_TOOL_CALLS times — so the agent can genuinely
*  execute code, not just describe what it would do.
*  `repairContext`, when present, is a previous parse/validation failure
*  fed back in so the model can correct itself — this is what the
*  self-healing harness drives. `surveyContext`, when present, is the
*  owner's onboarding-survey answers (profession, business type, website,
*  goal, ...) folded in as background so the diagnosis is about their
*  actual business, not a generic one. */
async function callAgent(history, userText, repairContext, surveyContext) {
	const key = await resolveDefaultModelKey();
	if (!key) throw new NoModelConfiguredError();
	const provider = MODEL_PROVIDERS[key.providerId];
	if (!provider) throw new Error(`Unknown model provider "${key.providerId}"`);
	const skills = await listSkills();
	const systemPrompt = BASE_SYSTEM_PROMPT + (surveyContext ? `\n\n=== Owner's setup profile (from their onboarding survey) ===\n${surveyContext}\nUse this as background context for every reply — don't re-ask for it, but do ask follow-up questions to fill in whatever it doesn't cover and your diagnosis needs.` : "\n\nThis owner hasn't completed their setup survey yet, so you have no business profile for them — ask what you need to know as you go.") + buildSkillsBlock(skills) + (repairContext ? `\n\nYour previous reply was rejected: ${repairContext}\nReply again, following the JSON shape exactly.` : "");
	const turns = [...history.slice(-12).map((m) => ({
		role: m.role === "user" ? "user" : "assistant",
		content: m.role === "user" ? m.text : JSON.stringify({
			reply: m.text,
			question: m.question ?? null
		})
	})), {
		role: "user",
		content: userText
	}];
	const toolTrace = [];
	let toolCallsUsed = 0;
	for (let iteration = 0; iteration <= MAX_TOOL_CALLS; iteration++) {
		const { text } = await callProviderChat(provider, key.apiKey, {
			system: systemPrompt,
			messages: turns
		});
		const parsed = parseAgentReply(text);
		if (!parsed.toolCall || toolCallsUsed >= MAX_TOOL_CALLS) return {
			...parsed,
			toolTrace
		};
		toolCallsUsed++;
		const { language, code, purpose } = parsed.toolCall;
		const step = {
			id: `tool-${Date.now()}-${toolCallsUsed}`,
			label: `Ran code: ${purpose}`,
			status: "running"
		};
		toolTrace.push(step);
		turns.push({
			role: "assistant",
			content: JSON.stringify({
				reply: parsed.reply,
				question: null
			})
		});
		if (!isSandboxConfigured()) {
			step.status = "error";
			step.detail = "No code sandbox configured (E2B_API_KEY not set on the server).";
			turns.push({
				role: "user",
				content: "Tool call failed: no code sandbox is configured on this server. Don't request run_code again — answer using only what you already know, and mention plainly in your reply that live code execution isn't available yet."
			});
			continue;
		}
		try {
			const run = await runInSandbox(code, {
				language,
				sessionId: "brain-chat"
			});
			step.status = run.ok ? "done" : "error";
			step.detail = run.ok ? run.stdout.slice(0, 300) || "(no output)" : run.error || run.stderr.slice(0, 300);
			turns.push({
				role: "user",
				content: `Tool result for run_code ("${purpose}"):\nstdout:\n${run.stdout.slice(0, 4e3) || "(empty)"}\n` + (run.stderr ? `stderr:\n${run.stderr.slice(0, 1e3)}\n` : "") + (run.error ? `error: ${run.error}\n` : "") + "\nUse this real result to finish your answer. Give your final \"reply\" now unless another run_code call is genuinely necessary."
			});
		} catch (error) {
			const message = error instanceof Error ? error.message : "Sandbox execution failed";
			step.status = "error";
			step.detail = message;
			turns.push({
				role: "user",
				content: `Tool call failed: ${message}. Don't retry the same call — answer using what you have.`
			});
		}
	}
	throw new Error("Agent reply loop ended without a final answer.");
}
function parseAgentReply(text) {
	let parsedJson;
	try {
		parsedJson = JSON.parse(stripCodeFence$1(text));
	} catch {
		throw new Error(`Reply was not valid JSON (got: ${text.slice(0, 200)}). Respond with ONLY the JSON object.`);
	}
	const parsed = agentReplySchema.safeParse(parsedJson);
	if (!parsed.success) throw new Error(`Reply didn't match the required shape: ${parsed.error.message.slice(0, 300)}`);
	return parsed.data;
}
function stripCodeFence$1(text) {
	const trimmed = text.trim();
	const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
	return fenced ? fenced[1] ?? trimmed : trimmed;
}
var HarnessExhaustedError = class extends Error {
	trace;
	attempts;
	constructor(label, trace, attempts) {
		super(`"${label}" failed after ${attempts} attempt(s)`);
		this.name = "HarnessExhaustedError";
		this.trace = trace;
		this.attempts = attempts;
	}
};
function newStep(label) {
	return {
		id: `step-${Date.now()}-${Math.round(Math.random() * 1e6)}`,
		label,
		status: "running"
	};
}
/**
* Runs `fn` with automatic self-repair: on failure (thrown error, or a
* failed `validate` check), it records what went wrong, calls `fn` again
* passing that failure back in as `repairContext` so the caller can adjust
* its next attempt (e.g. re-prompt the model with the parse error), and
* repeats up to `maxAttempts`. Every attempt is recorded in the returned
* trace and, best-effort, in the `agent_runs` table for observability.
*
* This is intentionally generic — it's used for the chat model call today,
* and is the same primitive future tool-calling steps should wrap.
*/
async function runWithHarness(label, fn, opts = {}) {
	const maxAttempts = Math.max(1, opts.maxAttempts ?? 3);
	const trace = [];
	let repairContext;
	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		const step = newStep(attempt === 1 ? label : `${label} (retry ${attempt - 1})`);
		trace.push(step);
		try {
			const result = await fn(repairContext);
			const validationError = opts.validate?.(result) ?? null;
			if (validationError) {
				step.status = "error";
				step.detail = validationError;
				repairContext = validationError;
				if (attempt === maxAttempts) {
					await persistRun(label, "failed", attempt, trace, opts.persist);
					throw new HarnessExhaustedError(label, trace, attempt);
				}
				continue;
			}
			step.status = "done";
			await persistRun(label, "success", attempt, trace, opts.persist);
			return {
				result,
				trace,
				attempts: attempt
			};
		} catch (error) {
			if (error instanceof HarnessExhaustedError) throw error;
			const message = error instanceof Error ? error.message : String(error);
			step.status = "error";
			step.detail = message;
			repairContext = message;
			if (attempt === maxAttempts) {
				await persistRun(label, "failed", attempt, trace, opts.persist);
				throw new HarnessExhaustedError(label, trace, attempt);
			}
		}
	}
	throw new HarnessExhaustedError(label, trace, maxAttempts);
}
async function persistRun(label, status, attempts, trace, persist = true) {
	if (!persist) return;
	const db = getSupabaseAdmin();
	if (!db) return;
	try {
		await db.from("agent_runs").insert({
			workspace_id: DEFAULT_WORKSPACE_ID,
			label,
			status,
			attempts,
			trace
		});
	} catch (error) {
		console.error("[agent-harness] failed to persist agent_runs row", error);
	}
}
var MIME_BY_FORMAT = {
	txt: "text/plain",
	md: "text/markdown",
	docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	pdf: "application/pdf"
};
function bucket() {
	const db = getSupabaseAdmin();
	if (!db) throw new Error("No backend configured — set SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY first.");
	return db.storage.from("agent-files");
}
/** Renders plain text content into the bytes for the given format. This is
*  the "creating" half of the document skill — txt/md are passthrough,
*  docx/pdf are real generated files, not just renamed text. */
async function renderBytes(format, content) {
	if (format === "txt" || format === "md") return new TextEncoder().encode(content);
	if (format === "docx") {
		const doc = new File({ sections: [{ children: content.split("\n").map((line) => new Paragraph({ children: [new TextRun(line)] })) }] });
		return await Packer.toBuffer(doc);
	}
	const pdf = await PDFDocument.create();
	const font = await pdf.embedFont(StandardFonts.Helvetica);
	const fontSize = 11;
	const margin = 50;
	const pageWidth = 612;
	const pageHeight = 792;
	const maxWidth = pageWidth - margin * 2;
	const lineHeight = fontSize * 1.4;
	const wrapped = [];
	for (const paragraph of content.split("\n")) {
		if (!paragraph) {
			wrapped.push("");
			continue;
		}
		let line = "";
		for (const word of paragraph.split(" ")) {
			const candidate = line ? `${line} ${word}` : word;
			if (font.widthOfTextAtSize(candidate, fontSize) > maxWidth && line) {
				wrapped.push(line);
				line = word;
			} else line = candidate;
		}
		wrapped.push(line);
	}
	let page = pdf.addPage([pageWidth, pageHeight]);
	let y = pageHeight - margin;
	for (const line of wrapped) {
		if (y < margin) {
			page = pdf.addPage([pageWidth, pageHeight]);
			y = pageHeight - margin;
		}
		page.drawText(line, {
			x: margin,
			y,
			size: fontSize,
			font,
			color: rgb(0, 0, 0)
		});
		y -= lineHeight;
	}
	return await pdf.save();
}
/** Extracts plain text from arbitrary document bytes — the "reading" half
*  of the skill. Used both for files the agent generated (to build a
*  preview) and files the user uploads. */
async function extractText(format, bytes) {
	if (format === "txt" || format === "md") return new TextDecoder().decode(bytes);
	if (format === "docx") {
		const { value } = await import_lib.extractRawText({ buffer: Buffer.from(bytes) });
		return value;
	}
	const { PDFParse } = await import("../_libs/pdf-parse+pdfjs-dist.mjs").then((n) => n.t);
	return (await new PDFParse({ data: bytes }).getText()).text;
}
function storagePath(sessionId, id, filename) {
	return `${DEFAULT_WORKSPACE_ID}/${sessionId}/${id}-${filename}`;
}
/** Creates a new document from plain text content, uploads it, and records
*  it with a ready-made preview. This is the entry point for both "create a
*  document" and "edit a document" (edit = create again with new content,
*  new row — the old version stays retrievable). */
async function createDocument(args) {
	const db = getSupabaseAdmin();
	if (!db) throw new Error("No backend configured — set SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY first.");
	const bytes = await renderBytes(args.format, args.content);
	const id = crypto.randomUUID();
	const path = storagePath(args.sessionId, id, args.filename);
	const mimeType = MIME_BY_FORMAT[args.format];
	const { error: uploadError } = await bucket().upload(path, bytes, {
		contentType: mimeType,
		upsert: true
	});
	if (uploadError) throw new Error(`Failed to store document: ${uploadError.message}`);
	const previewText = args.content.slice(0, 5e3);
	const { data, error } = await db.from("agent_documents").insert({
		id,
		workspace_id: DEFAULT_WORKSPACE_ID,
		session_id: args.sessionId,
		filename: args.filename,
		format: args.format,
		mime_type: mimeType,
		storage_path: path,
		size_bytes: bytes.byteLength,
		preview_text: previewText,
		source: "agent"
	}).select("id, filename, format, mime_type, size_bytes, preview_text, source, created_at").single();
	if (error || !data) throw new Error(`Failed to record document: ${error?.message ?? "unknown error"}`);
	return toAgentDocument(data);
}
/** Stores an uploaded file (given as raw bytes the caller already decoded)
*  and extracts a text preview from it immediately. */
async function uploadDocument(args) {
	const db = getSupabaseAdmin();
	if (!db) throw new Error("No backend configured — set SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY first.");
	const id = crypto.randomUUID();
	const path = storagePath(args.sessionId, id, args.filename);
	const mimeType = MIME_BY_FORMAT[args.format];
	const { error: uploadError } = await bucket().upload(path, args.bytes, {
		contentType: mimeType,
		upsert: true
	});
	if (uploadError) throw new Error(`Failed to store document: ${uploadError.message}`);
	let previewText = null;
	try {
		previewText = (await extractText(args.format, args.bytes)).slice(0, 5e3);
	} catch (error) {
		console.error("[documents] failed to extract preview text", error);
	}
	const { data, error } = await db.from("agent_documents").insert({
		id,
		workspace_id: DEFAULT_WORKSPACE_ID,
		session_id: args.sessionId,
		filename: args.filename,
		format: args.format,
		mime_type: mimeType,
		storage_path: path,
		size_bytes: args.bytes.byteLength,
		preview_text: previewText,
		source: "upload"
	}).select("id, filename, format, mime_type, size_bytes, preview_text, source, created_at").single();
	if (error || !data) throw new Error(`Failed to record document: ${error?.message ?? "unknown error"}`);
	return toAgentDocument(data);
}
/** Converts a stored document to a different format by extracting its text
*  and re-rendering — real re-generation, not a file-extension swap. */
async function convertDocument(id, targetFormat) {
	if (!getSupabaseAdmin()) throw new Error("No backend configured.");
	const { bytes, record } = await getDocumentBytes(id);
	const text = await extractText(record.format, bytes);
	const baseName = record.filename.replace(/\.[^.]+$/, "");
	return createDocument({
		sessionId: record.session_id,
		filename: `${baseName}.${targetFormat}`,
		format: targetFormat,
		content: text
	});
}
async function getDocumentBytes(id) {
	const db = getSupabaseAdmin();
	if (!db) throw new Error("No backend configured.");
	const { data: record, error } = await db.from("agent_documents").select("*").eq("workspace_id", DEFAULT_WORKSPACE_ID).eq("id", id).single();
	if (error || !record) throw new Error("Document not found");
	const { data: file, error: downloadError } = await bucket().download(record.storage_path);
	if (downloadError || !file) throw new Error(`Failed to fetch document: ${downloadError?.message}`);
	return {
		bytes: new Uint8Array(await file.arrayBuffer()),
		record
	};
}
async function getDocumentMeta(id) {
	const db = getSupabaseAdmin();
	if (!db) throw new Error("No backend configured.");
	const { data, error } = await db.from("agent_documents").select("id, filename, format, mime_type, size_bytes, preview_text, source, created_at").eq("workspace_id", DEFAULT_WORKSPACE_ID).eq("id", id).single();
	if (error || !data) throw new Error("Document not found");
	return toAgentDocument(data);
}
function toAgentDocument(row) {
	return {
		id: row.id,
		filename: row.filename,
		format: row.format,
		mimeType: row.mime_type,
		sizeBytes: row.size_bytes,
		previewText: row.preview_text,
		source: row.source,
		createdAt: row.created_at
	};
}
var chatMessageShape = objectType({
	id: stringType(),
	role: enumType(["user", "aduf"]),
	text: stringType(),
	question: anyType().optional(),
	answeredValues: arrayType(stringType()).optional(),
	trace: anyType().optional()
});
var bodySchema$6 = objectType({
	message: stringType().min(1).max(4e3),
	history: arrayType(chatMessageShape).optional(),
	sessionId: stringType().min(1).max(200).optional(),
	accessToken: stringType().min(1).nullable().optional()
});
function json$9(data, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { "content-type": "application/json" }
	});
}
async function logMessage(sessionId, role, text, extra = {}) {
	const db = getSupabaseAdmin();
	if (!db) return;
	const { error } = await db.from("chat_messages").insert({
		workspace_id: DEFAULT_WORKSPACE_ID,
		session_id: sessionId,
		role,
		text,
		question: extra.question ?? null,
		answered_values: extra.answeredValues ?? null,
		trace: extra.trace ?? null,
		attachments: extra.attachments ?? null,
		analysis: extra.analysis ?? null,
		proposed_action: extra.proposedAction ?? null
	});
	if (error) console.error("[api/chat] failed to persist message", error);
}
/** Renders the agent's requested document and returns it as a chat
*  attachment. Retried by the harness like any other agent step — a
*  transient storage hiccup shouldn't lose a deliverable the model already
*  wrote. Returns null (never throws) so a document failure degrades to
*  "reply without the file" instead of losing the whole chat turn. */
async function attachDocumentIfRequested(sessionId, document) {
	if (!document) return void 0;
	try {
		const { result } = await runWithHarness("chat-document-create", () => createDocument({
			sessionId,
			...document
		}), { maxAttempts: 3 });
		return [{
			id: result.id,
			filename: result.filename,
			format: result.format,
			mimeType: result.mimeType,
			sizeBytes: result.sizeBytes,
			previewText: result.previewText
		}];
	} catch (error) {
		console.error("[api/chat] failed to create requested document", error);
		return;
	}
}
var Route$13 = createFileRoute("/api/chat")({ server: { handlers: { POST: async ({ request }) => {
	let raw;
	try {
		raw = await request.json();
	} catch {
		return json$9({ error: "Invalid JSON body" }, 400);
	}
	const parsed = bodySchema$6.safeParse(raw);
	if (!parsed.success) return json$9({
		error: "Invalid request",
		details: parsed.error.flatten()
	}, 400);
	const { message, history = [], sessionId = "default", accessToken } = parsed.data;
	const isBackendConfigured = Boolean(getSupabaseAdmin());
	const authedUser = isBackendConfigured ? await verifyAccessToken(accessToken) : null;
	if (isBackendConfigured && !authedUser) return json$9({ error: "sign_in_required" }, 401);
	logMessage(sessionId, "user", message);
	if (!await resolveDefaultModelKey()) {
		const error = new NoModelConfiguredError();
		logMessage(sessionId, "aduf", error.message);
		return json$9({
			reply: error.message,
			question: null,
			trace: []
		});
	}
	const surveyContext = authedUser ? await getSurvey(authedUser.id).then((s) => s ? surveyToContext(s) : void 0) : void 0;
	try {
		const { result, trace } = await runWithHarness("brain-chat-reply", (repairContext) => callAgent(history, message, repairContext, surveyContext), { maxAttempts: 3 });
		const fullTrace = [...trace, ...result.toolTrace];
		const attachments = await attachDocumentIfRequested(sessionId, result.document);
		logMessage(sessionId, "aduf", result.reply, {
			question: result.question ?? null,
			trace: fullTrace,
			attachments,
			analysis: result.analysis ?? null,
			proposedAction: result.proposedAction ?? null
		});
		return json$9({
			reply: result.reply,
			question: result.question ?? null,
			trace: fullTrace,
			attachments,
			analysis: result.analysis ?? null,
			proposedAction: result.proposedAction ?? null
		});
	} catch (error) {
		if (error instanceof NoModelConfiguredError) {
			logMessage(sessionId, "aduf", error.message);
			return json$9({
				reply: error.message,
				question: null,
				trace: []
			});
		}
		const trace = error instanceof HarnessExhaustedError ? error.trace : [];
		console.error("[api/chat] agent failed after retries", error);
		const reply = "I tried a few times but couldn't put together a good answer to that — mind rephrasing, or asking something more specific?";
		logMessage(sessionId, "aduf", reply, { trace });
		return json$9({
			reply,
			question: null,
			trace
		});
	}
} } } });
function json$8(data, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { "content-type": "application/json" }
	});
}
var bodySchema$5 = objectType({
	sessionId: stringType().min(1).max(200).default("default"),
	filename: stringType().min(1).max(200),
	format: enumType([
		"txt",
		"md",
		"docx",
		"pdf"
	]),
	content: stringType().min(1).max(2e5)
});
var Route$12 = createFileRoute("/api/documents")({ server: { handlers: { POST: async ({ request }) => {
	let raw;
	try {
		raw = await request.json();
	} catch {
		return json$8({ error: "Invalid JSON body" }, 400);
	}
	const parsed = bodySchema$5.safeParse(raw);
	if (!parsed.success) return json$8({
		error: "Invalid request",
		details: parsed.error.flatten()
	}, 400);
	try {
		return json$8({ document: await createDocument(parsed.data) });
	} catch (error) {
		return json$8({ error: error instanceof Error ? error.message : "Failed to create document" }, 500);
	}
} } } });
var cache = null;
var CACHE_MS = 3600 * 1e3;
async function getRates() {
	if (cache && Date.now() - cache.fetchedAt < CACHE_MS) return cache;
	const res = await fetch("https://open.er-api.com/v6/latest/USD");
	if (!res.ok) throw new Error(`FX provider error ${res.status}`);
	const data = await res.json();
	if (data.result !== "success" || !data.rates) throw new Error("FX provider returned no rates");
	cache = {
		rates: data.rates,
		fetchedAt: Date.now()
	};
	return cache;
}
function json$7(data, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			"content-type": "application/json",
			"cache-control": "public, max-age=1800"
		}
	});
}
var Route$11 = createFileRoute("/api/fx")({ server: { handlers: { GET: async () => {
	try {
		const { rates, fetchedAt } = await getRates();
		return json$7({
			base: "USD",
			rates,
			updatedAt: fetchedAt
		});
	} catch (error) {
		if (cache) return json$7({
			base: "USD",
			rates: cache.rates,
			updatedAt: cache.fetchedAt,
			stale: true
		});
		return json$7({ error: error instanceof Error ? error.message : "Failed to fetch exchange rates" }, 502);
	}
} } } });
function json$6(data, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { "content-type": "application/json" }
	});
}
var postSchema = objectType({
	providerId: enumType(Object.keys(MODEL_PROVIDERS)),
	apiKey: stringType().min(8).max(500),
	label: stringType().max(100).optional(),
	makeDefault: booleanType().optional()
});
var deleteSchema = objectType({ providerId: enumType(Object.keys(MODEL_PROVIDERS)) });
var Route$10 = createFileRoute("/api/model-keys")({ server: { handlers: {
	GET: async () => {
		return json$6({ providers: await listModelKeyStatuses() });
	},
	POST: async ({ request }) => {
		let raw;
		try {
			raw = await request.json();
		} catch {
			return json$6({ error: "Invalid JSON body" }, 400);
		}
		const parsed = postSchema.safeParse(raw);
		if (!parsed.success) return json$6({
			error: "Invalid request",
			details: parsed.error.flatten()
		}, 400);
		try {
			await storeModelKey(parsed.data.providerId, parsed.data.apiKey, parsed.data.label, parsed.data.makeDefault);
			return json$6({ ok: true });
		} catch (error) {
			return json$6({ error: error instanceof Error ? error.message : "Failed to store key" }, 500);
		}
	},
	DELETE: async ({ request }) => {
		let raw;
		try {
			raw = await request.json();
		} catch {
			return json$6({ error: "Invalid JSON body" }, 400);
		}
		const parsed = deleteSchema.safeParse(raw);
		if (!parsed.success) return json$6({ error: "Invalid request" }, 400);
		try {
			await deleteModelKey(parsed.data.providerId);
			return json$6({ ok: true });
		} catch (error) {
			return json$6({ error: error instanceof Error ? error.message : "Failed to delete key" }, 500);
		}
	},
	PATCH: async ({ request }) => {
		let raw;
		try {
			raw = await request.json();
		} catch {
			return json$6({ error: "Invalid JSON body" }, 400);
		}
		const parsed = deleteSchema.safeParse(raw);
		if (!parsed.success) return json$6({ error: "Invalid request" }, 400);
		try {
			await setDefaultModelKey(parsed.data.providerId);
			return json$6({ ok: true });
		} catch (error) {
			return json$6({ error: error instanceof Error ? error.message : "Failed to set default" }, 500);
		}
	}
} } });
function json$5(data, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { "content-type": "application/json" }
	});
}
var patchSchema = objectType({
	id: stringType().min(1),
	enabled: booleanType()
});
var Route$9 = createFileRoute("/api/skills")({ server: { handlers: {
	GET: async () => {
		return json$5({ skills: await listSkills() });
	},
	PATCH: async ({ request }) => {
		let raw;
		try {
			raw = await request.json();
		} catch {
			return json$5({ error: "Invalid JSON body" }, 400);
		}
		const parsed = patchSchema.safeParse(raw);
		if (!parsed.success) return json$5({ error: "Invalid request" }, 400);
		try {
			await setSkillEnabled(parsed.data.id, parsed.data.enabled);
			return json$5({ ok: true });
		} catch (error) {
			return json$5({ error: error instanceof Error ? error.message : "Failed to update skill" }, 500);
		}
	}
} } });
function json$4(data, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { "content-type": "application/json" }
	});
}
var bodySchema$4 = objectType({
	id: stringType().uuid(),
	targetFormat: enumType([
		"txt",
		"md",
		"docx",
		"pdf"
	])
});
var Route$8 = createFileRoute("/api/documents/convert")({ server: { handlers: { POST: async ({ request }) => {
	let raw;
	try {
		raw = await request.json();
	} catch {
		return json$4({ error: "Invalid JSON body" }, 400);
	}
	const parsed = bodySchema$4.safeParse(raw);
	if (!parsed.success) return json$4({
		error: "Invalid request",
		details: parsed.error.flatten()
	}, 400);
	try {
		return json$4({ document: await convertDocument(parsed.data.id, parsed.data.targetFormat) });
	} catch (error) {
		return json$4({ error: error instanceof Error ? error.message : "Failed to convert document" }, 500);
	}
} } } });
function json$3(data, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { "content-type": "application/json" }
	});
}
var bodySchema$3 = objectType({
	sessionId: stringType().min(1).max(200).default("default"),
	filename: stringType().min(1).max(200),
	format: enumType([
		"txt",
		"md",
		"docx",
		"pdf"
	]),
	/** Raw file bytes, base64-encoded — avoids needing multipart parsing. */
	base64Content: stringType().min(1)
});
var Route$7 = createFileRoute("/api/documents/upload")({ server: { handlers: { POST: async ({ request }) => {
	let raw;
	try {
		raw = await request.json();
	} catch {
		return json$3({ error: "Invalid JSON body" }, 400);
	}
	const parsed = bodySchema$3.safeParse(raw);
	if (!parsed.success) return json$3({
		error: "Invalid request",
		details: parsed.error.flatten()
	}, 400);
	let bytes;
	try {
		bytes = new Uint8Array(Buffer.from(parsed.data.base64Content, "base64"));
	} catch {
		return json$3({ error: "base64Content isn't valid base64" }, 400);
	}
	if (bytes.byteLength > 15 * 1024 * 1024) return json$3({ error: "File too large (15MB max)" }, 400);
	try {
		return json$3({ document: await uploadDocument({
			sessionId: parsed.data.sessionId,
			filename: parsed.data.filename,
			format: parsed.data.format,
			bytes
		}) });
	} catch (error) {
		return json$3({ error: error instanceof Error ? error.message : "Failed to upload document" }, 500);
	}
} } } });
function json$2(data, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { "content-type": "application/json" }
	});
}
var bodySchema$2 = objectType({
	code: stringType().min(1).max(2e4),
	language: enumType([
		"python",
		"javascript",
		"bash"
	]).default("python"),
	sessionId: stringType().min(1).max(200).optional()
});
/** Direct, ad-hoc sandbox execution — separate from the tasks/run pipeline
*  (which drives this automatically for plan steps flagged
*  needsCodeExecution). Useful for Brain Chat to run a one-off script the
*  agent wrote, or for testing the sandbox is wired up correctly. */
var Route$6 = createFileRoute("/api/sandbox/run")({ server: { handlers: {
	GET: async () => json$2({ configured: isSandboxConfigured() }),
	POST: async ({ request }) => {
		if (!isSandboxConfigured()) return json$2({ error: "E2B isn't configured yet — set E2B_API_KEY on the server." }, 400);
		let raw;
		try {
			raw = await request.json();
		} catch {
			return json$2({ error: "Invalid JSON body" }, 400);
		}
		const parsed = bodySchema$2.safeParse(raw);
		if (!parsed.success) return json$2({
			error: "Invalid request",
			details: parsed.error.flatten()
		}, 400);
		try {
			return json$2(await runInSandbox(parsed.data.code, {
				language: parsed.data.language,
				...parsed.data.sessionId ? { sessionId: parsed.data.sessionId } : {}
			}));
		} catch (error) {
			return json$2({ error: error instanceof Error ? error.message : "Sandbox run failed" }, 500);
		}
	}
} } });
function json$1(data, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { "content-type": "application/json" }
	});
}
var CHANNEL_TO_SKILL = {
	comment: "social-comment-reply",
	dm: "social-dm-reply",
	email: "email-reply"
};
var bodySchema$1 = objectType({
	channel: enumType([
		"comment",
		"dm",
		"email"
	]),
	incomingText: stringType().min(1).max(4e3),
	context: stringType().max(4e3).optional()
});
var Route$5 = createFileRoute("/api/skills/reply")({ server: { handlers: { POST: async ({ request }) => {
	let raw;
	try {
		raw = await request.json();
	} catch {
		return json$1({ error: "Invalid JSON body" }, 400);
	}
	const parsed = bodySchema$1.safeParse(raw);
	if (!parsed.success) return json$1({
		error: "Invalid request",
		details: parsed.error.flatten()
	}, 400);
	const { channel, incomingText, context } = parsed.data;
	const key = await resolveDefaultModelKey();
	if (!key) return json$1({ error: "No AI model is connected yet — add a model API key in Settings first." }, 400);
	const provider = MODEL_PROVIDERS[key.providerId];
	if (!provider) return json$1({ error: `Unknown provider "${key.providerId}"` }, 500);
	const skills = await listSkills();
	const skillId = CHANNEL_TO_SKILL[channel];
	const skill = skills.find((s) => s.id === skillId && s.enabled);
	if (!skill) return json$1({ error: `The "${skillId}" skill is disabled — enable it in Settings to use this.` }, 400);
	const system = `${skill.systemPrompt}\n\nRespond with ONLY the reply text — no preamble, no quotation marks, no explanation.`;
	try {
		const { result, trace } = await runWithHarness(`skill-reply-${channel}`, async () => {
			const { text } = await callProviderChat(provider, key.apiKey, {
				system,
				messages: [{
					role: "user",
					content: context ? `Context:\n${context}\n\nIncoming ${channel} message:\n${incomingText}` : `Incoming ${channel} message:\n${incomingText}`
				}]
			});
			if (!text.trim()) throw new Error("Model returned an empty reply.");
			return text.trim();
		}, { maxAttempts: 3 });
		return json$1({
			reply: result,
			trace
		});
	} catch (error) {
		return json$1({ error: error instanceof Error ? error.message : "Failed to draft a reply" }, 500);
	}
} } } });
var planStepSchema = objectType({
	id: stringType().min(1),
	title: stringType().min(1),
	detail: stringType().min(1),
	risk: enumType([
		"low",
		"medium",
		"high"
	]),
	successProbability: numberType().min(0).max(100),
	mitigation: stringType().min(1),
	dependsOn: arrayType(stringType()).default([]),
	/** True when this step genuinely needs code to actually run (real
	*  computation, data transformation, testing a script) rather than just
	*  writing/describing something — the planner sets this deliberately,
	*  not for every step. */
	needsCodeExecution: booleanType().default(false)
});
var planSchema = objectType({
	summary: stringType().min(1),
	steps: arrayType(planStepSchema).min(1).max(10)
});
var PLANNING_SYSTEM_PROMPT = `You are ADUF's planning module. Given a business goal or task, produce a
plan an operator can actually execute — not a vague outline.

For every step, weigh risk and probability honestly:
- "risk": how likely this step is to go wrong or cause damage if it does (low/medium/high)
- "successProbability": your honest 0-100 estimate of this step succeeding as described,
  given typical execution — do not default to 80-90 for everything; vary it based on real
  difficulty, and use low numbers (below 50) when a step genuinely is uncertain
- "mitigation": a concrete way to reduce the risk or recover if it fails — never "monitor closely"
  with nothing else; give an actual fallback action
- "dependsOn": ids of steps that must complete first (empty array if none)
- "needsCodeExecution": true only when this step requires code to actually
  run to be done correctly — a real calculation, parsing/transforming data,
  testing a script's output — not for steps that are writing, drafting, or
  reasoning in prose. Most steps are false.

Break the goal into 2-8 steps. Each step should be independently actionable — something a
sub-agent could execute with just its own title/detail, without needing the other steps'
output, unless dependsOn says otherwise.

Respond with ONLY a single JSON object, no markdown fences, no prose outside it:
{"summary": string, "steps": [{"id": string, "title": string, "detail": string, "risk": "low"|"medium"|"high", "successProbability": number, "mitigation": string, "dependsOn": string[], "needsCodeExecution": boolean}]}`;
/** Builds a risk/probability-weighted execution plan for a goal. Uses the
*  harness with extra attempts (this is the "very strong harness" the plan
*  itself runs under — plan quality matters more than latency here). */
async function buildPlan(goal) {
	const key = await resolveDefaultModelKey();
	if (!key) throw new NoModelConfiguredError();
	const provider = MODEL_PROVIDERS[key.providerId];
	if (!provider) throw new Error(`Unknown model provider "${key.providerId}"`);
	const { result, trace } = await runWithHarness("plan-goal", async (repairContext) => {
		const system = repairContext ? `${PLANNING_SYSTEM_PROMPT}\n\nYour previous plan was rejected: ${repairContext}\nTry again, following the JSON shape exactly.` : PLANNING_SYSTEM_PROMPT;
		const { text } = await callProviderChat(provider, key.apiKey, {
			system,
			messages: [{
				role: "user",
				content: goal
			}]
		});
		let parsedJson;
		try {
			parsedJson = JSON.parse(stripCodeFence(text));
		} catch {
			throw new Error(`Plan was not valid JSON (got: ${text.slice(0, 200)})`);
		}
		const parsed = planSchema.safeParse(parsedJson);
		if (!parsed.success) throw new Error(`Plan didn't match the required shape: ${parsed.error.message.slice(0, 300)}`);
		return parsed.data;
	}, { maxAttempts: 4 });
	return {
		plan: result,
		trace
	};
}
/** For a step the planner flagged needsCodeExecution: asks the model for a
*  single Python snippet, actually runs it in an E2B sandbox, and returns
*  the code plus its real stdout/stderr — so the sub-agent's final answer
*  is grounded in something that really executed, not a guessed result. */
async function runCodeStep(step, systemSkills, provider, apiKey, sessionId) {
	const { text } = await callProviderChat(provider, apiKey, {
		system: `Write a single, self-contained Python script that accomplishes this step: "${step.title}" — ${step.detail}\n\nPrint whatever result the step needs — the script's stdout is the only thing that will be captured. Respond with ONLY the code in a \`\`\`python fenced block, nothing else.` + systemSkills,
		messages: [{
			role: "user",
			content: step.detail
		}]
	});
	const code = (text.match(/```(?:python)?\s*([\s\S]*?)```/)?.[1] ?? text).trim();
	if (!code) throw new Error("Sub-agent didn't produce runnable code for this step.");
	const run = await runInSandbox(code, {
		language: "python",
		sessionId
	});
	if (!run.ok) throw new Error(`Code ran but failed: ${run.error ?? (run.stderr.slice(0, 300) || "unknown error")}`);
	return `\`\`\`python\n${code}\n\`\`\`\n\nOutput:\n\`\`\`\n${run.stdout || "(no output)"}\n\`\`\``;
}
/** Runs one plan step as an independent sub-agent call — its own harness,
*  its own trace, failure in one step never aborts the others. */
async function runSubAgent(goal, step, systemSkills, provider, apiKey, sessionId) {
	if (step.needsCodeExecution && !isSandboxConfigured()) return {
		stepId: step.id,
		title: step.title,
		status: "failed",
		output: "This step needs code execution, but no sandbox is configured yet — set E2B_API_KEY on the server (see .env.example).",
		attempts: 0,
		trace: []
	};
	const system = `You are a focused sub-agent executing exactly one step of a larger plan. Overall goal: ${goal}\n\nYour step: "${step.title}" — ${step.detail}\n\nProduce the actual output for this step (a draft, an analysis, a decision — whatever the step calls for), not a description of what you would do. Be concrete and complete.` + systemSkills;
	try {
		const { result, trace, attempts } = await runWithHarness(`subagent-${step.id}`, async () => {
			if (step.needsCodeExecution) return await runCodeStep(step, systemSkills, provider, apiKey, sessionId);
			const { text } = await callProviderChat(provider, apiKey, {
				system,
				messages: [{
					role: "user",
					content: step.detail
				}]
			});
			if (!text.trim()) throw new Error("Sub-agent returned an empty result.");
			return text.trim();
		}, { maxAttempts: 3 });
		return {
			stepId: step.id,
			title: step.title,
			status: "success",
			output: result,
			attempts,
			trace
		};
	} catch (error) {
		const trace = error instanceof HarnessExhaustedError ? error.trace : [];
		const message = error instanceof Error ? error.message : "Sub-agent failed";
		return {
			stepId: step.id,
			title: step.title,
			status: "failed",
			output: message,
			attempts: 3,
			trace
		};
	}
}
/** Full pipeline for a large/multi-part goal: plan it (risk-weighted), then
*  fan out every step to its own sub-agent running concurrently, then
*  synthesize the sub-agent outputs into one coherent result. Every model
*  call in this pipeline — plan, each sub-agent, synthesis — runs under the
*  self-healing harness independently. */
async function runTask(goal, sessionId = "default") {
	const key = await resolveDefaultModelKey();
	if (!key) throw new NoModelConfiguredError();
	const provider = MODEL_PROVIDERS[key.providerId];
	if (!provider) throw new Error(`Unknown model provider "${key.providerId}"`);
	const { plan, trace: planTrace } = await buildPlan(goal);
	const skillsBlock = buildSkillsBlock(await listSkills());
	const results = await Promise.all(plan.steps.map((step) => runSubAgent(goal, step, skillsBlock, provider, key.apiKey, sessionId)));
	const synthesisPrompt = `Goal: ${goal}\n\nSub-agent results:\n` + results.map((r) => `### ${r.title} (${r.status})\n${r.output}`).join("\n\n");
	const { result: synthesis } = await runWithHarness("synthesize-task", async () => {
		const { text } = await callProviderChat(provider, key.apiKey, {
			system: "Combine these sub-agent results into one coherent, well-organized answer for the business owner. Note any step that failed and what that means for the overall goal. Respond with plain text/markdown — no JSON.",
			messages: [{
				role: "user",
				content: synthesisPrompt
			}]
		});
		if (!text.trim()) throw new Error("Synthesis returned empty output.");
		return text.trim();
	}, { maxAttempts: 3 });
	return {
		plan,
		planTrace,
		results,
		synthesis
	};
}
function stripCodeFence(text) {
	const trimmed = text.trim();
	const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
	return fenced ? fenced[1] ?? trimmed : trimmed;
}
function json(data, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { "content-type": "application/json" }
	});
}
var bodySchema = objectType({
	goal: stringType().min(3).max(4e3),
	/** "plan" returns just the risk-weighted plan without executing it —
	*  useful to show the owner the plan and let them approve it first.
	*  "run" plans and immediately executes every step via sub-agents. */
	mode: enumType(["plan", "run"]).default("run"),
	sessionId: stringType().min(1).max(200).optional()
});
var Route$4 = createFileRoute("/api/tasks/run")({ server: { handlers: { POST: async ({ request }) => {
	let raw;
	try {
		raw = await request.json();
	} catch {
		return json({ error: "Invalid JSON body" }, 400);
	}
	const parsed = bodySchema.safeParse(raw);
	if (!parsed.success) return json({
		error: "Invalid request",
		details: parsed.error.flatten()
	}, 400);
	try {
		if (parsed.data.mode === "plan") {
			const { plan, trace } = await buildPlan(parsed.data.goal);
			return json({
				plan,
				trace
			});
		}
		return json(await runTask(parsed.data.goal, parsed.data.sessionId));
	} catch (error) {
		if (error instanceof NoModelConfiguredError) return json({ error: error.message }, 400);
		return json({ error: error instanceof Error ? error.message : "Task failed" }, 500);
	}
} } } });
function redirectToSettings(origin, provider, error) {
	return Response.redirect(`${origin}/settings?connectorError=${encodeURIComponent(error)}&provider=${encodeURIComponent(provider)}`, 302);
}
var Route$3 = createFileRoute("/api/connectors/$provider/authorize")({ server: { handlers: { GET: async ({ request, params }) => {
	const providerId = params.provider;
	const url = new URL(request.url);
	const origin = processModule.env["APP_URL"] ?? url.origin;
	const provider = getProvider(providerId);
	if (!provider) return redirectToSettings(origin, providerId, "unknown_provider");
	if (!isOAuth(provider)) return redirectToSettings(origin, providerId, "not_oauth");
	if (!provider.clientId || !provider.clientSecret) return redirectToSettings(origin, providerId, "not_configured");
	let authorizeUrl = provider.authorizeUrl;
	if (provider.requiresShopParam) {
		const shop = url.searchParams.get("shop");
		if (!shop) return redirectToSettings(origin, providerId, "missing_shop");
		authorizeUrl = authorizeUrl.replace("{shop}", shop);
	}
	const db = getSupabaseAdmin();
	if (!db) return redirectToSettings(origin, providerId, "backend_not_configured");
	const state = randomBytes(24).toString("hex");
	const { error } = await db.from("oauth_states").insert({
		state,
		provider: providerId,
		workspace_id: DEFAULT_WORKSPACE_ID
	});
	if (error) {
		console.error("[connectors/authorize] failed to store oauth state", error);
		return redirectToSettings(origin, providerId, "server_error");
	}
	const redirectUri = `${origin}/api/connectors/${providerId}/callback`;
	const authParams = new URLSearchParams({
		client_id: provider.clientId,
		redirect_uri: redirectUri,
		scope: provider.scope,
		response_type: "code",
		state,
		...provider.extraAuthorizeParams ?? {}
	});
	return Response.redirect(`${authorizeUrl}?${authParams.toString()}`, 302);
} } } });
var Route$2 = createFileRoute("/api/connectors/$provider/callback")({ server: { handlers: { GET: async ({ request, params }) => {
	const providerId = params.provider;
	const url = new URL(request.url);
	const origin = processModule.env["APP_URL"] ?? url.origin;
	const redirectSettings = (error) => Response.redirect(error ? `${origin}/settings?connectorError=${encodeURIComponent(error)}&provider=${encodeURIComponent(providerId)}` : `${origin}/settings?connected=${encodeURIComponent(providerId)}`, 302);
	const provider = getProvider(providerId);
	if (!provider || !isOAuth(provider) || !provider.clientId || !provider.clientSecret) return redirectSettings("not_configured");
	if (url.searchParams.get("error")) return redirectSettings("provider_denied");
	const code = url.searchParams.get("code");
	const state = url.searchParams.get("state");
	if (!code || !state) return redirectSettings("missing_code");
	const db = getSupabaseAdmin();
	if (!db) return redirectSettings("backend_not_configured");
	const { data: stateRow, error: stateError } = await db.from("oauth_states").select("provider, created_at").eq("state", state).maybeSingle();
	if (stateError || !stateRow || stateRow.provider !== providerId) return redirectSettings("invalid_state");
	const ageMs = Date.now() - new Date(stateRow.created_at).getTime();
	await db.from("oauth_states").delete().eq("state", state);
	if (ageMs > 600 * 1e3) return redirectSettings("expired_state");
	let tokenUrl = provider.tokenUrl;
	const shop = url.searchParams.get("shop");
	if (provider.requiresShopParam) {
		if (!shop) return redirectSettings("missing_shop");
		tokenUrl = tokenUrl.replace("{shop}", shop);
	}
	const redirectUri = `${origin}/api/connectors/${providerId}/callback`;
	let tokenJson;
	try {
		const tokenResponse = await fetch(tokenUrl, {
			method: "POST",
			headers: {
				"content-type": "application/x-www-form-urlencoded",
				accept: "application/json"
			},
			body: new URLSearchParams({
				client_id: provider.clientId,
				client_secret: provider.clientSecret,
				code,
				redirect_uri: redirectUri,
				grant_type: "authorization_code"
			})
		});
		if (!tokenResponse.ok) {
			const body = await tokenResponse.text().catch(() => "");
			throw new Error(`token exchange failed ${tokenResponse.status}: ${body.slice(0, 200)}`);
		}
		tokenJson = await tokenResponse.json();
	} catch (error) {
		console.error("[connectors/callback] token exchange failed", error);
		return redirectSettings("token_exchange_failed");
	}
	const { error: upsertError } = await db.from("connectors").upsert({
		id: providerId,
		workspace_id: DEFAULT_WORKSPACE_ID,
		connected: true,
		access_token: tokenJson.access_token ?? null,
		refresh_token: tokenJson.refresh_token ?? null,
		token_type: tokenJson.token_type ?? null,
		scope: tokenJson.scope ?? provider.scope,
		expires_at: tokenJson.expires_in ? new Date(Date.now() + tokenJson.expires_in * 1e3).toISOString() : null,
		metadata: shop ? { shop } : null,
		updated_at: (/* @__PURE__ */ new Date()).toISOString()
	}, { onConflict: "workspace_id,id" });
	if (upsertError) {
		console.error("[connectors/callback] failed to store connector tokens", upsertError);
		return redirectSettings("storage_failed");
	}
	return redirectSettings();
} } } });
var Route$1 = createFileRoute("/api/documents/$id/download")({ server: { handlers: { GET: async ({ params, request }) => {
	try {
		const { bytes, record } = await getDocumentBytes(params.id);
		const inline = new URL(request.url).searchParams.get("inline") === "1";
		return new Response(Buffer.from(bytes), {
			status: 200,
			headers: {
				"content-type": record.mime_type,
				"content-disposition": `${inline ? "inline" : "attachment"}; filename="${record.filename.replace(/"/g, "")}"`,
				"content-length": String(bytes.byteLength)
			}
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : "Document not found";
		return new Response(JSON.stringify({ error: message }), {
			status: 404,
			headers: { "content-type": "application/json" }
		});
	}
} } } });
var Route = createFileRoute("/api/documents/$id/preview")({ server: { handlers: { GET: async ({ params }) => {
	try {
		const doc = await getDocumentMeta(params.id);
		return new Response(JSON.stringify({ document: doc }), {
			status: 200,
			headers: { "content-type": "application/json" }
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : "Document not found";
		return new Response(JSON.stringify({ error: message }), {
			status: 404,
			headers: { "content-type": "application/json" }
		});
	}
} } } });
var IndexRoute = Route$21.update({
	id: "/",
	path: "/",
	getParentRoute: () => Route$22
});
var AnalyticsRoute = Route$20.update({
	id: "/analytics",
	path: "/analytics",
	getParentRoute: () => Route$22
});
var AutomationsRoute = Route$19.update({
	id: "/automations",
	path: "/automations",
	getParentRoute: () => Route$22
});
var GoalsRoute = Route$18.update({
	id: "/goals",
	path: "/goals",
	getParentRoute: () => Route$22
});
var MemoryRoute = Route$17.update({
	id: "/memory",
	path: "/memory",
	getParentRoute: () => Route$22
});
var NotificationsRoute = Route$16.update({
	id: "/notifications",
	path: "/notifications",
	getParentRoute: () => Route$22
});
var ScheduleRoute = Route$15.update({
	id: "/schedule",
	path: "/schedule",
	getParentRoute: () => Route$22
});
var SettingsRoute = Route$14.update({
	id: "/settings",
	path: "/settings",
	getParentRoute: () => Route$22
});
var ApiChatRoute = Route$13.update({
	id: "/api/chat",
	path: "/api/chat",
	getParentRoute: () => Route$22
});
var ApiDocumentsRoute = Route$12.update({
	id: "/api/documents",
	path: "/api/documents",
	getParentRoute: () => Route$22
});
var ApiFxRoute = Route$11.update({
	id: "/api/fx",
	path: "/api/fx",
	getParentRoute: () => Route$22
});
var ApiModelKeysRoute = Route$10.update({
	id: "/api/model-keys",
	path: "/api/model-keys",
	getParentRoute: () => Route$22
});
var ApiSkillsRoute = Route$9.update({
	id: "/api/skills",
	path: "/api/skills",
	getParentRoute: () => Route$22
});
var ApiDocumentsConvertRoute = Route$8.update({
	id: "/convert",
	path: "/convert",
	getParentRoute: () => ApiDocumentsRoute
});
var ApiDocumentsUploadRoute = Route$7.update({
	id: "/upload",
	path: "/upload",
	getParentRoute: () => ApiDocumentsRoute
});
var ApiSandboxRunRoute = Route$6.update({
	id: "/api/sandbox/run",
	path: "/api/sandbox/run",
	getParentRoute: () => Route$22
});
var ApiSkillsReplyRoute = Route$5.update({
	id: "/reply",
	path: "/reply",
	getParentRoute: () => ApiSkillsRoute
});
var ApiTasksRunRoute = Route$4.update({
	id: "/api/tasks/run",
	path: "/api/tasks/run",
	getParentRoute: () => Route$22
});
var ApiConnectorsProviderAuthorizeRoute = Route$3.update({
	id: "/api/connectors/$provider/authorize",
	path: "/api/connectors/$provider/authorize",
	getParentRoute: () => Route$22
});
var ApiConnectorsProviderCallbackRoute = Route$2.update({
	id: "/api/connectors/$provider/callback",
	path: "/api/connectors/$provider/callback",
	getParentRoute: () => Route$22
});
var ApiDocumentsRouteChildren = {
	ApiDocumentsConvertRoute,
	ApiDocumentsUploadRoute,
	ApiDocumentsIdDownloadRoute: Route$1.update({
		id: "/$id/download",
		path: "/$id/download",
		getParentRoute: () => ApiDocumentsRoute
	}),
	ApiDocumentsIdPreviewRoute: Route.update({
		id: "/$id/preview",
		path: "/$id/preview",
		getParentRoute: () => ApiDocumentsRoute
	})
};
var ApiDocumentsRouteWithChildren = ApiDocumentsRoute._addFileChildren(ApiDocumentsRouteChildren);
var ApiSkillsRouteChildren = { ApiSkillsReplyRoute };
var rootRouteChildren = {
	IndexRoute,
	AnalyticsRoute,
	AutomationsRoute,
	GoalsRoute,
	MemoryRoute,
	NotificationsRoute,
	ScheduleRoute,
	SettingsRoute,
	ApiChatRoute,
	ApiDocumentsRoute: ApiDocumentsRouteWithChildren,
	ApiFxRoute,
	ApiModelKeysRoute,
	ApiSkillsRoute: ApiSkillsRoute._addFileChildren(ApiSkillsRouteChildren),
	ApiSandboxRunRoute,
	ApiTasksRunRoute,
	ApiConnectorsProviderAuthorizeRoute,
	ApiConnectorsProviderCallbackRoute
};
var routeTree = Route$22._addFileChildren(rootRouteChildren)._addFileTypes();
var getRouter = () => {
	return createRouter({
		routeTree,
		context: { queryClient: new QueryClient() },
		scrollRestoration: true,
		defaultPreloadStaleTime: 0
	});
};
//#endregion
export { getRouter };
