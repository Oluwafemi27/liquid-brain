import { a as __toESM } from "../_runtime.mjs";
import { t as motion } from "../_libs/framer-motion+[...].mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { t as require_jsx_dev_runtime } from "../_libs/react.mjs";
import { A as Mail, B as CreditCard, I as Globe, O as MessageCircle, k as Megaphone, y as Radio, z as Database } from "../_libs/lucide-react.mjs";
import { _ as cn, b as useAduf, c as PageHeader, g as WaterOrb, o as GlassCard, t as AppShell, y as timeAgo } from "./app-shell-Dd7fJpNz.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/automations-CLRMPiLB.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_dev_runtime = require_jsx_dev_runtime();
var automation_core_default = "/assets/automation-core-DCCNTH0x.png";
var automation_live_feed_default = "/assets/automation-live-feed-kJhTzXV8.webp";
var _jsxFileName$1 = "/root/app/code/src/components/aduf/live-log-feed.tsx";
var SEVERITY_DOT = {
	info: "bg-cyan",
	success: "bg-[oklch(0.84_0.06_195)]",
	warning: "bg-[oklch(0.78_0.12_70)]"
};
/**
* Console-style feed of real system events: recent insights (automation
* toggles, connected sources, goals hit) followed by each channel's current
* status, straight from store state — no fabricated log lines.
*/
function LiveLogFeed({ insights, automations, className }) {
	const scrollRef = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		scrollRef.current?.scrollTo({ top: 0 });
	}, [insights.length]);
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: cn("glass flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/20", className),
		children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
			className: "flex shrink-0 items-center gap-2 border-b border-white/10 px-4 py-2.5",
			children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
				className: "relative flex h-2 w-2 shrink-0",
				children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { className: "animate-ripple absolute inset-0 rounded-full bg-cyan" }, void 0, false, {
					fileName: _jsxFileName$1,
					lineNumber: 41,
					columnNumber: 11
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { className: "relative h-2 w-2 rounded-full bg-cyan" }, void 0, false, {
					fileName: _jsxFileName$1,
					lineNumber: 42,
					columnNumber: 11
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName$1,
				lineNumber: 40,
				columnNumber: 9
			}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
				className: "font-display text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground",
				children: "Live Feed"
			}, void 0, false, {
				fileName: _jsxFileName$1,
				lineNumber: 44,
				columnNumber: 9
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName$1,
			lineNumber: 39,
			columnNumber: 7
		}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
			ref: scrollRef,
			className: "min-h-0 flex-1 space-y-2.5 overflow-y-auto px-4 py-3 font-mono text-[11px] leading-relaxed",
			children: [
				insights.map((insight, i) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(motion.div, {
					initial: {
						opacity: 0,
						x: -6
					},
					animate: {
						opacity: 1,
						x: 0
					},
					transition: { delay: Math.min(i, 6) * .03 },
					className: "flex items-start gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
						className: cn("mt-1 h-1.5 w-1.5 shrink-0 rounded-full", SEVERITY_DOT[insight.severity]),
						"aria-hidden": true
					}, void 0, false, {
						fileName: _jsxFileName$1,
						lineNumber: 61,
						columnNumber: 13
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
						className: "min-w-0 flex-1 text-muted-foreground",
						children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
							className: "text-foreground",
							children: insight.title
						}, void 0, false, {
							fileName: _jsxFileName$1,
							lineNumber: 69,
							columnNumber: 15
						}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
							className: "ml-1.5 text-muted-foreground/60",
							children: [
								"· ",
								insight.source,
								" · ",
								timeAgo(insight.createdAt)
							]
						}, void 0, true, {
							fileName: _jsxFileName$1,
							lineNumber: 70,
							columnNumber: 15
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName$1,
						lineNumber: 68,
						columnNumber: 13
					}, this)]
				}, insight.id, true, {
					fileName: _jsxFileName$1,
					lineNumber: 54,
					columnNumber: 11
				}, this)),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "!mt-4 border-t border-white/10 pt-3",
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
						className: "mb-1.5 text-[9px] uppercase tracking-[0.2em] text-muted-foreground/60",
						children: "Channel status"
					}, void 0, false, {
						fileName: _jsxFileName$1,
						lineNumber: 78,
						columnNumber: 11
					}, this), automations.map((a) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "flex items-center justify-between gap-2 py-0.5",
						children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
							className: "truncate text-muted-foreground/80",
							children: a.name
						}, void 0, false, {
							fileName: _jsxFileName$1,
							lineNumber: 83,
							columnNumber: 15
						}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
							className: cn("shrink-0 text-[10px] font-semibold uppercase tracking-wider", a.enabled ? "text-cyan" : "text-muted-foreground/50"),
							children: a.enabled ? "live" : "standby"
						}, void 0, false, {
							fileName: _jsxFileName$1,
							lineNumber: 84,
							columnNumber: 15
						}, this)]
					}, a.id, true, {
						fileName: _jsxFileName$1,
						lineNumber: 82,
						columnNumber: 13
					}, this))]
				}, void 0, true, {
					fileName: _jsxFileName$1,
					lineNumber: 77,
					columnNumber: 9
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
					className: "inline-block h-3 w-1.5 animate-pulse bg-cyan/70",
					"aria-hidden": true
				}, void 0, false, {
					fileName: _jsxFileName$1,
					lineNumber: 96,
					columnNumber: 9
				}, this)
			]
		}, void 0, true, {
			fileName: _jsxFileName$1,
			lineNumber: 49,
			columnNumber: 7
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName$1,
		lineNumber: 33,
		columnNumber: 5
	}, this);
}
var _jsxFileName = "/root/app/code/src/routes/automations.tsx?tsr-split=component";
var CHANNEL_ICONS = {
	website: Globe,
	whatsapp: MessageCircle,
	crm: Database,
	payments: CreditCard,
	ads: Megaphone,
	email: Mail
};
/** Hexagon outline, drawn point-up so its six vertices line up with the six
*  orbiting channel nodes below. Pure decoration — no hit targets. */
function HexRing({ scale, opacity, duration }) {
	const pts = Array.from({ length: 6 }, (_, i) => {
		const a = i / 6 * Math.PI * 2 - Math.PI / 2;
		return `${50 + Math.cos(a) * 48 * scale},${50 + Math.sin(a) * 48 * scale}`;
	}).join(" ");
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(motion.svg, {
		"aria-hidden": true,
		viewBox: "0 0 100 100",
		className: "absolute inset-0 h-full w-full",
		animate: { rotate: 360 },
		transition: {
			duration,
			repeat: Infinity,
			ease: "linear"
		},
		style: { opacity },
		children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("polygon", {
			points: pts,
			fill: "none",
			stroke: "var(--border)",
			strokeWidth: "0.4"
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 48,
			columnNumber: 7
		}, this)
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 39,
		columnNumber: 10
	}, this);
}
function AutomationsPage() {
	const { automations, toggleAutomation, insights } = useAduf();
	const [open, setOpen] = (0, import_react.useState)(null);
	const active = automations.find((a) => a.id === open) ?? null;
	const liveCount = automations.filter((a) => a.enabled).length;
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(AppShell, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:py-8",
		children: [
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(PageHeader, {
				eyebrow: "Automation Grid",
				title: "Command Center",
				children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "glass rounded-full px-4 py-2 text-xs text-muted-foreground",
					children: [
						liveCount,
						"/",
						automations.length,
						" channels live"
					]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 63,
					columnNumber: 11
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 62,
				columnNumber: 9
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(GlassCard, {
				hover: false,
				className: "relative overflow-hidden p-6 sm:p-10",
				children: [
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "mb-6 flex justify-center",
						children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "glass flex items-center gap-2 rounded-full px-4 py-1.5",
							children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Radio, { className: "h-3 w-3 text-cyan" }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 72,
								columnNumber: 15
							}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
								className: "font-display text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground",
								children: "Automation Command Center"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 73,
								columnNumber: 15
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 71,
							columnNumber: 13
						}, this)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 70,
						columnNumber: 11
					}, this),
					automations.length === 0 ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "flex min-h-64 items-center justify-center text-center text-sm text-muted-foreground",
						children: "No live automations yet. Connected automation records will appear here in real time."
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 79,
						columnNumber: 39
					}, this) : null,
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: cn("grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_300px]", automations.length === 0 && "hidden"),
						children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "relative mx-auto aspect-square w-full max-w-[560px] lg:mx-0",
							children: [
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(HexRing, {
									scale: 1,
									opacity: .7,
									duration: 90
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 85,
									columnNumber: 15
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(HexRing, {
									scale: .78,
									opacity: .4,
									duration: 70
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 86,
									columnNumber: 15
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
									className: "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
									children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(WaterOrb, {
										fill: automations.length ? liveCount / automations.length * 100 : 0,
										size: 140,
										float: false,
										children: [
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("img", {
												src: automation_core_default,
												alt: "",
												"aria-hidden": true,
												className: "h-10 w-10 object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)]"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 90,
												columnNumber: 19
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
												className: "mt-1 font-display text-[11px] font-semibold",
												children: "Automation Core"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 91,
												columnNumber: 19
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
												className: "text-[10px] text-muted-foreground",
												children: "AI CORE // LIVE"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 94,
												columnNumber: 19
											}, this)
										]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 89,
										columnNumber: 17
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 88,
									columnNumber: 15
								}, this),
								automations.map((a, i) => {
									const angle = i / automations.length * Math.PI * 2 - Math.PI / 2;
									const r = 44;
									const left = 50 + Math.cos(angle) * r;
									const top = 50 + Math.sin(angle) * r;
									const Icon = CHANNEL_ICONS[a.id];
									const isOpen = open === a.id;
									return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
										className: "absolute -translate-x-1/2 -translate-y-1/2",
										style: {
											left: `${left}%`,
											top: `${top}%`
										},
										children: [
											a.enabled ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
												"aria-hidden": true,
												className: "pointer-events-none absolute left-1/2 top-1/2 origin-left",
												style: {
													width: `${r * 5.4}px`,
													transform: `rotate(${angle + Math.PI}rad)`
												},
												children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
													className: "absolute inset-y-0 left-0 h-[2px] w-full rounded-full",
													style: { background: "color-mix(in oklab, var(--cyan) 22%, transparent)" }
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 114,
													columnNumber: 25
												}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
													className: "animate-pipe-shoot absolute top-1/2 h-[3px] w-10 -translate-y-1/2 rounded-full",
													style: {
														background: "linear-gradient(90deg, transparent, var(--cyan) 35%, oklch(1 0 0 / 95%) 55%, var(--violet) 75%, transparent)",
														boxShadow: "0 0 8px 1px var(--cyan)",
														animationDelay: `${i * .18}s`
													}
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 119,
													columnNumber: 25
												}, this)]
											}, void 0, true, {
												fileName: _jsxFileName,
												lineNumber: 109,
												columnNumber: 34
											}, this) : null,
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
												className: "absolute left-1/2 -top-6 -translate-x-1/2 whitespace-nowrap font-display text-[9px] font-semibold tracking-widest text-muted-foreground",
												children: ["0", i + 1]
											}, void 0, true, {
												fileName: _jsxFileName,
												lineNumber: 126,
												columnNumber: 21
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", {
												onClick: () => setOpen(a.id),
												onDoubleClick: () => toggleAutomation(a.id),
												className: "relative block",
												"aria-label": `Open ${a.name} automation`,
												children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(WaterOrb, {
													fill: a.enabled ? 74 : 0,
													size: 96,
													children: [
														/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Icon, { className: cn("h-4 w-4", a.enabled ? "text-cyan" : "text-muted-foreground") }, void 0, false, {
															fileName: _jsxFileName,
															lineNumber: 132,
															columnNumber: 25
														}, this),
														/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
															className: "mt-1 whitespace-nowrap font-display text-[9px] font-semibold uppercase tracking-wide leading-none",
															children: a.name
														}, void 0, false, {
															fileName: _jsxFileName,
															lineNumber: 133,
															columnNumber: 25
														}, this),
														/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
															className: "mt-1 text-[8px] leading-none text-muted-foreground",
															children: a.enabled ? "ON" : "OFF"
														}, void 0, false, {
															fileName: _jsxFileName,
															lineNumber: 136,
															columnNumber: 25
														}, this)
													]
												}, void 0, true, {
													fileName: _jsxFileName,
													lineNumber: 131,
													columnNumber: 23
												}, this), isOpen ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
													"aria-hidden": true,
													className: "absolute inset-[-6px] rounded-full",
													style: { boxShadow: "0 0 0 1.5px var(--foreground)" }
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 140,
													columnNumber: 33
												}, this) : null]
											}, void 0, true, {
												fileName: _jsxFileName,
												lineNumber: 130,
												columnNumber: 21
											}, this)
										]
									}, a.id, true, {
										fileName: _jsxFileName,
										lineNumber: 105,
										columnNumber: 22
									}, this);
								})
							]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 84,
							columnNumber: 13
						}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LiveLogFeed, {
							insights,
							automations,
							className: "h-[320px] lg:h-[500px]"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 148,
							columnNumber: 13
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 83,
						columnNumber: 11
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
						className: "mt-5 text-center text-xs text-muted-foreground",
						children: "Tap a node to open its live feed · double-tap to toggle"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 150,
						columnNumber: 11
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 69,
				columnNumber: 9
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(GlassCard, {
				hover: false,
				className: "mt-6 overflow-hidden p-0",
				children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "grid lg:grid-cols-[minmax(0,1fr)_260px]",
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "p-6 sm:p-8",
						children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4",
							children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "min-w-0",
								children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
									className: "text-[10px] uppercase tracking-[0.2em] text-muted-foreground",
									children: active ? `Channel detail // ${active.id.toUpperCase()}` : "Channel detail"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 161,
									columnNumber: 19
								}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h2", {
									className: "mt-1 truncate text-xl font-semibold",
									children: active ? active.name : "Select a channel"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 164,
									columnNumber: 19
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 160,
								columnNumber: 17
							}, this), active ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
								className: cn("shrink-0 rounded-full border px-3 py-1 text-[10px] font-medium uppercase tracking-wider", active.enabled ? "border-cyan/40 text-cyan" : "border-border text-muted-foreground"),
								children: active.enabled ? "Live" : "Standby"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 168,
								columnNumber: 27
							}, this) : null]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 159,
							columnNumber: 15
						}, this), active ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(import_jsx_dev_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "mt-5 space-y-3",
							children: [
								{
									k: "Trigger",
									v: active.trigger
								},
								{
									k: "Action",
									v: active.action
								},
								{
									k: "Goal it affects",
									v: active.goal || "Not linked to a goal yet"
								}
							].map((row) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "rounded-2xl bg-white/6 p-4",
								children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
									className: "text-[11px] uppercase tracking-wider text-muted-foreground",
									children: row.k
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 185,
									columnNumber: 25
								}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
									className: "mt-1 text-sm",
									children: row.v
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 188,
									columnNumber: 25
								}, this)]
							}, row.k, true, {
								fileName: _jsxFileName,
								lineNumber: 184,
								columnNumber: 31
							}, this))
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 174,
							columnNumber: 19
						}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "mt-5 flex items-center justify-between gap-4",
							children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
								className: "text-xs text-muted-foreground",
								children: [active.runs.toLocaleString(), " runs all time"]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 193,
								columnNumber: 21
							}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", {
								onClick: () => toggleAutomation(active.id),
								className: "rounded-full px-5 py-2.5 text-xs font-medium",
								style: active.enabled ? { border: "1px solid var(--border)" } : {
									background: "var(--gradient-accent)",
									color: "var(--background)"
								},
								children: active.enabled ? "Turn off" : "Turn on"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 196,
								columnNumber: 21
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 192,
							columnNumber: 19
						}, this)] }, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 173,
							columnNumber: 25
						}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
							className: "mt-4 max-w-md text-sm text-muted-foreground",
							children: "Tap any node in the command center above to inspect its trigger, its action, and the goal it feeds — then turn it on right from here."
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 205,
							columnNumber: 23
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 158,
						columnNumber: 13
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "relative min-h-[220px] border-t border-border lg:border-l lg:border-t-0",
						children: [
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("img", {
								src: automation_live_feed_default,
								alt: "",
								"aria-hidden": true,
								className: cn("absolute inset-0 h-full w-full object-cover object-top transition-all duration-500", active?.enabled ? "opacity-70 saturate-100" : "opacity-30 saturate-0")
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 213,
								columnNumber: 15
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								"aria-hidden": true,
								className: "absolute inset-0",
								style: { background: "linear-gradient(180deg, oklch(0.145 0.018 258 / 20%), oklch(0.145 0.018 258 / 90%) 85%)" }
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 214,
								columnNumber: 15
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "absolute inset-x-3 top-3 flex items-center justify-between",
								children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
									className: "glass rounded-full px-2.5 py-1 font-display text-[9px] font-semibold uppercase tracking-widest",
									children: active ? active.id : "core"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 218,
									columnNumber: 17
								}, this)
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 217,
								columnNumber: 15
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "absolute inset-x-3 bottom-3 flex items-center gap-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
									className: "relative flex h-2 w-2 shrink-0",
									children: [active?.enabled ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { className: "animate-ripple absolute inset-0 rounded-full bg-cyan" }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 224,
										columnNumber: 38
									}, this) : null, /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { className: cn("relative h-2 w-2 rounded-full", active?.enabled ? "bg-cyan" : "bg-muted-foreground") }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 225,
										columnNumber: 19
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 223,
									columnNumber: 17
								}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
									className: "font-display text-[10px] font-semibold uppercase tracking-widest text-muted-foreground",
									children: "Live feed"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 227,
									columnNumber: 17
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 222,
								columnNumber: 15
							}, this)
						]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 212,
						columnNumber: 13
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 157,
					columnNumber: 11
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 156,
				columnNumber: 9
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 61,
		columnNumber: 7
	}, this) }, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 60,
		columnNumber: 10
	}, this);
}
//#endregion
export { AutomationsPage as component };
