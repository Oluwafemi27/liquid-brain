// Dropshipping decision engine. Pure functions, no I/O, client-safe, fully unit-tested.
//
// Ported in spirit from logeshkannan19/DropShipping-AI-Agent (MIT): its five pricing strategies
// (cost-plus, competitive, premium, penetration, dynamic), its auto-strategy selection, and its
// product scoring idea. Deliberately NOT ported: its mock product generator and its "RL" placeholder
// (neither does real work), and its price floor of cost x 1.1, which ignores payment fees, refunds
// and shipping, so it can recommend prices that lose money. Every price here is floored on a
// fee-aware break-even instead.
//
// All money values are in ONE currency chosen by the caller (the store's selling currency).

export interface CostModel {
  /** What the supplier charges for the item. */
  productCost: number;
  /** Supplier -> customer shipping you pay. */
  shippingCost: number;
  /** Packaging, support, app fees per order. */
  otherCostPerOrder?: number;
  /** Payment processor percentage, e.g. 0.029. Default 2.9%. */
  paymentPct?: number;
  /** Payment processor fixed fee per order. Default 0.30. */
  paymentFixed?: number;
  /** Share of orders refunded (0-1). Fees and supplier cost are NOT recovered. Default 0.05. */
  refundRate?: number;
}

const DEFAULTS = { other: 0, pct: 0.029, fixed: 0.3, refund: 0.05 };
const r2 = (n: number) => Math.round(n * 100) / 100;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

function norm(c: CostModel) {
  const m = {
    productCost: c.productCost,
    shippingCost: c.shippingCost,
    other: c.otherCostPerOrder ?? DEFAULTS.other,
    pct: c.paymentPct ?? DEFAULTS.pct,
    fixed: c.paymentFixed ?? DEFAULTS.fixed,
    refund: c.refundRate ?? DEFAULTS.refund,
  };
  if (![m.productCost, m.shippingCost, m.other, m.pct, m.fixed, m.refund].every(Number.isFinite))
    throw new Error("Costs must be numbers.");
  if (m.productCost < 0 || m.shippingCost < 0 || m.other < 0 || m.fixed < 0)
    throw new Error("Costs can't be negative.");
  if (m.pct < 0 || m.refund < 0 || m.pct + m.refund >= 1)
    throw new Error("Payment % and refund rate must be 0-1 and sum to less than 1.");
  return m;
}

export interface UnitEconomics {
  price: number;
  landedCost: number;
  paymentFees: number;
  expectedRefundLoss: number;
  /** Expected profit per order before ads (refund-adjusted). */
  contributionBeforeAds: number;
  contributionMarginPct: number;
  /** Max you can pay for one sale and still break even. null when each sale already loses money. */
  breakEvenCpa: number | null;
  breakEvenRoas: number | null;
  /** Highest CPC that breaks even at the given conversion rate (null if no conversion rate given). */
  maxCpcAtBreakEven: number | null;
  /** Present when adCpa (or cpc + conversionRate) is given. */
  atAdCost?: { cpa: number; profitPerOrder: number; netMarginPct: number; roas: number };
  warnings: string[];
}

