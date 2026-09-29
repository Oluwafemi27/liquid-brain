import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useAduf } from "@/store/aduf-store";
import type { Insight, InsightSeverity } from "@/lib/aduf-types";

const AUTO_DISMISS_MS = 8000;
const MAX_VISIBLE = 4;

function dotColor(severity: InsightSeverity) {
  if (severity === "success") return "bg-emerald-400";
  if (severity === "warning") return "bg-amber-400";
  return "bg-cyan";
}

/** Live pop-up stack, mounted only on the Brain page. The Insight Feed
 *  card on /goals is the browsable history; this is the "something just
 *  happened" surface — the instant NotificationsBootstrap's realtime
 *  subscription sees a new row land in `insights` (a goal hit, an
 *  automation run, a new source connected...), it shows up here as a
 *  toast and clears itself a few seconds later. Insights that were
 *  already loaded when the page mounted are the existing history, not
 *  something that "just happened", so they're recorded as a baseline and
 *  never toasted. */
export function InsightToastStack() {
  const { insights, markInsightRead } = useAduf();
  const [toasts, setToasts] = useState<Insight[]>([]);
  const seenIds = useRef<Set<string> | null>(null);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    if (seenIds.current === null) {
      seenIds.current = new Set(insights.map((i) => i.id));
      return;
    }
    const fresh = insights.filter((i) => !seenIds.current!.has(i.id));
    if (fresh.length === 0) return;
    for (const i of fresh) seenIds.current.add(i.id);
    setToasts((prev) => [...fresh, ...prev].slice(0, MAX_VISIBLE));
  }, [insights]);

  useEffect(() => {
    for (const t of toasts) {
      if (timers.current.has(t.id)) continue;
      const handle = setTimeout(() => {
        timers.current.delete(t.id);
        setToasts((prev) => prev.filter((x) => x.id !== t.id));
      }, AUTO_DISMISS_MS);
      timers.current.set(t.id, handle);
    }
    const stillVisible = new Set(toasts.map((t) => t.id));
    for (const [id, handle] of timers.current) {
      if (!stillVisible.has(id)) {
        clearTimeout(handle);
        timers.current.delete(id);
      }
    }
  }, [toasts]);

  useEffect(() => {
    const map = timers.current;
    return () => {
      for (const handle of map.values()) clearTimeout(handle);
      map.clear();
    };
  }, []);

  function dismiss(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+4.25rem)] z-40 flex flex-col items-stretch gap-2 px-4 sm:items-end lg:left-[268px] lg:right-4 lg:top-4 lg:px-0">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
            className="glass pointer-events-auto flex w-full items-start gap-2.5 rounded-2xl border border-border/60 p-3.5 shadow-xl sm:w-96"
          >
            <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${dotColor(t.severity)}`} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold">{t.title}</p>
              <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                {t.body}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                markInsightRead(t.id);
                dismiss(t.id);
              }}
              aria-label="Dismiss"
              className="shrink-0 rounded-full p-1 text-muted-foreground hover:bg-white/10 hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
