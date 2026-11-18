import { useEffect, useState } from "react";
import { PlanCard } from "@/components/aduf/plan-card";
import type { BillingInterval, Plan } from "@/lib/billing-types";
import { DEFAULT_PLANS } from "@/lib/plan-defaults";
import { fetchPublicPlansFn } from "@/lib/server-fns";

/** Public pricing. Renders the built-in plans immediately (so search engines and slow connections
 *  see real prices), then swaps in whatever the admin has configured. */
export function PricingSection({ onStart }: { onStart: () => void }) {
  const [plans, setPlans] = useState<Plan[]>(DEFAULT_PLANS);
  const [interval, setInterval_] = useState<BillingInterval>("month");

  useEffect(() => {
    fetchPublicPlansFn({ data: {} })
      .then((r) => r && r.plans.length > 0 && setPlans(r.plans))
      .catch(() => undefined);
  }, []);

  return (
    <section
      id="pricing"
      aria-labelledby="pricing-title"
      className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6 sm:py-14"
    >
      <div className="mb-8 text-center">
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Pricing</p>
        <h2 id="pricing-title" className="mt-2 text-xl font-semibold sm:text-2xl">
          Start free. Pay only when ADUF is earning its place.
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
          Plans include a monthly allowance of AI tokens — the fuel for every answer, plan and
          reply. Top up any time; extra tokens never expire.
        </p>
        <div
          role="group"
          aria-label="Billing period"
          className="mt-5 inline-flex rounded-full bg-white/[0.07] p-1 text-xs"
        >
          {(["month", "year"] as const).map((i) => (
            <button
              key={i}
              type="button"
              aria-pressed={interval === i}
              onClick={() => setInterval_(i)}
              className={`rounded-full px-4 py-1.5 ${interval === i ? "bg-white/20" : "text-muted-foreground"}`}
            >
              {i === "month" ? "Monthly" : "Yearly · 2 months free"}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {plans.map((p) => (
          <PlanCard key={p.id} plan={p} interval={interval}>
            <button
              type="button"
              onClick={onStart}
              className={`w-full rounded-full px-4 py-2.5 text-sm font-medium ${p.highlighted ? "" : "border border-white/20"}`}
              style={
                p.highlighted
                  ? { background: "var(--gradient-accent)", color: "var(--background)" }
                  : undefined
              }
            >
              {p.priceNgnMonth === 0 ? "Start free" : "Start, upgrade later"}
            </button>
          </PlanCard>
        ))}
      </div>
      <p className="mt-4 text-center text-[11px] text-muted-foreground">
        No card needed to start. Paid plans are charged in naira through Paystack — cards, bank
        transfer and more. Cancel any time.
      </p>
    </section>
  );
}
