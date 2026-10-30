import { useCallback } from "react";
import { useLiveRefresh } from "@/hooks/use-live-refresh";
import { fetchConnectorStatuses } from "@/lib/server-fns";
import { useAduf } from "@/store/aduf-store";
import { useAuth } from "@/store/auth-store";

/** Mounted once in AppShell. Keeps every page's idea of "which integrations
 *  are connected" in step with the `connectors` table in Supabase.
 *
 *  Before this existed only the Settings page ever read connection state, so
 *  Business Memory (and anything else) showed the hard-coded "disconnected"
 *  defaults until you happened to visit Settings first.
 *
 *  `connectors` holds OAuth tokens and is deliberately NOT in the realtime
 *  publication (that would broadcast them), so this polls — on mount, on tab
 *  focus, and every 20s — instead. Renders nothing. */
export function ConnectorsBootstrap() {
  const setConnectorStatuses = useAduf((s) => s.setConnectorStatuses);
  const accessToken = useAuth((s) => s.accessToken);

  const refresh = useCallback(() => {
    fetchConnectorStatuses({ data: { accessToken } })
      .then((statuses) => {
        if (statuses) setConnectorStatuses(statuses);
      })
      .catch((err) => console.error("[connectors] status refresh failed", err));
  }, [accessToken, setConnectorStatuses]);

  useLiveRefresh(refresh, 20_000, Boolean(accessToken));
  return null;
}
