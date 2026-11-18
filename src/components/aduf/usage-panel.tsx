import type { HitWindow } from "@/lib/billing-types";
import { untilText } from "@/lib/usage-notices";
import { useUsage } from "@/store/usage-store";
import { GlassCard } from "./liquid";

function Meter({
  label,
  used,
  limit,
  hint,
}: {
  label: string;
  used: number;
  limit: number;
  hint?: string | undefined;
}) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const tone = pct >= 100 ? "bg-red-400" : pct >= 80 ? "bg-amber-400" : "bg-cyan";
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums">
          {limit > 0 ? `${used} of ${limit}` : `${used} · no cap`}
        </span>
      </div>
      {limit > 0 ? (
        <div
          className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10"
          role="progressbar"
          aria-label={label}
          aria-valuenow={used}
          aria-valuemin={0}
          aria-valuemax={limit}
        >
          <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
        </div>
      ) : null}
      {hint ? <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

const windowHint = (w: HitWindow) =>
  w.limit > 0 && w.used >= w.limit ? `Resets in ${untilText(w.resetsAt)}` : undefined;

/** What you've used this term: credits, replies per hour and per day, chat sessions and AI actions. */
export function UsagePanel() {
  const usage = useUsage((s) => s.usage);
  if (!usage)
    return (
      <GlassCard hover={false} className="rounded-2xl p-5 text-sm text-muted-foreground">
        Loading your usage…
      </GlassCard>
    );

  const total = usage.credits.limit + usage.credits.bonus;
  const used = Math.min(usage.credits.used, total);
  const demo = usage.term.kind === "demo";
  const fmt = (iso: string) =>
    new Date(iso).toLocaleString(undefined, {
      day: "numeric",
      month: "short",
      hour: demo ? "2-digit" : undefined,
      minute: demo ? "2-digit" : undefined,
    });

  return (
    <GlassCard hover={false} className="space-y-5 rounded-2xl p-5">
      <div>
        <h3 className="text-sm font-semibold">Usage this {demo ? "demo" : "term"}</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {fmt(usage.term.start)} to {fmt(usage.term.end)}
          {demo
            ? ""
            : ` · ${usage.term.daysLeft} ${usage.term.daysLeft === 1 ? "day" : "days"} left`}
        </p>
      </div>

      <Meter label="AI credits" used={used} limit={total} />
      <Meter
        label="Replies this hour"
        used={usage.hour.used}
        limit={usage.hour.limit}
        hint={windowHint(usage.hour)}
      />
      <Meter
        label="Replies today"
        used={usage.day.used}
        limit={usage.day.limit}
        hint={windowHint(usage.day)}
      />

      <dl className="grid grid-cols-2 gap-3 text-xs">
        <div className="rounded-xl bg-white/5 p-3">
          <dt className="text-muted-foreground">Chat sessions</dt>
          <dd className="mt-1 text-lg font-semibold tabular-nums">{usage.sessionsThisTerm}</dd>
        </div>
        <div className="rounded-xl bg-white/5 p-3">
          <dt className="text-muted-foreground">AI actions</dt>
          <dd className="mt-1 text-lg font-semibold tabular-nums">{usage.hitsThisTerm}</dd>
        </div>
      </dl>
    </GlassCard>
  );
}
