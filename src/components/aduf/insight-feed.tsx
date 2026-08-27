import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import type { Insight, InsightSeverity } from "@/lib/aduf-types";
import { cn, timeAgo } from "@/lib/utils";

const SEVERITY_ICON: Record<InsightSeverity, typeof Info> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
};

const SEVERITY_COLOR: Record<InsightSeverity, string> = {
  info: "text-cyan",
  success: "text-[oklch(0.84_0.06_195)]",
  warning: "text-[oklch(0.78_0.12_70)]",
};

/** One insight/notification row. Shared by the Brain page feed and the
 *  full Notifications page — `compact` trims the body to one line. */
export function InsightRow({
  insight,
  onRead,
  onDismiss,
  compact = false,
}: {
  insight: Insight;
  onRead?: (id: string) => void;
  onDismiss?: (id: string) => void;
  compact?: boolean;
}) {
  const Icon = SEVERITY_ICON[insight.severity];
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 12 }}
      className={cn(
        "group flex items-start gap-3 rounded-2xl px-3 py-3 text-left transition-colors",
        insight.read ? "bg-white/4" : "bg-white/8",
      )}
    >
      <span className={cn("mt-0.5 shrink-0", SEVERITY_COLOR[insight.severity])}>
        <Icon className="h-4 w-4" />
      </span>
      <button
        onClick={() => onRead?.(insight.id)}
        className="min-w-0 flex-1 text-left"
        disabled={!onRead}
      >
        <div className="flex items-center gap-2">
          {insight.read ? null : (
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-cyan" aria-hidden />
          )}
          <p className="truncate text-sm font-medium">{insight.title}</p>
        </div>
        <p className={cn("mt-0.5 text-xs text-muted-foreground", compact && "line-clamp-1")}>
          {insight.body}
        </p>
        <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground/70">
          {insight.source} · {timeAgo(insight.createdAt)}
        </p>
      </button>
      {onDismiss ? (
        <button
          onClick={() => onDismiss(insight.id)}
          aria-label="Dismiss"
          className="shrink-0 rounded-full p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-white/8 hover:text-foreground group-hover:opacity-100"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </motion.div>
  );
}
