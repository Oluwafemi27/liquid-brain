import { Check, Copy, Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge, KpiCard, Pager, SearchBox, SectionHeader, Table, Td } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import type { Plan, PromoCodeRow, TokenPack } from "@/lib/billing-types";
import { formatNgn, formatTokens } from "@/lib/billing-types";
import {
  adminBillingFn,
  adminBillingSettingsFn,
  adminCreatePromoFn,
  adminGrantPlanFn,
  adminGrantTokensFn,
  adminSetPromoActiveFn,
  adminSyncPaystackPlanFn,
  adminCreatePackFn,
  adminUpdatePackFn,
  adminUpdatePlanFn,
} from "@/lib/server-fns";
import type { BillingOverview } from "@/lib/server/checkout";
import { useAuth } from "@/store/auth-store";

interface AdminBilling {
  overview: BillingOverview;
  plans: Plan[];
  packs: TokenPack[];
  promos: PromoCodeRow[];
  settings: {
    trialEnabled: boolean;
    trialDays: number;
    trialPlan: string;
    tokensPerCredit: number;
  };
  paymentsReady: boolean;
}

function useAdminBilling() {
  const accessToken = useAuth((s) => s.accessToken);
  const [data, setData] = useState<AdminBilling | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async () => {
    const res = await adminBillingFn({ data: { accessToken } });
    if (res.ok) {
      const { ok: _ok, ...rest } = res;
      setData(rest as unknown as AdminBilling);
      setError(null);
    } else setError(res.error);
  }, [accessToken]);
  useEffect(() => {
    void reload();
  }, [reload]);
  return { data, error, reload, accessToken };
}

const inputCls =
  "w-full rounded-xl border border-white/10 bg-white/6 px-3 py-2 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring";
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block text-[11px] text-muted-foreground">
    {label}
    <div className="mt-1">{children}</div>
  </label>
);

// ------------------------------------------------------------ Plans & pricing

