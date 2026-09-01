import { a as __toESM } from "../_runtime.mjs";
import { n as AnimatePresence, t as motion } from "../_libs/framer-motion+[...].mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { s as Slot } from "../_libs/@radix-ui/react-collapsible+[...].mjs";
import { t as require_jsx_dev_runtime } from "../_libs/react.mjs";
import { $ as Blocks, P as KeyRound, U as CircleCheck, a as UserRound, et as Bell, f as Star, g as ShieldCheck, j as LoaderCircle, m as Sparkle, nt as BadgeCheck, u as Trash2 } from "../_libs/lucide-react.mjs";
import { t as cva } from "../_libs/class-variance-authority+clsx.mjs";
import { _ as cn, b as useAduf, c as PageHeader, d as SelectContent, f as SelectItem, m as SelectValue, o as GlassCard, p as SelectTrigger, s as Input, t as AppShell, u as Select, v as fetchConnectorStatuses } from "./app-shell-Dd7fJpNz.mjs";
import { n as SwitchThumb, t as Switch$1 } from "../_libs/radix-ui__react-switch.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/settings-DsVyOeVK.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_dev_runtime = require_jsx_dev_runtime();
var _jsxFileName$4 = "/root/app/code/src/components/ui/button.tsx";
var buttonVariants = cva("inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0", {
	variants: {
		variant: {
			default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
			destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
			outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
			secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
			ghost: "hover:bg-accent hover:text-accent-foreground",
			link: "text-primary underline-offset-4 hover:underline"
		},
		size: {
			default: "h-9 px-4 py-2",
			sm: "h-8 rounded-md px-3 text-xs",
			lg: "h-10 rounded-md px-8",
			icon: "h-9 w-9"
		}
	},
	defaultVariants: {
		variant: "default",
		size: "default"
	}
});
var Button = import_react.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(asChild ? Slot : "button", {
		className: cn(buttonVariants({
			variant,
			size,
			className
		})),
		ref,
		...props
	}, void 0, false, {
		fileName: _jsxFileName$4,
		lineNumber: 43,
		columnNumber: 7
	}, void 0);
});
Button.displayName = "Button";
var _jsxFileName$3 = "/root/app/code/src/components/aduf/model-keys-panel.tsx";
function ModelKeysPanel() {
	const [providers, setProviders] = (0, import_react.useState)([]);
	const [loading, setLoading] = (0, import_react.useState)(true);
	const [selected, setSelected] = (0, import_react.useState)("");
	const [apiKey, setApiKey] = (0, import_react.useState)("");
	const [saving, setSaving] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)(null);
	const load = () => {
		setLoading(true);
		fetch("/api/model-keys").then((r) => r.json()).then((data) => {
			setProviders(data.providers);
			if (!selected && data.providers.length) setSelected(data.providers.find((p) => !p.connected)?.providerId ?? data.providers[0]?.providerId ?? "");
		}).catch(() => setError("Couldn't load model connections.")).finally(() => setLoading(false));
	};
	(0, import_react.useEffect)(load, []);
	const save = async () => {
		if (!selected || apiKey.trim().length < 8) return;
		setSaving(true);
		setError(null);
		try {
			const res = await fetch("/api/model-keys", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					providerId: selected,
					apiKey: apiKey.trim(),
					makeDefault: !providers.some((p) => p.isDefault)
				})
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error ?? "Failed to save key");
			setApiKey("");
			load();
		} catch (e) {
			setError(e instanceof Error ? e.message : "Failed to save key");
		} finally {
			setSaving(false);
		}
	};
	const remove = async (providerId) => {
		setError(null);
		try {
			const res = await fetch("/api/model-keys", {
				method: "DELETE",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ providerId })
			});
			if (!res.ok) throw new Error((await res.json()).error ?? "Failed to remove key");
			load();
		} catch (e) {
			setError(e instanceof Error ? e.message : "Failed to remove key");
		}
	};
	const makeDefault = async (providerId) => {
		setError(null);
		try {
			const res = await fetch("/api/model-keys", {
				method: "PATCH",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ providerId })
			});
			if (!res.ok) throw new Error((await res.json()).error ?? "Failed to set default");
			load();
		} catch (e) {
			setError(e instanceof Error ? e.message : "Failed to set default");
		}
	};
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(GlassCard, {
		hover: false,
		className: "space-y-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "flex items-center gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(KeyRound, { className: "h-4 w-4 text-cyan" }, void 0, false, {
					fileName: _jsxFileName$3,
					lineNumber: 111,
					columnNumber: 9
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", {
					className: "text-sm font-semibold",
					children: "AI Model Keys"
				}, void 0, false, {
					fileName: _jsxFileName$3,
					lineNumber: 112,
					columnNumber: 9
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName$3,
				lineNumber: 110,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
				className: "text-xs text-muted-foreground",
				children: [
					"Bring your own API key for any model. The one marked",
					" ",
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
						className: "inline-flex items-center gap-0.5 text-cyan",
						children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Star, { className: "h-3 w-3 fill-current" }, void 0, false, {
							fileName: _jsxFileName$3,
							lineNumber: 117,
							columnNumber: 11
						}, this), " Default"]
					}, void 0, true, {
						fileName: _jsxFileName$3,
						lineNumber: 116,
						columnNumber: 9
					}, this),
					" ",
					"powers Brain Chat and every skill. Keys are encrypted at rest and never shown again."
				]
			}, void 0, true, {
				fileName: _jsxFileName$3,
				lineNumber: 114,
				columnNumber: 7
			}, this),
			loading ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "flex items-center gap-2 text-xs text-muted-foreground",
				children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LoaderCircle, { className: "h-3.5 w-3.5 animate-spin" }, void 0, false, {
					fileName: _jsxFileName$3,
					lineNumber: 124,
					columnNumber: 11
				}, this), " Loading…"]
			}, void 0, true, {
				fileName: _jsxFileName$3,
				lineNumber: 123,
				columnNumber: 9
			}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "space-y-2",
				children: providers.map((p) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5 rounded-xl border border-border/60 px-3 py-2 text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "flex min-w-0 flex-1 items-center gap-2",
						children: [
							p.connected ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CircleCheck, { className: "h-4 w-4 shrink-0 text-cyan" }, void 0, false, {
								fileName: _jsxFileName$3,
								lineNumber: 135,
								columnNumber: 19
							}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { className: "h-4 w-4 shrink-0 rounded-full border border-border" }, void 0, false, {
								fileName: _jsxFileName$3,
								lineNumber: 137,
								columnNumber: 19
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
								className: "truncate",
								children: p.displayName
							}, void 0, false, {
								fileName: _jsxFileName$3,
								lineNumber: 139,
								columnNumber: 17
							}, this),
							p.isDefault ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
								className: "flex shrink-0 items-center gap-0.5 rounded-full bg-cyan/15 px-1.5 py-0.5 text-[10px] text-cyan",
								children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Star, { className: "h-2.5 w-2.5 fill-current" }, void 0, false, {
									fileName: _jsxFileName$3,
									lineNumber: 142,
									columnNumber: 21
								}, this), " Default"]
							}, void 0, true, {
								fileName: _jsxFileName$3,
								lineNumber: 141,
								columnNumber: 19
							}, this) : null
						]
					}, void 0, true, {
						fileName: _jsxFileName$3,
						lineNumber: 133,
						columnNumber: 15
					}, this), p.connected ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "flex shrink-0 items-center gap-1",
						children: [!p.isDefault ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", {
							type: "button",
							onClick: () => makeDefault(p.providerId),
							className: "text-[11px] text-muted-foreground hover:text-foreground",
							children: "Set default"
						}, void 0, false, {
							fileName: _jsxFileName$3,
							lineNumber: 149,
							columnNumber: 21
						}, this) : null, /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", {
							type: "button",
							"aria-label": `Remove ${p.displayName} key`,
							onClick: () => remove(p.providerId),
							className: "grid h-7 w-7 place-items-center rounded-full text-muted-foreground hover:bg-white/8 hover:text-red-400",
							children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Trash2, { className: "h-3.5 w-3.5" }, void 0, false, {
								fileName: _jsxFileName$3,
								lineNumber: 163,
								columnNumber: 21
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName$3,
							lineNumber: 157,
							columnNumber: 19
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName$3,
						lineNumber: 147,
						columnNumber: 17
					}, this) : null]
				}, p.providerId, true, {
					fileName: _jsxFileName$3,
					lineNumber: 129,
					columnNumber: 13
				}, this))
			}, void 0, false, {
				fileName: _jsxFileName$3,
				lineNumber: 127,
				columnNumber: 9
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "flex flex-col gap-2 border-t border-border/60 pt-3 sm:flex-row",
				children: [
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Select, {
						value: selected,
						onValueChange: setSelected,
						children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectTrigger, {
							className: "sm:w-44",
							children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectValue, { placeholder: "Provider" }, void 0, false, {
								fileName: _jsxFileName$3,
								lineNumber: 175,
								columnNumber: 13
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName$3,
							lineNumber: 174,
							columnNumber: 11
						}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectContent, { children: providers.map((p) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
							value: p.providerId,
							children: [p.displayName, p.connected ? " (replace)" : ""]
						}, p.providerId, true, {
							fileName: _jsxFileName$3,
							lineNumber: 179,
							columnNumber: 15
						}, this)) }, void 0, false, {
							fileName: _jsxFileName$3,
							lineNumber: 177,
							columnNumber: 11
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName$3,
						lineNumber: 173,
						columnNumber: 9
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
						type: "password",
						value: apiKey,
						onChange: (e) => setApiKey(e.target.value),
						placeholder: "Paste API key",
						className: "flex-1"
					}, void 0, false, {
						fileName: _jsxFileName$3,
						lineNumber: 186,
						columnNumber: 9
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
						onClick: save,
						disabled: saving || apiKey.trim().length < 8,
						className: "shrink-0",
						children: saving ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LoaderCircle, { className: "h-4 w-4 animate-spin" }, void 0, false, {
							fileName: _jsxFileName$3,
							lineNumber: 194,
							columnNumber: 21
						}, this) : "Save"
					}, void 0, false, {
						fileName: _jsxFileName$3,
						lineNumber: 193,
						columnNumber: 9
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName$3,
				lineNumber: 172,
				columnNumber: 7
			}, this),
			error ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
				className: "text-xs text-amber-400",
				children: error
			}, void 0, false, {
				fileName: _jsxFileName$3,
				lineNumber: 197,
				columnNumber: 16
			}, this) : null
		]
	}, void 0, true, {
		fileName: _jsxFileName$3,
		lineNumber: 109,
		columnNumber: 5
	}, this);
}
var _jsxFileName$2 = "/root/app/code/src/components/ui/switch.tsx";
var Switch = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Switch$1, {
	className: cn("peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input", className),
	...props,
	ref,
	children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SwitchThumb, { className: cn("pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0") }, void 0, false, {
		fileName: _jsxFileName$2,
		lineNumber: 18,
		columnNumber: 5
	}, void 0)
}, void 0, false, {
	fileName: _jsxFileName$2,
	lineNumber: 10,
	columnNumber: 3
}, void 0));
Switch.displayName = Switch$1.displayName;
var _jsxFileName$1 = "/root/app/code/src/components/aduf/skills-panel.tsx";
var CATEGORY_LABEL = {
	growth: "Growth",
	ops: "Operations",
	social: "Social & Messaging",
	commerce: "Commerce"
};
function SkillsPanel() {
	const [skills, setSkills] = (0, import_react.useState)([]);
	const [loading, setLoading] = (0, import_react.useState)(true);
	const [pending, setPending] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		fetch("/api/skills").then((r) => r.json()).then((data) => setSkills(data.skills)).catch(() => {}).finally(() => setLoading(false));
	}, []);
	const toggle = async (id, enabled) => {
		setPending(id);
		setSkills((prev) => prev.map((s) => s.id === id ? {
			...s,
			enabled
		} : s));
		try {
			await fetch("/api/skills", {
				method: "PATCH",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					id,
					enabled
				})
			});
		} catch {
			setSkills((prev) => prev.map((s) => s.id === id ? {
				...s,
				enabled: !enabled
			} : s));
		} finally {
			setPending(null);
		}
	};
	const byCategory = skills.reduce((acc, s) => {
		(acc[s.category] ??= []).push(s);
		return acc;
	}, {});
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(GlassCard, {
		hover: false,
		className: "space-y-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "flex items-center gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Sparkle, { className: "h-4 w-4 text-cyan" }, void 0, false, {
					fileName: _jsxFileName$1,
					lineNumber: 58,
					columnNumber: 9
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", {
					className: "text-sm font-semibold",
					children: "Business Skills"
				}, void 0, false, {
					fileName: _jsxFileName$1,
					lineNumber: 59,
					columnNumber: 9
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName$1,
				lineNumber: 57,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
				className: "text-xs text-muted-foreground",
				children: "Turn off any skill you don't want ADUF drawing on — it only shapes replies while on."
			}, void 0, false, {
				fileName: _jsxFileName$1,
				lineNumber: 61,
				columnNumber: 7
			}, this),
			loading ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "flex items-center gap-2 text-xs text-muted-foreground",
				children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LoaderCircle, { className: "h-3.5 w-3.5 animate-spin" }, void 0, false, {
					fileName: _jsxFileName$1,
					lineNumber: 67,
					columnNumber: 11
				}, this), " Loading…"]
			}, void 0, true, {
				fileName: _jsxFileName$1,
				lineNumber: 66,
				columnNumber: 9
			}, this) : !skills.length ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
				className: "text-xs text-muted-foreground",
				children: "Connect a backend to configure skills — see .env.example."
			}, void 0, false, {
				fileName: _jsxFileName$1,
				lineNumber: 70,
				columnNumber: 9
			}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "space-y-4",
				children: Object.entries(byCategory).map(([category, items]) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
					className: "mb-1.5 text-[10px] uppercase tracking-wider text-muted-foreground",
					children: CATEGORY_LABEL[category] ?? category
				}, void 0, false, {
					fileName: _jsxFileName$1,
					lineNumber: 77,
					columnNumber: 15
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "space-y-1.5",
					children: items.map((s) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "flex items-center justify-between gap-3 rounded-xl border border-border/60 px-3 py-2",
						children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "min-w-0",
							children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
								className: "text-sm",
								children: s.title
							}, void 0, false, {
								fileName: _jsxFileName$1,
								lineNumber: 87,
								columnNumber: 23
							}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
								className: "truncate text-[11px] text-muted-foreground",
								children: s.description
							}, void 0, false, {
								fileName: _jsxFileName$1,
								lineNumber: 88,
								columnNumber: 23
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName$1,
							lineNumber: 86,
							columnNumber: 21
						}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Switch, {
							checked: s.enabled,
							disabled: pending === s.id,
							onCheckedChange: (checked) => toggle(s.id, checked),
							className: "shrink-0"
						}, void 0, false, {
							fileName: _jsxFileName$1,
							lineNumber: 90,
							columnNumber: 21
						}, this)]
					}, s.id, true, {
						fileName: _jsxFileName$1,
						lineNumber: 82,
						columnNumber: 19
					}, this))
				}, void 0, false, {
					fileName: _jsxFileName$1,
					lineNumber: 80,
					columnNumber: 15
				}, this)] }, category, true, {
					fileName: _jsxFileName$1,
					lineNumber: 76,
					columnNumber: 13
				}, this))
			}, void 0, false, {
				fileName: _jsxFileName$1,
				lineNumber: 74,
				columnNumber: 9
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName$1,
		lineNumber: 56,
		columnNumber: 5
	}, this);
}
var _jsxFileName = "/root/app/code/src/routes/settings.tsx?tsr-split=component";
/** Providers with a real OAuth redirect flow (see src/lib/server/oauth-providers.ts).
*  Everything else (currently just Paystack, which is key-based) keeps the
*  local demo "pour" animation until a real key-entry flow is built. */
var OAUTH_SOURCE_IDS = /* @__PURE__ */ new Set([
	"shopify",
	"ga",
	"meta",
	"whatsapp",
	"sheets"
]);
var CONNECTOR_ERROR_COPY = {
	not_configured: "This integration isn't set up yet — add its API app credentials on the server.",
	not_oauth: "This integration connects with an API key, not a redirect — use the form below.",
	backend_not_configured: "No backend is connected yet, so ADUF can't securely store this connection.",
	missing_shop: "Enter your shop domain to connect Shopify.",
	invalid_state: "That connection attempt expired or wasn't recognised — try again.",
	expired_state: "That connection attempt expired — try again.",
	provider_denied: "The connection was cancelled.",
	token_exchange_failed: "The provider rejected that connection — try again.",
	storage_failed: "Connected, but ADUF couldn't save it — try again.",
	server_error: "Something went wrong starting that connection — try again.",
	unknown_provider: "Unknown integration."
};
function SettingsPage() {
	const { sources, connectSource, setSourceConnected, userName, setUserName } = useAduf();
	const [pouring, setPouring] = (0, import_react.useState)(null);
	const [configured, setConfigured] = (0, import_react.useState)({});
	const [banner, setBanner] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		fetchConnectorStatuses().then((statuses) => {
			setConfigured(Object.fromEntries(Object.entries(statuses).map(([id, s]) => [id, s.configured])));
			for (const [id, status] of Object.entries(statuses)) setSourceConnected(id, status.connected);
		}).catch(() => {});
	}, [setSourceConnected]);
	(0, import_react.useEffect)(() => {
		const params = new URLSearchParams(window.location.search);
		const connected = params.get("connected");
		const error = params.get("connectorError");
		const provider = params.get("provider");
		if (connected) {
			setSourceConnected(connected, true);
			setBanner({
				kind: "success",
				text: `${provider ?? connected} connected.`
			});
		} else if (error) setBanner({
			kind: "error",
			text: CONNECTOR_ERROR_COPY[error] ?? "That connection didn't go through."
		});
		if (connected || error) window.history.replaceState({}, "", window.location.pathname);
	}, [setSourceConnected]);
	const connect = (id) => {
		if (OAUTH_SOURCE_IDS.has(id) && configured[id]) {
			if (id === "shopify") {
				const shop = window.prompt("Your Shopify store domain (e.g. my-store):");
				if (!shop) return;
				window.location.href = `/api/connectors/shopify/authorize?shop=${encodeURIComponent(shop)}`;
				return;
			}
			window.location.href = `/api/connectors/${id}/authorize`;
			return;
		}
		setPouring(id);
		setTimeout(() => {
			connectSource(id);
			setPouring(null);
		}, 1200);
	};
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(AppShell, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "mx-auto max-w-[1500px] px-3 py-4 sm:px-6 sm:py-6 lg:py-8",
		children: [
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(PageHeader, {
				eyebrow: "Settings",
				title: "You & your stack"
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 98,
				columnNumber: 9
			}, this),
			banner ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(GlassCard, {
				hover: false,
				className: `mb-4 py-3 text-sm ${banner.kind === "success" ? "text-cyan" : "text-amber-400"}`,
				children: banner.text
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 100,
				columnNumber: 19
			}, this) : null,
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "grid gap-4 sm:gap-6 lg:grid-cols-[280px_minmax(0,1fr)]",
				children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "space-y-4",
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(GlassCard, {
						hover: false,
						className: "p-4 text-center sm:p-5",
						children: [
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "mx-auto grid h-12 w-12 place-items-center rounded-full sm:h-16 sm:w-16",
								style: { background: "var(--gradient-accent)" },
								children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(UserRound, { className: "h-5 w-5 text-background sm:h-7 sm:w-7" }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 110,
									columnNumber: 17
								}, this)
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 107,
								columnNumber: 15
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("input", {
								value: userName,
								onChange: (e) => setUserName(e.target.value),
								placeholder: "Add your name",
								className: "mt-3 w-full rounded-full bg-white/8 px-3 py-2 text-center text-base font-semibold outline-none placeholder:text-base placeholder:font-normal placeholder:text-muted-foreground/70 focus:ring-2 focus:ring-ring sm:text-lg"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 112,
								columnNumber: 15
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
								className: "mt-1 text-xs text-muted-foreground",
								children: "Owner"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 113,
								columnNumber: 15
							}, this)
						]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 106,
						columnNumber: 13
					}, this), [
						{
							icon: ShieldCheck,
							label: "Autonomy",
							value: "Not set"
						},
						{
							icon: Bell,
							label: "Alerts",
							value: "Not set"
						},
						{
							icon: BadgeCheck,
							label: "Plan",
							value: "Free"
						}
					].map(({ icon: Icon, label, value }, i) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(GlassCard, {
						delay: i * .05,
						className: "flex items-center gap-3 p-4",
						children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/10",
							children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Icon, { className: "h-4 w-4" }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 134,
								columnNumber: 19
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 133,
							columnNumber: 17
						}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "min-w-0",
							children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
								className: "text-[11px] uppercase tracking-wider text-muted-foreground",
								children: label
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 137,
								columnNumber: 19
							}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
								className: "truncate text-sm",
								children: value
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 140,
								columnNumber: 19
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 136,
							columnNumber: 17
						}, this)]
					}, label, true, {
						fileName: _jsxFileName,
						lineNumber: 132,
						columnNumber: 20
					}, this))]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 105,
					columnNumber: 11
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "space-y-5 sm:space-y-8",
					children: [
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h2", {
							className: "mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground",
							children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Blocks, { className: "h-4 w-4" }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 148,
								columnNumber: 17
							}, this), " Integrations"]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 147,
							columnNumber: 15
						}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "grid gap-4 sm:grid-cols-2 xl:grid-cols-3",
							children: sources.map((s, i) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(GlassCard, {
								delay: i * .05,
								className: "relative",
								children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(AnimatePresence, { children: pouring === s.id ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(motion.div, {
									initial: { height: 0 },
									animate: { height: "100%" },
									exit: { opacity: 0 },
									transition: {
										duration: 1.1,
										ease: [
											.2,
											.8,
											.2,
											1
										]
									},
									className: "water-surface pointer-events-none absolute inset-x-0 bottom-0"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 153,
									columnNumber: 43
								}, this) : null }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 152,
									columnNumber: 21
								}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
									className: "relative",
									children: [
										/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
											className: "font-display text-base font-semibold",
											children: s.name
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 165,
											columnNumber: 23
										}, this),
										/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
											className: "mt-0.5 text-[11px] text-muted-foreground",
											children: s.category
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 166,
											columnNumber: 23
										}, this),
										/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", {
											onClick: () => !s.connected && connect(s.id),
											disabled: s.connected || pouring === s.id,
											className: "mt-4 w-full rounded-full px-4 py-2 text-xs font-medium",
											style: s.connected ? { border: "1px solid var(--border)" } : {
												background: "var(--gradient-accent)",
												color: "var(--background)"
											},
											children: s.connected ? "Connected" : pouring === s.id ? "Pouring…" : "Connect"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 167,
											columnNumber: 23
										}, this)
									]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 164,
									columnNumber: 21
								}, this)]
							}, s.id, true, {
								fileName: _jsxFileName,
								lineNumber: 151,
								columnNumber: 40
							}, this))
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 150,
							columnNumber: 15
						}, this)] }, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 146,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ModelKeysPanel, {}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 180,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SkillsPanel, {}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 181,
							columnNumber: 13
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 145,
					columnNumber: 11
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 104,
				columnNumber: 9
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 97,
		columnNumber: 7
	}, this) }, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 96,
		columnNumber: 10
	}, this);
}
//#endregion
export { SettingsPage as component };