export function unitEconomics(
  price: number,
  cost: CostModel,
  ads: { cpa?: number; cpc?: number; conversionRate?: number } = {},
): UnitEconomics {
  if (!(price > 0)) throw new Error("Price must be greater than 0.");
  const m = norm(cost);
  const landedCost = m.productCost + m.shippingCost + m.other;
  const paymentFees = price * m.pct + m.fixed;
  // Refunded orders return the price but not the fees or the goods already ordered.
  const expectedRefundLoss = price * m.refund;
  const contribution = price - expectedRefundLoss - landedCost - paymentFees;
  const warnings: string[] = [];

  const breakEvenCpa = contribution > 0 ? contribution : null;
  const breakEvenRoas = breakEvenCpa ? price / breakEvenCpa : null;
  const cr = ads.conversionRate;
  const maxCpc = breakEvenCpa && cr && cr > 0 && cr <= 1 ? breakEvenCpa * cr : null;

  const out: UnitEconomics = {
    price: r2(price),
    landedCost: r2(landedCost),
    paymentFees: r2(paymentFees),
    expectedRefundLoss: r2(expectedRefundLoss),
    contributionBeforeAds: r2(contribution),
    contributionMarginPct: r2((contribution / price) * 100),
    breakEvenCpa: breakEvenCpa === null ? null : r2(breakEvenCpa),
    breakEvenRoas: breakEvenRoas === null ? null : r2(breakEvenRoas),
    maxCpcAtBreakEven: maxCpc === null ? null : r2(maxCpc),
    warnings,
  };

  let cpa = ads.cpa;
  if (cpa === undefined && ads.cpc !== undefined && cr && cr > 0 && cr <= 1) cpa = ads.cpc / cr;
  if (cpa !== undefined) {
    const profit = contribution - cpa;
    out.atAdCost = {
      cpa: r2(cpa),
      profitPerOrder: r2(profit),
      netMarginPct: r2((profit / price) * 100),
      roas: r2(price / cpa),
    };
    if (profit < 0) warnings.push("Loses money per order at this ad cost.");
  }
  if (contribution <= 0) warnings.push("Loses money on every sale before any ad spend.");
  else if (contribution / price < 0.15)
    warnings.push("Contribution margin under 15%: one bad week of ads or refunds wipes it out.");
  if (m.shippingCost > price * 0.3) warnings.push("Shipping is over 30% of the price.");
  return out;
}

/** Lowest price at which contribution (after fees and expected refunds) is at least `minMarginPct`
 *  of the price. Closed form: price x (1 - refund - pct - margin) = landed + fixed. */
export function floorPrice(cost: CostModel, minMarginPct = 0.15): number {
  const m = norm(cost);
  const denom = 1 - m.refund - m.pct - minMarginPct;
  if (denom <= 0) throw new Error("Minimum margin is too high for these fee and refund rates.");
  return (m.productCost + m.shippingCost + m.other + m.fixed) / denom;
}

// ------------------------------------------------------------------ pricing

export type PricingStrategy = "cost_plus" | "competitive" | "premium" | "penetration" | "dynamic";

export interface PriceInput {
  cost: CostModel;
  competitorPrices?: number[];
  /** 0-1. Use scoreProduct().demand, or 0.5 when unknown. */
  demandScore?: number;
  /** Markup on landed cost used by cost-plus / premium / dynamic. Default 0.5 (50%). */
  targetMarkup?: number;
  /** Minimum contribution margin the price must clear. Default 0.15. */
  minMarginPct?: number;
  strategy?: PricingStrategy | "auto";
  /** Round up to the next x.99. Default true. */
  charmPricing?: boolean;
}

export interface PriceRecommendation {
  strategy: PricingStrategy;
  price: number;
  floor: number;
  limitedByFloor: boolean;
  economics: UnitEconomics;
  competitors: { count: number; min: number; avg: number; max: number } | null;
  position: "below_market" | "at_market" | "above_market" | "no_market_data";
  notes: string[];
}

function autoStrategy(demand: number, comps: number[]): PricingStrategy {
  if (demand > 0.7 && comps.length) {
    const avg = comps.reduce((a, b) => a + b, 0) / comps.length;
    return avg > 50 ? "premium" : "competitive";
  }
  return demand > 0.5 ? "cost_plus" : "penetration";
}

/** Smallest x.99 that is >= p, so charm pricing can only raise a price, never drop it below the floor. */
const charm = (p: number) => {
  const f = Math.floor(p);
  return p <= f + 0.99 + 1e-9 ? f + 0.99 : f + 1.99;
};

