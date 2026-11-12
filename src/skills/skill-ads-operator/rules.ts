// Ad diagnosis rules. Pure and client-safe. Every verdict carries the rule that produced it, and
// "wait" is the default whenever there isn't enough data: ads are judged on spend and purchases, not hunches.
import type { InsightRow } from "../services/meta-ads";

export type AdVerdict = "scale" | "keep" | "fix" | "pause" | "wait";

export interface Economics {
  /** Revenue / spend needed to break even (from dropship_unit_economics.breakEvenRoas). */
  breakEvenRoas: number;
  /** Most you can pay for one sale (breakEvenCpa). */
  breakEvenCpa: number;
}

export interface AdDiagnosis {
  id: string;
  name: string;
  verdict: AdVerdict;
  confidence: "low" | "medium" | "high";
  /** Max change to the daily budget this verdict supports, in percent (never more than 20 either way). */
  suggestedBudgetChangePct: number;
  reasons: string[];
  metrics: {
    spend: number;
    purchases: number;
    roas: number | null;
    cpa: number | null;
    ctr: number | null;
    frequency: number | null;
  };
}

/** Meta's learning phase needs ~50 conversions; below ~5 sales a ROAS number is mostly noise. */
export function diagnose(rows: InsightRow[], eco: Economics | null): AdDiagnosis[] {
  return rows.map((r) => {
    const roas = r.spend > 0 ? r.revenue / r.spend : null;
    const cpa = r.purchases > 0 ? r.spend / r.purchases : null;
    const reasons: string[] = [];
    const m = {
      spend: r.spend,
      purchases: r.purchases,
      roas: roas === null ? null : Math.round(roas * 100) / 100,
      cpa: cpa === null ? null : Math.round(cpa * 100) / 100,
      ctr: r.ctr,
      frequency: r.frequency,
    };
    const confidence: AdDiagnosis["confidence"] =
      r.purchases >= 20 ? "high" : r.purchases >= 5 ? "medium" : "low";
    const out = (verdict: AdVerdict, pct: number): AdDiagnosis => ({
      id: r.id,
      name: r.name,
      verdict,
      confidence,
      suggestedBudgetChangePct: pct,
      reasons,
      metrics: m,
    });

    if (r.impressions < 1000) {
      reasons.push("Under 1,000 impressions: too early to judge.");
      return out("wait", 0);
    }
    if (!eco) {
      // Without the product's economics there is no break-even to judge against; report facts only.
      reasons.push(
        "No break-even given (pass the product's price and costs), so this can only report, not judge profit.",
      );
      if (r.frequency !== null && r.frequency > 3.5)
        reasons.push(`Frequency ${r.frequency}: the audience is seeing this too often.`);
      return out("wait", 0);
    }

    const needSpend = eco.breakEvenCpa * 2; // two break-even sales' worth of spend before calling a zero
    if (r.purchases === 0) {
      if (r.spend >= needSpend) {
        reasons.push(
          `Spent ${r.spend.toFixed(2)} (more than 2 × the break-even cost per sale of ${eco.breakEvenCpa.toFixed(2)}) with no sales.`,
        );
        return out("pause", -20);
      }
      reasons.push(
        `No sales yet, but spend (${r.spend.toFixed(2)}) is still under 2 × break-even cost per sale (${needSpend.toFixed(2)}).`,
      );
      return out("wait", 0);
    }

    if (r.frequency !== null && r.frequency > 3.5)
      reasons.push(`Frequency ${r.frequency}: ad fatigue is likely.`);
    if (r.ctr !== null && r.impressions >= 2000 && r.ctr < 0.8)
      reasons.push(`Click-through rate ${r.ctr}% is low: the creative or audience isn't landing.`);
    const fatigued = reasons.length > 0;

    if (r.purchases < 3) {
      reasons.push(`Only ${r.purchases} sale(s): ROAS ${m.roas} is mostly noise.`);
      return out("wait", 0);
    }
    const be = eco.breakEvenRoas;
    if (roas! < be * 0.8) {
      reasons.push(
        `ROAS ${m.roas} is more than 20% under break-even (${be.toFixed(2)}): losing money on each sale.`,
      );
      return out(r.purchases >= 5 ? "pause" : "fix", r.purchases >= 5 ? -20 : -10);
    }
    if (roas! >= be * 1.3 && r.purchases >= 5 && !fatigued) {
      reasons.push(
        `ROAS ${m.roas} is 30%+ above break-even (${be.toFixed(2)}) on ${r.purchases} sales. Raise gradually: big jumps reset Meta's learning.`,
      );
      return out("scale", 20);
    }
    if (roas! < be) {
      reasons.push(`ROAS ${m.roas} is just under break-even (${be.toFixed(2)}).`);
      return out("fix", 0);
    }
    reasons.push(
      `ROAS ${m.roas} is above break-even (${be.toFixed(2)}) but not by enough to scale confidently${fatigued ? ", and there are fatigue signs" : ""}.`,
    );
    return out(fatigued ? "fix" : "keep", 0);
  });
}
