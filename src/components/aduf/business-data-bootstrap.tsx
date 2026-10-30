import { useBusinessDataRefresh } from "@/hooks/use-business-data-refresh";
import { useLiveRefresh } from "@/hooks/use-live-refresh";
import { useAuth } from "@/store/auth-store";

/** Mounted once in AppShell. Keeps the imported-data panels (sales, leads,
 *  customers, deals, funnel) fresh: on mount, on tab focus and every 60s.
 *  Imports are written by server functions, so there's no realtime stream to
 *  follow — the import panel also refreshes immediately after saving.
 *  Renders nothing. */
export function BusinessDataBootstrap() {
  const accessToken = useAuth((s) => s.accessToken);
  const refresh = useBusinessDataRefresh();
  useLiveRefresh(() => void refresh(), 60_000, Boolean(accessToken));
  return null;
}
