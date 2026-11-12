import { useEffect, useRef } from "react";

/** Never refresh the same thing twice within this window (focus + visibility fire together). */
const MIN_GAP_MS = 5_000;

/** Next wait: the interval plus or minus 20%, so hundreds of open tabs never fire in lockstep. */
export function jitteredInterval(intervalMs: number, random = Math.random): number {
  return Math.round(intervalMs * (0.8 + random() * 0.4));
}

/** Calls `refresh` right away, again whenever the tab regains focus or becomes
 *  visible, and about every `intervalMs` while the tab is visible. This is the
 *  safety net under Supabase Realtime: it also covers data that can't be
 *  streamed (tables outside the realtime publication, e.g. `connectors`) and
 *  recovers from a dropped websocket or a laptop waking from sleep.
 *
 *  Built for many people at once: the first call is spread over a couple of
 *  seconds, repeat calls are jittered, duplicates are dropped, and a hidden
 *  tab makes no requests at all. */
export function useLiveRefresh(refresh: () => void, intervalMs: number, enabled = true) {
  const ref = useRef(refresh);
  ref.current = refresh;

  useEffect(() => {
    if (!enabled) return;
    let last = 0;
    let timer: number | undefined;
    let stopped = false;

    const run = (force = false) => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (!force && now - last < MIN_GAP_MS) return;
      last = now;
      ref.current();
    };
    const schedule = () => {
      timer = window.setTimeout(() => {
        if (stopped) return;
        run();
        schedule();
      }, jitteredInterval(intervalMs));
    };

    // First load: tiny random delay so a deploy or reconnect doesn't hit the server all at once.
    const first = window.setTimeout(() => run(true), Math.floor(Math.random() * 1500));
    schedule();
    const onWake = () => run();
    document.addEventListener("visibilitychange", onWake);
    window.addEventListener("focus", onWake);
    window.addEventListener("online", onWake);
    return () => {
      stopped = true;
      window.clearTimeout(first);
      if (timer !== undefined) window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onWake);
      window.removeEventListener("focus", onWake);
      window.removeEventListener("online", onWake);
    };
  }, [intervalMs, enabled]);
}
