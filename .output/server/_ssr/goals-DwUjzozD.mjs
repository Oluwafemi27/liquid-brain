import { a as __toESM } from "../_runtime.mjs";
import { t as motion } from "../_libs/framer-motion+[...].mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { t as require_jsx_dev_runtime } from "../_libs/react.mjs";
import { Y as ChartColumn, b as Plus, d as Target, q as Check, s as Trophy } from "../_libs/lucide-react.mjs";
import { b as useAduf, c as PageHeader, g as WaterOrb, o as GlassCard, t as AppShell } from "./app-shell-CAc38KbR.mjs";
import { i as useUsdRates, r as toUsd, t as formatUsd } from "./currency-D8wRH1AH.mjs";
import { a as XAxis, c as Bar, d as ResponsiveContainer, f as Tooltip, i as YAxis, r as BarChart, u as Cell } from "../_libs/recharts+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/goals-DwUjzozD.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_dev_runtime = require_jsx_dev_runtime();
var _jsxFileName = "/root/app/code/src/routes/goals.tsx?tsr-split=component";
function GoalsPage() {
	const { goals, toggleSubTask, bumpGoal, addGoal } = useAduf();
	const { rates } = useUsdRates();
	const formatGoalAmount = (amount, currency) => currency ? formatUsd(toUsd(amount, currency, rates)) : amount.toLocaleString();
	const [creating, setCreating] = (0, import_react.useState)(false);
	const [title, setTitle] = (0, import_react.useState)("");
	const [target, setTarget] = (0, import_react.useState)("100");
	const goalPct = (g) => g.target > 0 ? Math.min(999, Math.round(g.current / g.target * 100)) : 0;
	const completed = goals.filter((g) => goalPct(g) >= 100);
	const inProgress = goals.filter((g) => goalPct(g) > 0 && goalPct(g) < 100);
	const notStarted = goals.filter((g) => goalPct(g) <= 0);
	const avgCompletion = goals.length ? Math.round(goals.reduce((sum, g) => sum + Math.min(100, goalPct(g)), 0) / goals.length) : 0;
	const healthBuckets = [
		{
			label: "Completed",
			count: completed.length,
			color: "bg-emerald-300"
		},
		{
			label: "In progress",
			count: inProgress.length,
			color: "bg-cyan-300"
		},
		{
			label: "Not started",
			count: notStarted.length,
			color: "bg-white/25"
		}
	].filter((b) => b.count > 0);
	const goalAnalytics = (0, import_react.useMemo)(() => goals.map((goal) => ({
		label: goal.title,
		progress: Math.min(100, goalPct(goal)),
		current: goal.current,
		target: goal.target
	})), [goals]);
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(AppShell, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:py-8",
		children: [
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(PageHeader, {
				eyebrow: "Goals Engine",
				title: "What we're chasing",
				children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", {
					onClick: () => setCreating((c) => !c),
					className: "flex items-center gap-1.5 rounded-full px-4 py-2.5 text-xs font-medium text-background transition-transform hover:scale-[1.03]",
					style: { background: "var(--gradient-accent)" },
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Plus, { className: "h-4 w-4" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 57,
						columnNumber: 13
					}, this), " New Goal"]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 54,
					columnNumber: 11
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 53,
				columnNumber: 9
			}, this),
			creating ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(GlassCard, {
				hover: false,
				className: "mb-6",
				children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("form", {
					onSubmit: (e) => {
						e.preventDefault();
						if (!title.trim()) return;
						addGoal(title.trim(), Number(target) || 100);
						setTitle("");
						setCreating(false);
					},
					className: "flex flex-col gap-3 sm:flex-row",
					children: [
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("input", {
							value: title,
							onChange: (e) => setTitle(e.target.value),
							placeholder: "Goal name, e.g. ₦5,000,000 in Sales",
							className: "min-w-0 flex-1 rounded-full bg-white/8 px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 69,
							columnNumber: 15
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("input", {
							value: target,
							onChange: (e) => setTarget(e.target.value),
							inputMode: "numeric",
							placeholder: "Target",
							className: "w-full rounded-full bg-white/8 px-4 py-2.5 text-sm outline-none sm:w-32 focus:ring-2 focus:ring-ring"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 70,
							columnNumber: 15
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", {
							type: "submit",
							className: "rounded-full px-5 py-2.5 text-xs font-medium text-background",
							style: { background: "var(--gradient-accent)" },
							children: "Create"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 71,
							columnNumber: 15
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 62,
					columnNumber: 13
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 61,
				columnNumber: 21
			}, this) : null,
			goals.length > 0 ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(GlassCard, {
				hover: false,
				className: "mb-6 min-w-0 p-4 sm:p-5",
				children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "mb-4 flex flex-wrap items-end justify-between gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
						className: "text-[10px] uppercase tracking-[0.16em] text-muted-foreground",
						children: "Live analytics"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 82,
						columnNumber: 17
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h2", {
						className: "mt-1 text-base font-semibold",
						children: "Goal completion"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 85,
						columnNumber: 17
					}, this)] }, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 81,
						columnNumber: 15
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
						className: "text-xs text-muted-foreground",
						children: "Updates as progress is logged"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 87,
						columnNumber: 15
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 80,
					columnNumber: 13
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "h-52 sm:h-64",
					children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ResponsiveContainer, {
						width: "100%",
						height: "100%",
						children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(BarChart, {
							data: goalAnalytics,
							layout: "vertical",
							margin: {
								left: 0,
								right: 12
							},
							children: [
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(XAxis, {
									type: "number",
									domain: [0, 100],
									hide: true
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 95,
									columnNumber: 19
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(YAxis, {
									type: "category",
									dataKey: "label",
									width: 88,
									tick: {
										fill: "var(--muted-foreground)",
										fontSize: 11
									},
									tickFormatter: (value) => value.length > 14 ? `${value.slice(0, 14)}…` : value
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 96,
									columnNumber: 19
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Tooltip, {
									cursor: { fill: "rgba(255,255,255,0.04)" },
									contentStyle: {
										background: "var(--popover)",
										border: "1px solid var(--border)",
										borderRadius: 12,
										color: "var(--foreground)"
									},
									formatter: (value, _name, item) => [`${value}% · ${item.payload.current.toLocaleString()} of ${item.payload.target.toLocaleString()}`, "Progress"]
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 100,
									columnNumber: 19
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Bar, {
									dataKey: "progress",
									radius: [
										0,
										8,
										8,
										0
									],
									animationDuration: 600,
									children: goalAnalytics.map((goal) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Cell, { fill: goal.progress >= 100 ? "var(--chart-1)" : "var(--cyan)" }, goal.label, false, {
										fileName: _jsxFileName,
										lineNumber: 109,
										columnNumber: 48
									}, this))
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 108,
									columnNumber: 19
								}, this)
							]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 91,
							columnNumber: 17
						}, this)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 90,
						columnNumber: 15
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 89,
					columnNumber: 13
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 79,
				columnNumber: 29
			}, this) : null,
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "grid gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-3",
				children: [goals.length === 0 ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
					className: "col-span-full py-10 text-center text-sm text-muted-foreground",
					children: "No goals yet — set one with \"New Goal\" and ADUF will help you track it."
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 117,
					columnNumber: 33
				}, this) : null, goals.map((goal, i) => {
					const pct = goalPct(goal);
					const complete = pct >= 100;
					return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(GlassCard, {
						delay: i * .06,
						className: "flex flex-col",
						children: [
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "flex flex-col items-center text-center",
								children: [
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(WaterOrb, {
										fill: pct,
										size: 144,
										burst: complete,
										children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
											className: "font-display text-2xl font-semibold sm:text-3xl",
											children: [pct, "%"]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 126,
											columnNumber: 21
										}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
											className: "mt-0.5 text-[11px] text-muted-foreground",
											children: ["due ", goal.due]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 127,
											columnNumber: 21
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 125,
										columnNumber: 19
									}, this),
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", {
										className: "mt-4 text-base font-semibold",
										children: goal.title
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 129,
										columnNumber: 19
									}, this),
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
										className: "mt-1 text-xs text-muted-foreground",
										children: [
											formatGoalAmount(goal.current, goal.currency),
											" of",
											" ",
											formatGoalAmount(goal.target, goal.currency)
										]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 130,
										columnNumber: 19
									}, this)
								]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 124,
								columnNumber: 17
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("ul", {
								className: "mt-5 flex-1 space-y-2",
								children: [goal.subTasks.length === 0 ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", {
									className: "text-xs text-muted-foreground",
									children: "No sub-tasks yet — ADUF will propose a plan."
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 137,
									columnNumber: 49
								}, this) : null, goal.subTasks.map((t) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", {
									onClick: () => toggleSubTask(goal.id, t.id),
									className: "flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left text-sm transition-colors hover:bg-white/8",
									children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
										className: "grid h-5 w-5 shrink-0 place-items-center rounded-md border border-border",
										style: t.done ? { background: "var(--gradient-accent)" } : void 0,
										children: t.done ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Check, { className: "h-3.5 w-3.5 text-background" }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 145,
											columnNumber: 37
										}, this) : null
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 142,
										columnNumber: 25
									}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
										className: t.done ? "text-muted-foreground line-through" : void 0,
										children: t.label
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 147,
										columnNumber: 25
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 141,
									columnNumber: 23
								}, this) }, t.id, false, {
									fileName: _jsxFileName,
									lineNumber: 140,
									columnNumber: 43
								}, this))]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 136,
								columnNumber: 17
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "mt-4 flex gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", {
									onClick: () => bumpGoal(goal.id, Math.round(goal.target * .1)),
									className: "flex-1 rounded-full border border-border px-3 py-2 text-xs text-muted-foreground hover:bg-white/8 hover:text-foreground",
									children: "Log progress"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 155,
									columnNumber: 19
								}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(motion.button, {
									whileTap: { scale: .96 },
									className: "flex-1 rounded-full px-3 py-2 text-xs font-medium text-background",
									style: { background: "var(--gradient-accent)" },
									children: "Edit Plan"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 158,
									columnNumber: 19
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 154,
								columnNumber: 17
							}, this)
						]
					}, goal.id, true, {
						fileName: _jsxFileName,
						lineNumber: 123,
						columnNumber: 18
					}, this);
				})]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 116,
				columnNumber: 9
			}, this),
			goals.length > 0 ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("section", {
				className: "mt-8 space-y-4",
				"aria-labelledby": "momentum-heading",
				children: [
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
						className: "text-xs uppercase tracking-[0.16em] text-muted-foreground",
						children: "Momentum"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 172,
						columnNumber: 15
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h2", {
						id: "momentum-heading",
						className: "mt-1 text-xl font-semibold",
						children: "Where you stand"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 173,
						columnNumber: 15
					}, this)] }, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 171,
						columnNumber: 13
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "grid gap-4 md:grid-cols-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(GlassCard, {
								className: "flex items-center gap-4 p-5",
								children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
									className: "grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-amber-400/15 text-amber-300",
									children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Trophy, { className: "h-5 w-5" }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 180,
										columnNumber: 19
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 179,
									columnNumber: 17
								}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
									className: "text-2xl font-semibold",
									children: completed.length
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 183,
									columnNumber: 19
								}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
									className: "text-xs text-muted-foreground",
									children: completed.length === 1 ? "Goal completed" : "Goals completed"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 184,
									columnNumber: 19
								}, this)] }, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 182,
									columnNumber: 17
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 178,
								columnNumber: 15
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(GlassCard, {
								className: "flex items-center gap-4 p-5",
								children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
									className: "grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-400/15 text-emerald-300",
									children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Target, { className: "h-5 w-5" }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 191,
										columnNumber: 19
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 190,
									columnNumber: 17
								}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
									className: "text-2xl font-semibold",
									children: [avgCompletion, "%"]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 194,
									columnNumber: 19
								}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
									className: "text-xs text-muted-foreground",
									children: "Average goal completion"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 195,
									columnNumber: 19
								}, this)] }, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 193,
									columnNumber: 17
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 189,
								columnNumber: 15
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(GlassCard, {
								className: "flex items-center gap-4 p-5",
								children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
									className: "grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-cyan-400/15 text-cyan-300",
									children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ChartColumn, { className: "h-5 w-5" }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 200,
										columnNumber: 19
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 199,
									columnNumber: 17
								}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
									className: "text-2xl font-semibold",
									children: goals.length
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 203,
									columnNumber: 19
								}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
									className: "text-xs text-muted-foreground",
									children: "Active goals"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 204,
									columnNumber: 19
								}, this)] }, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 202,
									columnNumber: 17
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 198,
								columnNumber: 15
							}, this)
						]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 177,
						columnNumber: 13
					}, this),
					completed.length > 0 ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(GlassCard, {
						className: "grid gap-4 p-5 sm:grid-cols-3",
						children: completed.slice(0, 6).map((g) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "flex items-center gap-3 rounded-2xl bg-white/5 p-3",
							children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
								className: "grid h-9 w-9 shrink-0 place-items-center rounded-full border border-cyan-300/35 text-cyan-300",
								children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Check, { className: "h-4 w-4" }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 212,
									columnNumber: 23
								}, this)
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 211,
								columnNumber: 21
							}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "min-w-0",
								children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
									className: "truncate text-sm font-medium",
									children: g.title
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 215,
									columnNumber: 23
								}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
									className: "text-[11px] text-muted-foreground",
									children: "Target reached"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 216,
									columnNumber: 23
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 214,
								columnNumber: 21
							}, this)]
						}, g.id, true, {
							fileName: _jsxFileName,
							lineNumber: 210,
							columnNumber: 49
						}, this))
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 209,
						columnNumber: 37
					}, this) : null,
					healthBuckets.length > 0 ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(GlassCard, {
						className: "p-5",
						children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "flex items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Target, { className: "h-4 w-4 text-violet-300" }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 223,
								columnNumber: 19
							}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", {
								className: "text-sm font-semibold",
								children: "Goal breakdown"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 224,
								columnNumber: 19
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 222,
							columnNumber: 17
						}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "mt-5 space-y-5",
							children: healthBuckets.map((bucket) => {
								const width = `${Math.round(bucket.count / goals.length * 100)}%`;
								return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
									className: "mb-2 flex justify-between text-xs",
									children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { children: bucket.label }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 231,
										columnNumber: 27
									}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
										className: "text-muted-foreground",
										children: [
											bucket.count,
											" ",
											bucket.count === 1 ? "goal" : "goals"
										]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 232,
										columnNumber: 27
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 230,
									columnNumber: 25
								}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
									className: "h-2 rounded-full bg-white/8",
									children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
										className: `h-full rounded-full ${bucket.color}`,
										style: { width }
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 237,
										columnNumber: 27
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 236,
									columnNumber: 25
								}, this)] }, bucket.label, true, {
									fileName: _jsxFileName,
									lineNumber: 229,
									columnNumber: 22
								}, this);
							})
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 226,
							columnNumber: 17
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 221,
						columnNumber: 41
					}, this) : null
				]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 170,
				columnNumber: 29
			}, this) : null
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 52,
		columnNumber: 7
	}, this) }, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 51,
		columnNumber: 10
	}, this);
}
//#endregion
export { GoalsPage as component };
