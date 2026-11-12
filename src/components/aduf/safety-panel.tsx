import { Loader2, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { GlassCard } from "@/components/aduf/liquid";
import { Button } from "@/components/ui/button";
import type { OwnerSettings } from "@/lib/aduf-types";
import { APPROVAL_RULES } from "@/lib/action-registry";
import { fetchOwnerSettingsFn, saveOwnerSettingsFn, sendDigestNowFn } from "@/lib/server-fns";
import { useAuth } from "@/store/auth-store";

const input =
  "w-full rounded-xl border border-white/10 bg-white/6 px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-xs text-muted-foreground">
      <span className="text-foreground">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-[11px]">{hint}</span> : null}
    </label>
  );
}

/** Spending & sending limits, approval rules, alert thresholds, quiet hours and the daily summary. */
export function SafetyPanel() {
  const accessToken = useAuth((s) => s.accessToken);
  const [s, setS] = useState<OwnerSettings | null>(null);
  const [emailAvailable, setEmailAvailable] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchOwnerSettingsFn({ data: { accessToken } })
      .then((r) => {
        if (r.ok) {
          setS(r.settings);
          setEmailAvailable(r.emailAvailable);
        } else setMsg({ ok: false, text: r.error });
      })
      .catch(() => setMsg({ ok: false, text: "Couldn't load your settings." }));
  }, [accessToken]);

  if (!s)
    return (
      <GlassCard hover={false} className="h-40 animate-pulse" aria-busy="true">
        <span className="sr-only">Loading</span>
      </GlassCard>
    );
  const set = <K extends keyof OwnerSettings>(k: K, v: OwnerSettings[K]) =>
    setS((cur) => (cur ? { ...cur, [k]: v } : cur));
  const num = (v: string) => (v === "" ? 0 : Number(v));

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const r = await saveOwnerSettingsFn({ data: { accessToken, patch: { ...s } } });
      if (r.ok) {
        setS(r.settings);
        setMsg({ ok: true, text: "Saved." });
      } else setMsg({ ok: false, text: r.error });
    } catch {
      setMsg({ ok: false, text: "Couldn't save. Try again." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <GlassCard hover={false} className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          <ShieldCheck className="h-4 w-4" /> Safety &amp; limits
        </h2>
        <p className="mt-2 text-xs text-muted-foreground">
          ADUF can't go past these without your explicit approval.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Biggest ad-budget increase per change (USD / day)"
          hint="A change above this shows a red warning and needs “Approve anyway”."
        >
          <input
            className={`${input} mt-1`}
            type="number"
            min={0}
            value={s.adChangeCapUsd}
            onChange={(e) => set("adChangeCapUsd", num(e.target.value))}
          />
        </Field>
        <Field
          label="Customer messages ADUF may send per day"
          hint="Auto-replies pause for the rest of the day once this is reached (rolling 24 hours)."
        >
          <input
            className={`${input} mt-1`}
            type="number"
            min={0}
            value={s.dailyMessageCap}
            onChange={(e) => set("dailyMessageCap", Math.round(num(e.target.value)))}
          />
        </Field>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium">What runs on its own, and what needs your OK</p>
        <ul className="divide-y divide-white/5 rounded-2xl bg-white/[0.04] text-xs">
          {APPROVAL_RULES.map((r) => (
            <li key={r.plain} className="flex items-center gap-3 px-3 py-2">
              <span className="flex-1">{r.plain}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${r.tier === "auto" ? "bg-emerald-400/15 text-emerald-300" : "bg-amber-400/15 text-amber-300"}`}
              >
                {r.tier === "auto" ? "Runs automatically" : "Needs your OK"}
              </span>
              <span className="w-28 text-right text-muted-foreground">{r.undo}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Anything that touches money, ads or customer messages always needs your OK, whatever else
          changes.
        </p>
      </div>

      <div className="space-y-4 border-t border-white/10 pt-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Alerts</p>
            <p className="text-xs text-muted-foreground">
              Only when something you care about crosses a line. Each says what happened, why it
              matters and what to do.
            </p>
          </div>
          <input
            type="checkbox"
            aria-label="Alerts"
            className="h-5 w-5 accent-white"
            checked={s.alertsEnabled}
            onChange={(e) => set("alertsEnabled", e.target.checked)}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Alert me if sales fall by (%)" hint="Compared with the 30 days before.">
            <input
              className={`${input} mt-1`}
              type="number"
              min={1}
              max={100}
              value={s.salesDropPct}
              onChange={(e) => set("salesDropPct", Math.round(num(e.target.value)))}
            />
          </Field>
          <Field label="Alert me after this many failed automation runs in a day">
            <input
              className={`${input} mt-1`}
              type="number"
              min={1}
              value={s.failedRunsThreshold}
              onChange={(e) => set("failedRunsThreshold", Math.round(num(e.target.value)))}
            />
          </Field>
          <Field label="Quiet hours start">
            <input
              className={`${input} mt-1`}
              type="time"
              value={s.quietStart}
              onChange={(e) => set("quietStart", e.target.value)}
            />
          </Field>
          <Field
            label="Quiet hours end"
            hint="No alerts are pushed to you in this window; they wait in the app and your daily summary."
          >
            <input
              className={`${input} mt-1`}
              type="time"
              value={s.quietEnd}
              onChange={(e) => set("quietEnd", e.target.value)}
            />
          </Field>
          <Field label="Time zone">
            <div className="mt-1 flex gap-2">
              <input
                className={input}
                value={s.timezone}
                onChange={(e) => set("timezone", e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => set("timezone", Intl.DateTimeFormat().resolvedOptions().timeZone)}
              >
                Use mine
              </Button>
            </div>
          </Field>
        </div>
      </div>

      <div className="space-y-4 border-t border-white/10 pt-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Daily summary</p>
            <p className="text-xs text-muted-foreground">
              Your daily verdict, sent to you each morning so you don't have to log in to feel
              informed.
            </p>
          </div>
          <input
            type="checkbox"
            aria-label="Daily summary"
            className="h-5 w-5 accent-white"
            checked={s.digestEnabled}
            onChange={(e) => set("digestEnabled", e.target.checked)}
          />
        </div>
        <Field
          label="Send it by"
          hint={
            emailAvailable
              ? "Email goes to your sign-in address."
              : "Email needs RESEND_API_KEY set on the server. WhatsApp isn't available (it needs a WhatsApp Business number)."
          }
        >
          <select
            className={`${input} mt-1`}
            value={s.digestChannel}
            onChange={(e) => set("digestChannel", e.target.value as "email" | "telegram")}
          >
            <option value="email">
              Email{emailAvailable ? "" : " (not set up on this server)"}
            </option>
            <option value="telegram">Telegram</option>
          </select>
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="animate-spin" /> : null}Save
        </Button>
        <Button
          variant="outline"
          disabled={sending}
          onClick={async () => {
            setSending(true);
            setMsg(null);
            try {
              const r = await sendDigestNowFn({ data: { accessToken } });
              setMsg(r.ok ? { ok: true, text: r.message } : { ok: false, text: r.error });
            } catch {
              setMsg({ ok: false, text: "Couldn't send. Try again." });
            } finally {
              setSending(false);
            }
          }}
        >
          {sending ? <Loader2 className="animate-spin" /> : null}Send me one now
        </Button>
        {msg ? (
          <p
            role={msg.ok ? "status" : "alert"}
            className={`text-xs ${msg.ok ? "text-emerald-300" : "text-red-300"}`}
          >
            {msg.text}
          </p>
        ) : null}
      </div>
    </GlassCard>
  );
}
