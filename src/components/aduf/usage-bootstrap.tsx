import { useCallback, useEffect } from "react";
import { useLiveRefresh } from "@/hooks/use-live-refresh";
import { useAuth } from "@/store/auth-store";
import { useUsage } from "@/store/usage-store";

/** Keeps the usage numbers fresh while signed in: on load, every minute, and whenever the tab wakes. */
export function UsageBootstrap() {
  const { status, accessToken, user } = useAuth();
  const refresh = useUsage((s) => s.refresh);
  const reset = useUsage((s) => s.reset);

  const run = useCallback(() => {
    void refresh();
  }, [refresh]);
  useLiveRefresh(run, 60_000, status === "signed-in" && Boolean(accessToken));

  // A different account must never see the previous one's numbers.
  useEffect(() => {
    reset();
  }, [user?.id, reset]);

  return null;
}
