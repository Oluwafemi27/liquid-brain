import { Link } from "@tanstack/react-router";
import { ChevronDown, RefreshCw } from "lucide-react";
import { useCallback, useState, type CSSProperties } from "react";
import { ActionCard, ConfidenceBadge, SourcesRow } from "@/components/aduf/action-card";
import { ActivityFeed } from "@/components/aduf/activity-feed";
import { TokenChip } from "@/components/aduf/token-chip";
import { GlassCard } from "@/components/aduf/liquid";
import { useLiveRefresh } from "@/hooks/use-live-refresh";
import type { ActionRecord, DailyVerdict, VerdictStatus } from "@/lib/aduf-types";
import { firstInsights } from "@/lib/first-insight";
import { ageLabel } from "@/lib/sources";
import { fetchVerdictFn } from "@/lib/server-fns";
import { useAduf } from "@/store/aduf-store";
import { useAuth } from "@/store/auth-store";

export const STATUS_STYLE: Record<
  VerdictStatus,
  { dot: string; border: string; rgb: string; word: string }
> = {
  green: {
    dot: "bg-emerald-400",
    border: "border-emerald-400/60",
    rgb: "52 211 153",
    word: "On track",
  },
  amber: {
    dot: "bg-amber-400",
    border: "border-amber-400/60",
    rgb: "251 191 36",
    word: "Needs a look",
  },
  red: { dot: "bg-red-400", border: "border-red-400/60", rgb: "248 113 113", word: "Needs you" },
  unknown: {
    dot: "bg-zinc-400",
    border: "border-zinc-400/40",
    rgb: "161 161 170",
    word: "Not enough data yet",
  },
};

/** The verdict itself — one plain sentence, one status — so it can also be shown as a static sample. */
export function VerdictView({
  verdict,
  sample = false,
}: {
  verdict: DailyVerdict;
  sample?: boolean;
}) {
  const st = STATUS_STYLE[verdict.status];
  return (
    <div>
      <div className="flex items-center gap-3">
        {/* The status light glows continuously (a still glow if the device asks for reduced motion). */}
        <span
          className={`verdict-orb grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 ${st.border}`}
          style={{ "--orb": st.rgb } as CSSProperties}
          role="img"
          aria-label={`Status: ${st.word}`}
        >
          <span className={`verdict-orb-dot h-3 w-3 rounded-full ${st.dot}`} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {sample ? "Example · " : "Today · "}
            {st.word}
          </p>
          <h2 className="text-[15px] font-semibold leading-snug sm:text-lg">{verdict.headline}</h2>
        </div>
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">{verdict.subline}</p>
      <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-muted-foreground">
        <ConfidenceBadge level={verdict.confidence} />
        <span>{verdict.confidenceNote}</span>
      </p>
    </div>
  );
}

const LEVEL_DOT = { act: "bg-red-400", watch: "bg-amber-400", ok: "bg-emerald-400" } as const;

