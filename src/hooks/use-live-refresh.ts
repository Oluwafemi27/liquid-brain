import { useEffect, useRef } from "react";

/** Calls `refresh` right away, again whenever the tab regains focus or becomes
 *  visible, and every `intervalMs` while the tab is visible. This is the
 *  safety net under Supabase Realtime: it also covers data that can't be
 *  streamed (tables outside the realtime publication, e.g. `connectors`) and
 *  recovers from a dropped websocket or a laptop waking from sleep. */
export function useLiveRefresh(refresh: () => void, intervalMs: number, enabled = true) {
  const ref = useRef(refresh);
  ref.current = refresh;

  useEffect(() => {
    if (!enabled) return;
    const run = () => {
      if (document.visibilityState === "visible") ref.current();
    };
    run();
    const timer = window.setInterval(run, intervalMs);
    document.addEventListener("visibilitychange", run);
    window.addEventListener("focus", run);
    window.addEventListener("online", run);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", run);
      window.removeEventListener("focus", run);
      window.removeEventListener("online", run);
    };
  }, [intervalMs, enabled]);
}
