import { Link } from "@tanstack/react-router";
import { Coins } from "lucide-react";
import { useEffect, useState } from "react";
import { GlassCard } from "@/components/aduf/liquid";
import type { Entitlements } from "@/lib/billing-types";
import { formatTokens } from "@/lib/billing-types";
import { fetchWalletFn } from "@/lib/server-fns";
import { useAuth } from "@/store/auth-store";

export function useWallet() {
  const accessToken = useAuth((s) => s.accessToken);
  const [ent, setEnt] = useState<Entitlements | null>(null);
  useEffect(() => {
    if (!accessToken) return;
    fetchWalletFn({ data: { accessToken } })
      .then((r) => r.ok && setEnt(r.entitlements))
      .catch(() => undefined);
  }, [accessToken]);
  return ent;
}

export function TokenBar({ ent }: { ent: Entitlements }) {
  const { planTokens, planUsed, bonus } = ent.wallet;
  const pct = planTokens > 0 ? Math.min(100, Math.round((planUsed / planTokens) * 100)) : 100;
  const low = ent.wallet.total <= planTokens * 0.2 && ent.wallet.total > 0;
  return (
    <div>
      <div
        className="h-2 overflow-hidden rounded-full bg-white/10"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label="Monthly tokens used"
      >
        <div
          className={`h-full rounded-full ${ent.wallet.total <= 0 ? "bg-red-400" : low ? "bg-amber-400" : "bg-cyan"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1.5 flex flex-wrap justify-between gap-x-3 text-[11px] text-muted-foreground">
        <span>
          {formatTokens(ent.wallet.planRemaining)} of {formatTokens(planTokens)} monthly tokens left
        </span>
        {bonus > 0 ? <span>+ {formatTokens(bonus)} bonus</span> : null}
      </p>
    </div>
  );
}

/** Settings card: current plan and token balance, with a way into Billing. */
export function PlanSummaryCard() {
  const ent = useWallet();
  return (
    <GlassCard hover={false} className="space-y-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        <Coins className="h-4 w-4" /> Plan &amp; tokens
      </h2>
      {!ent ? (
        <div className="h-14 animate-pulse rounded-xl bg-white/[0.05]" aria-hidden />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm">
              <span className="text-lg font-semibold">{ent.plan.name}</span>
              {ent.subscription.status === "trialing" ? (
                <span className="ml-2 rounded-full bg-cyan/15 px-2 py-0.5 text-[10px] text-cyan">
                  Trial
                </span>
              ) : null}
            </p>
            <Link
              to="/billing"
              className="rounded-full bg-white/15 px-4 py-2 text-xs font-medium hover:bg-white/20"
            >
              Manage plan &amp; tokens
            </Link>
          </div>
          <TokenBar ent={ent} />
        </>
      )}
    </GlassCard>
  );
}
