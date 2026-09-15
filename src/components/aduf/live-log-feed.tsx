import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import type { Automation, Insight } from "@/lib/aduf-types";
import { cn, timeAgo } from "@/lib/utils";

const SEVERITY_DOT: Record<Insight["severity"], string> = {
  info: "bg-cyan",
  success: "bg-[oklch(0.84_0.06_195)]",
  warning: "bg-[oklch(0.78_0.12_70)]",
};

/**
 * Console-style feed of real system events: recent insights (automation
 * toggles, connected sources, goals hit) followed by each channel's current
 * status, straight from store state — no fabricated log lines.
 */
export function LiveLogFeed({
  insights,
  automations,
  className,
}: {
  insights: Insight[];
  automations: Automation[];
  className?: string;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [insights.length]);

  return (
    <div
      className={cn(
        "glass flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/20",
        className,
      )}
    >
      <div className="flex shrink-0 items-center gap-2 border-b border-white/10 px-4 py-2.5">
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ripple absolute inset-0 rounded-full bg-cyan" />
          <span className="relative h-2 w-2 rounded-full bg-cyan" />
        </span>
        <span className="font-display text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Live Feed
        </span>
      </div>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-4 py-3 font-mono text-[11px] leading-relaxed"
      >
        {insights.map((insight, i) => (
          <motion.div
            key={insight.id}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: Math.min(i, 6) * 0.03 }}
            className="flex items-start gap-2"
          >
            <span
              className={cn(
                "mt-1 h-1.5 w-1.5 shrink-0 rounded-full",
                SEVERITY_DOT[insight.severity],
              )}
              aria-hidden
            />
            <p className="min-w-0 flex-1 text-muted-foreground">
              <span className="text-foreground">{insight.title}</span>
              <span className="ml-1.5 text-muted-foreground/60">
                · {insight.source} · {timeAgo(insight.createdAt)}
              </span>
            </p>
          </motion.div>
        ))}

        <div className="!mt-4 border-t border-white/10 pt-3">
          <p className="mb-1.5 text-[9px] uppercase tracking-[0.2em] text-muted-foreground/60">
            Channel status
          </p>
          {automations.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-2 py-0.5">
              <span className="truncate text-muted-foreground/80">{a.name}</span>
              <span
                className={cn(
                  "shrink-0 text-[10px] font-semibold uppercase tracking-wider",
                  a.enabled ? "text-cyan" : "text-muted-foreground/50",
                )}
              >
                {a.enabled ? "live" : "standby"}
              </span>
            </div>
          ))}
        </div>

        <span className="inline-block h-3 w-1.5 animate-pulse bg-cyan/70" aria-hidden />
      </div>
    </div>
  );
}