function PlanEditor({
  plan,
  onSaved,
  accessToken,
  paymentsReady,
}: {
  plan: Plan;
  onSaved: () => void;
  accessToken: string | null;
  paymentsReady: boolean;
}) {
  const [p, setP] = useState(plan);
  const [busy, setBusy] = useState<"save" | "sync" | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const num = (v: string) => (v === "" ? 0 : Number(v));
  const priceChanged =
    p.priceNgnMonth !== plan.priceNgnMonth || p.priceNgnYear !== plan.priceNgnYear;

  const save = async () => {
    setBusy("save");
    setMsg(null);
    const res = await adminUpdatePlanFn({
      data: {
        accessToken,
        id: plan.id,
        patch: {
          name: p.name,
          tagline: p.tagline,
          active: p.active,
          highlighted: p.highlighted,
          priceNgnMonth: p.priceNgnMonth,
          priceNgnYear: p.priceNgnYear,
          priceUsdMonth: p.priceUsdMonth,
          priceUsdYear: p.priceUsdYear,
          monthlyTokens: p.monthlyTokens,
          limits: p.limits,
          features: p.features,
        },
      },
    });
    setMsg(
      res.ok
        ? {
            ok: true,
            text: priceChanged
              ? "Saved. Price changed, so auto-renew is off until you sync it to Paystack."
              : "Saved.",
          }
        : { ok: false, text: res.error },
    );
    setBusy(null);
    if (res.ok) onSaved();
  };
  const sync = async () => {
    setBusy("sync");
    setMsg(null);
    const res = await adminSyncPaystackPlanFn({ data: { accessToken, id: plan.id } });
    setMsg(res.ok ? { ok: true, text: res.message } : { ok: false, text: res.error });
    setBusy(null);
    if (res.ok) onSaved();
  };

  return (
    <details className="group rounded-2xl border border-white/10 bg-white/[0.03]">
      <summary className="flex cursor-pointer list-none items-center gap-3 p-4">
        <span className="font-semibold">{plan.name}</span>
        {!plan.active ? <Badge>Hidden</Badge> : null}
        {plan.highlighted ? <Badge tone="info">Highlighted</Badge> : null}
        <span className="text-xs text-muted-foreground">
          {plan.priceNgnMonth ? `${formatNgn(plan.priceNgnMonth)}/mo` : "Free"} ·{" "}
          {formatTokens(plan.monthlyTokens)} credits
        </span>
        {plan.id !== "free" ? (
          <span className="ml-auto text-[11px]">
            {plan.autoRenewMonth || plan.autoRenewYear ? (
              <Badge tone="good">Auto-renew on</Badge>
            ) : (
              <Badge tone="warn">Manual renew only</Badge>
            )}
          </span>
        ) : null}
      </summary>
      <div className="space-y-4 border-t border-white/10 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name">
            <input
              className={inputCls}
              value={p.name}
              onChange={(e) => setP({ ...p, name: e.target.value })}
            />
          </Field>
          <Field label="Tagline">
            <input
              className={inputCls}
              value={p.tagline}
              onChange={(e) => setP({ ...p, tagline: e.target.value })}
            />
          </Field>
          <Field label="Price per month (₦, charged)">
            <input
              className={inputCls}
              type="number"
              min={0}
              disabled={plan.id === "free"}
              value={p.priceNgnMonth}
              onChange={(e) => setP({ ...p, priceNgnMonth: num(e.target.value) })}
            />
          </Field>
          <Field label="Price per year (₦, charged)">
            <input
              className={inputCls}
              type="number"
              min={0}
              disabled={plan.id === "free"}
              value={p.priceNgnYear}
              onChange={(e) => setP({ ...p, priceNgnYear: num(e.target.value) })}
            />
          </Field>
          <Field label="USD per month (display only)">
            <input
              className={inputCls}
              type="number"
              min={0}
              value={p.priceUsdMonth}
              onChange={(e) => setP({ ...p, priceUsdMonth: num(e.target.value) })}
            />
          </Field>
          <Field label="USD per year (display only)">
            <input
              className={inputCls}
              type="number"
              min={0}
              value={p.priceUsdYear}
              onChange={(e) => setP({ ...p, priceUsdYear: num(e.target.value) })}
            />
          </Field>
          <Field label="AI credits per month">
            <input
              className={inputCls}
              type="number"
              min={0}
              value={p.monthlyTokens}
              onChange={(e) => setP({ ...p, monthlyTokens: Math.round(num(e.target.value)) })}
            />
          </Field>
          <Field label="Custom automations allowed">
            <input
              className={inputCls}
              type="number"
              min={0}
              value={p.limits.automations}
              onChange={(e) =>
                setP({
                  ...p,
                  limits: { ...p.limits, automations: Math.round(num(e.target.value)) },
                })
              }
            />
          </Field>
          <Field label="Data sources allowed">
            <input
              className={inputCls}
              type="number"
              min={0}
              value={p.limits.dataSources}
              onChange={(e) =>
                setP({
                  ...p,
                  limits: { ...p.limits, dataSources: Math.round(num(e.target.value)) },
                })
              }
            />
          </Field>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs">
          {(["n8n", "sandbox", "digest"] as const).map((k) => (
            <label key={k} className="flex items-center gap-2">
              <input
                type="checkbox"
                className="accent-white"
                checked={p.limits[k]}
                onChange={(e) => setP({ ...p, limits: { ...p.limits, [k]: e.target.checked } })}
              />
              {k === "n8n"
                ? "n8n workflows"
                : k === "sandbox"
                  ? "Code execution"
                  : "Daily summary & pushed alerts"}
            </label>
          ))}
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="accent-white"
              checked={p.active}
              onChange={(e) => setP({ ...p, active: e.target.checked })}
            />
            Visible to customers
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="accent-white"
              checked={p.highlighted}
              onChange={(e) => setP({ ...p, highlighted: e.target.checked })}
            />
            Highlight as most popular
          </label>
        </div>
        <Field label="Bullet points on the pricing card (one per line)">
          <textarea
            className={`${inputCls} min-h-24`}
            value={p.features.join("\n")}
            onChange={(e) => setP({ ...p, features: e.target.value.split("\n").slice(0, 10) })}
          />
        </Field>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" disabled={busy !== null} onClick={() => void save()}>
            {busy === "save" ? <Loader2 className="animate-spin" /> : null}Save plan
          </Button>
          {plan.id !== "free" ? (
            <Button
              size="sm"
              variant="outline"
              disabled={busy !== null || !paymentsReady || priceChanged}
              title={priceChanged ? "Save your price change first" : undefined}
              onClick={() => void sync()}
            >
              {busy === "sync" ? <Loader2 className="animate-spin" /> : null}Enable auto-renew on
              Paystack
            </Button>
          ) : null}
          {msg ? (
            <span
              role={msg.ok ? "status" : "alert"}
              className={`text-xs ${msg.ok ? "text-emerald-300" : "text-red-300"}`}
            >
              {msg.text}
            </span>
          ) : null}
        </div>
      </div>
    </details>
  );
}

