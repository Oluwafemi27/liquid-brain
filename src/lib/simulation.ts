// The what-if engine, shared by the Analytics simulator and by action previews
// so the two can never disagree. These are FIXED ASSUMPTIONS, not measurements
// from the owner's ad account — every place that shows them must say so.
export const SIM_ASSUMPTIONS = {
  /** Extra leads per ₦1,000 of extra ad spend. */
  leadsPerThousandNgn: 0.46,
  /** Extra sales revenue per unit of extra ad spend. */
  salesReturnMultiple: 3.4,
} as const;

export const SIM_DISCLAIMER = `Illustrative only: assumes ${SIM_ASSUMPTIONS.leadsPerThousandNgn} extra leads per ₦1,000 and a ${SIM_ASSUMPTIONS.salesReturnMultiple}× return on extra spend. These are generic assumptions, not measured from your ad account.`;

/** Slider model on Analytics: `spend` is in thousands of naira. */
export function simulateSlider(spend: number) {
  return {
    leads: Math.round(spend * SIM_ASSUMPTIONS.leadsPerThousandNgn),
    salesNgn: Math.round(spend * 1000 * SIM_ASSUMPTIONS.salesReturnMultiple),
  };
}

/** Preview model for an ad-budget change: extra USD per day held for 30 days. */
export function simulateAdChange(changeUsdPerDay: number, ngnPerUsd: number) {
  const extraUsd = changeUsdPerDay * 30;
  const extraNgn = extraUsd * ngnPerUsd;
  return {
    extraSpendUsd: Math.round(extraUsd),
    leads: Math.round((extraNgn / 1000) * SIM_ASSUMPTIONS.leadsPerThousandNgn),
    salesUsd: Math.round(extraUsd * SIM_ASSUMPTIONS.salesReturnMultiple),
  };
}
