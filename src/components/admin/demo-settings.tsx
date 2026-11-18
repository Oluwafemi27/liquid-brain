import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { adminDemoFn, adminDemoSettingsFn } from "@/lib/server-fns";
import { useAuth } from "@/store/auth-store";

const inputCls =
  "w-full rounded-xl border border-white/10 bg-white/6 px-3 py-2 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring";

interface DemoData {
  settings: {
    enabled: boolean;
    keyOwnerEmail: string;
    sessionHours: number;
    dailyCreditCap: number;
    perIpHour: number;
  };
  stats: { sessionsToday: number; creditsToday: number; live: number };
  ownerFound: boolean;
}

/** Admin controls for "Continue as demo": on/off, whose model key visitors borrow, how long a visit lasts,
 *  and the spend limits that protect that key. Shows today's numbers so the limits can be tuned. */
export function DemoSettingsCard() {
  const { accessToken } = useAuth();
  const [data, setData] = useState<DemoData | null>(null);
  const [draft, setDraft] = useState<DemoData["settings"] | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(() => {
    adminDemoFn({ data: { accessToken } })
      .then((r) => {
        if ("settings" in r) {
          setData(r as DemoData);
          setDraft((r as DemoData).settings);
        }
      })
      .catch(() => undefined);
  }, [accessToken]);
  useEffect(load, [load]);

  if (!data || !draft) return null;
  const set = (patch: Partial<DemoData["settings"]>) => setDraft({ ...draft, ...patch });

  return (
    <div className="rounded-2xl border border-white/10 p-4">
      <p className="text-sm font-medium">Demo mode</p>
      <p className="mt-1 text-xs text-muted-foreground">
        "Continue as demo" gives every visitor their own private account (nothing is shared between
        visitors) on the Demo plan, using the model key of the account below. Each visit and
        everything in it is deleted when it ends.
      </p>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
        {[
          ["Live now", data.stats.live],
          ["Started today", data.stats.sessionsToday],
          ["Credits used today", data.stats.creditsToday],
        ].map(([label, value]) => (
          <div key={label as string} className="rounded-xl bg-white/5 p-2">
            <dd className="text-lg font-semibold tabular-nums">{value}</dd>
            <dt className="text-muted-foreground">{label}</dt>
          </div>
        ))}
      </dl>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="flex items-center gap-2 text-xs sm:col-span-2">
          <input
            type="checkbox"
            className="accent-white"
            checked={draft.enabled}
            onChange={(e) => set({ enabled: e.target.checked })}
          />
          Demo is on
        </label>
        <label className="block text-[11px] text-muted-foreground sm:col-span-2">
          Model key comes from this account
          <input
            className={`${inputCls} mt-1`}
            type="email"
            value={draft.keyOwnerEmail}
            onChange={(e) => set({ keyOwnerEmail: e.target.value })}
          />
          {!data.ownerFound ? (
            <span className="mt-1 block text-amber-300">
              No account has this email yet, so the demo can't answer.
            </span>
          ) : null}
        </label>
        <label className="block text-[11px] text-muted-foreground">
          Visit length (hours)
          <input
            className={`${inputCls} mt-1`}
            type="number"
            min={1}
            max={168}
            value={draft.sessionHours}
            onChange={(e) => set({ sessionHours: Number(e.target.value) })}
          />
        </label>
        <label className="block text-[11px] text-muted-foreground">
          Credits all visitors may use per day (0 = no cap)
          <input
            className={`${inputCls} mt-1`}
            type="number"
            min={0}
            value={draft.dailyCreditCap}
            onChange={(e) => set({ dailyCreditCap: Number(e.target.value) })}
          />
        </label>
        <label className="block text-[11px] text-muted-foreground">
          Demos one address can start per hour
          <input
            className={`${inputCls} mt-1`}
            type="number"
            min={1}
            max={100}
            value={draft.perIpHour}
            onChange={(e) => set({ perIpHour: Number(e.target.value) })}
          />
        </label>
        <Button
          size="sm"
          className="self-end"
          onClick={async () => {
            const r = await adminDemoSettingsFn({ data: { accessToken, patch: draft } });
            setMsg(r.ok ? "Saved." : r.error);
            if (r.ok) load();
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
  );
}
