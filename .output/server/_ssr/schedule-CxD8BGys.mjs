import { a as __toESM } from "../_runtime.mjs";
import { t as motion } from "../_libs/framer-motion+[...].mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { t as require_jsx_dev_runtime } from "../_libs/react.mjs";
import { C as PenLine, S as Phone, V as Clock, X as CalendarClock, b as Plus, i as Users, k as Megaphone, q as Check, r as Waves, u as Trash2 } from "../_libs/lucide-react.mjs";
import { _ as cn, b as useAduf, c as PageHeader, o as GlassCard, t as AppShell } from "./app-shell-CaedC11b.mjs";
import { n as startOfWeek, r as addDays, t as format } from "../_libs/date-fns.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/schedule-CxD8BGys.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_dev_runtime = require_jsx_dev_runtime();
var _jsxFileName = "/root/app/code/src/routes/schedule.tsx?tsr-split=component";
var WEEKDAYS = [
	"Mon",
	"Tue",
	"Wed",
	"Thu",
	"Fri",
	"Sat",
	"Sun"
];
var CATEGORY_META = {
	meeting: {
		label: "Meeting",
		color: "var(--chart-2)",
		icon: Users
	},
	content: {
		label: "Content",
		color: "var(--chart-3)",
		icon: PenLine
	},
	campaign: {
		label: "Campaign",
		color: "var(--chart-1)",
		icon: Megaphone
	},
	automation: {
		label: "Automation",
		color: "var(--cyan)",
		icon: Waves
	},
	followup: {
		label: "Follow-up",
		color: "var(--chart-4)",
		icon: Phone
	},
	other: {
		label: "Other",
		color: "var(--chart-5)",
		icon: CalendarClock
	}
};
/** "14:05" -> "2:05 PM" */
function formatTime(t) {
	const [hStr, mStr] = t.split(":");
	let h = Number(hStr);
	const ampm = h >= 12 ? "PM" : "AM";
	h = h % 12 || 12;
	return `${h}:${(mStr ?? "00").padStart(2, "0")} ${ampm}`;
}
function minutesOf(t) {
	const [h, m] = t.split(":").map(Number);
	return (h ?? 0) * 60 + (m ?? 0);
}
var inputClass = "min-w-0 rounded-full bg-white/8 px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring [color-scheme:dark]";
function SchedulePage() {
	const { scheduleEvents, addScheduleEvent, toggleScheduleEventDone, removeScheduleEvent } = useAduf();
	const weekStart = (0, import_react.useMemo)(() => startOfWeek(/* @__PURE__ */ new Date(), { weekStartsOn: 1 }), []);
	const weekDates = (0, import_react.useMemo)(() => WEEKDAYS.map((_, i) => addDays(weekStart, i)), [weekStart]);
	const todayLabel = format(/* @__PURE__ */ new Date(), "EEE");
	const [selectedDay, setSelectedDay] = (0, import_react.useState)(todayLabel);
	const [creating, setCreating] = (0, import_react.useState)(false);
	const [title, setTitle] = (0, import_react.useState)("");
	const [day, setDay] = (0, import_react.useState)(todayLabel);
	const [startTime, setStartTime] = (0, import_react.useState)("09:00");
	const [endTime, setEndTime] = (0, import_react.useState)("10:00");
	const [category, setCategory] = (0, import_react.useState)("meeting");
	const [notes, setNotes] = (0, import_react.useState)("");
	const eventsByDay = (0, import_react.useMemo)(() => {
		const map = /* @__PURE__ */ new Map();
		for (const d of WEEKDAYS) map.set(d, []);
		for (const e of scheduleEvents) map.get(e.day)?.push(e);
		for (const d of WEEKDAYS) map.get(d)?.sort((a, b) => minutesOf(a.startTime) - minutesOf(b.startTime));
		return map;
	}, [scheduleEvents]);
	const dayEvents = eventsByDay.get(selectedDay) ?? [];
	/** Nearest upcoming event across the whole week from right now. */
	const upNext = (0, import_react.useMemo)(() => {
		if (scheduleEvents.length === 0) return null;
		const todayIdx = WEEKDAYS.indexOf(todayLabel);
		const nowMinutes = (/* @__PURE__ */ new Date()).getHours() * 60 + (/* @__PURE__ */ new Date()).getMinutes();
		let best = null;
		for (const e of scheduleEvents) {
			if (e.done) continue;
			let daysAhead = (WEEKDAYS.indexOf(e.day) - todayIdx + 7) % 7;
			if (daysAhead === 0 && minutesOf(e.startTime) < nowMinutes) daysAhead = 7;
			const rank = daysAhead * 1440 + minutesOf(e.startTime);
			if (!best || rank < best.rank) best = {
				event: e,
				rank
			};
		}
		return best?.event ?? null;
	}, [scheduleEvents, todayLabel]);
	function resetForm() {
		setTitle("");
		setNotes("");
		setDay(selectedDay);
		setStartTime("09:00");
		setEndTime("10:00");
		setCategory("meeting");
	}
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(AppShell, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:py-8",
		children: [
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(PageHeader, {
				eyebrow: "Schedule",
				title: "Your Week",
				children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", {
					onClick: () => {
						setDay(selectedDay);
						setCreating((c) => !c);
					},
					className: "flex items-center gap-1.5 rounded-full px-4 py-2.5 text-xs font-medium text-background transition-transform hover:scale-[1.03]",
					style: { background: "var(--gradient-accent)" },
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Plus, { className: cn("h-4 w-4 transition-transform", creating && "rotate-45") }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 128,
						columnNumber: 13
					}, this), "New Event"]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 122,
					columnNumber: 11
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 121,
				columnNumber: 9
			}, this),
			creating ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(GlassCard, {
				hover: false,
				className: "mb-6",
				children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("form", {
					onSubmit: (e) => {
						e.preventDefault();
						if (!title.trim() || !startTime || !endTime) return;
						addScheduleEvent({
							title: title.trim(),
							day,
							startTime,
							endTime,
							category,
							notes: notes.trim()
						});
						resetForm();
						setCreating(false);
					},
					className: "grid gap-3 sm:grid-cols-2 lg:grid-cols-6",
					children: [
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("input", {
							value: title,
							onChange: (e) => setTitle(e.target.value),
							placeholder: "e.g. WhatsApp campaign review",
							className: cn(inputClass, "sm:col-span-2 lg:col-span-2")
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 148,
							columnNumber: 15
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("select", {
							value: day,
							onChange: (e) => setDay(e.target.value),
							className: inputClass,
							children: WEEKDAYS.map((d) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("option", {
								value: d,
								className: "bg-[oklch(0.19_0.02_258)]",
								children: d
							}, d, false, {
								fileName: _jsxFileName,
								lineNumber: 150,
								columnNumber: 36
							}, this))
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 149,
							columnNumber: 15
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("input", {
							type: "time",
							value: startTime,
							onChange: (e) => setStartTime(e.target.value),
							className: inputClass
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 154,
							columnNumber: 15
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("input", {
							type: "time",
							value: endTime,
							onChange: (e) => setEndTime(e.target.value),
							className: inputClass
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 155,
							columnNumber: 15
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("select", {
							value: category,
							onChange: (e) => setCategory(e.target.value),
							className: inputClass,
							children: Object.keys(CATEGORY_META).map((c) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("option", {
								value: c,
								className: "bg-[oklch(0.19_0.02_258)]",
								children: CATEGORY_META[c].label
							}, c, false, {
								fileName: _jsxFileName,
								lineNumber: 157,
								columnNumber: 78
							}, this))
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 156,
							columnNumber: 15
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("input", {
							value: notes,
							onChange: (e) => setNotes(e.target.value),
							placeholder: "Notes (optional)",
							className: cn(inputClass, "sm:col-span-2 lg:col-span-5")
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 161,
							columnNumber: 15
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", {
							type: "submit",
							className: "rounded-full px-5 py-2.5 text-xs font-medium text-background",
							style: { background: "var(--gradient-accent)" },
							children: "Add to schedule"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 162,
							columnNumber: 15
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 134,
					columnNumber: 13
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 133,
				columnNumber: 21
			}, this) : null,
			upNext ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(GlassCard, {
				hover: false,
				className: "mb-6 flex items-center gap-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "grid h-11 w-11 shrink-0 place-items-center rounded-2xl",
						style: { background: "var(--gradient-accent)" },
						children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Clock, { className: "h-5 w-5 text-background" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 174,
							columnNumber: 15
						}, this)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 171,
						columnNumber: 13
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "min-w-0 flex-1",
						children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
							className: "text-[10px] uppercase tracking-[0.2em] text-muted-foreground",
							children: "Up next"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 177,
							columnNumber: 15
						}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
							className: "truncate text-sm font-semibold",
							children: upNext.title
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 180,
							columnNumber: 15
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 176,
						columnNumber: 13
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
						className: "shrink-0 text-xs text-muted-foreground",
						children: [
							upNext.day,
							" · ",
							formatTime(upNext.startTime)
						]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 182,
						columnNumber: 13
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 170,
				columnNumber: 19
			}, this) : null,
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(GlassCard, {
				hover: false,
				className: "mb-6 overflow-x-auto p-2 sm:p-3",
				children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "grid min-w-[560px] grid-cols-7 gap-1.5 sm:gap-2",
					children: WEEKDAYS.map((d, i) => {
						const date = weekDates[i];
						const count = eventsByDay.get(d)?.length ?? 0;
						const isToday = d === todayLabel;
						return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", {
							onClick: () => setSelectedDay(d),
							className: cn("flex flex-col items-center gap-1 rounded-2xl px-2 py-3 text-center transition-colors", d === selectedDay ? "bg-white/12 text-foreground shadow-[var(--glow-cyan)]" : "text-muted-foreground hover:bg-white/8 hover:text-foreground"),
							children: [
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
									className: "text-[10px] uppercase tracking-wider",
									children: d
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 196,
									columnNumber: 19
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
									className: cn("grid h-7 w-7 place-items-center rounded-full font-display text-xs font-semibold", isToday && "text-background"),
									style: isToday ? { background: "var(--gradient-accent)" } : void 0,
									children: date ? format(date, "d") : ""
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 197,
									columnNumber: 19
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
									className: "text-[9px] text-muted-foreground",
									children: count > 0 ? `${count} event${count > 1 ? "s" : ""}` : "—"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 202,
									columnNumber: 19
								}, this)
							]
						}, d, true, {
							fileName: _jsxFileName,
							lineNumber: 195,
							columnNumber: 20
						}, this);
					})
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 189,
					columnNumber: 11
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 188,
				columnNumber: 9
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(GlassCard, {
				hover: false,
				className: "p-0",
				children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "flex items-center justify-between gap-3 border-b border-border p-5",
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
						className: "text-[10px] uppercase tracking-[0.2em] text-muted-foreground",
						children: selectedDay === todayLabel ? "Today" : "Agenda"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 214,
						columnNumber: 15
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h2", {
						className: "mt-0.5 text-base font-semibold",
						children: [selectedDay, weekDates[WEEKDAYS.indexOf(selectedDay)] ? `, ${format(weekDates[WEEKDAYS.indexOf(selectedDay)], "MMMM d")}` : ""]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 217,
						columnNumber: 15
					}, this)] }, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 213,
						columnNumber: 13
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
						className: "glass rounded-full px-3 py-1 text-[10px] text-muted-foreground",
						children: [dayEvents.length, " scheduled"]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 222,
						columnNumber: 13
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 212,
					columnNumber: 11
				}, this), dayEvents.length === 0 ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "flex flex-col items-center gap-2 px-5 py-12 text-center",
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
						className: "text-sm text-muted-foreground",
						children: [
							"Nothing on ",
							selectedDay,
							" yet."
						]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 228,
						columnNumber: 15
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", {
						onClick: () => {
							setDay(selectedDay);
							setCreating(true);
						},
						className: "rounded-full px-4 py-2 text-xs font-medium text-background",
						style: { background: "var(--gradient-accent)" },
						children: "Add an event"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 229,
						columnNumber: 15
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 227,
					columnNumber: 37
				}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("ul", {
					className: "divide-y divide-border",
					children: dayEvents.map((e, i) => {
						const meta = CATEGORY_META[e.category];
						const Icon = meta.icon;
						return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(motion.li, {
							initial: {
								opacity: 0,
								y: 6
							},
							animate: {
								opacity: 1,
								y: 0
							},
							transition: {
								duration: .3,
								delay: i * .03
							},
							className: "flex items-start gap-3 p-4 sm:gap-4 sm:p-5",
							children: [
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
									className: "w-16 shrink-0 pt-0.5 text-right sm:w-20",
									children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
										className: "text-xs font-medium tabular-nums",
										children: formatTime(e.startTime)
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 252,
										columnNumber: 23
									}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
										className: "text-[10px] text-muted-foreground tabular-nums",
										children: formatTime(e.endTime)
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 253,
										columnNumber: 23
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 251,
									columnNumber: 21
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
									className: "mt-1 h-full w-px shrink-0 self-stretch rounded-full",
									style: { background: "var(--border)" },
									"aria-hidden": true
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 258,
									columnNumber: 21
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
									className: "mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl",
									style: { background: `color-mix(in oklab, ${meta.color} 22%, transparent)` },
									children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Icon, {
										className: "h-4 w-4",
										style: { color: meta.color }
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 265,
										columnNumber: 23
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 262,
									columnNumber: 21
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
									className: "min-w-0 flex-1",
									children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
										className: cn("truncate text-sm font-medium", e.done && "text-muted-foreground line-through"),
										children: e.title
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 271,
										columnNumber: 23
									}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
										className: "mt-0.5 flex flex-wrap items-center gap-2",
										children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
											className: "rounded-full px-2 py-0.5 text-[10px] font-medium",
											style: {
												background: `color-mix(in oklab, ${meta.color} 16%, transparent)`,
												color: meta.color
											},
											children: meta.label
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 275,
											columnNumber: 25
										}, this), e.notes ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
											className: "truncate text-[11px] text-muted-foreground",
											children: e.notes
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 281,
											columnNumber: 36
										}, this) : null]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 274,
										columnNumber: 23
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 270,
									columnNumber: 21
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
									className: "flex shrink-0 items-center gap-1",
									children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", {
										onClick: () => toggleScheduleEventDone(e.id),
										"aria-label": e.done ? "Mark as not done" : "Mark as done",
										className: cn("grid h-8 w-8 place-items-center rounded-full border transition-colors", e.done ? "border-cyan/50 bg-cyan/15 text-cyan" : "border-border text-muted-foreground hover:bg-white/8 hover:text-foreground"),
										children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Check, { className: "h-3.5 w-3.5" }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 289,
											columnNumber: 25
										}, this)
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 288,
										columnNumber: 23
									}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", {
										onClick: () => removeScheduleEvent(e.id),
										"aria-label": "Delete event",
										className: "grid h-8 w-8 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive",
										children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Trash2, { className: "h-3.5 w-3.5" }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 292,
											columnNumber: 25
										}, this)
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 291,
										columnNumber: 23
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 287,
									columnNumber: 21
								}, this)
							]
						}, e.id, true, {
							fileName: _jsxFileName,
							lineNumber: 241,
							columnNumber: 20
						}, this);
					})
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 237,
					columnNumber: 22
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 211,
				columnNumber: 9
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 120,
		columnNumber: 7
	}, this) }, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 119,
		columnNumber: 10
	}, this);
}
//#endregion
export { SchedulePage as component };