/** Top of the Home screen: the daily verdict, anything waiting for approval, and the checks behind it. */
export function DailyVerdictCard() {
  const accessToken = useAuth((s) => s.accessToken);
  const businessMeta = useAduf((s) => s.businessMeta);
  const series = useAduf((s) => s.series);
  const channelRevenue = useAduf((s) => s.channelRevenue);
  const topCustomers = useAduf((s) => s.topCustomers);
  const [verdict, setVerdict] = useState<DailyVerdict | null>(null);
  const [pending, setPending] = useState<ActionRecord[]>([]);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [feedKey, setFeedKey] = useState(0);

  const load = useCallback(
    async (refreshHealth = false) => {
      try {
        const res = await fetchVerdictFn({ data: { accessToken, refreshHealth } });
        if (!res.ok) throw new Error(res.error);
        setVerdict(res.verdict);
        setPending(res.pending);
        setError(false);
      } catch {
        setError(true);
      }
    },
    [accessToken],
  );
  useLiveRefresh(() => void load(), 120_000, Boolean(accessToken));

  const insights = businessMeta
    ? firstInsights({
        series,
        channelRevenue,
        topCustomers,
        ...businessMeta,
        channelPeriod: businessMeta.channelPeriod,
      })
    : [];

  if (!verdict) {
    return (
      <GlassCard hover={false} className="mb-4 min-h-[112px] p-5">
        {error ? (
          <p className="text-sm text-muted-foreground">
            I couldn't run today's check.{" "}
            <button className="underline underline-offset-4" onClick={() => void load()}>
              Try again
            </button>
          </p>
        ) : (
          <div className="flex items-start gap-3.5" aria-busy="true">
            <div className="h-11 w-11 animate-pulse rounded-full bg-white/10" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-24 animate-pulse rounded bg-white/10" />
              <div className="h-5 w-3/4 animate-pulse rounded bg-white/10" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-white/10" />
            </div>
          </div>
        )}
      </GlassCard>
    );
  }

  const showCta = verdict.status === "unknown";
  return (
    <GlassCard hover={false} className="mb-3 p-3.5 sm:p-5">
      <VerdictView verdict={verdict} />

      {showCta ? (
        <div className="mt-4 rounded-2xl bg-white/[0.05] p-4 text-sm">
          <p className="font-medium">Start with one thing — everything else can wait.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Upload a spreadsheet of your sales (about a minute, no account linking), or connect
            Google Analytics. You'll get a real read straight away.
          </p>
          <Link
            to="/analytics"
            className="mt-3 inline-flex rounded-full bg-white/15 px-4 py-2 text-xs font-medium hover:bg-white/20"
          >
            Get my first insight
          </Link>
        </div>
      ) : null}

      {pending.length > 0 ? (
        <div className="mt-3">
          <p className="text-xs font-medium">Waiting for your OK</p>
          {pending.slice(0, 3).map((a) => (
            <ActionCard
              key={a.id}
              action={a}
              onUpdate={(next) => {
                setPending((cur) =>
                  next.status === "proposed"
                    ? cur.map((c) => (c.id === next.id ? next : c))
                    : cur.filter((c) => c.id !== next.id),
                );
                setFeedKey((k) => k + 1);
                void load();
              }}
            />
          ))}
          {pending.length > 3 ? (
            <p className="mt-2 text-xs text-muted-foreground">
              +{pending.length - 3} more waiting.
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.07] px-3 py-1 text-[11px] hover:bg-white/12"
        >
          What I checked
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        <Link
          to="/analytics"
          className="rounded-full px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
        >
          See the numbers →
        </Link>
        <button
          type="button"
          disabled={refreshing}
          onClick={async () => {
            setRefreshing(true);
            await load(true);
            setRefreshing(false);
          }}
          className="ml-auto inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground"
          title="Re-check connections now"
        >
          <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} /> Checked{" "}
          {ageLabel(verdict.generatedAt)}
        </button>
      </div>

      {open ? (
        <div className="mt-4 space-y-4 border-t border-white/10 pt-4">
          <ul className="space-y-3">
            {verdict.items.length === 0 ? (
              <li className="text-xs text-muted-foreground">
                Nothing to check yet — connect a source or set a goal.
              </li>
            ) : null}
            {verdict.items.map((i) => (
              <li key={i.id} className="flex gap-2.5">
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${LEVEL_DOT[i.level]}`}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm">{i.text}</p>
                  <p className="text-xs text-muted-foreground">
                    {i.why}
                    {i.suggestion ? ` ${i.suggestion}` : ""}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <ConfidenceBadge level={i.confidence} />
                  </div>
                  <SourcesRow sources={i.sources} />
                </div>
              </li>
            ))}
          </ul>

          {insights.length > 0 ? (
            <div>
              <p className="mb-2 text-xs font-medium">What your data says</p>
              <ul className="space-y-2">
                {insights.map((i) => (
                  <li key={i.id} className="text-sm">
                    {i.text} <span className="text-xs text-muted-foreground">{i.basis}</span>
                    <SourcesRow sources={[i.source]} />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div>
            <div className="mb-1 flex items-center justify-between">
              <p className="text-xs font-medium">Recent activity</p>
              <Link
                to="/analytics"
                className="text-[11px] text-muted-foreground hover:text-foreground"
              >
                Full log →
              </Link>
            </div>
            <ActivityFeed compact limit={4} refreshKey={feedKey} />
          </div>
        </div>
      ) : null}
    </GlassCard>
  );
}
