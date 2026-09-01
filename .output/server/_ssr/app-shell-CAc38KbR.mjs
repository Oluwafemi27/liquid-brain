import { a as __toESM } from "../_runtime.mjs";
import { t as motion } from "../_libs/framer-motion+[...].mjs";
import { c as createServerFn, i as TSS_SERVER_FUNCTION } from "./createServerFn-Dp-V928M.mjs";
import { t as getServerFnById } from "../__23tanstack-start-server-fn-resolver-CESYHpSE.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { d as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as createClient } from "../_libs/supabase__supabase-js.mjs";
import { a as DialogOverlay$1, i as DialogDescription$1, n as DialogClose, o as DialogPortal$1, r as DialogContent$1, s as DialogTitle$1, t as Dialog$1 } from "../_libs/@radix-ui/react-dialog+[...].mjs";
import { t as require_jsx_dev_runtime } from "../_libs/react.mjs";
import { G as ChevronUp, K as ChevronDown, T as Network, X as CalendarClock, Y as ChartColumn, Z as Brain, _ as Settings, d as Target, et as Bell, n as X, p as Sparkles, q as Check, r as Waves } from "../_libs/lucide-react.mjs";
import { t as create } from "../_libs/zustand.mjs";
import { n as clsx, t as cva } from "../_libs/class-variance-authority+clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
import { t as Root } from "../_libs/radix-ui__react-label.mjs";
import { a as SelectItemIndicator, c as SelectPortal, d as SelectSeparator$1, f as SelectTrigger$1, i as SelectItem$1, l as SelectScrollDownButton$1, m as SelectViewport, n as SelectContent$1, o as SelectItemText, p as SelectValue$1, r as SelectIcon, s as SelectLabel$1, t as Select$1, u as SelectScrollUpButton$1 } from "../_libs/@radix-ui/react-select+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/app-shell-CAc38KbR.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_dev_runtime = require_jsx_dev_runtime();
/** Data sources ADUF can connect to. A product catalog, not business data —
*  every account starts fully disconnected. */
var initialDataSources = [
	{
		id: "shopify",
		name: "Shopify",
		category: "Commerce",
		connected: false
	},
	{
		id: "ga",
		name: "Google Analytics",
		category: "Traffic",
		connected: false
	},
	{
		id: "whatsapp",
		name: "WhatsApp Business",
		category: "Messaging",
		connected: false
	},
	{
		id: "paystack",
		name: "Paystack",
		category: "Payments",
		connected: false
	},
	{
		id: "meta",
		name: "Meta Ads",
		category: "Advertising",
		connected: false
	},
	{
		id: "sheets",
		name: "Google Sheets",
		category: "Ops",
		connected: false
	}
];
/** Fresh accounts start with an empty week — no fabricated meetings. */
var initialScheduleEvents = [];
/** The one insight every fresh account starts with — onboarding guidance,
*  not a fabricated business figure. Everything after this is generated
*  live from real state changes (an automation flipped on, a goal hit). */
var initialInsights = [{
	id: "welcome",
	title: "Welcome to ADUF",
	body: "Connect a data source or set your first goal and I'll start surfacing real insights here as things happen.",
	severity: "info",
	source: "ADUF",
	createdAt: Date.now(),
	read: false
}];
var cached = null;
function getSupabaseBrowser() {
	if (typeof window === "undefined") return null;
	const url = {
		"BASE_URL": "/",
		"DEV": true,
		"MODE": "production",
		"PROD": false,
		"SSR": true,
		"TSS_DEV_SERVER": "false",
		"TSS_DEV_SSR_STYLES_BASEPATH": "/",
		"TSS_DEV_SSR_STYLES_ENABLED": "true",
		"TSS_DISABLE_CSRF_MIDDLEWARE_WARNING": "false",
		"TSS_INLINE_CSS_ENABLED": "false",
		"TSS_ROUTER_BASEPATH": "",
		"TSS_SERVER_FN_BASE": "/_serverFn/"
	}["VITE_SUPABASE_URL"];
	const anonKey = {
		"BASE_URL": "/",
		"DEV": true,
		"MODE": "production",
		"PROD": false,
		"SSR": true,
		"TSS_DEV_SERVER": "false",
		"TSS_DEV_SSR_STYLES_BASEPATH": "/",
		"TSS_DEV_SSR_STYLES_ENABLED": "true",
		"TSS_DISABLE_CSRF_MIDDLEWARE_WARNING": "false",
		"TSS_INLINE_CSS_ENABLED": "false",
		"TSS_ROUTER_BASEPATH": "",
		"TSS_SERVER_FN_BASE": "/_serverFn/"
	}["VITE_SUPABASE_ANON_KEY"];
	if (!url || !anonKey) {
		console.warn("[auth] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY not set — Google sign-in is disabled.");
		return null;
	}
	if (!cached) cached = createClient(url, anonKey, { auth: {
		persistSession: true,
		autoRefreshToken: true,
		detectSessionInUrl: true
	} });
	return cached;
}
function toAuthUser(supabaseUser) {
	const meta = supabaseUser.user_metadata ?? {};
	const name = meta["full_name"] ?? meta["name"] ?? (supabaseUser.email ? supabaseUser.email.split("@")[0] : "") ?? "";
	const avatarUrl = meta["avatar_url"] ?? meta["picture"] ?? null;
	return {
		id: supabaseUser.id,
		email: supabaseUser.email ?? null,
		name,
		avatarUrl
	};
}
var useAuth = create((set, get) => ({
	status: "loading",
	user: null,
	accessToken: null,
	surveyStatus: "unknown",
	signInModalOpen: false,
	initialized: false,
	init: () => {
		if (get().initialized) return;
		set({ initialized: true });
		const client = getSupabaseBrowser();
		if (!client) {
			set({ status: "signed-out" });
			return;
		}
		client.auth.getSession().then(({ data }) => {
			const session = data.session;
			set(session ? {
				status: "signed-in",
				user: toAuthUser(session.user),
				accessToken: session.access_token,
				signInModalOpen: false
			} : { status: "signed-out" });
		});
		client.auth.onAuthStateChange((_event, session) => {
			set(session ? {
				status: "signed-in",
				user: toAuthUser(session.user),
				accessToken: session.access_token,
				signInModalOpen: false
			} : {
				status: "signed-out",
				user: null,
				accessToken: null,
				surveyStatus: "unknown"
			});
		});
	},
	openSignIn: () => set({ signInModalOpen: true }),
	closeSignIn: () => set({ signInModalOpen: false }),
	signInWithGoogle: async () => {
		const client = getSupabaseBrowser();
		if (!client) {
			console.error("[auth] Supabase isn't configured — can't sign in.");
			return;
		}
		await client.auth.signInWithOAuth({
			provider: "google",
			options: { redirectTo: window.location.origin }
		});
	},
	signOut: async () => {
		const client = getSupabaseBrowser();
		if (!client) return;
		await client.auth.signOut();
		set({
			status: "signed-out",
			user: null,
			accessToken: null,
			surveyStatus: "unknown"
		});
	},
	setSurveyStatus: (status) => set({ surveyStatus: status }),
	requireAuth: () => {
		const { status } = get();
		if (status === "signed-in") return true;
		set({ signInModalOpen: true });
		return false;
	}
}));
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var fetchConnectorStatuses = createServerFn({ method: "GET" }).handler(createSsrRpc("cdf2289d974805f0b50f709d93d6770a68c7bb8b187f5b251d88348598899290"));
var fetchGoals = createServerFn({ method: "GET" }).handler(createSsrRpc("f44eb82f7bd67a16b74a9711804545b5fb5ebd9337bc31c353c7ab055183d896"));
var fetchAutomations = createServerFn({ method: "GET" }).handler(createSsrRpc("ccb5f43d9b5f16bc209684b0b39118e358c1115588be86490f95f0867723dc8f"));
var setAutomationEnabledFn = createServerFn({ method: "POST" }).validator((data) => data).handler(createSsrRpc("6aa4601de618649c0557cd19a0e021db192ac7a774021d6f3d86a7d2d51aa8c7"));
var createGoalFn = createServerFn({ method: "POST" }).validator((data) => data).handler(createSsrRpc("863c6881819a89073d67706b473992052eb2b1ebcb8db674b3bdf377d99c628d"));
var bumpGoalFn = createServerFn({ method: "POST" }).validator((data) => data).handler(createSsrRpc("314b5d564f37628f5080a28c45b6a32c4c3cc9edb0c1d024f1c7b2508d5b1016"));
var toggleGoalSubTaskFn = createServerFn({ method: "POST" }).validator((data) => data).handler(createSsrRpc("3344e03ba8cb0e7a49eeb91d8ef38b1f3d14574ed36407709c15b8288f0a9989"));
createServerFn({ method: "POST" }).validator((data) => data).handler(createSsrRpc("fcf653d8b6e63db849c13fdd1087755ce92dc967bcc7d3a4eb04ea0533422053"));
/** Returns "unconfigured" | "pending" | "done" — never trusts a userId the
*  client claims; it re-derives identity from the access token itself. */
var fetchSurveyStatus = createServerFn({ method: "POST" }).validator((data) => data).handler(createSsrRpc("500a88227a705844576527860dcf631ec7036b09c2c92a00003ab4b9a7b283e8"));
var submitSurvey = createServerFn({ method: "POST" }).validator((data) => data).handler(createSsrRpc("253efa051317895311e9f26ce13938b7c75a91b2d290d12a4043ddc8cdaad334"));
function makeSessionId() {
	if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
	return `session-${Date.now()}-${Math.round(Math.random() * 1e9)}`;
}
var MONEY_GOAL_PATTERN = /[₦$€£]|\b(sales|revenue|mrr|income|earn(ings)?|profit)\b/i;
/** Detects whether a goal is money-denominated from its title, since the
*  form only collects a title + a bare number — "100 bookings" and
*  "₦5,000,000 in Sales" both arrive the same shape otherwise. Money goals
*  get a currency (shown converted to USD); everything else is a plain count. */
function inferGoalCurrency(title) {
	return MONEY_GOAL_PATTERN.test(title) ? "₦" : "";
}
function makeInsight(partial) {
	return {
		...partial,
		id: `insight-${Date.now()}-${Math.round(Math.random() * 1e4)}`,
		createdAt: Date.now(),
		read: false
	};
}
var useAduf = create((set, get) => ({
	userName: "",
	series: [],
	deals: [],
	topCustomers: [],
	channelRevenue: [],
	funnel: [],
	goals: [],
	automations: [],
	memoryNodes: [],
	memoryEdges: [],
	sources: initialDataSources,
	messages: [],
	thinking: false,
	sessionId: makeSessionId(),
	insights: initialInsights,
	scheduleEvents: initialScheduleEvents,
	setUserName: (name) => set({ userName: name }),
	toggleAutomation: (id) => {
		const automation = get().automations.find((item) => item.id === id);
		if (!automation) return;
		setAutomationEnabledFn({ data: {
			id,
			enabled: !automation.enabled
		} }).then((updated) => {
			if (updated) get().upsertAutomation(updated);
		}).catch((err) => console.error("[automations] toggle failed", err));
	},
	setAutomations: (automations) => set({ automations }),
	upsertAutomation: (automation) => set((s) => {
		return { automations: s.automations.some((item) => item.id === automation.id) ? s.automations.map((item) => item.id === automation.id ? automation : item) : [...s.automations, automation] };
	}),
	removeAutomation: (id) => set((s) => ({ automations: s.automations.filter((item) => item.id !== id) })),
	toggleSubTask: (goalId, taskId) => {
		toggleGoalSubTaskFn({ data: {
			goalId,
			taskId
		} }).then((goal) => {
			if (goal) get().upsertGoal(goal);
		}).catch((err) => console.error("[goals] toggleSubTask failed", err));
	},
	bumpGoal: (goalId, amount) => {
		const before = get().goals.find((g) => g.id === goalId);
		bumpGoalFn({ data: {
			goalId,
			amount
		} }).then((after) => {
			if (!after) return;
			get().upsertGoal(after);
			if (before && before.current < before.target && after.current >= after.target) set((s) => ({ insights: [makeInsight({
				title: `Goal reached: ${after.title}`,
				body: `You hit your target of ${after.currency}${after.target.toLocaleString()}. Nice work.`,
				severity: "success",
				source: "Goals"
			}), ...s.insights] }));
		}).catch((err) => console.error("[goals] bumpGoal failed", err));
	},
	addGoal: (title, target) => {
		createGoalFn({ data: {
			title,
			target,
			currency: inferGoalCurrency(title)
		} }).then((goal) => {
			if (!goal) return;
			get().upsertGoal(goal);
			set((s) => ({ insights: [makeInsight({
				title: `New goal set: ${title}`,
				body: `ADUF will track progress toward this goal and flag anything worth knowing here.`,
				severity: "info",
				source: "Goals"
			}), ...s.insights] }));
		}).catch((err) => console.error("[goals] addGoal failed", err));
	},
	setGoals: (goals) => set({ goals }),
	upsertGoal: (goal) => set((s) => {
		return { goals: s.goals.some((g) => g.id === goal.id) ? s.goals.map((g) => g.id === goal.id ? goal : g) : [...s.goals, goal] };
	}),
	removeGoal: (goalId) => set((s) => ({ goals: s.goals.filter((g) => g.id !== goalId) })),
	connectSource: (id) => set((s) => {
		const sources = s.sources.map((d) => d.id === id ? {
			...d,
			connected: true
		} : d);
		const src = sources.find((x) => x.id === id);
		if (!src) return { sources };
		return {
			sources,
			insights: [makeInsight({
				title: `${src.name} connected`,
				body: `ADUF is now syncing data from ${src.name}.`,
				severity: "success",
				source: "Data"
			}), ...s.insights]
		};
	}),
	setSourceConnected: (id, connected) => set((s) => ({ sources: s.sources.map((d) => d.id === id ? {
		...d,
		connected
	} : d) })),
	sendMessage: (text) => {
		const trimmed = text.trim();
		if (!trimmed || get().thinking) return;
		if (!useAuth.getState().requireAuth()) return;
		const history = get().messages;
		set((s) => ({
			messages: [...s.messages, {
				id: `u-${Date.now()}`,
				role: "user",
				text: trimmed
			}],
			thinking: true
		}));
		const accessToken = useAuth.getState().accessToken;
		fetch("/api/chat", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				message: trimmed,
				history,
				sessionId: get().sessionId,
				accessToken
			})
		}).then(async (res) => {
			if (res.status === 401) {
				useAuth.getState().openSignIn();
				throw new Error("sign_in_required");
			}
			if (!res.ok) throw new Error(`chat request failed (${res.status})`);
			return await res.json();
		}).then((data) => {
			set((s) => ({
				messages: [...s.messages, {
					id: `a-${Date.now()}`,
					role: "aduf",
					text: data.reply,
					...data.question ? { question: data.question } : {},
					...data.trace?.length ? { trace: data.trace } : {},
					...data.attachments?.length ? { attachments: data.attachments } : {},
					...data.analysis ? { analysis: data.analysis } : {},
					...data.proposedAction ? {
						proposedAction: data.proposedAction,
						proposedActionStatus: "pending"
					} : {}
				}],
				thinking: false
			}));
		}).catch((err) => {
			if (err instanceof Error && err.message === "sign_in_required") {
				set((s) => ({
					messages: s.messages.slice(0, -1),
					thinking: false
				}));
				return;
			}
			set((s) => ({
				messages: [...s.messages, {
					id: `a-${Date.now()}`,
					role: "aduf",
					text: "Couldn't reach the brain just now — check your connection and try again."
				}],
				thinking: false
			}));
		});
	},
	answerQuestion: (messageId, values, label) => {
		set((s) => ({ messages: s.messages.map((m) => m.id === messageId ? {
			...m,
			answeredValues: values
		} : m) }));
		get().sendMessage(label);
	},
	markInsightRead: (id) => set((s) => ({ insights: s.insights.map((i) => i.id === id ? {
		...i,
		read: true
	} : i) })),
	markAllInsightsRead: () => set((s) => ({ insights: s.insights.map((i) => ({
		...i,
		read: true
	})) })),
	dismissInsight: (id) => set((s) => ({ insights: s.insights.filter((i) => i.id !== id) })),
	approveProposedAction: (messageId) => {
		const message = get().messages.find((m) => m.id === messageId);
		const action = message?.proposedAction;
		if (!action || message?.proposedActionStatus !== "pending") return;
		set((s) => ({ messages: s.messages.map((m) => m.id === messageId ? {
			...m,
			proposedActionStatus: "approved"
		} : m) }));
		if (action.type === "create_goal") get().addGoal(action.title, action.target);
		else if (action.type === "toggle_automation") {
			const current = get().automations.find((a) => a.id === action.channelId);
			if (current && current.enabled !== action.enabled) get().toggleAutomation(action.channelId);
		}
	},
	dismissProposedAction: (messageId) => set((s) => ({ messages: s.messages.map((m) => m.id === messageId ? {
		...m,
		proposedActionStatus: "dismissed"
	} : m) })),
	addScheduleEvent: (event) => set((s) => ({
		scheduleEvents: [...s.scheduleEvents, {
			...event,
			id: `sched-${Date.now()}-${Math.round(Math.random() * 1e4)}`,
			done: false
		}],
		insights: [makeInsight({
			title: `Scheduled: ${event.title}`,
			body: `Booked for ${event.day} ${event.startTime}–${event.endTime}. ADUF will remind you when it's close.`,
			severity: "info",
			source: "Schedule"
		}), ...s.insights]
	})),
	toggleScheduleEventDone: (id) => set((s) => ({ scheduleEvents: s.scheduleEvents.map((e) => e.id === id ? {
		...e,
		done: !e.done
	} : e) })),
	removeScheduleEvent: (id) => set((s) => ({ scheduleEvents: s.scheduleEvents.filter((e) => e.id !== id) }))
}));
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
/** Coarse relative-time label for insight/notification timestamps. */
function timeAgo(ts) {
	const s = Math.floor((Date.now() - ts) / 1e3);
	if (s < 45) return "just now";
	const m = Math.floor(s / 60);
	if (m < 60) return `${m}m ago`;
	const h = Math.floor(m / 60);
	if (h < 24) return `${h}h ago`;
	const d = Math.floor(h / 24);
	if (d < 7) return `${d}d ago`;
	return `${Math.floor(d / 7)}w ago`;
}
var _jsxFileName$9 = "/root/app/code/src/components/aduf/liquid.tsx";
/** Builds a seamless, tileable wave path: alternating up/down bezier bumps
*  that return to `baseline` every half period, so the shape can be laid
*  side-by-side with a copy of itself with no visible seam. */
function wavePath(width, height, baseline, amplitude, period) {
	const half = period / 2;
	let d = `M0,${baseline}`;
	let x = 0;
	let crestUp = true;
	while (x < width) {
		const next = x + half;
		const c1 = x + half * .33;
		const c2 = x + half * .67;
		const y = crestUp ? baseline - amplitude : baseline + amplitude;
		d += ` C${c1},${y} ${c2},${y} ${next},${baseline}`;
		x = next;
		crestUp = !crestUp;
	}
	return `${d} L${width},${height} L0,${height} Z`;
}
var WAVE_W = 1440;
var WAVE_H = 260;
var backPath = wavePath(WAVE_W, WAVE_H, 150, 26, 480);
var midPath = wavePath(WAVE_W, WAVE_H, 130, 20, 360);
var frontPath = wavePath(WAVE_W, WAVE_H, 110, 14, 288);
/** One flowing layer: the wave tiled twice inside a 200%-wide track that
*  scrolls a full tile-width (-50%) on a linear loop, so the motion never
*  stutters or resets visibly. */
function RiverLayer({ path, className, fill, reverse = false, duration }) {
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: cn("absolute inset-x-0 bottom-0 flex w-[200%]", reverse ? "animate-river-slow" : "animate-river", className),
		style: duration ? { animationDuration: duration } : void 0,
		children: [0, 1].map((i) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("svg", {
			viewBox: `0 0 ${WAVE_W} ${WAVE_H}`,
			preserveAspectRatio: "none",
			className: "h-full w-1/2 shrink-0",
			children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("path", {
				d: path,
				fill
			}, void 0, false, {
				fileName: _jsxFileName$9,
				lineNumber: 69,
				columnNumber: 11
			}, this)
		}, i, false, {
			fileName: _jsxFileName$9,
			lineNumber: 63,
			columnNumber: 9
		}, this))
	}, void 0, false, {
		fileName: _jsxFileName$9,
		lineNumber: 54,
		columnNumber: 5
	}, this);
}
/** Deterministic (SSR-safe — no Math.random) spray kicked up along the crest. */
var SPLASHES = [
	{
		left: "6%",
		delay: "0s",
		duration: "2.1s"
	},
	{
		left: "17%",
		delay: "1.3s",
		duration: "2.6s"
	},
	{
		left: "29%",
		delay: "0.6s",
		duration: "2.3s"
	},
	{
		left: "41%",
		delay: "1.9s",
		duration: "2.5s"
	},
	{
		left: "53%",
		delay: "0.2s",
		duration: "2.2s"
	},
	{
		left: "64%",
		delay: "1.1s",
		duration: "2.7s"
	},
	{
		left: "76%",
		delay: "0.8s",
		duration: "2.4s"
	},
	{
		left: "87%",
		delay: "1.6s",
		duration: "2.3s"
	},
	{
		left: "95%",
		delay: "0.4s",
		duration: "2.6s"
	}
];
/** Animated ambience: a liquid glass "river" that never stops moving,
*  layered waves crossing at different speeds plus flecks of spray off the
*  crest. Pure CSS transforms — cheap and 60fps. */
function LiquidBackground() {
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		"aria-hidden": true,
		className: "pointer-events-none fixed inset-0 -z-10 overflow-hidden",
		children: [
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { className: "absolute inset-0 bg-background" }, void 0, false, {
				fileName: _jsxFileName$9,
				lineNumber: 95,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "animate-drift absolute -left-40 top-[-10%] h-[70vh] w-[70vh] rounded-full opacity-35 blur-3xl",
				style: { background: "radial-gradient(circle, var(--cyan), transparent 65%)" }
			}, void 0, false, {
				fileName: _jsxFileName$9,
				lineNumber: 97,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "animate-drift absolute -right-32 top-[10%] h-[55vh] w-[55vh] rounded-full opacity-25 blur-3xl",
				style: {
					background: "radial-gradient(circle, var(--violet), transparent 65%)",
					animationDelay: "-6s"
				}
			}, void 0, false, {
				fileName: _jsxFileName$9,
				lineNumber: 101,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "absolute inset-x-0 bottom-0 h-[38vh] min-h-[220px] overflow-hidden",
				style: { maskImage: "linear-gradient(180deg, transparent, black 45%)" },
				children: [
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(RiverLayer, {
						path: backPath,
						fill: "color-mix(in oklab, var(--violet) 30%, transparent)",
						reverse: true,
						duration: "26s",
						className: "opacity-40 blur-[1px]"
					}, void 0, false, {
						fileName: _jsxFileName$9,
						lineNumber: 114,
						columnNumber: 9
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(RiverLayer, {
						path: midPath,
						fill: "color-mix(in oklab, var(--cyan) 34%, transparent)",
						duration: "18s",
						className: "opacity-45"
					}, void 0, false, {
						fileName: _jsxFileName$9,
						lineNumber: 121,
						columnNumber: 9
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(RiverLayer, {
						path: frontPath,
						fill: "var(--gradient-water)",
						duration: "12s",
						className: "opacity-80"
					}, void 0, false, {
						fileName: _jsxFileName$9,
						lineNumber: 127,
						columnNumber: 9
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "absolute inset-x-0 top-[38%] h-0",
						children: SPLASHES.map((s, i) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
							className: "animate-splash absolute h-1.5 w-1.5 rounded-full bg-cyan/80 blur-[0.5px]",
							style: {
								left: s.left,
								animationDelay: s.delay,
								animationDuration: s.duration
							}
						}, i, false, {
							fileName: _jsxFileName$9,
							lineNumber: 137,
							columnNumber: 13
						}, this))
					}, void 0, false, {
						fileName: _jsxFileName$9,
						lineNumber: 135,
						columnNumber: 9
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName$9,
				lineNumber: 110,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "absolute inset-0 opacity-[0.07]",
				style: {
					backgroundImage: "repeating-linear-gradient(0deg, transparent 0 22px, oklch(1 0 0 / 40%) 22px 23px)",
					maskImage: "radial-gradient(ellipse at 50% 40%, black, transparent 75%)"
				}
			}, void 0, false, {
				fileName: _jsxFileName$9,
				lineNumber: 146,
				columnNumber: 7
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName$9,
		lineNumber: 94,
		columnNumber: 5
	}, this);
}
function GlassCard({ children, className, hover = true, delay = 0 }) {
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(motion.div, {
		initial: {
			opacity: 0,
			y: 14
		},
		animate: {
			opacity: 1,
			y: 0
		},
		transition: {
			duration: .5,
			delay,
			ease: [
				.2,
				.8,
				.2,
				1
			]
		},
		className: cn("glass relative overflow-hidden p-5", hover && "glass-hover", className),
		children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
			"aria-hidden": true,
			className: "pointer-events-none absolute inset-x-0 top-0 h-px",
			style: {
				background: "var(--gradient-accent)",
				opacity: .5
			}
		}, void 0, false, {
			fileName: _jsxFileName$9,
			lineNumber: 176,
			columnNumber: 7
		}, this), children]
	}, void 0, true, {
		fileName: _jsxFileName$9,
		lineNumber: 170,
		columnNumber: 5
	}, this);
}
/** Water-fill progress bar — the only loading/progress primitive in the app. */
function WaterBar({ value, label, className }) {
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: cn("space-y-1.5", className),
		children: [label ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
			className: "flex justify-between text-xs text-muted-foreground",
			children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { children: label }, void 0, false, {
				fileName: _jsxFileName$9,
				lineNumber: 200,
				columnNumber: 11
			}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
				className: "tabular-nums text-foreground",
				children: [Math.round(value), "%"]
			}, void 0, true, {
				fileName: _jsxFileName$9,
				lineNumber: 201,
				columnNumber: 11
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName$9,
			lineNumber: 199,
			columnNumber: 9
		}, this) : null, /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
			className: "relative h-2.5 overflow-hidden rounded-full bg-secondary",
			children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(motion.div, {
				className: "water-surface absolute inset-y-0 left-0 rounded-full",
				initial: { width: 0 },
				animate: { width: `${Math.min(100, Math.max(0, value))}%` },
				transition: {
					duration: 1.1,
					ease: [
						.2,
						.8,
						.2,
						1
					]
				},
				children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { className: "animate-wave absolute inset-y-0 -right-4 w-8 bg-cyan/60 blur-sm" }, void 0, false, {
					fileName: _jsxFileName$9,
					lineNumber: 211,
					columnNumber: 11
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName$9,
				lineNumber: 205,
				columnNumber: 9
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName$9,
			lineNumber: 204,
			columnNumber: 7
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName$9,
		lineNumber: 197,
		columnNumber: 5
	}, this);
}
/** Glass orb/bubble filled with water to `fill`%. Floats gently. */
function WaterOrb({ fill, size = 168, children, float = true, burst = false }) {
	const level = Math.min(100, Math.max(0, fill));
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: cn("relative shrink-0", float && "animate-float"),
		style: {
			width: size,
			height: size
		},
		children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
			className: "glass relative h-full w-full overflow-hidden rounded-full",
			children: [
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(motion.div, {
					className: "absolute inset-x-0 bottom-0",
					initial: { height: 0 },
					animate: { height: `${level}%` },
					transition: {
						duration: 1.4,
						ease: [
							.2,
							.8,
							.2,
							1
						]
					},
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { className: "water-surface absolute inset-0 opacity-80" }, void 0, false, {
						fileName: _jsxFileName$9,
						lineNumber: 262,
						columnNumber: 11
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { className: "animate-wave absolute -top-2 left-0 h-4 w-[200%] rounded-full bg-cyan/50 blur-[2px]" }, void 0, false, {
						fileName: _jsxFileName$9,
						lineNumber: 263,
						columnNumber: 11
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName$9,
					lineNumber: 256,
					columnNumber: 9
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					"aria-hidden": true,
					className: "absolute left-[18%] top-[12%] h-[22%] w-[30%] rounded-full bg-white/25 blur-md"
				}, void 0, false, {
					fileName: _jsxFileName$9,
					lineNumber: 265,
					columnNumber: 9
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "relative z-10 flex h-full w-full flex-col items-center justify-center px-3 text-center",
					children
				}, void 0, false, {
					fileName: _jsxFileName$9,
					lineNumber: 269,
					columnNumber: 9
				}, this)
			]
		}, void 0, true, {
			fileName: _jsxFileName$9,
			lineNumber: 255,
			columnNumber: 7
		}, this), burst ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
			"aria-hidden": true,
			className: "pointer-events-none absolute inset-0",
			children: Array.from({ length: 12 }).map((_, i) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(motion.span, {
				className: "absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full bg-cyan",
				animate: {
					x: Math.cos(i / 12 * Math.PI * 2) * size * .7,
					y: Math.sin(i / 12 * Math.PI * 2) * size * .7,
					opacity: [1, 0]
				},
				transition: {
					duration: 1.8,
					repeat: Infinity,
					delay: i * .06
				}
			}, i, false, {
				fileName: _jsxFileName$9,
				lineNumber: 276,
				columnNumber: 13
			}, this))
		}, void 0, false, {
			fileName: _jsxFileName$9,
			lineNumber: 274,
			columnNumber: 9
		}, this) : null]
	}, void 0, true, {
		fileName: _jsxFileName$9,
		lineNumber: 251,
		columnNumber: 5
	}, this);
}
/** Slim circular progress ring — compact metric display for banners/dashboards,
*  distinct from WaterOrb (which is the big hero liquid-fill primitive). */
function ProgressRing({ value, label, sublabel, size = 92, color = "var(--cyan)", dashed = false }) {
	const stroke = 7;
	const radius = (size - stroke) / 2;
	const circumference = 2 * Math.PI * radius;
	const pct = Math.min(100, Math.max(0, value));
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "flex flex-col items-center gap-2",
		children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
			className: "relative",
			style: {
				width: size,
				height: size
			},
			children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("svg", {
				width: size,
				height: size,
				className: "-rotate-90",
				children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("circle", {
					cx: size / 2,
					cy: size / 2,
					r: radius,
					stroke: "var(--border)",
					strokeWidth: stroke,
					fill: "none",
					strokeDasharray: dashed ? "3 5" : void 0
				}, void 0, false, {
					fileName: _jsxFileName$9,
					lineNumber: 318,
					columnNumber: 11
				}, this), dashed ? null : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(motion.circle, {
					cx: size / 2,
					cy: size / 2,
					r: radius,
					stroke: color,
					strokeWidth: stroke,
					fill: "none",
					strokeLinecap: "round",
					strokeDasharray: circumference,
					initial: { strokeDashoffset: circumference },
					animate: { strokeDashoffset: circumference - pct / 100 * circumference },
					transition: {
						duration: 1.1,
						ease: [
							.2,
							.8,
							.2,
							1
						]
					}
				}, void 0, false, {
					fileName: _jsxFileName$9,
					lineNumber: 328,
					columnNumber: 13
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName$9,
				lineNumber: 317,
				columnNumber: 9
			}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "absolute inset-0 grid place-items-center px-2 text-center",
				children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
					className: "font-display text-sm font-semibold leading-none",
					children: label
				}, void 0, false, {
					fileName: _jsxFileName$9,
					lineNumber: 344,
					columnNumber: 11
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName$9,
				lineNumber: 343,
				columnNumber: 9
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName$9,
			lineNumber: 316,
			columnNumber: 7
		}, this), sublabel ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
			className: "max-w-[104px] truncate text-center text-[10px] text-muted-foreground",
			children: sublabel
		}, void 0, false, {
			fileName: _jsxFileName$9,
			lineNumber: 348,
			columnNumber: 9
		}, this) : null]
	}, void 0, true, {
		fileName: _jsxFileName$9,
		lineNumber: 315,
		columnNumber: 5
	}, this);
}
/** Mounted once in AppShell. Boots the auth session listener, and — once a
*  user is signed in — checks whether they've completed the onboarding
*  survey yet, so SurveyModal knows whether to open. Renders nothing. */
function AuthBootstrap() {
	const { init, status, accessToken, user, setSurveyStatus } = useAuth();
	const checkedFor = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		init();
	}, [init]);
	(0, import_react.useEffect)(() => {
		if (status !== "signed-in" || !accessToken || !user) return;
		if (checkedFor.current === user.id) return;
		checkedFor.current = user.id;
		fetchSurveyStatus({ data: { accessToken } }).then((res) => {
			if (res.status === "done" || res.status === "pending") setSurveyStatus(res.status);
		}).catch(() => {});
	}, [
		status,
		accessToken,
		user,
		setSurveyStatus
	]);
	(0, import_react.useEffect)(() => {
		if (status === "signed-out") checkedFor.current = null;
	}, [status]);
	return null;
}
function AutomationsBootstrap() {
	const { setAutomations, upsertAutomation, removeAutomation } = useAduf();
	(0, import_react.useEffect)(() => {
		let cancelled = false;
		fetchAutomations().then((automations) => {
			if (!cancelled) setAutomations(automations);
		}).catch(() => {});
		return () => {
			cancelled = true;
		};
	}, [setAutomations]);
	(0, import_react.useEffect)(() => {
		const client = getSupabaseBrowser();
		if (!client) return;
		const channel = client.channel("automations-realtime").on("postgres_changes", {
			event: "*",
			schema: "public",
			table: "automations"
		}, (payload) => {
			if (payload.eventType === "DELETE") {
				const id = payload.old.id;
				if (id) removeAutomation(id);
				return;
			}
			const row = payload.new;
			upsertAutomation(row);
		}).subscribe();
		return () => {
			client.removeChannel(channel);
		};
	}, [upsertAutomation, removeAutomation]);
	return null;
}
/** Mounted once in AppShell. Loads goals from Supabase on first render, then
*  keeps them live via Supabase Realtime — any insert/update/delete on the
*  `goals` table (from this tab, another tab, or another session) is
*  reflected here within moments, no manual refetch needed. Renders nothing. */
function GoalsBootstrap() {
	const { setGoals, upsertGoal, removeGoal } = useAduf();
	(0, import_react.useEffect)(() => {
		let cancelled = false;
		fetchGoals().then((goals) => {
			if (!cancelled) setGoals(goals);
		}).catch(() => {});
		return () => {
			cancelled = true;
		};
	}, [setGoals]);
	(0, import_react.useEffect)(() => {
		const client = getSupabaseBrowser();
		if (!client) return;
		const channel = client.channel("goals-realtime").on("postgres_changes", {
			event: "*",
			schema: "public",
			table: "goals"
		}, (payload) => {
			if (payload.eventType === "DELETE") {
				const oldId = payload.old["id"];
				if (oldId) removeGoal(oldId);
				return;
			}
			const row = payload.new;
			upsertGoal({
				id: row.id,
				title: row.title,
				target: row.target,
				current: row.current,
				currency: row.currency,
				due: row.due,
				subTasks: row.sub_tasks ?? []
			});
		}).subscribe();
		return () => {
			client.removeChannel(channel);
		};
	}, [upsertGoal, removeGoal]);
	return null;
}
var _jsxFileName$8 = "/root/app/code/src/components/ui/dialog.tsx";
var Dialog = Dialog$1;
var DialogPortal = DialogPortal$1;
var DialogOverlay = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogOverlay$1, {
	ref,
	className: cn("fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0", className),
	...props
}, void 0, false, {
	fileName: _jsxFileName$8,
	lineNumber: 21,
	columnNumber: 3
}, void 0));
DialogOverlay.displayName = DialogOverlay$1.displayName;
var DialogContent = import_react.forwardRef(({ className, children, showCloseButton = true, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogPortal, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogOverlay, {}, void 0, false, {
	fileName: _jsxFileName$8,
	lineNumber: 37,
	columnNumber: 5
}, void 0), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogContent$1, {
	ref,
	className: cn("fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg", className),
	...props,
	children: [children, showCloseButton ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogClose, {
		className: "absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background cursor-pointer transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground",
		children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(X, { className: "h-4 w-4" }, void 0, false, {
			fileName: _jsxFileName$8,
			lineNumber: 49,
			columnNumber: 11
		}, void 0), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
			className: "sr-only",
			children: "Close"
		}, void 0, false, {
			fileName: _jsxFileName$8,
			lineNumber: 50,
			columnNumber: 11
		}, void 0)]
	}, void 0, true, {
		fileName: _jsxFileName$8,
		lineNumber: 48,
		columnNumber: 9
	}, void 0) : null]
}, void 0, true, {
	fileName: _jsxFileName$8,
	lineNumber: 38,
	columnNumber: 5
}, void 0)] }, void 0, true, {
	fileName: _jsxFileName$8,
	lineNumber: 36,
	columnNumber: 3
}, void 0));
DialogContent.displayName = DialogContent$1.displayName;
var DialogHeader = ({ className, ...props }) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
	className: cn("flex flex-col space-y-1.5 text-center sm:text-left", className),
	...props
}, void 0, false, {
	fileName: _jsxFileName$8,
	lineNumber: 59,
	columnNumber: 3
}, void 0);
DialogHeader.displayName = "DialogHeader";
var DialogFooter = ({ className, ...props }) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
	className: cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className),
	...props
}, void 0, false, {
	fileName: _jsxFileName$8,
	lineNumber: 64,
	columnNumber: 3
}, void 0);
DialogFooter.displayName = "DialogFooter";
var DialogTitle = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogTitle$1, {
	ref,
	className: cn("text-lg font-semibold leading-none tracking-tight", className),
	...props
}, void 0, false, {
	fileName: _jsxFileName$8,
	lineNumber: 75,
	columnNumber: 3
}, void 0));
DialogTitle.displayName = DialogTitle$1.displayName;
var DialogDescription = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogDescription$1, {
	ref,
	className: cn("text-sm text-muted-foreground", className),
	...props
}, void 0, false, {
	fileName: _jsxFileName$8,
	lineNumber: 87,
	columnNumber: 3
}, void 0));
DialogDescription.displayName = DialogDescription$1.displayName;
var _jsxFileName$7 = "/root/app/code/src/components/aduf/sign-in-modal.tsx";
function GoogleGlyph() {
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("svg", {
		viewBox: "0 0 24 24",
		className: "h-4.5 w-4.5",
		"aria-hidden": true,
		children: [
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("path", {
				fill: "#4285F4",
				d: "M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47c-.28 1.5-1.13 2.78-2.41 3.63v3h3.9c2.28-2.1 3.6-5.2 3.6-8.82z"
			}, void 0, false, {
				fileName: _jsxFileName$7,
				lineNumber: 15,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("path", {
				fill: "#34A853",
				d: "M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.9-3c-1.08.73-2.46 1.16-4.05 1.16-3.11 0-5.75-2.1-6.69-4.92H1.28v3.1C3.26 21.3 7.29 24 12 24z"
			}, void 0, false, {
				fileName: _jsxFileName$7,
				lineNumber: 19,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("path", {
				fill: "#FBBC05",
				d: "M5.31 14.34a7.2 7.2 0 0 1 0-4.62v-3.1H1.28a12 12 0 0 0 0 10.82l4.03-3.1z"
			}, void 0, false, {
				fileName: _jsxFileName$7,
				lineNumber: 23,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("path", {
				fill: "#EA4335",
				d: "M12 4.77c1.76 0 3.35.6 4.6 1.79l3.45-3.45C17.95 1.19 15.24 0 12 0 7.29 0 3.26 2.7 1.28 6.62l4.03 3.1C6.25 6.9 8.89 4.77 12 4.77z"
			}, void 0, false, {
				fileName: _jsxFileName$7,
				lineNumber: 27,
				columnNumber: 7
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName$7,
		lineNumber: 14,
		columnNumber: 5
	}, this);
}
/** Google-only sign-in overlay. Deliberately never offers email/password —
*  the app has exactly one auth path. Renders as a Dialog, so the interface
*  behind it stays visible (per the product requirement: people can look
*  around before signing in, but any attempt to actually use the AI opens
*  this). */
function SignInModal() {
	const { signInModalOpen, closeSignIn, signInWithGoogle, status } = useAuth();
	const [loading, setLoading] = (0, import_react.useState)(false);
	if (status === "signed-in") return null;
	async function handleGoogleClick() {
		setLoading(true);
		try {
			await signInWithGoogle();
		} finally {
			setLoading(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Dialog, {
		open: signInModalOpen,
		onOpenChange: (open) => !open && closeSignIn(),
		children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogContent, {
			className: "glass max-w-sm border-border bg-background/95 text-foreground",
			children: [
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogHeader, {
					className: "items-center text-center",
					children: [
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "grid h-11 w-11 place-items-center rounded-2xl",
							style: { background: "var(--gradient-accent)" },
							children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Sparkles, { className: "h-5 w-5 text-background" }, void 0, false, {
								fileName: _jsxFileName$7,
								lineNumber: 65,
								columnNumber: 13
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName$7,
							lineNumber: 61,
							columnNumber: 11
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogTitle, {
							className: "mt-2 text-lg",
							children: "Sign in to talk to ADUF"
						}, void 0, false, {
							fileName: _jsxFileName$7,
							lineNumber: 67,
							columnNumber: 11
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogDescription, {
							className: "text-center",
							children: "You can look around the dashboard freely, but chatting with ADUF — or running an analysis — needs a signed-in account so your business context is saved."
						}, void 0, false, {
							fileName: _jsxFileName$7,
							lineNumber: 68,
							columnNumber: 11
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName$7,
					lineNumber: 60,
					columnNumber: 9
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", {
					type: "button",
					onClick: handleGoogleClick,
					disabled: loading,
					className: "mt-2 flex w-full items-center justify-center gap-2.5 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-medium text-neutral-800 transition-opacity hover:opacity-90 disabled:opacity-60",
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(GoogleGlyph, {}, void 0, false, {
						fileName: _jsxFileName$7,
						lineNumber: 80,
						columnNumber: 11
					}, this), loading ? "Redirecting…" : "Continue with Google"]
				}, void 0, true, {
					fileName: _jsxFileName$7,
					lineNumber: 74,
					columnNumber: 9
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
					className: "mt-1 text-center text-[11px] text-muted-foreground",
					children: "That's the only sign-in method — no separate email/password account needed."
				}, void 0, false, {
					fileName: _jsxFileName$7,
					lineNumber: 84,
					columnNumber: 9
				}, this)
			]
		}, void 0, true, {
			fileName: _jsxFileName$7,
			lineNumber: 59,
			columnNumber: 7
		}, this)
	}, void 0, false, {
		fileName: _jsxFileName$7,
		lineNumber: 58,
		columnNumber: 5
	}, this);
}
var _jsxFileName$6 = "/root/app/code/src/components/aduf/sign-in-gate.tsx";
/** Full-screen gate shown instead of the app whenever the user isn't
*  signed in. Replaces the old "browse freely, sign in only to chat"
*  behavior — now nothing renders until Google sign-in succeeds. */
function SignInGate({ loading }) {
	const { signInWithGoogle } = useAuth();
	const [redirecting, setRedirecting] = (0, import_react.useState)(false);
	async function handleGoogleClick() {
		setRedirecting(true);
		try {
			await signInWithGoogle();
		} finally {
			setRedirecting(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "relative z-10 grid min-h-screen place-items-center px-4",
		children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
			className: "glass w-full max-w-sm rounded-3xl border border-border bg-background/95 p-6 text-center text-foreground",
			children: [
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "mx-auto grid h-11 w-11 place-items-center rounded-2xl",
					style: { background: "var(--gradient-accent)" },
					children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Sparkles, { className: "h-5 w-5 text-background" }, void 0, false, {
						fileName: _jsxFileName$6,
						lineNumber: 29,
						columnNumber: 11
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName$6,
					lineNumber: 25,
					columnNumber: 9
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h1", {
					className: "mt-3 text-lg font-semibold",
					children: loading ? "Checking your session…" : "Sign in to continue"
				}, void 0, false, {
					fileName: _jsxFileName$6,
					lineNumber: 31,
					columnNumber: 9
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
					className: "mt-1.5 text-center text-sm text-muted-foreground",
					children: loading ? "One moment." : "Sign in with Google to access ADUF AI — your dashboard, chat, and data all live here."
				}, void 0, false, {
					fileName: _jsxFileName$6,
					lineNumber: 34,
					columnNumber: 9
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", {
					type: "button",
					onClick: handleGoogleClick,
					disabled: loading || redirecting,
					className: "mt-5 flex w-full items-center justify-center gap-2.5 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-medium text-neutral-800 transition-opacity hover:opacity-90 disabled:opacity-60",
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(GoogleGlyph, {}, void 0, false, {
						fileName: _jsxFileName$6,
						lineNumber: 46,
						columnNumber: 11
					}, this), redirecting ? "Redirecting…" : loading ? "Loading…" : "Continue with Google"]
				}, void 0, true, {
					fileName: _jsxFileName$6,
					lineNumber: 40,
					columnNumber: 9
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
					className: "mt-3 text-center text-[11px] text-muted-foreground",
					children: "That's the only sign-in method — no separate email/password account needed."
				}, void 0, false, {
					fileName: _jsxFileName$6,
					lineNumber: 50,
					columnNumber: 9
				}, this)
			]
		}, void 0, true, {
			fileName: _jsxFileName$6,
			lineNumber: 24,
			columnNumber: 7
		}, this)
	}, void 0, false, {
		fileName: _jsxFileName$6,
		lineNumber: 23,
		columnNumber: 5
	}, this);
}
var _jsxFileName$5 = "/root/app/code/src/components/ui/input.tsx";
var Input = import_react.forwardRef(({ className, type, ...props }, ref) => {
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("input", {
		type,
		className: cn("flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm", className),
		ref,
		...props
	}, void 0, false, {
		fileName: _jsxFileName$5,
		lineNumber: 8,
		columnNumber: 7
	}, void 0);
});
Input.displayName = "Input";
var _jsxFileName$4 = "/root/app/code/src/components/ui/textarea.tsx";
var Textarea = import_react.forwardRef(({ className, ...props }, ref) => {
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("textarea", {
		className: cn("flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm", className),
		ref,
		...props
	}, void 0, false, {
		fileName: _jsxFileName$4,
		lineNumber: 8,
		columnNumber: 7
	}, void 0);
});
Textarea.displayName = "Textarea";
var _jsxFileName$3 = "/root/app/code/src/components/ui/label.tsx";
var labelVariants = cva("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70");
var Label = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Root, {
	ref,
	className: cn(labelVariants(), className),
	...props
}, void 0, false, {
	fileName: _jsxFileName$3,
	lineNumber: 17,
	columnNumber: 3
}, void 0));
Label.displayName = Root.displayName;
var _jsxFileName$2 = "/root/app/code/src/components/ui/select.tsx";
var Select = Select$1;
var SelectValue = SelectValue$1;
var SelectTrigger = import_react.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectTrigger$1, {
	ref,
	className: cn("flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background cursor-pointer data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1", className),
	...props,
	children: [children, /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectIcon, {
		asChild: true,
		children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ChevronDown, { className: "h-4 w-4 opacity-50" }, void 0, false, {
			fileName: _jsxFileName$2,
			lineNumber: 29,
			columnNumber: 7
		}, void 0)
	}, void 0, false, {
		fileName: _jsxFileName$2,
		lineNumber: 28,
		columnNumber: 5
	}, void 0)]
}, void 0, true, {
	fileName: _jsxFileName$2,
	lineNumber: 19,
	columnNumber: 3
}, void 0));
SelectTrigger.displayName = SelectTrigger$1.displayName;
var SelectScrollUpButton = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectScrollUpButton$1, {
	ref,
	className: cn("flex cursor-default items-center justify-center py-1", className),
	...props,
	children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ChevronUp, { className: "h-4 w-4" }, void 0, false, {
		fileName: _jsxFileName$2,
		lineNumber: 44,
		columnNumber: 5
	}, void 0)
}, void 0, false, {
	fileName: _jsxFileName$2,
	lineNumber: 39,
	columnNumber: 3
}, void 0));
SelectScrollUpButton.displayName = SelectScrollUpButton$1.displayName;
var SelectScrollDownButton = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectScrollDownButton$1, {
	ref,
	className: cn("flex cursor-default items-center justify-center py-1", className),
	...props,
	children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ChevronDown, { className: "h-4 w-4" }, void 0, false, {
		fileName: _jsxFileName$2,
		lineNumber: 58,
		columnNumber: 5
	}, void 0)
}, void 0, false, {
	fileName: _jsxFileName$2,
	lineNumber: 53,
	columnNumber: 3
}, void 0));
SelectScrollDownButton.displayName = SelectScrollDownButton$1.displayName;
var SelectContent = import_react.forwardRef(({ className, children, position = "popper", ...props }, ref) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectPortal, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectContent$1, {
	ref,
	className: cn("relative z-50 max-h-(--radix-select-content-available-height) min-w-[8rem] overflow-y-auto overflow-x-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-select-content-transform-origin)", position === "popper" && "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1", className),
	position,
	...props,
	children: [
		/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectScrollUpButton, {}, void 0, false, {
			fileName: _jsxFileName$2,
			lineNumber: 79,
			columnNumber: 7
		}, void 0),
		/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectViewport, {
			className: cn("p-1", position === "popper" && "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"),
			children
		}, void 0, false, {
			fileName: _jsxFileName$2,
			lineNumber: 80,
			columnNumber: 7
		}, void 0),
		/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectScrollDownButton, {}, void 0, false, {
			fileName: _jsxFileName$2,
			lineNumber: 89,
			columnNumber: 7
		}, void 0)
	]
}, void 0, true, {
	fileName: _jsxFileName$2,
	lineNumber: 68,
	columnNumber: 5
}, void 0) }, void 0, false, {
	fileName: _jsxFileName$2,
	lineNumber: 67,
	columnNumber: 3
}, void 0));
SelectContent.displayName = SelectContent$1.displayName;
var SelectLabel = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectLabel$1, {
	ref,
	className: cn("px-2 py-1.5 text-sm font-semibold", className),
	...props
}, void 0, false, {
	fileName: _jsxFileName$2,
	lineNumber: 99,
	columnNumber: 3
}, void 0));
SelectLabel.displayName = SelectLabel$1.displayName;
var SelectItem = import_react.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem$1, {
	ref,
	className: cn("relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50", className),
	...props,
	children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
		className: "absolute right-2 flex h-3.5 w-3.5 items-center justify-center",
		children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItemIndicator, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Check, { className: "h-4 w-4" }, void 0, false, {
			fileName: _jsxFileName$2,
			lineNumber: 121,
			columnNumber: 9
		}, void 0) }, void 0, false, {
			fileName: _jsxFileName$2,
			lineNumber: 120,
			columnNumber: 7
		}, void 0)
	}, void 0, false, {
		fileName: _jsxFileName$2,
		lineNumber: 119,
		columnNumber: 5
	}, void 0), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItemText, { children }, void 0, false, {
		fileName: _jsxFileName$2,
		lineNumber: 124,
		columnNumber: 5
	}, void 0)]
}, void 0, true, {
	fileName: _jsxFileName$2,
	lineNumber: 111,
	columnNumber: 3
}, void 0));
SelectItem.displayName = SelectItem$1.displayName;
var SelectSeparator = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectSeparator$1, {
	ref,
	className: cn("-mx-1 my-1 h-px bg-muted", className),
	...props
}, void 0, false, {
	fileName: _jsxFileName$2,
	lineNumber: 133,
	columnNumber: 3
}, void 0));
SelectSeparator.displayName = SelectSeparator$1.displayName;
var _jsxFileName$1 = "/root/app/code/src/components/aduf/survey-modal.tsx";
var BUSINESS_TYPES = [
	"E-commerce / online store",
	"Local / brick-and-mortar",
	"Service business",
	"SaaS / software",
	"Agency / consultancy",
	"Other"
];
var TEAM_SIZES = [
	"Just me",
	"2-5",
	"6-20",
	"21-50",
	"50+"
];
var emptySurvey = {
	profession: "",
	websiteUrl: "",
	goal: "",
	businessType: "",
	teamSize: ""
};
/** One-time onboarding survey — opens automatically right after a user's
*  first sign-in (driven by auth-store's surveyStatus, checked in
*  AuthBootstrap) and never again once submitted. The answers become part
*  of the context ADUF uses for every analysis (see
*  src/lib/server/survey.ts#surveyToContext). */
function SurveyModal() {
	const { status, surveyStatus, accessToken, setSurveyStatus } = useAuth();
	const [survey, setSurvey] = (0, import_react.useState)(emptySurvey);
	const [submitting, setSubmitting] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)(null);
	const open = status === "signed-in" && surveyStatus === "pending";
	const canSubmit = survey.profession.trim() && survey.goal.trim() && survey.businessType;
	async function handleSubmit(e) {
		e.preventDefault();
		if (!canSubmit || !accessToken) return;
		setSubmitting(true);
		setError(null);
		try {
			await submitSurvey({ data: {
				accessToken,
				survey
			} });
			setSurveyStatus("done");
		} catch {
			setError("Couldn't save that — mind trying again?");
		} finally {
			setSubmitting(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Dialog, {
		open,
		children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogContent, {
			className: "glass max-w-md border-border bg-background/95 text-foreground",
			showCloseButton: false,
			children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogTitle, { children: "Quick setup, before we start" }, void 0, false, {
				fileName: _jsxFileName$1,
				lineNumber: 81,
				columnNumber: 11
			}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogDescription, { children: "A few questions so ADUF's analysis is actually about your business, not generic advice. Takes under a minute." }, void 0, false, {
				fileName: _jsxFileName$1,
				lineNumber: 82,
				columnNumber: 11
			}, this)] }, void 0, true, {
				fileName: _jsxFileName$1,
				lineNumber: 80,
				columnNumber: 9
			}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("form", {
				onSubmit: handleSubmit,
				className: "space-y-3.5",
				children: [
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "space-y-1.5",
						children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Label, {
							htmlFor: "survey-profession",
							children: "Your role / profession"
						}, void 0, false, {
							fileName: _jsxFileName$1,
							lineNumber: 90,
							columnNumber: 13
						}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
							id: "survey-profession",
							placeholder: "e.g. Founder, Marketing lead, Shop owner",
							value: survey.profession,
							onChange: (e) => setSurvey((s) => ({
								...s,
								profession: e.target.value
							})),
							required: true
						}, void 0, false, {
							fileName: _jsxFileName$1,
							lineNumber: 91,
							columnNumber: 13
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName$1,
						lineNumber: 89,
						columnNumber: 11
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "space-y-1.5",
						children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Label, {
							htmlFor: "survey-business-type",
							children: "Business type"
						}, void 0, false, {
							fileName: _jsxFileName$1,
							lineNumber: 101,
							columnNumber: 13
						}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Select, {
							value: survey.businessType,
							onValueChange: (v) => setSurvey((s) => ({
								...s,
								businessType: v
							})),
							children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectTrigger, {
								id: "survey-business-type",
								children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectValue, { placeholder: "Select one" }, void 0, false, {
									fileName: _jsxFileName$1,
									lineNumber: 107,
									columnNumber: 17
								}, this)
							}, void 0, false, {
								fileName: _jsxFileName$1,
								lineNumber: 106,
								columnNumber: 15
							}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectContent, { children: BUSINESS_TYPES.map((t) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
								value: t,
								children: t
							}, t, false, {
								fileName: _jsxFileName$1,
								lineNumber: 111,
								columnNumber: 19
							}, this)) }, void 0, false, {
								fileName: _jsxFileName$1,
								lineNumber: 109,
								columnNumber: 15
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName$1,
							lineNumber: 102,
							columnNumber: 13
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName$1,
						lineNumber: 100,
						columnNumber: 11
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "space-y-1.5",
						children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Label, {
							htmlFor: "survey-website",
							children: "Website or storefront link (optional)"
						}, void 0, false, {
							fileName: _jsxFileName$1,
							lineNumber: 120,
							columnNumber: 13
						}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
							id: "survey-website",
							type: "url",
							placeholder: "https://",
							value: survey.websiteUrl,
							onChange: (e) => setSurvey((s) => ({
								...s,
								websiteUrl: e.target.value
							}))
						}, void 0, false, {
							fileName: _jsxFileName$1,
							lineNumber: 121,
							columnNumber: 13
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName$1,
						lineNumber: 119,
						columnNumber: 11
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "space-y-1.5",
						children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Label, {
							htmlFor: "survey-team-size",
							children: "Team size (optional)"
						}, void 0, false, {
							fileName: _jsxFileName$1,
							lineNumber: 131,
							columnNumber: 13
						}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Select, {
							value: survey.teamSize,
							onValueChange: (v) => setSurvey((s) => ({
								...s,
								teamSize: v
							})),
							children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectTrigger, {
								id: "survey-team-size",
								children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectValue, { placeholder: "Select one" }, void 0, false, {
									fileName: _jsxFileName$1,
									lineNumber: 137,
									columnNumber: 17
								}, this)
							}, void 0, false, {
								fileName: _jsxFileName$1,
								lineNumber: 136,
								columnNumber: 15
							}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectContent, { children: TEAM_SIZES.map((t) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
								value: t,
								children: t
							}, t, false, {
								fileName: _jsxFileName$1,
								lineNumber: 141,
								columnNumber: 19
							}, this)) }, void 0, false, {
								fileName: _jsxFileName$1,
								lineNumber: 139,
								columnNumber: 15
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName$1,
							lineNumber: 132,
							columnNumber: 13
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName$1,
						lineNumber: 130,
						columnNumber: 11
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "space-y-1.5",
						children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Label, {
							htmlFor: "survey-goal",
							children: "What's your main goal right now?"
						}, void 0, false, {
							fileName: _jsxFileName$1,
							lineNumber: 150,
							columnNumber: 13
						}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Textarea, {
							id: "survey-goal",
							placeholder: "e.g. Get more repeat customers, fix a leaky checkout, grow local visibility",
							value: survey.goal,
							onChange: (e) => setSurvey((s) => ({
								...s,
								goal: e.target.value
							})),
							required: true,
							rows: 3
						}, void 0, false, {
							fileName: _jsxFileName$1,
							lineNumber: 151,
							columnNumber: 13
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName$1,
						lineNumber: 149,
						columnNumber: 11
					}, this),
					error ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
						className: "text-xs text-destructive",
						children: error
					}, void 0, false, {
						fileName: _jsxFileName$1,
						lineNumber: 161,
						columnNumber: 20
					}, this) : null,
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", {
						type: "submit",
						disabled: !canSubmit || submitting,
						className: "w-full rounded-xl px-4 py-2.5 text-sm font-medium text-background transition-opacity disabled:opacity-50",
						style: { background: "var(--gradient-accent)" },
						children: submitting ? "Saving…" : "Start using ADUF"
					}, void 0, false, {
						fileName: _jsxFileName$1,
						lineNumber: 163,
						columnNumber: 11
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName$1,
				lineNumber: 88,
				columnNumber: 9
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName$1,
			lineNumber: 73,
			columnNumber: 7
		}, this)
	}, void 0, false, {
		fileName: _jsxFileName$1,
		lineNumber: 72,
		columnNumber: 5
	}, this);
}
var _jsxFileName = "/root/app/code/src/components/aduf/app-shell.tsx";
var nav = [
	{
		to: "/",
		label: "Brain",
		icon: Brain
	},
	{
		to: "/goals",
		label: "Goals",
		icon: Target
	},
	{
		to: "/automations",
		label: "Grid",
		icon: Waves
	},
	{
		to: "/schedule",
		label: "Schedule",
		icon: CalendarClock
	},
	{
		to: "/memory",
		label: "Memory",
		icon: Network
	},
	{
		to: "/notifications",
		label: "Notifications",
		icon: Bell
	},
	{
		to: "/analytics",
		label: "Analytics",
		icon: ChartColumn
	},
	{
		to: "/settings",
		label: "Me",
		icon: Settings
	}
];
var mobileNav = nav.filter((n) => n.label !== "Analytics" && n.label !== "Notifications");
function initials(name) {
	const trimmed = name.trim();
	return trimmed ? trimmed.slice(0, 2).toUpperCase() : "—";
}
/** Compact identity chip — used wherever we need a small header footprint
*  with room for the username. Doubles as the sign-in/sign-out control:
*  tapping it opens Google sign-in when signed out, or signs out when
*  signed in. */
function UserChip({ className }) {
	const { userName } = useAduf();
	const { status, user, openSignIn, signOut } = useAuth();
	const displayName = status === "signed-in" ? user?.name || userName : userName;
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", {
		type: "button",
		onClick: () => status === "signed-in" ? void signOut() : openSignIn(),
		title: status === "signed-in" ? "Sign out" : "Sign in with Google",
		className: `flex min-w-0 items-center gap-2 text-left ${className ?? ""}`,
		children: [status === "signed-in" && user?.avatarUrl ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("img", {
			src: user.avatarUrl,
			alt: "",
			className: "h-8 w-8 shrink-0 rounded-full object-cover",
			referrerPolicy: "no-referrer"
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 60,
			columnNumber: 9
		}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
			className: "grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-semibold text-background",
			style: { background: "var(--gradient-accent)" },
			children: initials(displayName)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 67,
			columnNumber: 9
		}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
			className: "min-w-0 leading-tight",
			children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
				className: "truncate text-xs font-medium",
				children: displayName || "Add your name"
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 75,
				columnNumber: 9
			}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
				className: "truncate text-[10px] text-muted-foreground",
				children: status === "signed-in" ? "Signed in" : "Sign in"
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 76,
				columnNumber: 9
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 74,
			columnNumber: 7
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 53,
		columnNumber: 5
	}, this);
}
/** Bell icon linking to /notifications, with an unread-count badge. Used in
*  the mobile header (which has no bottom-nav slot for Notifications) and
*  can be dropped in anywhere else a quick shortcut is useful. */
function NotificationBell({ className }) {
	const unread = useAduf((s) => s.insights.filter((i) => !i.read).length);
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Link, {
		to: "/notifications",
		"aria-label": unread > 0 ? `Notifications, ${unread} unread` : "Notifications",
		className: `relative grid h-9 w-9 shrink-0 place-items-center rounded-full hover:bg-white/8 ${className ?? ""}`,
		children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Bell, { className: "h-4.5 w-4.5" }, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 95,
			columnNumber: 7
		}, this), unread > 0 ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
			className: "absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-cyan px-1 text-[9px] font-semibold leading-none text-background",
			children: unread > 9 ? "9+" : unread
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 97,
			columnNumber: 9
		}, this) : null]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 90,
		columnNumber: 5
	}, this);
}
function AppShell({ children }) {
	const { sources, memoryNodes, insights, userName, setUserName } = useAduf();
	const { status, user } = useAuth();
	const connectedCount = sources.filter((s) => s.connected).length;
	const totalFacts = memoryNodes.reduce((sum, n) => sum + n.facts, 0);
	const unread = insights.filter((i) => !i.read).length;
	(0, import_react.useEffect)(() => {
		if (status === "signed-in" && user?.name && !userName) setUserName(user.name);
	}, [
		status,
		user,
		userName,
		setUserName
	]);
	if (status !== "signed-in") return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "min-h-screen",
		children: [
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(AuthBootstrap, {}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 127,
				columnNumber: 9
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LiquidBackground, {}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 128,
				columnNumber: 9
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SignInGate, { loading: status === "loading" }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 129,
				columnNumber: 9
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 126,
		columnNumber: 7
	}, this);
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "min-h-screen overflow-x-hidden",
		children: [
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(AuthBootstrap, {}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 136,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(GoalsBootstrap, {}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 137,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(AutomationsBootstrap, {}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 138,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SignInModal, {}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 139,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SurveyModal, {}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 140,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LiquidBackground, {}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 141,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("aside", {
				className: "glass fixed left-4 top-4 bottom-4 z-30 hidden w-[236px] flex-col rounded-3xl p-4 lg:flex",
				children: [
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "flex items-center justify-between gap-2 px-1 py-2",
						children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "flex min-w-0 items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "grid h-8 w-8 shrink-0 place-items-center rounded-xl",
								style: { background: "var(--gradient-accent)" },
								children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Sparkles, { className: "h-4 w-4 text-background" }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 150,
									columnNumber: 15
								}, this)
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 146,
								columnNumber: 13
							}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
								className: "truncate font-display text-sm font-semibold",
								children: "ADUF AI"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 152,
								columnNumber: 13
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 145,
							columnNumber: 11
						}, this)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 144,
						columnNumber: 9
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "glass mt-1 flex items-center justify-between gap-2 rounded-2xl p-2.5",
						children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(UserChip, {}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 157,
							columnNumber: 11
						}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
							className: "relative flex h-2 w-2 shrink-0",
							children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { className: "animate-ripple absolute inset-0 rounded-full bg-cyan" }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 159,
								columnNumber: 13
							}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { className: "relative h-2 w-2 rounded-full bg-cyan" }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 160,
								columnNumber: 13
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 158,
							columnNumber: 11
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 156,
						columnNumber: 9
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("nav", {
						className: "mt-4 flex flex-1 flex-col gap-1",
						children: nav.map(({ to, label, icon: Icon }) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Link, {
							to,
							activeOptions: { exact: to === "/" },
							className: "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-white/8 hover:text-foreground",
							activeProps: { className: "bg-white/12 text-foreground shadow-[var(--glow-cyan)]" },
							children: [
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
									className: "relative shrink-0",
									children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Icon, { className: "h-4.5 w-4.5" }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 176,
										columnNumber: 17
									}, this), label === "Notifications" && unread > 0 ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { className: "absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full bg-cyan" }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 178,
										columnNumber: 19
									}, this) : null]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 175,
									columnNumber: 15
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
									className: "truncate",
									children: label
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 181,
									columnNumber: 15
								}, this),
								label === "Notifications" && unread > 0 ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
									className: "ml-auto shrink-0 text-[10px] text-cyan",
									children: unread
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 183,
									columnNumber: 17
								}, this) : null
							]
						}, to, true, {
							fileName: _jsxFileName,
							lineNumber: 166,
							columnNumber: 13
						}, this))
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 164,
						columnNumber: 9
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "glass mt-2 rounded-2xl p-3",
						children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "flex items-center gap-2 text-xs",
							children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
								className: "relative flex h-2 w-2 shrink-0",
								children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { className: "animate-ripple absolute inset-0 rounded-full bg-cyan" }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 192,
									columnNumber: 15
								}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { className: "relative h-2 w-2 rounded-full bg-cyan" }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 193,
									columnNumber: 15
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 191,
								columnNumber: 13
							}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
								className: "text-muted-foreground",
								children: "ADUF is Active"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 195,
								columnNumber: 13
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 190,
							columnNumber: 11
						}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
							className: "mt-2 text-[11px] leading-relaxed text-muted-foreground",
							children: connectedCount === 0 ? "No data sources connected yet" : `Watching ${connectedCount} ${connectedCount === 1 ? "source" : "sources"} · ${totalFacts.toLocaleString()} facts learned`
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 197,
							columnNumber: 11
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 189,
						columnNumber: 9
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 143,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("header", {
				className: "glass fixed inset-x-0 top-0 z-30 flex items-center justify-between gap-3 rounded-none px-4 pb-2 pt-[env(safe-area-inset-top)] lg:hidden",
				children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "flex min-w-0 items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "grid h-7 w-7 shrink-0 place-items-center rounded-lg",
						style: { background: "var(--gradient-accent)" },
						children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Sparkles, { className: "h-3.5 w-3.5 text-background" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 211,
							columnNumber: 13
						}, this)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 207,
						columnNumber: 11
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
						className: "truncate font-display text-xs font-semibold",
						children: "ADUF AI"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 213,
						columnNumber: 11
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 206,
					columnNumber: 9
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "flex min-w-0 items-center gap-1",
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(NotificationBell, {}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 216,
						columnNumber: 11
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(UserChip, { className: "min-w-0 max-w-28 flex-row-reverse text-right" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 217,
						columnNumber: 11
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 215,
					columnNumber: 9
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 205,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("main", {
				className: "min-w-0 overflow-x-hidden pb-24 pt-16 lg:pb-8 lg:pt-0 lg:pl-[268px]",
				children
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 221,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("nav", {
				className: "glass fixed inset-x-0 bottom-0 z-40 grid grid-cols-6 rounded-none px-2 pt-1.5 pb-[env(safe-area-inset-bottom)] lg:hidden",
				children: mobileNav.map(({ to, label, icon: Icon }) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Link, {
					to,
					activeOptions: { exact: to === "/" },
					className: "flex flex-col items-center gap-1 rounded-2xl py-2 text-[10px] text-muted-foreground transition-colors",
					activeProps: { className: "bg-white/12 text-foreground" },
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Icon, { className: "h-6 w-6" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 234,
						columnNumber: 13
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
						className: "truncate",
						children: label
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 235,
						columnNumber: 13
					}, this)]
				}, to, true, {
					fileName: _jsxFileName,
					lineNumber: 227,
					columnNumber: 11
				}, this))
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 225,
				columnNumber: 7
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 135,
		columnNumber: 5
	}, this);
}
function PageHeader({ eyebrow, title, children }) {
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("header", {
		className: "mb-7 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:flex-wrap sm:justify-between",
		children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
			className: "min-w-0",
			children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
				className: "text-[10px] uppercase tracking-[0.2em] text-muted-foreground",
				children: eyebrow
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 255,
				columnNumber: 9
			}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h1", {
				className: "mt-1 truncate text-xl font-semibold sm:text-2xl",
				children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
					className: "text-gradient",
					children: title
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 257,
					columnNumber: 11
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 256,
				columnNumber: 9
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 254,
			columnNumber: 7
		}, this), children ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
			className: "shrink-0",
			children
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 260,
			columnNumber: 19
		}, this) : null]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 253,
		columnNumber: 5
	}, this);
}
//#endregion
export { cn as _, DialogTitle as a, useAduf as b, PageHeader as c, SelectContent as d, SelectItem as f, WaterOrb as g, WaterBar as h, DialogHeader as i, ProgressRing as l, SelectValue as m, Dialog as n, GlassCard as o, SelectTrigger as p, DialogContent as r, Input as s, AppShell as t, Select as u, fetchConnectorStatuses as v, timeAgo as y };