export function recommendPrice(input: PriceInput): PriceRecommendation {
  const demand = clamp(input.demandScore ?? 0.5, 0, 1);
  const comps = (input.competitorPrices ?? []).filter((p) => Number.isFinite(p) && p > 0);
  const markup = input.targetMarkup ?? 0.5;
  const minMargin = input.minMarginPct ?? 0.15;
  const m = norm(input.cost);
  const landed = m.productCost + m.shippingCost + m.other;
  const floor = floorPrice(input.cost, minMargin);
  const avg = comps.length ? comps.reduce((a, b) => a + b, 0) / comps.length : 0;
  const strategy: PricingStrategy =
    !input.strategy || input.strategy === "auto" ? autoStrategy(demand, comps) : input.strategy;
  const notes: string[] = [];

  let raw: number;
  switch (strategy) {
    case "cost_plus":
      raw = landed * (1 + markup);
      break;
    case "premium":
      raw = landed * (1 + markup * (1 + demand * 0.5));
      break;
    case "competitive": {
      if (!comps.length) {
        raw = landed * (1 + markup);
        notes.push("No competitor prices given, so this fell back to cost-plus.");
      } else {
        const demandFactor = demand < 0.5 ? 0.9 : demand < 0.7 ? 1 : 1.1;
        raw = avg * 0.95 * demandFactor;
      }
      break;
    }
    case "penetration": {
      raw = (comps.length ? Math.min(...comps) : landed * 1.3) * 0.85;
      if (!comps.length)
        notes.push("No competitor prices given, so penetration is estimated from cost.");
      break;
    }
    case "dynamic": {
      const base = landed * (1 + markup);
      const compFactor = comps.length ? clamp(avg / base, 0.7, 1.3) : 1;
      raw = base * compFactor * (0.8 + demand * 0.4);
      break;
    }
  }

  // Never price far above the whole market unless the strategy is explicitly premium.
  if (comps.length && strategy !== "premium") {
    const ceiling = Math.max(...comps) * 1.05;
    if (raw > ceiling) {
      raw = ceiling;
      notes.push("Capped just above the most expensive competitor.");
    }
  }

  let price = raw;
  let limitedByFloor = false;
  if (price < floor) {
    price = floor;
    limitedByFloor = true;
    notes.push(
      `The ${strategy.replace("_", "-")} price would be below your break-even floor, so the floor is used. ` +
        "If that isn't competitive, this product may not be worth selling.",
    );
  }
  if (input.charmPricing !== false) {
    price = charm(price);
  }
  price = r2(price);

  const economics = unitEconomics(price, input.cost);
  let position: PriceRecommendation["position"] = "no_market_data";
  let competitors: PriceRecommendation["competitors"] = null;
  if (comps.length) {
    competitors = {
      count: comps.length,
      min: r2(Math.min(...comps)),
      avg: r2(avg),
      max: r2(Math.max(...comps)),
    };
    position =
      price < avg * 0.9 ? "below_market" : price > avg * 1.1 ? "above_market" : "at_market";
    if (position === "above_market")
      notes.push("Priced over 10% above the market average; expect lower conversion.");
    if (position === "below_market" && !limitedByFloor)
      notes.push("Priced well under the market; you may be leaving margin on the table.");
  }
  if (economics.contributionMarginPct < minMargin * 100 - 0.01)
    notes.push("Margin is below your minimum even at the floor price.");
  return {
    strategy,
    price,
    floor: r2(floor),
    limitedByFloor,
    economics,
    competitors,
    position,
    notes,
  };
}

// ------------------------------------------------------------------ scoring

export interface ProductCandidate {
  name: string;
  cost: CostModel;
  /** Price you expect to sell at (use recommendPrice, or competitors' average). */
  expectedPrice: number;
  /** Units sold on the supplier listing. */
  orders?: number;
  reviews?: number;
  /** 0-5. */
  rating?: number;
  /** 0-5 supplier/store rating. */
  supplierRating?: number;
  shippingDays?: number;
}

