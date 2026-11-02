import { Link } from "@tanstack/react-router";
import { Coins } from "lucide-react";
import { useWallet } from "@/components/aduf/plan-summary";
import { formatTokens } from "@/lib/billing-types";

/** Tiny balance indicator on Home; turns amber when low and red when empty. */
export function TokenChip() {
  const ent = useWallet();
  if (!ent) return null;
  const total = ent.wallet.total;
  const tone =
    total <= 0
      ? "text-red-300"
      : total <= ent.wallet.planTokens * 0.2
        ? "text-amber-300"
        : "text-muted-foreground";
  return (
    <Link
      to="/billing"
      className={`inline-flex items-center gap-1.5 text-[11px] hover:text-foreground ${tone}`}
      title="AI tokens left — open Billing"
    >
      <Coins className="h-3 w-3" aria-hidden />{" "}
      {total <= 0 ? "Out of tokens" : `${formatTokens(total)} tokens left`}
    </Link>
  );
}