function PackRow({
  pack,
  accessToken,
  onSaved,
}: {
  pack: TokenPack;
  accessToken: string | null;
  onSaved: () => void;
}) {
  const [k, setK] = useState(pack);
  const [busy, setBusy] = useState(false);
  const dirty = JSON.stringify(k) !== JSON.stringify(pack);
  return (
    <tr>
      <Td>
        <input
          aria-label="Pack name"
          className={inputCls}
          value={k.name}
          onChange={(e) => setK({ ...k, name: e.target.value })}
        />
      </Td>
      <Td>
        <input
          aria-label="Credits"
          className={`${inputCls} w-24`}
          type="number"
          min={1}
          value={k.tokens}
          onChange={(e) => setK({ ...k, tokens: Math.round(Number(e.target.value)) })}
        />
      </Td>
      <Td>
        <input
          aria-label="Bonus credits"
          className={`${inputCls} w-24`}
          type="number"
          min={0}
          value={k.bonusTokens}
          onChange={(e) => setK({ ...k, bonusTokens: Math.round(Number(e.target.value)) })}
        />
      </Td>
      <Td>
        <input
          aria-label="Price in naira"
          className={`${inputCls} w-28`}
          type="number"
          min={0}
          value={k.priceNgn}
          onChange={(e) => setK({ ...k, priceNgn: Number(e.target.value) })}
        />
      </Td>
      <Td>
        <input
          type="checkbox"
          aria-label="Active"
          className="accent-white"
          checked={k.active}
          onChange={(e) => setK({ ...k, active: e.target.checked })}
        />
      </Td>
      <Td className="text-right">
        <Button
          size="sm"
          variant="outline"
          disabled={!dirty || busy}
          onClick={async () => {
            setBusy(true);
            await adminUpdatePackFn({
              data: {
                accessToken,
                id: pack.id,
                patch: {
                  name: k.name,
                  tokens: k.tokens,
                  bonusTokens: k.bonusTokens,
                  priceNgn: k.priceNgn,
                  active: k.active,
                },
              },
            });
            setBusy(false);
            onSaved();
          }}
        >
          Save
        </Button>
      </Td>
    </tr>
  );
}

