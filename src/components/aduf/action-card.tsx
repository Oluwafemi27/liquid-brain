import { Link, useRouter } from "@tanstack/react-router";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RotateCcw,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { ActionRecord, ActionStatus, Confidence, SourceRef } from "@/lib/aduf-types";
import { RISK_LABEL } from "@/lib/action-registry";
import { ageLabel } from "@/lib/sources";
import { decideActionFn, fetchActionsFn, undoActionFn } from "@/lib/server-fns";
import { useAuth } from "@/store/auth-store";

const STATE_DOT: Record<SourceRef["state"], string> = {
  fresh: "bg-emerald-400",
  stale: "bg-amber-400",
  missing: "bg-zinc-500",
};
const STATE_WORD: Record<SourceRef["state"], string> = {
  fresh: "up to date",
  stale: "out of date",
  missing: "no data",
};

/** The exact data behind a statement, each linking to where it can be checked. */
export function SourcesRow({
  sources,
  gaps,
}: {
  sources?: SourceRef[] | undefined;
  gaps?: string[] | undefined;
}) {
  if (!sources?.length && !gaps?.length) return null;
  return (
    <div className="mt-2 space-y-1.5">
      {sources?.length ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Based on
          </span>
          {sources.map((s) => (
            <Link
              key={`${s.label}-${s.href}`}
              to={s.href as "/"}
              title={s.note ?? `${s.label}: ${STATE_WORD[s.state]}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.07] px-2.5 py-1 text-[11px] text-foreground/90 transition-colors hover:bg-white/12"
            >
              <span className={`h-1.5 w-1.5 rounded-full ${STATE_DOT[s.state]}`} aria-hidden />
              {s.label}
              <span className="text-muted-foreground">
                · {s.state === "missing" ? "no data" : ageLabel(s.asOf)}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground">
          No stored data was used for this answer.
        </p>
      )}
      {gaps?.length ? (
        <p className="text-[11px] text-amber-300/90">
          Data I'm missing or that's out of date: {gaps.join(" · ")}
        </p>
      ) : null}
    </div>
  );
}

const CONF_STYLE: Record<Confidence, string> = {
  high: "bg-emerald-400/15 text-emerald-300",
  medium: "bg-amber-400/15 text-amber-300",
  low: "bg-zinc-400/15 text-zinc-300",
};
export function ConfidenceBadge({ level }: { level: Confidence }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${CONF_STYLE[level]}`}>
      {level} confidence
    </span>
  );
}

function timeLeft(iso: string | null): string | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return null;
  const h = Math.floor(ms / 3_600_000);
  return h >= 1 ? `${h}h left` : `${Math.max(1, Math.round(ms / 60_000))} min left`;
}

const DONE_LINE: Partial<Record<ActionStatus, string>> = {
  declined: "Declined — nothing was changed.",
  expired: "Expired — nobody approved it in time, so it was dropped.",
  undone: "Undone — it's been reversed.",
};

/** One proposed or completed action: what it will do, the likely outcome, limits, and the one-tap choice. */
export function ActionCard({
  action,
  onUpdate,
}: {
  action: ActionRecord;
  onUpdate: (a: ActionRecord) => void;
}) {
  const accessToken = useAuth((s) => s.accessToken);
  const router = useRouter();
  const [busy, setBusy] = useState<null | "approve" | "decline" | "undo">(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmOver, setConfirmOver] = useState(false);
  const p = action.preview;
  const over = action.overLimit || Boolean(p?.limit?.exceeded);

  const run = async (kind: "approve" | "decline" | "undo", overrideLimit = false) => {
    setBusy(kind);
    setError(null);
    try {
      const res =
        kind === "undo"
          ? await undoActionFn({ data: { accessToken, id: action.id } })
          : await decideActionFn({
              data: { accessToken, id: action.id, decision: kind, overrideLimit },
            });
      if (!res.ok) setError(res.error);
      else onUpdate(res.action);
    } catch {
      setError("That didn't go through. Check your connection and try again.");
    } finally {
      setBusy(null);
      setConfirmOver(false);
    }
  };

  const left = timeLeft(action.undoUntil);
  const done = action.status === "approved" || action.status === "auto_executed";

  return (
    <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm">
      <div className="flex items-start gap-2">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-cyan" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-medium break-words">{action.title}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {RISK_LABEL[action.risk]} ·{" "}
            {action.tier === "auto" ? "runs on its own (low-risk)" : "needs your OK"}
          </p>
        </div>
      </div>

      {action.reasoning ? (
        <p className="mt-2 text-xs text-muted-foreground">Why: {action.reasoning}</p>
      ) : null}

      {action.status === "proposed" && p ? (
        <div className="mt-3 space-y-2 rounded-xl bg-black/20 p-3 text-xs">
          <p className="font-medium text-foreground">{p.headline}</p>
          <ul className="space-y-0.5 text-muted-foreground">
            {p.effects.map((e) => (
              <li key={e}>· {e}</li>
            ))}
          </ul>
          {p.estimate?.length ? (
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
              {p.estimate.map((e) => (
                <div key={e.label} className="contents">
                  <dt className="text-muted-foreground">{e.label}</dt>
                  <dd className="text-right font-medium">{e.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          {p.unchanged.length ? (
            <p className="text-muted-foreground">Not touched: {p.unchanged.join(", ")}.</p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <ConfidenceBadge level={p.confidence} />
            <span className="text-[11px] text-muted-foreground">{p.confidenceNote}</span>
          </div>
          <SourcesRow sources={p.sources} />
        </div>
      ) : null}

      {over && action.status === "proposed" ? (
        <div className="mt-3 flex gap-2 rounded-xl bg-red-500/15 p-3 text-xs">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" aria-hidden />
          <p>
            <span className="font-medium">Over your limit. </span>
            {p?.limit?.note} ADUF won't do this unless you explicitly approve going over.
          </p>
        </div>
      ) : p?.limit?.note && action.status === "proposed" ? (
        <p className="mt-2 text-[11px] text-muted-foreground">{p.limit.note}</p>
      ) : null}

      {action.status === "proposed" ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {over && !confirmOver ? (
            <Button
              size="sm"
              variant="destructive"
              disabled={busy !== null}
              onClick={() => setConfirmOver(true)}
            >
              Approve anyway…
            </Button>
          ) : over ? (
            <Button
              size="sm"
              variant="destructive"
              disabled={busy !== null}
              onClick={() => void run("approve", true)}
            >
              {busy === "approve" ? <Loader2 className="animate-spin" /> : null}Yes, go over my
              limit
            </Button>
          ) : (
            <Button size="sm" disabled={busy !== null} onClick={() => void run("approve")}>
              {busy === "approve" ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}Approve
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            disabled={busy !== null}
            onClick={() => (confirmOver ? setConfirmOver(false) : void run("decline"))}
          >
            {confirmOver ? "Cancel" : "Decline"}
          </Button>
        </div>
      ) : null}

      {done ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" aria-hidden />
          <span>{action.result?.note ?? "Done."}</span>
          <span className="text-muted-foreground">
            {action.decidedBy === "auto" ? "Ran on its own." : "Approved by you."}
          </span>
          {action.result?.navigate ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => void router.navigate({ to: action.result!.navigate as never })}
            >
              Open page
            </Button>
          ) : left ? (
            <Button
              size="sm"
              variant="outline"
              disabled={busy !== null}
              onClick={() => void run("undo")}
            >
              {busy === "undo" ? <Loader2 className="animate-spin" /> : <RotateCcw />}Undo · {left}
            </Button>
          ) : (
            <span className="text-muted-foreground">
              Can't be undone{action.result?.manual ? " (you apply it yourself)" : ""}.
            </span>
          )}
        </div>
      ) : null}

      {DONE_LINE[action.status] ? (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <XCircle className="h-3.5 w-3.5" aria-hidden />
          {DONE_LINE[action.status]}
        </p>
      ) : null}
      {action.status === "failed" ? (
        <p className="mt-3 text-xs text-red-300">
          Failed: {action.error ?? "unknown error"}. Nothing was changed.
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-2 text-xs text-red-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Chat variant: loads the server's record for a proposal id so the card always reflects the truth,
 *  including after a page reload or when approved from another device. */
export function ServerActionCard({ actionId }: { actionId: string | undefined }) {
  const accessToken = useAuth((s) => s.accessToken);
  const [action, setAction] = useState<ActionRecord | null | "missing">(null);

  useEffect(() => {
    if (!actionId) return;
    let cancelled = false;
    fetchActionsFn({ data: { accessToken, ids: [actionId] } })
      .then((res) => {
        if (!cancelled) setAction(res.ok && res.actions[0] ? res.actions[0] : "missing");
      })
      .catch(() => !cancelled && setAction("missing"));
    return () => {
      cancelled = true;
    };
  }, [actionId, accessToken]);

  if (!actionId || action === "missing") {
    return (
      <p className="mt-2 text-[11px] text-muted-foreground">
        This suggestion is no longer available — ask me again if you still want it.
      </p>
    );
  }
  if (!action)
    return <div className="mt-3 h-24 animate-pulse rounded-2xl bg-white/[0.05]" aria-hidden />;
  return <ActionCard action={action} onUpdate={setAction} />;
}