export interface ProductScore {
  name: string;
  score: number;
  verdict: "go" | "test" | "skip";
  components: Record<"margin" | "demand" | "quality" | "supplier" | "shipping", number>;
  confidence: "low" | "medium" | "high";
  economics: UnitEconomics;
  reasons: string[];
}

const WEIGHTS = {
  margin: 0.35,
  demand: 0.25,
  quality: 0.15,
  supplier: 0.1,
  shipping: 0.15,
} as const;

/** Transparent weighted score. Missing inputs score neutral (0.5) and lower the confidence label,
 *  they are never guessed upward. "skip" is forced by hard gates, whatever the score. */
export function scoreProduct(c: ProductCandidate): ProductScore {
  const eco = unitEconomics(c.expectedPrice, c.cost);
  const reasons: string[] = [];
  let known = 0;

  const margin = clamp(eco.contributionMarginPct / 40, 0, 1);
  let demand = 0.5;
  if (c.orders !== undefined) {
    demand = clamp(Math.log10(c.orders + 1) / 4, 0, 1); // 10,000 orders = 1.0
    known++;
  }
  let quality = 0.5;
  if (c.rating !== undefined) {
    quality = clamp((c.rating - 3.5) / 1.2, 0, 1);
    known++;
    if ((c.reviews ?? 0) < 20) reasons.push("Rating is based on fewer than 20 reviews.");
  }
  let supplier = 0.5;
  if (c.supplierRating !== undefined) {
    supplier = clamp((c.supplierRating - 3.5) / 1.5, 0, 1);
    known++;
  }
  let shipping = 0.5;
  if (c.shippingDays !== undefined) {
    shipping = clamp((30 - c.shippingDays) / 23, 0, 1); // <=7 days = 1, >=30 days = 0
    known++;
  }

  const components = { margin, demand, quality, supplier, shipping };
  const score = Math.round(
    100 *
      (margin * WEIGHTS.margin +
        demand * WEIGHTS.demand +
        quality * WEIGHTS.quality +
        supplier * WEIGHTS.supplier +
        shipping * WEIGHTS.shipping),
  );

  let verdict: ProductScore["verdict"] = score >= 65 ? "go" : score >= 45 ? "test" : "skip";
  if (eco.contributionBeforeAds <= 0) {
    verdict = "skip";
    reasons.push("Loses money on every sale before ads.");
  } else if (eco.contributionMarginPct < 15) {
    if (verdict === "go") verdict = "test";
    reasons.push("Contribution margin under 15%.");
  }
  if (c.rating !== undefined && c.rating < 3.8) {
    verdict = "skip";
    reasons.push("Rating under 3.8 means refunds and bad reviews.");
  }
  if (c.shippingDays !== undefined && c.shippingDays > 25) {
    if (verdict === "go") verdict = "test";
    reasons.push("Delivery over 25 days drives refunds and chargebacks.");
  }
  if (c.orders === undefined || c.orders < 50) {
    // "go" needs evidence of demand. Margin alone never earns it.
    if (verdict === "go") verdict = "test";
    reasons.push(
      c.orders === undefined
        ? "No demand data: can't be 'go' without supplier order counts."
        : "Few supplier orders: demand is unproven.",
    );
  }
  if (verdict === "go")
    reasons.push("Healthy margin and proven demand. Still run a small ad test first.");

  return {
    name: c.name,
    score,
    verdict,
    components: {
      margin: r2(margin),
      demand: r2(demand),
      quality: r2(quality),
      supplier: r2(supplier),
      shipping: r2(shipping),
    },
    confidence: known >= 4 ? "high" : known >= 2 ? "medium" : "low",
    economics: eco,
    reasons,
  };
}

export function rankProducts(list: ProductCandidate[]): ProductScore[] {
  return list.map(scoreProduct).sort((a, b) => b.score - a.score);
}
