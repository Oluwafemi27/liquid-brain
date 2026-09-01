import { n as AnimatePresence } from "../_libs/framer-motion+[...].mjs";
import { t as require_jsx_dev_runtime } from "../_libs/react.mjs";
import { J as CheckCheck, tt as BellOff } from "../_libs/lucide-react.mjs";
import { b as useAduf, c as PageHeader, o as GlassCard, t as AppShell } from "./app-shell-CaedC11b.mjs";
import { t as InsightRow } from "./insight-feed-DCYrdwq-.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/notifications-Dlpij4iW.js
var import_jsx_dev_runtime = require_jsx_dev_runtime();
var _jsxFileName = "/root/app/code/src/routes/notifications.tsx?tsr-split=component";
function NotificationsPage() {
	const { insights, markInsightRead, markAllInsightsRead, dismissInsight } = useAduf();
	const unread = insights.filter((i) => !i.read).length;
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(AppShell, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "mx-auto max-w-[820px] px-4 py-6 sm:px-6 lg:py-8",
		children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(PageHeader, {
			eyebrow: "Signals",
			title: "Notifications",
			children: insights.length > 0 && unread > 0 ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", {
				onClick: markAllInsightsRead,
				className: "flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs text-muted-foreground hover:bg-white/8 hover:text-foreground",
				children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CheckCheck, { className: "h-3.5 w-3.5" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 19,
					columnNumber: 15
				}, this), "Mark all read"]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 18,
				columnNumber: 48
			}, this) : null
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 17,
			columnNumber: 9
		}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(GlassCard, {
			hover: false,
			className: "p-3 sm:p-4",
			children: insights.length === 0 ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "flex flex-col items-center gap-2 py-16 text-center",
				children: [
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(BellOff, { className: "h-6 w-6 text-muted-foreground" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 26,
						columnNumber: 15
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
						className: "text-sm text-muted-foreground",
						children: "You're all caught up."
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 27,
						columnNumber: 15
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
						className: "max-w-xs text-xs text-muted-foreground/70",
						children: "Toggle an automation, set a goal, or connect a data source and ADUF will start logging what happens here."
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 28,
						columnNumber: 15
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 25,
				columnNumber: 36
			}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "space-y-1.5",
				children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(AnimatePresence, {
					initial: false,
					children: insights.map((insight) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(InsightRow, {
						insight,
						onRead: markInsightRead,
						onDismiss: dismissInsight
					}, insight.id, false, {
						fileName: _jsxFileName,
						lineNumber: 34,
						columnNumber: 42
					}, this))
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 33,
					columnNumber: 15
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 32,
				columnNumber: 22
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 24,
			columnNumber: 9
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 16,
		columnNumber: 7
	}, this) }, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 15,
		columnNumber: 10
	}, this);
}
//#endregion
export { NotificationsPage as component };
