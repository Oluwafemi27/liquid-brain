import { Check } from "lucide-react";
import type { ReactNode } from "react";
import type { BillingInterval, Plan } from "@/lib/billing-types";
import { formatNgn, formatUsd } from "@/lib/billing-types";

/** One pricing card — shared by the Billing page and the public landing page. */
export function PlanCard({
  plan,
  interval,
  current,
  children,
}: {
  plan: Plan;
  interval: BillingInterval;
  current?: boolean;
  children?: ReactNode;
}) {
  const ngn = interval === "month" ? plan.priceNgnMonth : plan.priceNgnYear;
  const usd = interval === "month" ? plan.priceUsdMonth : plan.priceUsdYear;
  return (
    <div
      className={`relative flex flex-col rounded-3xl border p-5 ${plan.highlighted ? "border-cyan/50 bg-white/[0.07]" : "border-white/10 bg-white/[0.04]"}`}
    >
      {plan.highlighted ? (
        <span className="absolute -top-3 left-5 rounded-full bg-cyan px-3 py-0.5 text-[10px] font-semibold text-background">
          Most popular
        </span>
      ) : null}
      <div className="flex items-center gap-2">
        <h3 className="text-base font-semibold">{plan.name}</h3>
        {current ? (
          <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] text-emerald-300">
            Your plan
          </span>
        ) : null}
      </div>
      <p className="mt-1 min-h-8 text-xs text-muted-foreground">{plan.tagline}</p>
      <p className="mt-4">
        <span className="text-3xl font-semibold tabular-nums">
          {ngn === 0 ? "Free" : formatNgn(ngn)}
        </span>
        {ngn > 0 ? (
          <span className="ml-1 text-xs text-muted-foreground">
            /{interval === "month" ? "month" : "year"}
          </span>
        ) : null}
      </p>
      <p className="mt-0.5 h-4 text-[11px] text-muted-foreground">
        {ngn > 0 && usd > 0 ? `≈ ${formatUsd(usd)} · charged in naira` : ""}
      </p>
      <ul className="mt-4 flex-1 space-y-2 text-sm">
        {plan.features.map((f) => (
          <li key={f} className="flex gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-cyan" aria-hidden />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      {children ? <div className="mt-5">{children}</div> : null}
    </div>
  );
}
