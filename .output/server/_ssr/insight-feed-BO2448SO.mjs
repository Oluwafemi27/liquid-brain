import { t as motion } from "../_libs/framer-motion+[...].mjs";
import { t as require_jsx_dev_runtime } from "../_libs/react.mjs";
import { F as Info, U as CircleCheck, c as TriangleAlert, n as X } from "../_libs/lucide-react.mjs";
import { _ as cn, y as timeAgo } from "./app-shell-Dd7fJpNz.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/insight-feed-BO2448SO.js
var import_jsx_dev_runtime = require_jsx_dev_runtime();
var _jsxFileName = "/root/app/code/src/components/aduf/insight-feed.tsx";
var SEVERITY_ICON = {
	info: Info,
	success: CircleCheck,
	warning: TriangleAlert
};
var SEVERITY_COLOR = {
	info: "text-cyan",
	success: "text-[oklch(0.84_0.06_195)]",
	warning: "text-[oklch(0.78_0.12_70)]"
};
/** One insight/notification row. Shared by the Brain page feed and the
*  full Notifications page — `compact` trims the body to one line. */
function InsightRow({ insight, onRead, onDismiss, compact = false }) {
	const Icon = SEVERITY_ICON[insight.severity];
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(motion.div, {
		layout: true,
		initial: {
			opacity: 0,
			y: 6
		},
		animate: {
			opacity: 1,
			y: 0
		},
		exit: {
			opacity: 0,
			x: 12
		},
		className: cn("group flex items-start gap-3 rounded-2xl px-3 py-3 text-left transition-colors", insight.read ? "bg-white/4" : "bg-white/8"),
		children: [
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
				className: cn("mt-0.5 shrink-0", SEVERITY_COLOR[insight.severity]),
				children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Icon, { className: "h-4 w-4" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 44,
					columnNumber: 9
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 43,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", {
				onClick: () => onRead?.(insight.id),
				className: "min-w-0 flex-1 text-left",
				disabled: !onRead,
				children: [
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "flex items-center gap-2",
						children: [insight.read ? null : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
							className: "h-1.5 w-1.5 shrink-0 rounded-full bg-cyan",
							"aria-hidden": true
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 53,
							columnNumber: 13
						}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
							className: "truncate text-sm font-medium",
							children: insight.title
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 55,
							columnNumber: 11
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 51,
						columnNumber: 9
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
						className: cn("mt-0.5 text-xs text-muted-foreground", compact && "line-clamp-1"),
						children: insight.body
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 57,
						columnNumber: 9
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
						className: "mt-1 text-[10px] uppercase tracking-wider text-muted-foreground/70",
						children: [
							insight.source,
							" · ",
							timeAgo(insight.createdAt)
						]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 60,
						columnNumber: 9
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 46,
				columnNumber: 7
			}, this),
			onDismiss ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", {
				onClick: () => onDismiss(insight.id),
				"aria-label": "Dismiss",
				className: "shrink-0 rounded-full p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-white/8 hover:text-foreground group-hover:opacity-100",
				children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(X, { className: "h-3.5 w-3.5" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 70,
					columnNumber: 11
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 65,
				columnNumber: 9
			}, this) : null
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 33,
		columnNumber: 5
	}, this);
}
//#endregion
export { InsightRow as t };
