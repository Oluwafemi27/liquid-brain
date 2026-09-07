import { a as __toESM } from "../_runtime.mjs";
import { t as motion } from "../_libs/framer-motion+[...].mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { t as require_jsx_dev_runtime } from "../_libs/react.mjs";
import { E as Minus, h as ShoppingBag, it as ArrowDownRight, rt as ArrowUpRight, s as Trophy } from "../_libs/lucide-react.mjs";
import { b as useAduf, c as PageHeader, h as WaterBar, o as GlassCard, t as AppShell } from "./app-shell-CAc38KbR.mjs";
import { i as useUsdRates, n as formatUsdCompact, r as toUsd } from "./currency-D8wRH1AH.mjs";
import { a as XAxis, c as Bar, d as ResponsiveContainer, f as Tooltip, i as YAxis, l as Pie, n as PieChart, o as Area, r as BarChart, s as CartesianGrid, t as AreaChart, u as Cell } from "../_libs/recharts+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/analytics-_7IF_bYl.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_dev_runtime = require_jsx_dev_runtime();
var _jsxFileName = "/root/app/code/src/routes/analytics.tsx?tsr-split=component";
var stageOrder = [
	"New",
	"Contacted",
	"Negotiation",
	"Won"
];
var stageColor = {
	New: "var(--chart-4)",
	Contacted: "var(--chart-3)",
	Negotiation: "var(--chart-2)",
	Won: "var(--chart-1)"
};
function TrendIcon({ trend }) {
	if (trend === "up") return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ArrowUpRight, { className: "h-3.5 w-3.5 text-cyan" }, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 21,
		columnNumber: 30
	}, this);
	if (trend === "down") return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ArrowDownRight, { className: "h-3.5 w-3.5 text-destructive" }, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 22,
		columnNumber: 32
	}, this);
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Minus, { className: "h-3.5 w-3.5 text-muted-foreground" }, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 23,
		columnNumber: 10
	}, this);
}
function EmptyPanel({ label }) {
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "flex h-full min-h-[120px] items-center justify-center text-center text-xs text-muted-foreground",
		children: label
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 30,
		columnNumber: 10
	}, this);
}
function AnalyticsPage() {
	const { series, deals, topCustomers, channelRevenue, funnel } = useAduf();
	const [spend, setSpend] = (0, import_react.useState)(50);
	const { rates } = useUsdRates();
	const usd = (ngnAmount) => formatUsdCompact(toUsd(ngnAmount, "NGN", rates));
	const dealsByStage = (0, import_react.useMemo)(() => {
		const grouped = {
			New: [],
			Contacted: [],
			Negotiation: [],
			Won: []
		};
		for (const d of deals) grouped[d.stage].push(d);
		return grouped;
	}, [deals]);
	const pipelineValue = (0, import_react.useMemo)(() => deals.filter((d) => d.stage !== "Won").reduce((sum, d) => sum + d.value, 0), [deals]);
	const wonValue = (0, import_react.useMemo)(() => deals.filter((d) => d.stage === "Won").reduce((sum, d) => sum + d.value, 0), [deals]);
	const predictedLeads = Math.round(spend * .46);
	const predictedSales = Math.round(spend * 1e3 * 3.4);
	const simulated = (0, import_react.useMemo)(() => series.map((p, i) => ({
		...p,
		projected: Math.round(p.sales * (1 + spend / 1e3 * (i / series.length)))
	})), [series, spend]);
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(AppShell, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:py-8",
		children: [
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(PageHeader, {
				eyebrow: "Analytics",
				title: "Reports & Simulation"
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 69,
				columnNumber: 9
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "grid gap-6 lg:grid-cols-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(GlassCard, {
						hover: false,
						className: "min-w-0",
						children: [
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h2", {
								className: "text-base font-semibold",
								children: "Sales trend"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 73,
								columnNumber: 13
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
								className: "mb-4 text-xs text-muted-foreground",
								children: "Last 6 months"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 74,
								columnNumber: 13
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "h-64",
								children: series.length === 0 ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(EmptyPanel, { label: "No sales data yet — connect a source to see the trend." }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 76,
									columnNumber: 38
								}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ResponsiveContainer, {
									width: "100%",
									height: "100%",
									children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(AreaChart, {
										data: series,
										children: [
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("defs", { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("linearGradient", {
												id: "water",
												x1: "0",
												y1: "0",
												x2: "0",
												y2: "1",
												children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("stop", {
													offset: "0%",
													stopColor: "white",
													stopOpacity: .45
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 80,
													columnNumber: 25
												}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("stop", {
													offset: "100%",
													stopColor: "white",
													stopOpacity: .02
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 81,
													columnNumber: 25
												}, this)]
											}, void 0, true, {
												fileName: _jsxFileName,
												lineNumber: 79,
												columnNumber: 23
											}, this) }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 78,
												columnNumber: 21
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CartesianGrid, {
												stroke: "var(--border)",
												vertical: false
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 84,
												columnNumber: 21
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(XAxis, {
												dataKey: "month",
												stroke: "var(--muted-foreground)",
												fontSize: 12
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 85,
												columnNumber: 21
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(YAxis, {
												stroke: "var(--muted-foreground)",
												fontSize: 12,
												tickFormatter: (v) => `${v / 1e3}k`
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 86,
												columnNumber: 21
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Tooltip, { contentStyle: {
												background: "var(--popover)",
												border: "1px solid var(--border)",
												borderRadius: 14,
												color: "var(--foreground)"
											} }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 87,
												columnNumber: 21
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Area, {
												type: "monotone",
												dataKey: "sales",
												stroke: "white",
												strokeWidth: 2,
												fill: "url(#water)",
												animationDuration: 1400
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 93,
												columnNumber: 21
											}, this)
										]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 77,
										columnNumber: 19
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 76,
									columnNumber: 118
								}, this)
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 75,
								columnNumber: 13
							}, this)
						]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 72,
						columnNumber: 11
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(GlassCard, {
						hover: false,
						className: "min-w-0",
						children: [
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h2", {
								className: "text-base font-semibold",
								children: "Leads by month"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 100,
								columnNumber: 13
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
								className: "mb-4 text-xs text-muted-foreground",
								children: "Qualified only"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 101,
								columnNumber: 13
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "h-64",
								children: series.length === 0 ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(EmptyPanel, { label: "No lead data yet — connect a source to see the trend." }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 103,
									columnNumber: 38
								}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ResponsiveContainer, {
									width: "100%",
									height: "100%",
									children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(BarChart, {
										data: series,
										children: [
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("defs", { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("linearGradient", {
												id: "waterBar",
												x1: "0",
												y1: "0",
												x2: "0",
												y2: "1",
												children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("stop", {
													offset: "0%",
													stopColor: "white",
													stopOpacity: .75
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 107,
													columnNumber: 25
												}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("stop", {
													offset: "100%",
													stopColor: "white",
													stopOpacity: .12
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 108,
													columnNumber: 25
												}, this)]
											}, void 0, true, {
												fileName: _jsxFileName,
												lineNumber: 106,
												columnNumber: 23
											}, this) }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 105,
												columnNumber: 21
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CartesianGrid, {
												stroke: "var(--border)",
												vertical: false
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 111,
												columnNumber: 21
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(XAxis, {
												dataKey: "month",
												stroke: "var(--muted-foreground)",
												fontSize: 12
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 112,
												columnNumber: 21
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(YAxis, {
												stroke: "var(--muted-foreground)",
												fontSize: 12
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 113,
												columnNumber: 21
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Tooltip, { contentStyle: {
												background: "var(--popover)",
												border: "1px solid var(--border)",
												borderRadius: 14,
												color: "var(--foreground)"
											} }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 114,
												columnNumber: 21
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Bar, {
												dataKey: "leads",
												fill: "url(#waterBar)",
												radius: [
													10,
													10,
													4,
													4
												],
												animationDuration: 1400
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 120,
												columnNumber: 21
											}, this)
										]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 104,
										columnNumber: 19
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 103,
									columnNumber: 117
								}, this)
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 102,
								columnNumber: 13
							}, this)
						]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 99,
						columnNumber: 11
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(GlassCard, {
						hover: false,
						className: "min-w-0 lg:col-span-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h2", {
								className: "text-base font-semibold",
								children: "What If Simulator"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 127,
								columnNumber: 13
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
								className: "mb-5 text-xs text-muted-foreground",
								children: "Drag to model a change before you spend a dollar."
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 128,
								columnNumber: 13
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]",
								children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("label", {
										className: "text-sm",
										htmlFor: "spend",
										children: [
											"Increase Ad Spend by",
											" ",
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
												className: "font-display font-semibold",
												children: usd(spend * 1e3)
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 136,
												columnNumber: 19
											}, this)
										]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 134,
										columnNumber: 17
									}, this),
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("input", {
										id: "spend",
										type: "range",
										min: 0,
										max: 200,
										step: 5,
										value: spend,
										onChange: (e) => setSpend(Number(e.target.value)),
										className: "mt-3 w-full accent-white"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 138,
										columnNumber: 17
									}, this),
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
										className: "mt-5 space-y-4",
										children: [
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
												className: "rounded-2xl bg-white/6 p-4",
												children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
													className: "text-xs text-muted-foreground",
													children: "Predicted leads"
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 141,
													columnNumber: 21
												}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(motion.p, {
													initial: {
														opacity: 0,
														y: 6
													},
													animate: {
														opacity: 1,
														y: 0
													},
													className: "font-display text-2xl font-semibold",
													children: ["+", predictedLeads]
												}, predictedLeads, true, {
													fileName: _jsxFileName,
													lineNumber: 142,
													columnNumber: 21
												}, this)]
											}, void 0, true, {
												fileName: _jsxFileName,
												lineNumber: 140,
												columnNumber: 19
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
												className: "rounded-2xl bg-white/6 p-4",
												children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
													className: "text-xs text-muted-foreground",
													children: "Predicted sales lift"
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 153,
													columnNumber: 21
												}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(motion.p, {
													initial: {
														opacity: 0,
														y: 6
													},
													animate: {
														opacity: 1,
														y: 0
													},
													className: "font-display text-2xl font-semibold",
													children: ["+", usd(predictedSales)]
												}, predictedSales, true, {
													fileName: _jsxFileName,
													lineNumber: 154,
													columnNumber: 21
												}, this)]
											}, void 0, true, {
												fileName: _jsxFileName,
												lineNumber: 152,
												columnNumber: 19
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(WaterBar, {
												label: "Model confidence",
												value: Math.max(30, 92 - spend / 4)
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 164,
												columnNumber: 19
											}, this)
										]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 139,
										columnNumber: 17
									}, this)
								] }, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 133,
									columnNumber: 15
								}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
									className: "h-72 min-w-0",
									children: series.length === 0 ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(EmptyPanel, { label: "Connect a data source to model projections against real history." }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 169,
										columnNumber: 40
									}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ResponsiveContainer, {
										width: "100%",
										height: "100%",
										children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(AreaChart, {
											data: simulated,
											children: [
												/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CartesianGrid, {
													stroke: "var(--border)",
													vertical: false
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 171,
													columnNumber: 23
												}, this),
												/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(XAxis, {
													dataKey: "month",
													stroke: "var(--muted-foreground)",
													fontSize: 12
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 172,
													columnNumber: 23
												}, this),
												/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(YAxis, {
													stroke: "var(--muted-foreground)",
													fontSize: 12,
													tickFormatter: (v) => `${v / 1e3}k`
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 173,
													columnNumber: 23
												}, this),
												/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Tooltip, { contentStyle: {
													background: "var(--popover)",
													border: "1px solid var(--border)",
													borderRadius: 14,
													color: "var(--foreground)"
												} }, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 174,
													columnNumber: 23
												}, this),
												/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Area, {
													type: "monotone",
													dataKey: "sales",
													stroke: "var(--muted-foreground)",
													strokeWidth: 1.5,
													fill: "none"
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 180,
													columnNumber: 23
												}, this),
												/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Area, {
													type: "monotone",
													dataKey: "projected",
													stroke: "white",
													strokeWidth: 2.5,
													fill: "url(#water)",
													animationDuration: 700
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 181,
													columnNumber: 23
												}, this)
											]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 170,
											columnNumber: 21
										}, this)
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 169,
										columnNumber: 130
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 168,
									columnNumber: 15
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 132,
								columnNumber: 13
							}, this)
						]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 126,
						columnNumber: 11
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 71,
				columnNumber: 9
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "mt-10",
				children: [
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "mb-5 flex flex-wrap items-end justify-between gap-3",
						children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h2", {
							className: "text-lg font-semibold sm:text-xl",
							children: "CRM Board"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 192,
							columnNumber: 15
						}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
							className: "text-xs text-muted-foreground",
							children: "Live pipeline, revenue mix and your best customers."
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 193,
							columnNumber: 15
						}, this)] }, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 191,
							columnNumber: 13
						}, this)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 190,
						columnNumber: 11
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "grid gap-6 lg:grid-cols-3",
						children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(GlassCard, {
							hover: false,
							className: "min-w-0 lg:col-span-2",
							children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "mb-4 flex flex-wrap items-center justify-between gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", {
									className: "text-base font-semibold",
									children: "Deal Pipeline"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 203,
									columnNumber: 19
								}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
									className: "text-xs text-muted-foreground",
									children: [
										deals.length,
										" active deals · ",
										usd(pipelineValue),
										" in motion"
									]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 204,
									columnNumber: 19
								}, this)] }, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 202,
									columnNumber: 17
								}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
									className: "flex items-center gap-1.5 rounded-full bg-white/6 px-3 py-1.5 text-[11px] text-muted-foreground",
									children: [
										/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Trophy, { className: "h-3.5 w-3.5 text-cyan" }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 209,
											columnNumber: 19
										}, this),
										usd(wonValue),
										" won this month"
									]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 208,
									columnNumber: 17
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 201,
								columnNumber: 15
							}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "grid gap-3 sm:grid-cols-2 xl:grid-cols-4",
								children: deals.length === 0 ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
									className: "sm:col-span-2 xl:col-span-4",
									children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(EmptyPanel, { label: "No deals yet — connect a CRM source to see your pipeline." }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 216,
										columnNumber: 21
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 215,
									columnNumber: 39
								}, this) : stageOrder.map((stage, colIdx) => {
									const stageDeals = dealsByStage[stage];
									const stageTotal = stageDeals.reduce((s, d) => s + d.value, 0);
									return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(motion.div, {
										initial: {
											opacity: 0,
											y: 10
										},
										animate: {
											opacity: 1,
											y: 0
										},
										transition: { delay: colIdx * .06 },
										className: "min-w-0 rounded-2xl bg-white/[0.04] p-2.5",
										children: [
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
												className: "mb-2.5 flex items-center justify-between px-1",
												children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
													className: "flex items-center gap-1.5",
													children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
														className: "h-2 w-2 rounded-full",
														style: { background: stageColor[stage] }
													}, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 231,
														columnNumber: 29
													}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
														className: "text-xs font-medium",
														children: stage
													}, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 234,
														columnNumber: 29
													}, this)]
												}, void 0, true, {
													fileName: _jsxFileName,
													lineNumber: 230,
													columnNumber: 27
												}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
													className: "text-[10px] text-muted-foreground",
													children: stageDeals.length
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 236,
													columnNumber: 27
												}, this)]
											}, void 0, true, {
												fileName: _jsxFileName,
												lineNumber: 229,
												columnNumber: 25
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
												className: "mb-2 px-1 text-[10px] text-muted-foreground",
												children: usd(stageTotal)
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 240,
												columnNumber: 25
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
												className: "space-y-2",
												children: stageDeals.map((deal) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
													className: "glass-hover rounded-xl bg-white/[0.06] p-2.5",
													children: [
														/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
															className: "truncate text-xs font-medium",
															children: deal.company
														}, void 0, false, {
															fileName: _jsxFileName,
															lineNumber: 245,
															columnNumber: 31
														}, this),
														/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
															className: "truncate text-[10px] text-muted-foreground",
															children: deal.name
														}, void 0, false, {
															fileName: _jsxFileName,
															lineNumber: 246,
															columnNumber: 31
														}, this),
														/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
															className: "mt-2 flex items-center justify-between",
															children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
																className: "text-[11px] font-semibold",
																children: usd(deal.value)
															}, void 0, false, {
																fileName: _jsxFileName,
																lineNumber: 250,
																columnNumber: 33
															}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
																className: "rounded-full px-1.5 py-0.5 text-[9px]",
																style: { background: `color-mix(in oklab, ${stageColor[stage]} 22%, transparent)` },
																children: [deal.probability, "%"]
															}, void 0, true, {
																fileName: _jsxFileName,
																lineNumber: 251,
																columnNumber: 33
															}, this)]
														}, void 0, true, {
															fileName: _jsxFileName,
															lineNumber: 249,
															columnNumber: 31
														}, this)
													]
												}, deal.id, true, {
													fileName: _jsxFileName,
													lineNumber: 244,
													columnNumber: 51
												}, this))
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 243,
												columnNumber: 25
											}, this)
										]
									}, stage, true, {
										fileName: _jsxFileName,
										lineNumber: 220,
										columnNumber: 24
									}, this);
								})
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 214,
								columnNumber: 15
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 200,
							columnNumber: 13
						}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(GlassCard, {
							hover: false,
							className: "min-w-0",
							children: [
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", {
									className: "text-base font-semibold",
									children: "Revenue by Channel"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 265,
									columnNumber: 15
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
									className: "mb-2 text-xs text-muted-foreground",
									children: "Share of last 30 days"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 266,
									columnNumber: 15
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
									className: "h-48",
									children: channelRevenue.length === 0 ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(EmptyPanel, { label: "No channel data yet." }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 268,
										columnNumber: 48
									}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ResponsiveContainer, {
										width: "100%",
										height: "100%",
										children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(PieChart, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Pie, {
											data: channelRevenue,
											dataKey: "value",
											nameKey: "channel",
											innerRadius: 52,
											outerRadius: 78,
											paddingAngle: 3,
											animationDuration: 1e3,
											children: channelRevenue.map((entry) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Cell, {
												fill: entry.color,
												stroke: "none"
											}, entry.channel, false, {
												fileName: _jsxFileName,
												lineNumber: 271,
												columnNumber: 54
											}, this))
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 270,
											columnNumber: 23
										}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Tooltip, {
											contentStyle: {
												background: "var(--popover)",
												border: "1px solid var(--border)",
												borderRadius: 14,
												color: "var(--foreground)"
											},
											formatter: (value) => [`${value}%`, ""]
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 273,
											columnNumber: 23
										}, this)] }, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 269,
											columnNumber: 21
										}, this)
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 268,
										columnNumber: 94
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 267,
									columnNumber: 15
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
									className: "mt-1 grid grid-cols-2 gap-2",
									children: channelRevenue.map((c) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
										className: "flex items-center gap-1.5 text-[11px]",
										children: [
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
												className: "h-2 w-2 shrink-0 rounded-full",
												style: { background: c.color }
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 284,
												columnNumber: 21
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
												className: "truncate text-muted-foreground",
												children: c.channel
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 287,
												columnNumber: 21
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
												className: "ml-auto font-medium",
												children: [c.value, "%"]
											}, void 0, true, {
												fileName: _jsxFileName,
												lineNumber: 288,
												columnNumber: 21
											}, this)
										]
									}, c.channel, true, {
										fileName: _jsxFileName,
										lineNumber: 283,
										columnNumber: 42
									}, this))
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 282,
									columnNumber: 15
								}, this)
							]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 264,
							columnNumber: 13
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 199,
						columnNumber: 11
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "mt-6 grid gap-6 lg:grid-cols-3",
						children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(GlassCard, {
							hover: false,
							className: "min-w-0 lg:col-span-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", {
									className: "text-base font-semibold",
									children: "Top Customers"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 296,
									columnNumber: 15
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
									className: "mb-4 text-xs text-muted-foreground",
									children: "Ranked by lifetime value"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 297,
									columnNumber: 15
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
									className: "space-y-2.5",
									children: topCustomers.length === 0 ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(EmptyPanel, { label: "No customers yet — connect a commerce source to rank them here." }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 299,
										columnNumber: 46
									}, this) : topCustomers.map((c, i) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(motion.div, {
										initial: {
											opacity: 0,
											x: -8
										},
										animate: {
											opacity: 1,
											x: 0
										},
										transition: { delay: i * .05 },
										className: "flex items-center gap-3 rounded-2xl bg-white/[0.04] p-3",
										children: [
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
												className: "grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-semibold text-background",
												style: { background: "var(--gradient-accent)" },
												children: ["#", i + 1]
											}, void 0, true, {
												fileName: _jsxFileName,
												lineNumber: 308,
												columnNumber: 23
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
												className: "min-w-0 flex-1",
												children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
													className: "flex items-center justify-between gap-2",
													children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
														className: "truncate text-sm font-medium",
														children: c.name
													}, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 315,
														columnNumber: 27
													}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
														className: "shrink-0 text-sm font-semibold",
														children: usd(c.ltv)
													}, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 316,
														columnNumber: 27
													}, this)]
												}, void 0, true, {
													fileName: _jsxFileName,
													lineNumber: 314,
													columnNumber: 25
												}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
													className: "mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground",
													children: [
														/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
															className: "truncate",
															children: c.segment
														}, void 0, false, {
															fileName: _jsxFileName,
															lineNumber: 319,
															columnNumber: 27
														}, this),
														/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { children: "·" }, void 0, false, {
															fileName: _jsxFileName,
															lineNumber: 320,
															columnNumber: 27
														}, this),
														/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
															className: "flex items-center gap-0.5",
															children: [
																/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ShoppingBag, { className: "h-3 w-3" }, void 0, false, {
																	fileName: _jsxFileName,
																	lineNumber: 322,
																	columnNumber: 29
																}, this),
																c.orders,
																" orders"
															]
														}, void 0, true, {
															fileName: _jsxFileName,
															lineNumber: 321,
															columnNumber: 27
														}, this),
														/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { children: "·" }, void 0, false, {
															fileName: _jsxFileName,
															lineNumber: 325,
															columnNumber: 27
														}, this),
														/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
															className: "truncate",
															children: c.lastOrder
														}, void 0, false, {
															fileName: _jsxFileName,
															lineNumber: 326,
															columnNumber: 27
														}, this)
													]
												}, void 0, true, {
													fileName: _jsxFileName,
													lineNumber: 318,
													columnNumber: 25
												}, this)]
											}, void 0, true, {
												fileName: _jsxFileName,
												lineNumber: 313,
												columnNumber: 23
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TrendIcon, { trend: c.trend }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 329,
												columnNumber: 23
											}, this)
										]
									}, c.id, true, {
										fileName: _jsxFileName,
										lineNumber: 299,
										columnNumber: 162
									}, this))
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 298,
									columnNumber: 15
								}, this)
							]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 295,
							columnNumber: 13
						}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(GlassCard, {
							hover: false,
							className: "min-w-0",
							children: [
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", {
									className: "text-base font-semibold",
									children: "Conversion Funnel"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 335,
									columnNumber: 15
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
									className: "mb-4 text-xs text-muted-foreground",
									children: "Lead to won, this quarter"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 336,
									columnNumber: 15
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
									className: "space-y-4",
									children: funnel.length === 0 ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(EmptyPanel, { label: "No funnel data yet." }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 338,
										columnNumber: 40
									}, this) : funnel.map((stage, i) => {
										const pct = Math.round(stage.value / funnel[0].value * 100);
										return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(WaterBar, {
											label: `${stage.label} · ${stage.value.toLocaleString()}`,
											value: pct
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 341,
											columnNumber: 25
										}, this), i < funnel.length - 1 ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
											className: "mt-1 pl-1 text-[10px] text-muted-foreground",
											children: [Math.round(funnel[i + 1].value / stage.value * 100), "% moved forward"]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 342,
											columnNumber: 50
										}, this) : null] }, stage.label, true, {
											fileName: _jsxFileName,
											lineNumber: 340,
											columnNumber: 24
										}, this);
									})
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 337,
									columnNumber: 15
								}, this)
							]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 334,
							columnNumber: 13
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 294,
						columnNumber: 11
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 189,
				columnNumber: 9
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 68,
		columnNumber: 7
	}, this) }, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 67,
		columnNumber: 10
	}, this);
}
//#endregion
export { AnalyticsPage as component };
