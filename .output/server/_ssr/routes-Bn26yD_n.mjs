import { a as __toESM } from "../_runtime.mjs";
import { n as AnimatePresence, t as motion } from "../_libs/framer-motion+[...].mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { d as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as CollapsibleTrigger$1, r as Root, t as CollapsibleContent$1 } from "../_libs/@radix-ui/react-collapsible+[...].mjs";
import { t as require_jsx_dev_runtime } from "../_libs/react.mjs";
import { D as Mic, H as Circle, K as ChevronDown, L as FileText, M as ListChecks, N as Lightbulb, Q as Bot, R as Download, W as CircleAlert, b as Plus, c as TriangleAlert, d as Target, j as LoaderCircle, l as TrendingUp, n as X, o as UserCog, p as Sparkles, q as Check, rt as ArrowUpRight, t as Zap, v as Send, w as Paperclip, x as Plug } from "../_libs/lucide-react.mjs";
import { _ as cn, a as DialogTitle, b as useAduf, i as DialogHeader, l as ProgressRing, n as Dialog, o as GlassCard, r as DialogContent, t as AppShell } from "./app-shell-Dd7fJpNz.mjs";
import { t as InsightRow } from "./insight-feed-BO2448SO.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-Bn26yD_n.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_dev_runtime = require_jsx_dev_runtime();
var _jsxFileName$5 = "/root/app/code/src/components/aduf/agent-question.tsx";
function AgentQuestion({ question, answeredValues, disabled = false, onAnswer }) {
	const [selected, setSelected] = (0, import_react.useState)([]);
	const answered = answeredValues !== void 0;
	function toggle(option) {
		if (disabled || answered) return;
		if (!question.multi) {
			onAnswer([option.value]);
			return;
		}
		setSelected((prev) => prev.includes(option.value) ? prev.filter((v) => v !== option.value) : [...prev, option.value]);
	}
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "mt-2 max-w-[85%] space-y-2",
		children: [
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
				className: "text-xs text-muted-foreground",
				children: question.prompt
			}, void 0, false, {
				fileName: _jsxFileName$5,
				lineNumber: 36,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "flex flex-wrap gap-2",
				children: question.options.map((option) => {
					const isPicked = answered ? answeredValues.includes(option.value) : selected.includes(option.value);
					return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", {
						type: "button",
						disabled: disabled || answered,
						onClick: () => toggle(option),
						className: cn("flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] transition-colors", isPicked ? "border-transparent text-background" : "border-border text-muted-foreground hover:bg-white/8 hover:text-foreground", (disabled || answered) && !isPicked && "opacity-50"),
						style: isPicked ? { background: "var(--gradient-accent)" } : void 0,
						children: [isPicked ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Check, { className: "h-3 w-3" }, void 0, false, {
							fileName: _jsxFileName$5,
							lineNumber: 57,
							columnNumber: 27
						}, this) : null, option.label]
					}, option.id, true, {
						fileName: _jsxFileName$5,
						lineNumber: 43,
						columnNumber: 13
					}, this);
				})
			}, void 0, false, {
				fileName: _jsxFileName$5,
				lineNumber: 37,
				columnNumber: 7
			}, this),
			question.multi && !answered ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", {
				type: "button",
				disabled: disabled || selected.length === 0,
				onClick: () => onAnswer(selected),
				className: "rounded-full px-3 py-1.5 text-[11px] font-medium text-background disabled:opacity-40",
				style: { background: "var(--gradient-accent)" },
				children: "Submit"
			}, void 0, false, {
				fileName: _jsxFileName$5,
				lineNumber: 64,
				columnNumber: 9
			}, this) : null
		]
	}, void 0, true, {
		fileName: _jsxFileName$5,
		lineNumber: 35,
		columnNumber: 5
	}, this);
}
var _jsxFileName$4 = "/root/app/code/src/components/aduf/agent-proposed-action.tsx";
var CHANNEL_LABEL = {
	website: "Website",
	whatsapp: "WhatsApp",
	crm: "CRM",
	payments: "Payments",
	ads: "Ads",
	email: "Email"
};
function summarize(action) {
	if (action.type === "create_goal") {
		const amount = action.currency ? `${action.currency}${action.target.toLocaleString()}` : action.target.toLocaleString();
		return {
			icon: Target,
			title: `New goal: "${action.title}" — target ${amount}`
		};
	}
	return {
		icon: Zap,
		title: `${action.enabled ? "Turn on" : "Turn off"} ${CHANNEL_LABEL[action.channelId] ?? action.channelId} automation`
	};
}
/** Approve/Dismiss card rendered under a chat reply that carries a
*  proposedAction. Nothing happens until Approve is tapped — see
*  useAduf().approveProposedAction, which routes the change through the
*  same store actions the Goals page / Automation Grid use directly, so it
*  shows up there exactly like a hand-made change would. */
function AgentProposedAction({ action, status, onApprove, onDismiss }) {
	const { icon: Icon, title } = summarize(action);
	const resolved = status === "approved" || status === "dismissed";
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "mt-2 max-w-[85%] rounded-2xl border border-cyan/25 bg-cyan/[0.06] p-3.5",
		children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
			className: "flex items-start gap-2.5",
			children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-cyan/15 text-cyan",
				children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Icon, { className: "h-3.5 w-3.5" }, void 0, false, {
					fileName: _jsxFileName$4,
					lineNumber: 50,
					columnNumber: 11
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName$4,
				lineNumber: 49,
				columnNumber: 9
			}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "min-w-0 flex-1",
				children: [
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
						className: "flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-cyan",
						children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Sparkles, { className: "h-3 w-3" }, void 0, false, {
							fileName: _jsxFileName$4,
							lineNumber: 54,
							columnNumber: 13
						}, this), " Proposed action"]
					}, void 0, true, {
						fileName: _jsxFileName$4,
						lineNumber: 53,
						columnNumber: 11
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
						className: "mt-1 text-sm font-medium leading-snug",
						children: title
					}, void 0, false, {
						fileName: _jsxFileName$4,
						lineNumber: 56,
						columnNumber: 11
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
						className: "mt-1 text-xs text-muted-foreground",
						children: action.reasoning
					}, void 0, false, {
						fileName: _jsxFileName$4,
						lineNumber: 57,
						columnNumber: 11
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName$4,
				lineNumber: 52,
				columnNumber: 9
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName$4,
			lineNumber: 48,
			columnNumber: 7
		}, this), resolved ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
			className: cn("mt-3 flex items-center gap-1.5 text-xs font-medium", status === "approved" ? "text-cyan" : "text-muted-foreground"),
			children: status === "approved" ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(import_jsx_dev_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Check, { className: "h-3.5 w-3.5" }, void 0, false, {
				fileName: _jsxFileName$4,
				lineNumber: 70,
				columnNumber: 15
			}, this), " Applied"] }, void 0, true, {
				fileName: _jsxFileName$4,
				lineNumber: 69,
				columnNumber: 13
			}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(import_jsx_dev_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(X, { className: "h-3.5 w-3.5" }, void 0, false, {
				fileName: _jsxFileName$4,
				lineNumber: 74,
				columnNumber: 15
			}, this), " Dismissed"] }, void 0, true, {
				fileName: _jsxFileName$4,
				lineNumber: 73,
				columnNumber: 13
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName$4,
			lineNumber: 62,
			columnNumber: 9
		}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
			className: "mt-3 flex gap-2",
			children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", {
				type: "button",
				onClick: onApprove,
				className: "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium text-background",
				style: { background: "var(--gradient-accent)" },
				children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Check, { className: "h-3.5 w-3.5" }, void 0, false, {
					fileName: _jsxFileName$4,
					lineNumber: 86,
					columnNumber: 13
				}, this), " Approve"]
			}, void 0, true, {
				fileName: _jsxFileName$4,
				lineNumber: 80,
				columnNumber: 11
			}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", {
				type: "button",
				onClick: onDismiss,
				className: "rounded-full border border-border px-3.5 py-1.5 text-xs text-muted-foreground hover:bg-white/8 hover:text-foreground",
				children: "Dismiss"
			}, void 0, false, {
				fileName: _jsxFileName$4,
				lineNumber: 88,
				columnNumber: 11
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName$4,
			lineNumber: 79,
			columnNumber: 9
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName$4,
		lineNumber: 47,
		columnNumber: 5
	}, this);
}
var Collapsible = Root;
var CollapsibleTrigger = CollapsibleTrigger$1;
var CollapsibleContent = CollapsibleContent$1;
var _jsxFileName$3 = "/root/app/code/src/components/aduf/agent-trace.tsx";
function StepIcon({ status }) {
	if (status === "running") return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LoaderCircle, { className: "h-3 w-3 animate-spin text-cyan" }, void 0, false, {
		fileName: _jsxFileName$3,
		lineNumber: 8,
		columnNumber: 36
	}, this);
	if (status === "error") return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CircleAlert, { className: "h-3 w-3 text-red-400" }, void 0, false, {
		fileName: _jsxFileName$3,
		lineNumber: 9,
		columnNumber: 34
	}, this);
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Circle, { className: "h-3 w-3 fill-current text-muted-foreground/60" }, void 0, false, {
		fileName: _jsxFileName$3,
		lineNumber: 10,
		columnNumber: 10
	}, this);
}
/** Tucks the agent's step-by-step working behind a small toggle so it never
*  crowds the chat by default, but is one tap away when the user wants to
*  see what ADUF actually did to arrive at a reply. */
function AgentTracePanel({ steps }) {
	const [open, setOpen] = (0, import_react.useState)(false);
	if (!steps.length) return null;
	const isWorking = steps.some((s) => s.status === "running");
	const errorCount = steps.filter((s) => s.status === "error").length;
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Collapsible, {
		open,
		onOpenChange: setOpen,
		className: "mt-1.5 max-w-[85%] rounded-xl border border-border/60 bg-white/[0.03]",
		children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CollapsibleTrigger, {
			asChild: true,
			children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", {
				type: "button",
				className: "flex w-full items-center gap-1.5 px-2.5 py-1.5 text-left text-[10px] text-muted-foreground hover:text-foreground",
				children: [
					isWorking ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LoaderCircle, { className: "h-3 w-3 shrink-0 animate-spin text-cyan" }, void 0, false, {
						fileName: _jsxFileName$3,
						lineNumber: 35,
						columnNumber: 13
					}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Circle, { className: "h-3 w-3 shrink-0 fill-current text-muted-foreground/50" }, void 0, false, {
						fileName: _jsxFileName$3,
						lineNumber: 37,
						columnNumber: 13
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
						className: "truncate",
						children: [isWorking ? "ADUF is working…" : `Agent working (${steps.length} step${steps.length === 1 ? "" : "s"})`, errorCount > 0 ? ` — self-corrected ${errorCount}×` : ""]
					}, void 0, true, {
						fileName: _jsxFileName$3,
						lineNumber: 39,
						columnNumber: 11
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ChevronDown, { className: cn("ml-auto h-3 w-3 shrink-0 transition-transform", open && "rotate-180") }, void 0, false, {
						fileName: _jsxFileName$3,
						lineNumber: 45,
						columnNumber: 11
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName$3,
				lineNumber: 30,
				columnNumber: 9
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName$3,
			lineNumber: 29,
			columnNumber: 7
		}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CollapsibleContent, {
			className: "space-y-1 border-t border-border/60 px-2.5 py-2",
			children: steps.map((step) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "flex items-start gap-1.5 text-[10px]",
				children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
					className: "mt-0.5 shrink-0",
					children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(StepIcon, { status: step.status }, void 0, false, {
						fileName: _jsxFileName$3,
						lineNumber: 54,
						columnNumber: 15
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName$3,
					lineNumber: 53,
					columnNumber: 13
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "min-w-0",
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
						className: "truncate text-muted-foreground",
						children: step.label
					}, void 0, false, {
						fileName: _jsxFileName$3,
						lineNumber: 57,
						columnNumber: 15
					}, this), step.detail ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
						className: "mt-0.5 break-words text-muted-foreground/70",
						children: step.detail
					}, void 0, false, {
						fileName: _jsxFileName$3,
						lineNumber: 59,
						columnNumber: 17
					}, this) : null]
				}, void 0, true, {
					fileName: _jsxFileName$3,
					lineNumber: 56,
					columnNumber: 13
				}, this)]
			}, step.id, true, {
				fileName: _jsxFileName$3,
				lineNumber: 52,
				columnNumber: 11
			}, this))
		}, void 0, false, {
			fileName: _jsxFileName$3,
			lineNumber: 50,
			columnNumber: 7
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName$3,
		lineNumber: 24,
		columnNumber: 5
	}, this);
}
var _jsxFileName$2 = "/root/app/code/src/components/aduf/chat-attachment.tsx";
function formatSize(bytes) {
	if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
	if (bytes >= 1e3) return `${Math.round(bytes / 1e3)} KB`;
	return `${bytes} B`;
}
function ChatAttachmentCard({ attachment }) {
	const [open, setOpen] = (0, import_react.useState)(false);
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(import_jsx_dev_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", {
		type: "button",
		onClick: () => setOpen(true),
		className: "mt-2 flex max-w-[85%] items-center gap-2.5 rounded-xl border border-border/60 bg-white/[0.03] px-3 py-2.5 text-left hover:bg-white/[0.06]",
		children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
			className: "grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-cyan/15 text-cyan",
			children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(FileText, { className: "h-4 w-4" }, void 0, false, {
				fileName: _jsxFileName$2,
				lineNumber: 23,
				columnNumber: 11
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName$2,
			lineNumber: 22,
			columnNumber: 9
		}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
			className: "min-w-0 flex-1",
			children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
				className: "block truncate text-sm",
				children: attachment.filename
			}, void 0, false, {
				fileName: _jsxFileName$2,
				lineNumber: 26,
				columnNumber: 11
			}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
				className: "block text-[10px] uppercase tracking-wide text-muted-foreground",
				children: [
					attachment.format,
					" · ",
					formatSize(attachment.sizeBytes),
					" · click to preview"
				]
			}, void 0, true, {
				fileName: _jsxFileName$2,
				lineNumber: 27,
				columnNumber: 11
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName$2,
			lineNumber: 25,
			columnNumber: 9
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName$2,
		lineNumber: 17,
		columnNumber: 7
	}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Dialog, {
		open,
		onOpenChange: setOpen,
		children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogContent, {
			className: "max-h-[80vh] max-w-2xl overflow-hidden",
			children: [
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogHeader, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogTitle, {
					className: "flex items-center gap-2 pr-6 text-base",
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(FileText, { className: "h-4 w-4 shrink-0 text-cyan" }, void 0, false, {
						fileName: _jsxFileName$2,
						lineNumber: 37,
						columnNumber: 15
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
						className: "truncate",
						children: attachment.filename
					}, void 0, false, {
						fileName: _jsxFileName$2,
						lineNumber: 38,
						columnNumber: 15
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName$2,
					lineNumber: 36,
					columnNumber: 13
				}, this) }, void 0, false, {
					fileName: _jsxFileName$2,
					lineNumber: 35,
					columnNumber: 11
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "max-h-[55vh] overflow-y-auto rounded-lg border border-border/60 bg-black/20",
					children: attachment.format === "pdf" ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("iframe", {
						title: attachment.filename,
						src: `/api/documents/${attachment.id}/download?inline=1`,
						className: "h-[55vh] w-full"
					}, void 0, false, {
						fileName: _jsxFileName$2,
						lineNumber: 44,
						columnNumber: 15
					}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("pre", {
						className: "whitespace-pre-wrap break-words p-4 text-xs text-muted-foreground",
						children: attachment.previewText || "(no preview available)"
					}, void 0, false, {
						fileName: _jsxFileName$2,
						lineNumber: 50,
						columnNumber: 15
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName$2,
					lineNumber: 42,
					columnNumber: 11
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("a", {
					href: `/api/documents/${attachment.id}/download`,
					download: attachment.filename,
					className: "flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium text-background",
					style: { background: "var(--gradient-accent)" },
					children: [
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Download, { className: "h-4 w-4" }, void 0, false, {
							fileName: _jsxFileName$2,
							lineNumber: 62,
							columnNumber: 13
						}, this),
						" Download ",
						attachment.filename
					]
				}, void 0, true, {
					fileName: _jsxFileName$2,
					lineNumber: 56,
					columnNumber: 11
				}, this)
			]
		}, void 0, true, {
			fileName: _jsxFileName$2,
			lineNumber: 34,
			columnNumber: 9
		}, this)
	}, void 0, false, {
		fileName: _jsxFileName$2,
		lineNumber: 33,
		columnNumber: 7
	}, this)] }, void 0, true, {
		fileName: _jsxFileName$2,
		lineNumber: 16,
		columnNumber: 5
	}, this);
}
var _jsxFileName$1 = "/root/app/code/src/components/aduf/aduf-analysis-card.tsx";
var AREA_LABELS = {
	visibility: "Visibility",
	credibility: "Credibility",
	customer_journey: "Customer Journey",
	conversion: "Conversion",
	sales: "Sales",
	retention: "Retention",
	operations: "Operations",
	local_presence: "Local Presence",
	search_ai_visibility: "Search / AI Visibility"
};
var SEVERITY_STYLES = {
	low: "bg-cyan/15 text-cyan",
	medium: "bg-amber-400/15 text-amber-300",
	high: "bg-orange-400/15 text-orange-300",
	critical: "bg-red-500/15 text-red-400"
};
function SeverityBadge({ severity }) {
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
		className: cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", SEVERITY_STYLES[severity]),
		children: severity
	}, void 0, false, {
		fileName: _jsxFileName$1,
		lineNumber: 36,
		columnNumber: 5
	}, this);
}
function FindingList({ icon: Icon, label, items }) {
	if (!items.length) return null;
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "mt-2",
		children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
			className: "flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground",
			children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Icon, { className: "h-3 w-3" }, void 0, false, {
				fileName: _jsxFileName$1,
				lineNumber: 60,
				columnNumber: 9
			}, this), label]
		}, void 0, true, {
			fileName: _jsxFileName$1,
			lineNumber: 59,
			columnNumber: 7
		}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("ul", {
			className: "mt-1 space-y-0.5 pl-4 text-xs leading-relaxed text-muted-foreground",
			children: items.map((item, i) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", {
				className: "list-disc marker:text-muted-foreground/50",
				children: item
			}, i, false, {
				fileName: _jsxFileName$1,
				lineNumber: 65,
				columnNumber: 11
			}, this))
		}, void 0, false, {
			fileName: _jsxFileName$1,
			lineNumber: 63,
			columnNumber: 7
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName$1,
		lineNumber: 58,
		columnNumber: 5
	}, this);
}
function FindingCard({ finding }) {
	const [open, setOpen] = (0, import_react.useState)(false);
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Collapsible, {
		open,
		onOpenChange: setOpen,
		className: "rounded-xl border border-border/60 bg-white/[0.03] p-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "flex items-start justify-between gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "min-w-0",
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
						className: "text-[10px] uppercase tracking-[0.15em] text-cyan/80",
						children: AREA_LABELS[finding.area]
					}, void 0, false, {
						fileName: _jsxFileName$1,
						lineNumber: 85,
						columnNumber: 11
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
						className: "mt-0.5 text-sm font-medium leading-snug",
						children: finding.problem
					}, void 0, false, {
						fileName: _jsxFileName$1,
						lineNumber: 88,
						columnNumber: 11
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName$1,
					lineNumber: 84,
					columnNumber: 9
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SeverityBadge, { severity: finding.severity }, void 0, false, {
					fileName: _jsxFileName$1,
					lineNumber: 90,
					columnNumber: 9
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName$1,
				lineNumber: 83,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
				className: "mt-2 flex items-start gap-1.5 text-xs text-muted-foreground",
				children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TrendingUp, { className: "mt-0.5 h-3 w-3 shrink-0 text-cyan" }, void 0, false, {
					fileName: _jsxFileName$1,
					lineNumber: 94,
					columnNumber: 9
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
					className: "font-medium text-foreground/80",
					children: "Estimated impact: "
				}, void 0, false, {
					fileName: _jsxFileName$1,
					lineNumber: 96,
					columnNumber: 11
				}, this), finding.estimatedImpact] }, void 0, true, {
					fileName: _jsxFileName$1,
					lineNumber: 95,
					columnNumber: 9
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName$1,
				lineNumber: 93,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "mt-2 flex flex-wrap gap-1.5",
				children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
					className: cn("flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px]", finding.automationPossible ? "bg-violet/15 text-violet" : "bg-white/8 text-muted-foreground"),
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Bot, { className: "h-3 w-3" }, void 0, false, {
						fileName: _jsxFileName$1,
						lineNumber: 110,
						columnNumber: 11
					}, this), finding.automationPossible ? "Automatable" : "Not automatable"]
				}, void 0, true, {
					fileName: _jsxFileName$1,
					lineNumber: 102,
					columnNumber: 9
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
					className: cn("flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px]", finding.expertRequired ? "bg-amber-400/15 text-amber-300" : "bg-white/8 text-muted-foreground"),
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(UserCog, { className: "h-3 w-3" }, void 0, false, {
						fileName: _jsxFileName$1,
						lineNumber: 121,
						columnNumber: 11
					}, this), finding.expertRequired ? finding.expertType || "Expert needed" : "No expert needed"]
				}, void 0, true, {
					fileName: _jsxFileName$1,
					lineNumber: 113,
					columnNumber: 9
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName$1,
				lineNumber: 101,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CollapsibleTrigger, {
				asChild: true,
				children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", {
					type: "button",
					className: "mt-2 flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground",
					children: [open ? "Hide details" : "Root cause, opportunities & actions", /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ChevronDown, { className: cn("h-3 w-3 transition-transform", open && "rotate-180") }, void 0, false, {
						fileName: _jsxFileName$1,
						lineNumber: 132,
						columnNumber: 11
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName$1,
					lineNumber: 127,
					columnNumber: 9
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName$1,
				lineNumber: 126,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CollapsibleContent, { children: [
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(FindingList, {
					icon: TriangleAlert,
					label: "Root cause(s)",
					items: finding.rootCauses
				}, void 0, false, {
					fileName: _jsxFileName$1,
					lineNumber: 136,
					columnNumber: 9
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(FindingList, {
					icon: Lightbulb,
					label: "Opportunities",
					items: finding.opportunities
				}, void 0, false, {
					fileName: _jsxFileName$1,
					lineNumber: 137,
					columnNumber: 9
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(FindingList, {
					icon: ListChecks,
					label: "Recommended actions",
					items: finding.recommendedActions
				}, void 0, false, {
					fileName: _jsxFileName$1,
					lineNumber: 138,
					columnNumber: 9
				}, this),
				finding.automationNotes ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
					className: "mt-2 text-xs text-muted-foreground",
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
						className: "font-medium text-foreground/80",
						children: "Automation notes: "
					}, void 0, false, {
						fileName: _jsxFileName$1,
						lineNumber: 145,
						columnNumber: 13
					}, this), finding.automationNotes]
				}, void 0, true, {
					fileName: _jsxFileName$1,
					lineNumber: 144,
					columnNumber: 11
				}, this) : null
			] }, void 0, true, {
				fileName: _jsxFileName$1,
				lineNumber: 135,
				columnNumber: 7
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName$1,
		lineNumber: 78,
		columnNumber: 5
	}, this);
}
/** Renders a full ADUF diagnosis: a short summary plus one card per finding,
*  each covering problem / severity / root cause / opportunity /
*  recommended action / estimated impact / automation / expert need. */
function AdufAnalysisCard({ analysis }) {
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "mt-2 max-w-[95%] space-y-2.5 rounded-2xl border border-border/60 bg-secondary/40 p-3.5",
		children: [
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "flex items-center gap-1.5",
				children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
					className: "relative flex h-2 w-2",
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { className: "animate-ripple absolute inset-0 rounded-full bg-cyan" }, void 0, false, {
						fileName: _jsxFileName$1,
						lineNumber: 162,
						columnNumber: 11
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { className: "relative h-2 w-2 rounded-full bg-cyan" }, void 0, false, {
						fileName: _jsxFileName$1,
						lineNumber: 163,
						columnNumber: 11
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName$1,
					lineNumber: 161,
					columnNumber: 9
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
					className: "text-xs font-semibold",
					children: "ADUF Diagnostic"
				}, void 0, false, {
					fileName: _jsxFileName$1,
					lineNumber: 165,
					columnNumber: 9
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName$1,
				lineNumber: 160,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
				className: "text-xs leading-relaxed text-muted-foreground",
				children: analysis.summary
			}, void 0, false, {
				fileName: _jsxFileName$1,
				lineNumber: 167,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "space-y-2",
				children: analysis.findings.map((finding, i) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(FindingCard, { finding }, i, false, {
					fileName: _jsxFileName$1,
					lineNumber: 170,
					columnNumber: 11
				}, this))
			}, void 0, false, {
				fileName: _jsxFileName$1,
				lineNumber: 168,
				columnNumber: 7
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName$1,
		lineNumber: 159,
		columnNumber: 5
	}, this);
}
var _jsxFileName = "/root/app/code/src/routes/index.tsx?tsr-split=component";
function greeting() {
	const h = (/* @__PURE__ */ new Date()).getHours();
	if (h < 12) return "Good Morning";
	if (h < 18) return "Good Afternoon";
	return "Good Evening";
}
var suggestions = [
	"Why did sales drop?",
	"Where should I spend ₦50k?",
	"How are my goals tracking?",
	"Summarise this week for me"
];
var RING_COLORS = [
	"var(--accent)",
	"var(--violet)",
	"var(--cyan)"
];
/** Top-of-page dashboard: up to 3 goals as progress rings, with dashed
*  placeholder slots (linking to /goals) filling any remaining space. */
function GoalProgressBanner() {
	const goals = useAduf((s) => s.goals);
	const top = goals.slice(0, 3);
	const placeholders = Math.max(0, 3 - top.length);
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(GlassCard, {
		hover: false,
		className: "mb-4",
		children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
			className: "mb-4 flex items-center justify-between gap-3",
			children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "min-w-0",
				children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
					className: "text-[10px] uppercase tracking-[0.2em] text-muted-foreground",
					children: "Today"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 57,
					columnNumber: 11
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h2", {
					className: "mt-0.5 truncate text-base font-semibold sm:text-lg",
					children: "Goal Progress Dashboard"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 58,
					columnNumber: 11
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 56,
				columnNumber: 9
			}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Link, {
				to: "/goals",
				className: "flex shrink-0 items-center gap-1 rounded-full border border-border px-3 py-1.5 text-[11px] text-muted-foreground hover:bg-white/8 hover:text-foreground",
				children: ["Goals", /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ArrowUpRight, { className: "h-3 w-3" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 64,
					columnNumber: 11
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 62,
				columnNumber: 9
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 55,
			columnNumber: 7
		}, this), goals.length === 0 ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
			className: "flex flex-col items-center gap-2 py-4 text-center",
			children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
				className: "text-sm text-muted-foreground",
				children: "No goals set yet."
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 69,
				columnNumber: 11
			}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Link, {
				to: "/goals",
				className: "rounded-full px-4 py-2 text-xs font-medium text-background",
				style: { background: "var(--gradient-accent)" },
				children: "Set your first goal"
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 70,
				columnNumber: 11
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 68,
			columnNumber: 29
		}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
			className: "flex flex-wrap justify-center gap-6 sm:justify-between sm:gap-4",
			children: [top.map((g, i) => {
				const pct = Math.round(g.current / g.target * 100);
				return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ProgressRing, {
					value: pct,
					label: `${Math.min(100, pct)}%`,
					sublabel: g.title,
					color: RING_COLORS[i % RING_COLORS.length] ?? "var(--accent)"
				}, g.id, false, {
					fileName: _jsxFileName,
					lineNumber: 78,
					columnNumber: 16
				}, this);
			}), Array.from({ length: placeholders }).map((_, i) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Link, {
				to: "/goals",
				className: "group",
				children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ProgressRing, {
					value: 0,
					label: "+",
					sublabel: "Add goal",
					dashed: true
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 83,
					columnNumber: 15
				}, this)
			}, `ph-${i}`, false, {
				fileName: _jsxFileName,
				lineNumber: 82,
				columnNumber: 24
			}, this))]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 75,
			columnNumber: 18
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 54,
		columnNumber: 10
	}, this);
}
/** Compact insight/notification preview — the full history lives on
*  /notifications; this shows the freshest few inline on the Brain page. */
function InsightFeedCard() {
	const { insights, markInsightRead } = useAduf();
	const unread = insights.filter((i) => !i.read).length;
	const recent = insights.slice(0, 3);
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(GlassCard, {
		hover: false,
		className: "mb-4 p-3 sm:p-4",
		children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
			className: "mb-1 flex items-center justify-between gap-3 px-1",
			children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "flex items-center gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h2", {
					className: "text-sm font-semibold",
					children: "Insight Feed"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 101,
					columnNumber: 11
				}, this), unread > 0 ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
					className: "rounded-full bg-cyan/15 px-2 py-0.5 text-[10px] font-medium text-cyan",
					children: [unread, " new"]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 102,
					columnNumber: 25
				}, this) : null]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 100,
				columnNumber: 9
			}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Link, {
				to: "/notifications",
				className: "flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground",
				children: ["View all", /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ArrowUpRight, { className: "h-3 w-3" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 108,
					columnNumber: 11
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 106,
				columnNumber: 9
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 99,
			columnNumber: 7
		}, this), recent.length === 0 ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
			className: "px-1 py-3 text-xs text-muted-foreground",
			children: "Nothing yet — ADUF will drop signals here as your business moves."
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 111,
			columnNumber: 30
		}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
			className: "space-y-1",
			children: recent.map((insight) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(InsightRow, {
				insight,
				onRead: markInsightRead,
				compact: true
			}, insight.id, false, {
				fileName: _jsxFileName,
				lineNumber: 114,
				columnNumber: 34
			}, this))
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 113,
			columnNumber: 16
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 98,
		columnNumber: 10
	}, this);
}
function BrainPage() {
	const { userName, messages, thinking, sendMessage, answerQuestion, approveProposedAction, dismissProposedAction } = useAduf();
	const [draft, setDraft] = (0, import_react.useState)("");
	const [menuOpen, setMenuOpen] = (0, import_react.useState)(false);
	const [listening, setListening] = (0, import_react.useState)(false);
	const [speechSupported, setSpeechSupported] = (0, import_react.useState)(false);
	const hello = (0, import_react.useMemo)(greeting, []);
	const scrollRef = (0, import_react.useRef)(null);
	const fileInputRef = (0, import_react.useRef)(null);
	const recognitionRef = (0, import_react.useRef)(null);
	/** Draft text as it was the moment the mic was turned on — speech is
	*  appended after this, never overwrites what was already typed/said. */
	const baseDraftRef = (0, import_react.useRef)("");
	/** Speech confirmed as final since the mic turned on, kept separate from
	*  the current in-flight interim guess so each onresult tick can replace
	*  just the interim tail without losing earlier finalized words. */
	const finalizedRef = (0, import_react.useRef)("");
	(0, import_react.useEffect)(() => {
		scrollRef.current?.scrollTo({
			top: scrollRef.current.scrollHeight,
			behavior: "smooth"
		});
	}, [messages, thinking]);
	(0, import_react.useEffect)(() => {
		const w = window;
		setSpeechSupported(Boolean(w.SpeechRecognition || w.webkitSpeechRecognition));
	}, []);
	function toggleMic() {
		if (!speechSupported) return;
		if (listening) {
			recognitionRef.current?.stop();
			setListening(false);
			return;
		}
		const w = window;
		const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
		if (!SR) return;
		baseDraftRef.current = draft ? `${draft} ` : "";
		finalizedRef.current = "";
		const recognition = new SR();
		recognition.lang = "en-US";
		recognition.continuous = true;
		recognition.interimResults = true;
		recognition.onresult = (e) => {
			let interim = "";
			for (let i = e.resultIndex; i < e.results.length; i++) {
				const result = e.results[i];
				if (!result) continue;
				const chunk = result[0].transcript;
				if (result.isFinal) finalizedRef.current += (finalizedRef.current ? " " : "") + chunk.trim();
				else interim += chunk;
			}
			const finalized = finalizedRef.current;
			setDraft(baseDraftRef.current + finalized + (finalized && interim ? " " : "") + interim);
		};
		recognition.onend = () => setListening(false);
		recognition.onerror = () => setListening(false);
		recognitionRef.current = recognition;
		recognition.start();
		setListening(true);
	}
	function handleFileChosen(e) {
		const file = e.target.files?.[0];
		if (file) setDraft((d) => d ? `${d} 📎 ${file.name}` : `📎 ${file.name}`);
		e.target.value = "";
	}
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(AppShell, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "mx-auto max-w-[880px] px-4 py-4 sm:px-6 lg:py-8",
		children: [
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("header", {
				className: "mb-4 flex shrink-0 items-center justify-between gap-3 lg:mb-6",
				children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "min-w-0",
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
						className: "text-[10px] uppercase tracking-[0.2em] text-muted-foreground",
						children: "The Brain"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 209,
						columnNumber: 13
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h1", {
						className: "mt-1 truncate text-xl font-semibold sm:text-2xl",
						children: [hello, userName ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(import_jsx_dev_runtime.Fragment, { children: [", ", /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
							className: "text-gradient",
							children: userName
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 215,
							columnNumber: 21
						}, this)] }, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 214,
							columnNumber: 27
						}, this) : null]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 212,
						columnNumber: 13
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 208,
					columnNumber: 11
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "glass flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs",
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
						className: "relative flex h-2 w-2",
						children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { className: "animate-ripple absolute inset-0 rounded-full bg-cyan" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 221,
							columnNumber: 15
						}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { className: "relative h-2 w-2 rounded-full bg-cyan" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 222,
							columnNumber: 15
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 220,
						columnNumber: 13
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
						className: "whitespace-nowrap text-muted-foreground",
						children: "ADUF is Active"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 224,
						columnNumber: 13
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 219,
					columnNumber: 11
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 207,
				columnNumber: 9
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(GoalProgressBanner, {}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 228,
				columnNumber: 9
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(InsightFeedCard, {}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 229,
				columnNumber: 9
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(GlassCard, {
				hover: false,
				className: "flex h-[60vh] min-h-[420px] max-h-[640px] flex-col p-0",
				children: [
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "flex shrink-0 items-center gap-2 border-b border-border p-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
								className: "relative flex h-2 w-2",
								children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { className: "animate-ripple absolute inset-0 rounded-full bg-cyan" }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 234,
									columnNumber: 15
								}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { className: "relative h-2 w-2 rounded-full bg-cyan" }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 235,
									columnNumber: 15
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 233,
								columnNumber: 13
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h2", {
								className: "text-sm font-semibold",
								children: "Brain Chat"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 237,
								columnNumber: 13
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
								className: "ml-auto text-[11px] text-muted-foreground",
								children: "always on"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 238,
								columnNumber: 13
							}, this)
						]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 232,
						columnNumber: 11
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						ref: scrollRef,
						className: "min-h-0 flex-1 space-y-3 overflow-y-auto p-4",
						children: [
							messages.length === 0 && !thinking ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "flex h-full flex-col items-center justify-center gap-1.5 text-center",
								children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
									className: "text-sm text-muted-foreground",
									children: "Ask ADUF anything about your business."
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 243,
									columnNumber: 17
								}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
									className: "text-xs text-muted-foreground/70",
									children: "Try one of the prompts below to get started."
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 246,
									columnNumber: 17
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 242,
								columnNumber: 51
							}, this) : null,
							messages.map((m) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(motion.div, {
								initial: {
									opacity: 0,
									y: 8
								},
								animate: {
									opacity: 1,
									y: 0
								},
								className: m.role === "user" ? "ml-auto max-w-[85%]" : "max-w-[85%]",
								children: [
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
										className: `rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${m.role === "user" ? "bg-white/12" : "bg-secondary text-muted-foreground"}`,
										children: m.text
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 257,
										columnNumber: 17
									}, this),
									m.trace?.length ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(AgentTracePanel, { steps: m.trace }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 260,
										columnNumber: 36
									}, this) : null,
									m.analysis ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(AdufAnalysisCard, { analysis: m.analysis }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 261,
										columnNumber: 31
									}, this) : null,
									m.attachments?.map((a) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ChatAttachmentCard, { attachment: a }, a.id, false, {
										fileName: _jsxFileName,
										lineNumber: 262,
										columnNumber: 42
									}, this)),
									m.question ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(AgentQuestion, {
										question: m.question,
										answeredValues: m.answeredValues,
										disabled: thinking,
										onAnswer: (values) => {
											const label = m.question.options.filter((o) => values.includes(o.value)).map((o) => o.label).join(", ");
											answerQuestion(m.id, values, label);
										}
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 263,
										columnNumber: 31
									}, this) : null,
									m.proposedAction ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(AgentProposedAction, {
										action: m.proposedAction,
										status: m.proposedActionStatus,
										onApprove: () => approveProposedAction(m.id),
										onDismiss: () => dismissProposedAction(m.id)
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 267,
										columnNumber: 37
									}, this) : null
								]
							}, m.id, true, {
								fileName: _jsxFileName,
								lineNumber: 250,
								columnNumber: 32
							}, this)),
							thinking ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "flex w-24 gap-1.5 rounded-2xl bg-secondary px-3.5 py-3",
								children: [
									0,
									1,
									2
								].map((i) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(motion.span, {
									className: "h-2 w-2 rounded-full bg-cyan",
									animate: {
										y: [
											0,
											-5,
											0
										],
										opacity: [
											.4,
											1,
											.4
										]
									},
									transition: {
										duration: .9,
										repeat: Infinity,
										delay: i * .15
									}
								}, i, false, {
									fileName: _jsxFileName,
									lineNumber: 270,
									columnNumber: 37
								}, this))
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 269,
								columnNumber: 25
							}, this) : null
						]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 241,
						columnNumber: 11
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "flex shrink-0 flex-wrap gap-2 px-4 pt-3",
						children: suggestions.map((q) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", {
							onClick: () => sendMessage(q),
							className: "flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-[11px] text-muted-foreground hover:bg-white/8 hover:text-foreground",
							children: [q, /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ArrowUpRight, { className: "h-3 w-3" }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 284,
								columnNumber: 17
							}, this)]
						}, q, true, {
							fileName: _jsxFileName,
							lineNumber: 282,
							columnNumber: 35
						}, this))
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 281,
						columnNumber: 11
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("form", {
						onSubmit: (e) => {
							e.preventDefault();
							sendMessage(draft);
							setDraft("");
						},
						className: "flex shrink-0 items-center gap-2 p-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "relative shrink-0",
								children: [
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", {
										type: "button",
										onClick: () => setMenuOpen((o) => !o),
										"aria-label": "Add attachment or shortcut",
										"aria-expanded": menuOpen,
										className: "grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-white/8 hover:text-foreground",
										children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Plus, { className: cn("h-4 w-4 transition-transform", menuOpen && "rotate-45") }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 295,
											columnNumber: 17
										}, this)
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 294,
										columnNumber: 15
									}, this),
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(AnimatePresence, { children: menuOpen ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(import_jsx_dev_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
										className: "fixed inset-0 z-40",
										onClick: () => setMenuOpen(false),
										"aria-hidden": true
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 300,
										columnNumber: 21
									}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(motion.div, {
										initial: {
											opacity: 0,
											y: 8,
											scale: .96
										},
										animate: {
											opacity: 1,
											y: 0,
											scale: 1
										},
										exit: {
											opacity: 0,
											y: 8,
											scale: .96
										},
										transition: { duration: .15 },
										className: "glass absolute bottom-full left-0 z-50 mb-2 w-60 overflow-hidden p-1.5",
										children: [
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", {
												type: "button",
												onClick: () => {
													fileInputRef.current?.click();
													setMenuOpen(false);
												},
												className: "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-white/8",
												children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Paperclip, { className: "h-4 w-4 text-muted-foreground" }, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 320,
													columnNumber: 25
												}, this), "Attach a file"]
											}, void 0, true, {
												fileName: _jsxFileName,
												lineNumber: 316,
												columnNumber: 23
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Link, {
												to: "/goals",
												onClick: () => setMenuOpen(false),
												className: "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-white/8",
												children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Target, { className: "h-4 w-4 text-muted-foreground" }, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 324,
													columnNumber: 25
												}, this), "Set a goal"]
											}, void 0, true, {
												fileName: _jsxFileName,
												lineNumber: 323,
												columnNumber: 23
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Link, {
												to: "/settings",
												onClick: () => setMenuOpen(false),
												className: "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-white/8",
												children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Plug, { className: "h-4 w-4 text-muted-foreground" }, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 328,
													columnNumber: 25
												}, this), "Connect a source"]
											}, void 0, true, {
												fileName: _jsxFileName,
												lineNumber: 327,
												columnNumber: 23
											}, this)
										]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 301,
										columnNumber: 21
									}, this)] }, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 299,
										columnNumber: 29
									}, this) : null }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 298,
										columnNumber: 15
									}, this),
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("input", {
										ref: fileInputRef,
										type: "file",
										onChange: handleFileChosen,
										className: "hidden"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 335,
										columnNumber: 15
									}, this)
								]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 293,
								columnNumber: 13
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("input", {
								value: draft,
								onChange: (e) => setDraft(e.target.value),
								placeholder: "Ask ADUF anything...",
								className: "min-w-0 flex-1 rounded-full bg-white/8 px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 338,
								columnNumber: 13
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", {
								type: "button",
								onClick: toggleMic,
								disabled: !speechSupported,
								"aria-pressed": listening,
								"aria-label": listening ? "Stop voice input" : "Voice input",
								title: speechSupported ? listening ? "Stop listening" : "Speak to ADUF" : "Voice input isn't supported in this browser",
								className: cn("relative grid h-10 w-10 shrink-0 place-items-center rounded-full border transition-colors", listening ? "border-cyan/60 bg-cyan/15 text-cyan" : "border-border text-muted-foreground hover:bg-white/8 hover:text-foreground", !speechSupported && "cursor-not-allowed opacity-40"),
								children: [listening ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { className: "animate-ripple absolute inset-0 rounded-full bg-cyan/60" }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 341,
									columnNumber: 28
								}, this) : null, /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Mic, { className: "relative h-4 w-4" }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 342,
									columnNumber: 15
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 340,
								columnNumber: 13
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", {
								type: "submit",
								"aria-label": "Send message",
								className: "grid h-10 w-10 shrink-0 place-items-center rounded-full transition-transform hover:scale-105",
								style: { background: "var(--gradient-accent)" },
								children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Send, { className: "h-4 w-4 text-background" }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 348,
									columnNumber: 15
								}, this)
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 345,
								columnNumber: 13
							}, this)
						]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 288,
						columnNumber: 11
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 231,
				columnNumber: 9
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 206,
		columnNumber: 7
	}, this) }, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 205,
		columnNumber: 10
	}, this);
}
//#endregion
export { BrainPage as component };
