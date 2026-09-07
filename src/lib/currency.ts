import { useEffect, useState } from "react";

/** Symbols/labels used around the app for the currency an amount was
 *  entered in, mapped to ISO 4217 codes the FX API understands. */
const SYMBOL_TO_ISO: Record<string, string> = {
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
  ZAR: "ZAR",
};

/** Approximate fallback rates (USD base) used only if /api/fx hasn't
 *  responded yet or is unreachable — real conversion always wins once the
 *  live rate loads. Keeps the UI from showing raw Naira in the meantime. */
const FALLBACK_RATES: Record<string, number> = {
  USD: 1,
  NGN: 1500,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 149,
  GHS: 15.5,
  KES: 129,
  ZAR: 18,
};

export function isoFromCurrencyLabel(label: string): string {
  return SYMBOL_TO_ISO[label] ?? label.toUpperCase();
}

interface FxState {
  rates: Record<string, number>;
  loading: boolean;
  live: boolean;
}

/** Fetches live USD exchange rates once per mount and shares a module-level
 *  cache across every component using the hook in the same page load. */
let sharedRates: Record<string, number> | null = null;
let inFlight: Promise<Record<string, number>> | null = null;

function fetchRates(): Promise<Record<string, number>> {
  if (sharedRates) return Promise.resolve(sharedRates);
  if (!inFlight) {
    inFlight = fetch("/api/fx")
      .then((r) => r.json())
      .then((data: { rates?: Record<string, number> }) => {
        sharedRates = data.rates ?? FALLBACK_RATES;
        return sharedRates;
      })
      .catch(() => {
        sharedRates = FALLBACK_RATES;
        return sharedRates;
      });
  }
  return inFlight;
}

export function useUsdRates(): FxState {
  const [rates, setRates] = useState<Record<string, number>>(sharedRates ?? FALLBACK_RATES);
  const [loading, setLoading] = useState(!sharedRates);

  useEffect(() => {
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

  return { rates, loading, live: rates !== FALLBACK_RATES };
}

/** Converts an amount in `fromCurrency` (symbol or ISO code) to USD. */
export function toUsd(amount: number, fromCurrency: string, rates: Record<string, number>): number {
  const iso = isoFromCurrencyLabel(fromCurrency);
  if (iso === "USD") return amount;
  const rate = rates[iso] ?? FALLBACK_RATES[iso];
  if (!rate) return amount; // Unknown currency — better to show the raw number than hide it.
  return amount / rate;
}

export function formatUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: amount >= 1000 ? 0 : 2,
  }).format(amount);
}

/** Compact form for chart labels / tight spaces: $1.2M, $340k, $85. */
export function formatUsdCompact(amount: number): string {
  const sign = amount < 0 ? "-" : "";
  const n = Math.abs(amount);
  if (n >= 1_000_000) return `${sign}$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${sign}$${Math.round(n / 1_000)}k`;
  return `${sign}$${Math.round(n)}`;
}
