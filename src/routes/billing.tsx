import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, Loader2, Tag, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/aduf/app-shell";
import { GlassCard } from "@/components/aduf/liquid";
import { PlanCard } from "@/components/aduf/plan-card";
import { TokenBar } from "@/components/aduf/plan-summary";
import { Button } from "@/components/ui/button";
import type {
  BillingInterval,
  Entitlements,
  PaymentView,
  Plan,
  PromoPreview,
  TokenPack,
  UsageByFeature,
} from "@/lib/billing-types";
import { FEATURE_LABEL, formatNgn, formatTokens, planRank } from "@/lib/billing-types";
import {
  applyPromoFn,
  cancelSubscriptionFn,
  fetchBillingFn,
  resumeSubscriptionFn,
  startCheckoutFn,
  verifyPaymentFn,
} from "@/lib/server-fns";
import { useAuth } from "@/store/auth-store";

export const Route = createFileRoute("/billing")({
  head: () => ({
    meta: [
      { title: "Plan & credits — ADUF AI" },
      { name: "description", content: "Manage your ADUF AI plan, AI credits and payments." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BillingPage,
});

interface BillingData {
  entitlements: Entitlements;
  plans: Plan[];
  packs: TokenPack[];
  payments: PaymentView[];
  usage: UsageByFeature[];
  paymentsReady: boolean;
}

type Banner = { ok: boolean; text: string } | null;
const fmtDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

function BillingPage() {
  const { accessToken, status } = useAuth();
  const [data, setData] = useState<BillingData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<Banner>(null);
  const [interval, setInterval_] = useState<BillingInterval>("month");
  const [autoRenew, setAutoRenew] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [promoText, setPromoText] = useState("");
  const [discount, setDiscount] = useState<PromoPreview | null>(null);
  const [promoBusy, setPromoBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetchBillingFn({ data: { accessToken } });
    if (res.ok) {
      const { ok: _ok, ...rest } = res;
      setData(rest as BillingData);
      setError(null);
    } else setError(res.error);
  }, [accessToken]);

  // Coming back from Paystack (?reference=…): confirm the payment with Paystack, then show the result.
  useEffect(() => {
    if (!accessToken) return;
    const params = new URLSearchParams(window.location.search);
    const reference = params.get("reference") ?? params.get("trxref");
    void (async () => {
      if (reference) {
        window.history.replaceState({}, "", window.location.pathname);
        const res = await verifyPaymentFn({ data: { accessToken, reference } }).catch(() => null);
        setBanner(
          !res
            ? {
                ok: false,
                text: "Couldn't confirm the payment. If you were charged it will appear here shortly.",
              }
            : res.ok
              ? { ok: res.status !== "failed", text: res.message }
              : { ok: false, text: res.error },
        );
      }
      await load();
    })();
  }, [accessToken, load]);

  const checkout = async (input: { planId?: string; packId?: string }, key: string) => {
    setBusy(key);
    setBanner(null);
    try {
      const res = await startCheckoutFn({
        data: {
          accessToken,
          ...input,
          interval,
          autoRenew,
          promoCode: discount?.code,
          origin: window.location.origin,
        },
      });
      if (!res.ok) return setBanner({ ok: false, text: res.error });
      if (res.url)
        window.location.href = res.url; // off to Paystack
      else {
        setBanner({ ok: true, text: "Done — your discount covered it in full." });
        setDiscount(null);
        await load();
      }
    } catch {
      setBanner({ ok: false, text: "Couldn't start the payment. Try again." });
    } finally {
      setBusy(null);
    }
  };

  const applyPromo = async () => {
    setPromoBusy(true);
    setBanner(null);
    try {
      const res = await applyPromoFn({ data: { accessToken, code: promoText } });
      if (!res.ok) return setBanner({ ok: false, text: res.error });
      setBanner({ ok: true, text: res.message });
      setPromoText("");
      if (res.mode === "discount") setDiscount(res.preview);
      else await load();
    } catch {
      setBanner({ ok: false, text: "Couldn't check that code. Try again." });
    } finally {
      setPromoBusy(false);
    }
  };

  const manage = async (kind: "cancel" | "resume") => {
    setBusy(kind);
    const res = await (kind === "cancel" ? cancelSubscriptionFn : resumeSubscriptionFn)({
      data: { accessToken },
    }).catch(() => null);
    setBanner(
      !res
        ? { ok: false, text: "That didn't go through." }
        : res.ok
          ? { ok: true, text: res.message }
          : { ok: false, text: res.error },
    );
    await load();
    setBusy(null);
  };

  if (status === "signed-out") {
    return (
      <AppShell>
        <div className="mx-auto max-w-xl px-4 py-16 text-center text-sm text-muted-foreground">
          Sign in to manage your plan.
        </div>
      </AppShell>
    );
  }

  const ent = data?.entitlements;
  const sub = ent?.subscription;
  const current = ent?.plan;
  const paid = sub && sub.planId !== "free";
  const statusLine = !sub
    ? ""
    : sub.status === "past_due"
      ? "Payment failed — update your card to keep this plan."
      : sub.status === "trialing"
        ? `Free trial until ${fmtDate(sub.currentPeriodEnd)}`
        : !paid
          ? "Free forever"
          : sub.cancelAtPeriodEnd
            ? `Ends ${fmtDate(sub.currentPeriodEnd)} — won't renew`
            : sub.autoRenews
              ? `Renews ${fmtDate(sub.currentPeriodEnd)}`
              : `Active until ${fmtDate(sub.currentPeriodEnd)} — renew before then to keep it`;

  return (
    <AppShell>
      <div className="mx-auto max-w-[1100px] space-y-6 px-4 py-6 sm:px-6 lg:py-10">
        <div>
          <h1 className="text-2xl font-semibold">Plan &amp; credits</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            AI credits power every answer, plan and reply. A normal reply costs 1 credit. Your
            allowance renews every 30 days; extra credits never expire.
          </p>
        </div>

        {banner ? (
          <div
            role={banner.ok ? "status" : "alert"}
            className={`flex gap-2 rounded-2xl p-3 text-sm ${banner.ok ? "bg-emerald-400/10 text-emerald-200" : "bg-red-400/10 text-red-200"}`}
          >
            {banner.ok ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            {banner.text}
          </div>
        ) : null}
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
        {data && !data.paymentsReady ? (
          <p className="rounded-2xl bg-amber-400/10 p-3 text-xs text-amber-200">
            Payments aren't switched on for this workspace yet — your admin needs to add a Paystack
            key. You can still use any promo code below.
          </p>
        ) : null}

        {!data && !error ? (
          <div className="h-48 animate-pulse rounded-3xl bg-white/[0.05]" aria-busy="true" />
        ) : null}

        {ent && current && sub ? (
          <GlassCard hover={false} className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Current plan
                </p>
                <p className="text-2xl font-semibold">{current.name}</p>
                <p
                  className={`mt-0.5 text-xs ${sub.status === "past_due" ? "text-red-300" : "text-muted-foreground"}`}
                >
                  {statusLine}
                </p>
              </div>
              {paid && sub.source === "paystack" ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy !== null}
                  onClick={() => void manage(sub.cancelAtPeriodEnd ? "resume" : "cancel")}
                >
                  {busy === "cancel" || busy === "resume" ? (
                    <Loader2 className="animate-spin" />
                  ) : null}
                  {sub.cancelAtPeriodEnd ? "Keep my plan" : "Cancel plan"}
                </Button>
              ) : null}
            </div>
            <TokenBar ent={ent} />
            <p className="text-[11px] text-muted-foreground">
              Monthly allowance resets on {fmtDate(ent.wallet.periodEnd)}. Allowance is used first,
              then extra credits.
            </p>
            {ent.wallet.total <= 0 ? (
              <p className="rounded-xl bg-red-400/10 p-3 text-xs text-red-200">
                You're out of credits, so ADUF can't answer until your allowance resets. Top up
                below or upgrade your plan.
              </p>
            ) : null}
          </GlassCard>
        ) : null}

        {/* Promo code */}
        {data ? (
          <GlassCard hover={false} className="space-y-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Tag className="h-4 w-4" /> Have a promo code?
            </h2>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={promoText}
                onChange={(e) => setPromoText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && promoText.trim() && void applyPromo()}
                placeholder="e.g. ADUF-7K3Q-9XPM-4TWD"
                aria-label="Promo code"
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/6 px-3 py-2.5 text-sm uppercase tracking-wide outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              <Button disabled={promoBusy || !promoText.trim()} onClick={() => void applyPromo()}>
                {promoBusy ? <Loader2 className="animate-spin" /> : null}Apply
              </Button>
            </div>
            {discount ? (
              <p className="inline-flex items-center gap-2 rounded-full bg-cyan/15 py-1 pl-3 pr-1 text-xs text-cyan">
                {discount.description} · {discount.code}
                <button
                  type="button"
                  aria-label="Remove discount"
                  onClick={() => setDiscount(null)}
                  className="rounded-full p-1 hover:bg-white/10"
                >
                  <X className="h-3 w-3" />
                </button>
              </p>
            ) : null}
          </GlassCard>
        ) : null}

        {/* Plans */}
        {data ? (
          <section aria-labelledby="plans-title">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <h2 id="plans-title" className="text-lg font-semibold">
                Choose a plan
              </h2>
              <div
                role="group"
                aria-label="Billing period"
                className="inline-flex rounded-full bg-white/[0.07] p-1 text-xs"
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
              {data.plans.map((p) => {
                const isCurrent = current?.id === p.id;
                const higher = current ? planRank(p.id) > planRank(current.id) : true;
                const canRenew =
                  (p.autoRenewMonth && interval === "month") ||
                  (p.autoRenewYear && interval === "year");
                return (
                  <PlanCard key={p.id} plan={p} interval={interval} current={isCurrent}>
                    {p.id === "free" ? (
                      <p className="text-center text-xs text-muted-foreground">
                        {isCurrent ? "You're on Free" : "Included for everyone"}
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {canRenew && !discount ? (
                          <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
                            <input
                              type="checkbox"
                              checked={autoRenew}
                              onChange={(e) => setAutoRenew(e.target.checked)}
                              className="accent-white"
                            />{" "}
                            Renew automatically
                          </label>
                        ) : null}
                        <Button
                          className="w-full"
                          variant={p.highlighted ? "default" : "outline"}
                          disabled={busy !== null || !data.paymentsReady}
                          onClick={() => void checkout({ planId: p.id }, p.id)}
                        >
                          {busy === p.id ? <Loader2 className="animate-spin" /> : null}
                          {isCurrent ? "Renew" : higher ? "Upgrade" : "Switch"}
                        </Button>
                      </div>
                    )}
                  </PlanCard>
                );
              })}
            </div>
            <p className="mt-3 text-center text-[11px] text-muted-foreground">
              Secure payment by Paystack — cards, bank transfer and more. Prices are charged in
              naira.
            </p>
          </section>
        ) : null}

        {/* Top-ups */}
        {data && data.packs.length > 0 ? (
          <section aria-labelledby="packs-title">
            <h2 id="packs-title" className="mb-1 text-lg font-semibold">
              Need more credits?
            </h2>
            <p className="mb-4 text-xs text-muted-foreground">
              Top-ups never expire and are used after your monthly allowance.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              {data.packs.map((k) => (
                <div
                  key={k.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4"
                >
                  <div>
                    <p className="font-semibold">
                      {formatTokens(k.tokens)} credits
                      {k.bonusTokens > 0 ? (
                        <span className="ml-1.5 rounded-full bg-emerald-400/15 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                          +{formatTokens(k.bonusTokens)} bonus
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatNgn(k.priceNgn)}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy !== null || !data.paymentsReady}
                    onClick={() => void checkout({ packId: k.id }, k.id)}
                  >
                    {busy === k.id ? <Loader2 className="animate-spin" /> : null}Buy
                  </Button>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* Usage */}
        {data ? (
          <GlassCard hover={false}>
            <h2 className="text-sm font-semibold">Where your credits went (last 30 days)</h2>
            {data.usage.length === 0 ? (
              <p className="mt-3 text-xs text-muted-foreground">Nothing used yet.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {(() => {
                  const max = Math.max(...data.usage.map((u) => u.tokens));
                  return data.usage.map((u) => (
                    <li key={u.feature} className="text-xs">
                      <div className="flex justify-between">
                        <span>{FEATURE_LABEL[u.feature] ?? u.feature}</span>
                        <span className="text-muted-foreground">{formatTokens(u.tokens)}</span>
                      </div>
                      <div className="mt-1 h-1.5 rounded-full bg-white/8">
                        <div
                          className="h-full rounded-full bg-white/50"
                          style={{ width: `${(u.tokens / max) * 100}%` }}
                        />
                      </div>
                    </li>
                  ));
                })()}
              </ul>
            )}
          </GlassCard>
        ) : null}

        {/* History */}
        {data ? (
          <GlassCard hover={false}>
            <h2 className="text-sm font-semibold">Payment history</h2>
            {data.payments.length === 0 ? (
              <p className="mt-3 text-xs text-muted-foreground">No payments yet.</p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[480px] text-left text-xs">
                  <thead className="text-muted-foreground">
                    <tr>
                      <th className="pb-2 font-medium">Date</th>
                      <th className="pb-2 font-medium">For</th>
                      <th className="pb-2 font-medium">Amount</th>
                      <th className="pb-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {data.payments.map((p) => (
                      <tr key={p.id}>
                        <td className="py-2 text-muted-foreground">{fmtDate(p.at)}</td>
                        <td className="py-2">{p.label}</td>
                        <td className="py-2 tabular-nums">
                          {formatNgn(p.amountNgn)}
                          {p.discountNgn > 0 ? (
                            <span className="ml-1 text-muted-foreground">
                              (−{formatNgn(p.discountNgn)})
                            </span>
                          ) : null}
                        </td>
                        <td className="py-2">
                          <span
                            className={
                              p.status === "success"
                                ? "text-emerald-300"
                                : p.status === "pending"
                                  ? "text-amber-300"
                                  : "text-muted-foreground"
                            }
                          >
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </GlassCard>
        ) : null}
      </div>
    </AppShell>
  );
}
