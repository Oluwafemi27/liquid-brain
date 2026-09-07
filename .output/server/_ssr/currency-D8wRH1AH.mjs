import { a as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/currency-D8wRH1AH.js
var import_react = /* @__PURE__ */ __toESM(require_react());
/** Symbols/labels used around the app for the currency an amount was
*  entered in, mapped to ISO 4217 codes the FX API understands. */
var SYMBOL_TO_ISO = {
	"₦": "NGN",
	NGN: "NGN",
	$: "USD",
	USD: "USD",
	"€": "EUR",
	EUR: "EUR",
	"£": "GBP",
	GBP: "GBP",
	"¥": "JPY",
	JPY: "JPY",
	"₵": "GHS",
	GHS: "GHS",
	KES: "KES",
	ZAR: "ZAR"
};
/** Approximate fallback rates (USD base) used only if /api/fx hasn't
*  responded yet or is unreachable — real conversion always wins once the
*  live rate loads. Keeps the UI from showing raw Naira in the meantime. */
var FALLBACK_RATES = {
	USD: 1,
	NGN: 1500,
	EUR: .92,
	GBP: .79,
	JPY: 149,
	GHS: 15.5,
	KES: 129,
	ZAR: 18
};
function isoFromCurrencyLabel(label) {
	return SYMBOL_TO_ISO[label] ?? label.toUpperCase();
}
/** Fetches live USD exchange rates once per mount and shares a module-level
*  cache across every component using the hook in the same page load. */
var sharedRates = null;
var inFlight = null;
function fetchRates() {
	if (sharedRates) return Promise.resolve(sharedRates);
	if (!inFlight) inFlight = fetch("/api/fx").then((r) => r.json()).then((data) => {
		sharedRates = data.rates ?? FALLBACK_RATES;
		return sharedRates;
	}).catch(() => {
		sharedRates = FALLBACK_RATES;
		return sharedRates;
	});
	return inFlight;
}
function useUsdRates() {
	const [rates, setRates] = (0, import_react.useState)(sharedRates ?? FALLBACK_RATES);
	const [loading, setLoading] = (0, import_react.useState)(!sharedRates);
	(0, import_react.useEffect)(() => {
		let cancelled = false;
		fetchRates().then((r) => {
			if (!cancelled) {
				setRates(r);
				setLoading(false);
			}
		});
		return () => {
			cancelled = true;
		};
	}, []);
	return {
		rates,
		loading,
		live: rates !== FALLBACK_RATES
	};
}
/** Converts an amount in `fromCurrency` (symbol or ISO code) to USD. */
function toUsd(amount, fromCurrency, rates) {
	const iso = isoFromCurrencyLabel(fromCurrency);
	if (iso === "USD") return amount;
	const rate = rates[iso] ?? FALLBACK_RATES[iso];
	if (!rate) return amount;
	return amount / rate;
}
function formatUsd(amount) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
		maximumFractionDigits: amount >= 1e3 ? 0 : 2
	}).format(amount);
}
/** Compact form for chart labels / tight spaces: $1.2M, $340k, $85. */
function formatUsdCompact(amount) {
	const sign = amount < 0 ? "-" : "";
	const n = Math.abs(amount);
	if (n >= 1e6) return `${sign}$${(n / 1e6).toFixed(2)}M`;
	if (n >= 1e3) return `${sign}$${Math.round(n / 1e3)}k`;
	return `${sign}$${Math.round(n)}`;
}
//#endregion
export { useUsdRates as i, formatUsdCompact as n, toUsd as r, formatUsd as t };