export function PlansSection() {
  const { data, error, reload, accessToken } = useAdminBilling();
  const [settings, setSettings] = useState<AdminBilling["settings"] | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    if (data) setSettings(data.settings);
  }, [data]);
  return (
    <div className="space-y-8">
      <SectionHeader
        title="Plans & pricing"
        description="Everything customers see and are limited by. Prices are charged in naira through Paystack."
      />
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      {data && !data.paymentsReady ? (
        <p className="rounded-2xl bg-amber-400/10 p-3 text-xs text-amber-200">
          PAYSTACK_SECRET_KEY isn't set on the server, so nobody can pay yet. Set it, then add{" "}
          <code>/api/billing/paystack-webhook</code> as your Paystack webhook URL.
        </p>
      ) : null}
      {!data ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <div className="space-y-3">
            {data.plans.map((p) => (
              <PlanEditor
                key={`${p.id}-${p.priceNgnMonth}-${p.priceNgnYear}-${p.autoRenewMonth}`}
                plan={p}
                accessToken={accessToken}
                paymentsReady={data.paymentsReady}
                onSaved={() => void reload()}
              />
            ))}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Credit top-up packs</h3>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  const r = await adminCreatePackFn({
                    data: {
                      accessToken,
                      pack: {
                        name: "New pack",
                        tokens: 10,
                        bonusTokens: 0,
                        priceNgn: 1500,
                        priceUsd: 1,
                      },
                    },
                  });
                  setMsg(r.ok ? "Pack added. Set it up, then switch it on." : r.error);
                  void reload();
                }}
              >
                Add pack
              </Button>
            </div>
            <Table head={["Name", "Credits", "Bonus", "Price (₦)", "On sale", ""]}>
              {data.packs.map((k) => (
                <PackRow
                  key={`${k.id}-${k.tokens}-${k.bonusTokens}-${k.priceNgn}-${k.active}`}
                  pack={k}
                  accessToken={accessToken}
                  onSaved={() => void reload()}
                />
              ))}
            </Table>
          </div>

          {settings ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <h3 className="text-sm font-semibold">Free trial for new users</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                New sign-ups get a trial of a paid plan with no card, then fall back to Free.
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-5">
                <label className="flex items-center gap-2 self-end text-xs">
                  <input
                    type="checkbox"
                    className="accent-white"
                    checked={settings.trialEnabled}
                    onChange={(e) => setSettings({ ...settings, trialEnabled: e.target.checked })}
                  />
                  Trial on
                </label>
                <Field label="Days">
                  <input
                    className={inputCls}
                    type="number"
                    min={1}
                    max={90}
                    value={settings.trialDays}
                    onChange={(e) =>
                      setSettings({ ...settings, trialDays: Number(e.target.value) })
                    }
                  />
                </Field>
                <Field label="Trial plan">
                  <select
                    className={inputCls}
                    value={settings.trialPlan}
                    onChange={(e) => setSettings({ ...settings, trialPlan: e.target.value })}
                  >
                    {data.plans
                      .filter((p) => p.id !== "free")
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                  </select>
                </Field>
                <Field label="Model tokens per credit">
                  <input
                    className={inputCls}
                    type="number"
                    min={500}
                    value={settings.tokensPerCredit}
                    onChange={(e) =>
                      setSettings({ ...settings, tokensPerCredit: Number(e.target.value) })
                    }
                  />
                </Field>
                <Button
                  size="sm"
                  className="self-end"
                  onClick={async () => {
                    const r = await adminBillingSettingsFn({
                      data: { accessToken, patch: settings },
                    });
                    setMsg(r.ok ? "Saved." : r.error);
                  }}
                >
                  Save
                </Button>
              </div>
              {msg ? (
                <p role="status" className="mt-2 text-xs text-muted-foreground">
                  {msg}
                </p>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

// -------------------------------------------------------------- Promo codes

function describe(p: PromoCodeRow): string {
  return p.kind === "percent_off"
    ? `${p.percent}% off${p.appliesTo !== "any" ? ` (${p.appliesTo === "topup" ? "top-ups" : "plans"})` : ""}`
    : p.kind === "free_plan"
      ? `Free ${p.planId} · ${p.durationDays} days`
      : `${formatTokens(p.tokens ?? 0)} bonus credits`;
}

function CopyBtn({ text, label }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      aria-label={label ?? `Copy ${text}`}
      onClick={async () => {
        await navigator.clipboard?.writeText(text).catch(() => undefined);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] text-muted-foreground hover:bg-white/8 hover:text-foreground"
    >
      {done ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {label ?? ""}
    </button>
  );
}

export function PromoSection() {
  const { data, error, reload, accessToken } = useAdminBilling();
  const [kind, setKind] = useState<"percent_off" | "free_plan" | "bonus_tokens">("percent_off");
  const [percent, setPercent] = useState(20);
  const [planId, setPlanId] = useState("growth");
  const [days, setDays] = useState(30);
  const [tokens, setTokens] = useState(250000);
  const [appliesTo, setAppliesTo] = useState<"any" | "subscription" | "topup">("any");
  const [max, setMax] = useState("");
  const [expires, setExpires] = useState("");
  const [note, setNote] = useState("");
  const [prefix, setPrefix] = useState("ADUF");
  const [custom, setCustom] = useState("");
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [made, setMade] = useState<PromoCodeRow[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);

  const create = async () => {
    setBusy(true);
    setMsg(null);
    const res = await adminCreatePromoFn({
      data: {
        accessToken,
        kind,
        note: note || undefined,
        prefix: prefix || undefined,
        customCode: custom || undefined,
        quantity: custom ? 1 : qty,
        ...(kind === "percent_off"
          ? { percent, appliesTo }
          : kind === "free_plan"
            ? { planId, durationDays: days }
            : { tokens }),
        ...(max ? { maxRedemptions: Number(max) } : {}),
        ...(expires ? { expiresAt: new Date(`${expires}T23:59:59`).toISOString() } : {}),
      },
    }).catch(() => null);
    if (!res) setMsg("Couldn't create the codes.");
    else if (!res.ok) setMsg(res.error);
    else {
      setMade(res.codes);
      setCustom("");
      await reload();
    }
    setBusy(false);
  };

  const rows = useMemo(
    () =>
      (data?.promos ?? []).filter(
        (p) => !q || `${p.code} ${p.note}`.toLowerCase().includes(q.toLowerCase()),
      ),
    [data, q],
  );
  useEffect(() => setPage(0), [q]);

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Promo codes"
        description="Only admins can create codes. Codes are random and can't be guessed; wrong attempts are rate-limited per user."
      />
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <h3 className="text-sm font-semibold">Generate codes</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="What it does">
            <select
              className={inputCls}
              value={kind}
              onChange={(e) => setKind(e.target.value as typeof kind)}
            >
              <option value="percent_off">Percentage discount at checkout</option>
              <option value="free_plan">Free plan for a period</option>
              <option value="bonus_tokens">Bonus AI tokens</option>
            </select>
          </Field>
          {kind === "percent_off" ? (
            <>
              <Field label="Percent off">
                <input
                  className={inputCls}
                  type="number"
                  min={1}
                  max={100}
                  value={percent}
                  onChange={(e) => setPercent(Number(e.target.value))}
                />
              </Field>
              <Field label="Applies to">
                <select
                  className={inputCls}
                  value={appliesTo}
                  onChange={(e) => setAppliesTo(e.target.value as typeof appliesTo)}
                >
                  <option value="any">Plans and top-ups</option>
                  <option value="subscription">Plans only</option>
                  <option value="topup">Top-ups only</option>
                </select>
              </Field>
            </>
          ) : kind === "free_plan" ? (
            <>
              <Field label="Plan">
                <select
                  className={inputCls}
                  value={planId}
                  onChange={(e) => setPlanId(e.target.value)}
                >
                  {(data?.plans ?? [])
                    .filter((p) => p.id !== "free")
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
              </Field>
              <Field label="For how many days">
                <input
                  className={inputCls}
                  type="number"
                  min={1}
                  max={3650}
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                />
              </Field>
            </>
          ) : (
            <Field label="Tokens granted">
              <input
                className={inputCls}
                type="number"
                min={1}
                value={tokens}
                onChange={(e) => setTokens(Number(e.target.value))}
              />
            </Field>
          )}
          <Field label="Max uses per code (blank = unlimited)">
            <input
              className={inputCls}
              type="number"
              min={1}
              value={max}
              onChange={(e) => setMax(e.target.value)}
              placeholder={qty > 1 ? "1 (single-use)" : "unlimited"}
            />
          </Field>
          <Field label="Expires (optional)">
            <input
              className={inputCls}
              type="date"
              value={expires}
              onChange={(e) => setExpires(e.target.value)}
            />
          </Field>
          <Field label="Internal note">
            <input
              className={inputCls}
              value={note}
              maxLength={200}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Instagram giveaway"
            />
          </Field>
          <Field label="Code prefix">
            <input
              className={inputCls}
              value={prefix}
              maxLength={12}
              onChange={(e) => setPrefix(e.target.value)}
            />
          </Field>
          <Field label="How many codes (max 200)">
            <input
              className={inputCls}
              type="number"
              min={1}
              max={200}
              disabled={!!custom}
              value={custom ? 1 : qty}
              onChange={(e) => setQty(Number(e.target.value))}
            />
          </Field>
          <Field label="Or choose your own code">
            <input
              className={inputCls}
              value={custom}
              maxLength={40}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="LAUNCH2026"
            />
          </Field>
        </div>
        {custom ? (
          <p className="text-[11px] text-amber-200">
            Custom codes are easier to guess than random ones. Use a usage limit.
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm" disabled={busy} onClick={() => void create()}>
            {busy ? <Loader2 className="animate-spin" /> : null}Generate
          </Button>
          {msg ? (
            <span role="alert" className="text-xs text-red-300">
              {msg}
            </span>
          ) : null}
        </div>
        {made.length > 0 ? (
          <div className="rounded-xl bg-emerald-400/10 p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-emerald-200">
                {made.length} code{made.length === 1 ? "" : "s"} created — copy them now
              </p>
              <CopyBtn text={made.map((c) => c.code).join("\n")} label="Copy all" />
            </div>
            <ul className="mt-2 grid gap-1 font-mono text-xs sm:grid-cols-2">
              {made.slice(0, 40).map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between rounded bg-black/20 px-2 py-1"
                >
                  {c.code}
                  <CopyBtn text={c.code} />
                </li>
              ))}
            </ul>
            {made.length > 40 ? (
              <p className="mt-1 text-[11px] text-muted-foreground">
                Showing 40 — use “Copy all” for the full list.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div>
        <SectionHeader title="All codes">
          <SearchBox value={q} onChange={setQ} placeholder="Search code or note" />
        </SectionHeader>
        <Table
          head={["Code", "Gives", "Used", "Expires", "Note", ""]}
          empty={rows.length === 0 ? "No codes yet." : undefined}
        >
          {rows.slice(page * 10, page * 10 + 10).map((p) => {
            const expired = p.expiresAt ? new Date(p.expiresAt) < new Date() : false;
            const used = p.maxRedemptions !== null && p.redeemedCount >= p.maxRedemptions;
            return (
              <tr key={p.id}>
                <Td className="font-mono text-xs">
                  {p.code} <CopyBtn text={p.code} />
                </Td>
                <Td>{describe(p)}</Td>
                <Td className="tabular-nums">
                  {p.redeemedCount}
                  {p.maxRedemptions !== null ? ` / ${p.maxRedemptions}` : ""}
                </Td>
                <Td className="text-muted-foreground">
                  {p.expiresAt ? new Date(p.expiresAt).toLocaleDateString() : "—"}
                </Td>
                <Td className="max-w-[160px] truncate text-muted-foreground">{p.note || "—"}</Td>
                <Td className="text-right">
                  {!p.active ? (
                    <Badge>Disabled</Badge>
                  ) : expired ? (
                    <Badge tone="warn">Expired</Badge>
                  ) : used ? (
                    <Badge tone="warn">Used up</Badge>
                  ) : (
                    <Badge tone="good">Active</Badge>
                  )}{" "}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      await adminSetPromoActiveFn({
                        data: { accessToken, id: p.id, active: !p.active },
                      });
                      await reload();
                    }}
                  >
                    {p.active ? "Disable" : "Enable"}
                  </Button>
                </Td>
              </tr>
            );
          })}
        </Table>
        <Pager page={page} pages={Math.max(1, Math.ceil(rows.length / 10))} onPage={setPage} />
      </div>
    </div>
  );
}

// -------------------------------------------------------------- Subscribers

export function SubscribersSection() {
  const { data, error, reload, accessToken } = useAdminBilling();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [target, setTarget] = useState<BillingOverview["subscribers"][number] | null>(null);
  const [planId, setPlanId] = useState("growth");
  const [days, setDays] = useState(30);
  const [tokens, setTokens] = useState(100000);
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => setPage(0), [q]);
  const o = data?.overview;
  const rows = (o?.subscribers ?? []).filter(
    (s) => !q || s.email.toLowerCase().includes(q.toLowerCase()),
  );
  const planName = (id: string) => data?.plans.find((p) => p.id === id)?.name ?? id;

  const act = async (fn: () => Promise<{ ok: boolean; error?: string }>, ok: string) => {
    setMsg(null);
    const r = await fn().catch(() => ({ ok: false, error: "Failed." }));
    setMsg(r.ok ? ok : (r.error ?? "Failed."));
    if (r.ok) await reload();
  };

  return (
    <div>
      <SectionHeader title="Subscribers" description="Revenue and who's on which plan.">
        <SearchBox value={q} onChange={setQ} placeholder="Search email" />
      </SectionHeader>
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <KpiCard label="MRR" value={o ? formatNgn(o.mrrNgn) : "—"} hint="From paying subscribers" />
        <KpiCard label="Paying subscribers" value={o?.paidSubscribers ?? "—"} />
        <KpiCard label="On trial" value={o?.trialing ?? "—"} />
        <KpiCard label="Revenue (30 days)" value={o ? formatNgn(o.revenue30dNgn) : "—"} />
        <KpiCard label="Tokens used (30 days)" value={o ? formatTokens(o.tokensUsed30d) : "—"} />
      </div>
      {msg ? (
        <p role="status" className="mb-3 rounded-xl bg-white/[0.06] p-3 text-xs">
          {msg}
        </p>
      ) : null}
      <Table
        head={["User", "Plan", "Status", "Until", "Tokens used", "Bonus", ""]}
        empty={o && rows.length === 0 ? "No subscribers yet." : undefined}
      >
        {rows.slice(page * 10, page * 10 + 10).map((s) => (
          <tr key={s.userId}>
            <Td>{s.email}</Td>
            <Td>{planName(s.planId)}</Td>
            <Td>
              <Badge
                tone={
                  s.status === "past_due"
                    ? "bad"
                    : s.status === "trialing"
                      ? "info"
                      : s.source === "paystack"
                        ? "good"
                        : "neutral"
                }
              >
                {s.status === "active" ? s.source : s.status.replace("_", " ")}
              </Badge>
            </Td>
            <Td className="text-muted-foreground">
              {s.periodEnd ? new Date(s.periodEnd).toLocaleDateString() : "—"}
            </Td>
            <Td className="tabular-nums">{formatTokens(s.tokensUsed)}</Td>
            <Td className="tabular-nums">{formatTokens(s.bonus)}</Td>
            <Td className="text-right">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setTarget(s);
                  setMsg(null);
                }}
              >
                Grant…
              </Button>
            </Td>
          </tr>
        ))}
      </Table>
      <Pager page={page} pages={Math.max(1, Math.ceil(rows.length / 10))} onPage={setPage} />

      {target ? (
        <div
          role="dialog"
          aria-label={`Grant to ${target.email}`}
          className="fixed inset-y-0 right-0 z-50 w-full max-w-sm space-y-6 overflow-y-auto border-l border-white/10 bg-background p-5 shadow-2xl"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold">Grant to {target.email}</p>
              <p className="text-xs text-muted-foreground">Currently {planName(target.planId)}</p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setTarget(null)}>
              Close
            </Button>
          </div>
          <div className="space-y-3 rounded-2xl border border-white/10 p-4">
            <p className="text-sm font-medium">Set their plan</p>
            <Field label="Plan">
              <select
                className={inputCls}
                value={planId}
                onChange={(e) => setPlanId(e.target.value)}
              >
                {(data?.plans ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="For how many days">
              <input
                className={inputCls}
                type="number"
                min={1}
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
              />
            </Field>
            <Button
              size="sm"
              onClick={() =>
                void act(
                  () =>
                    adminGrantPlanFn({
                      data: { accessToken, userId: target.userId, planId, days },
                    }),
                  "Plan updated.",
                )
              }
            >
              Apply plan
            </Button>
          </div>
          <div className="space-y-3 rounded-2xl border border-white/10 p-4">
            <p className="text-sm font-medium">Give bonus tokens</p>
            <Field label="Tokens">
              <input
                className={inputCls}
                type="number"
                min={1}
                value={tokens}
                onChange={(e) => setTokens(Number(e.target.value))}
              />
            </Field>
            <Field label="Reason (shown in their history)">
              <input
                className={inputCls}
                value={note}
                maxLength={120}
                onChange={(e) => setNote(e.target.value)}
              />
            </Field>
            <Button
              size="sm"
              onClick={() =>
                void act(
                  () =>
                    adminGrantTokensFn({
                      data: { accessToken, userId: target.userId, tokens, note },
                    }),
                  "Tokens added.",
                )
              }
            >
              Add tokens
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ------------------------------------------------- Dashboard + connector demand

/** Revenue tiles for the Dashboard. */
export function RevenueKpis() {
  const { data } = useAdminBilling();
  const o = data?.overview;
  if (!o) return null;
  return (
    <div className="mt-8">
      <h3 className="mb-2 text-sm font-semibold">Revenue</h3>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="MRR" value={formatNgn(o.mrrNgn)} hint={`${o.paidSubscribers} paying`} />
        <KpiCard label="Revenue (30 days)" value={formatNgn(o.revenue30dNgn)} />
        <KpiCard label="On trial" value={o.trialing} />
        <KpiCard
          label="Tokens used (30 days)"
          value={formatTokens(o.tokensUsed30d)}
          hint="Across all users"
        />
      </div>
    </div>
  );
}

/** What people asked for in the connector hub — build the top of this list next. */
export function RequestedConnectors() {
  const accessToken = useAuth((s) => s.accessToken);
  const [rows, setRows] = useState<
    { name: string; count: number; last: string; notes: string[] }[] | null
  >(null);
  useEffect(() => {
    import("@/lib/server-fns")
      .then((m) => m.adminConnectorRequestsFn({ data: { accessToken } }))
      .then((r) => setRows(r ?? []))
      .catch(() => setRows([]));
  }, [accessToken]);
  return (
    <div className="mt-10">
      <h3 className="mb-1 text-sm font-semibold">Requested platforms</h3>
      <p className="mb-3 text-xs text-muted-foreground">
        What people asked for in the connector list, most requested first.
      </p>
      <Table
        head={["Platform", "Requests", "Latest", "What they'd do with it"]}
        empty={rows && rows.length === 0 ? "No requests yet." : undefined}
      >
        {(rows ?? []).slice(0, 25).map((r) => (
          <tr key={r.name}>
            <Td className="font-medium">{r.name}</Td>
            <Td className="tabular-nums">{r.count}</Td>
            <Td className="text-muted-foreground">{new Date(r.last).toLocaleDateString()}</Td>
            <Td className="text-muted-foreground">{r.notes.join(" · ") || "—"}</Td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
