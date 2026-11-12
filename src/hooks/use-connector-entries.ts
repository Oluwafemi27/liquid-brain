import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildEntries, type ConnectorEntry } from "@/lib/connector-entries";
import { fetchComposioBoard, type ComposioBoard } from "@/lib/composio-fns";
import { useAuth } from "@/store/auth-store";

// The list of every app (all of them come from Composio: connectors are connected only through it) for the Memory page and the chat connector panel.
// The Composio catalogue is large, so it is loaded once and shared between everything that shows it.

let cache: { token: string; at: number; board: ComposioBoard } | null = null;
const FRESH_MS = 60_000;

export function useConnectorEntries(enabled = true) {
  const accessToken = useAuth((s) => s.accessToken);
  const [board, setBoard] = useState<ComposioBoard | null>(
    cache && cache.token === accessToken ? cache.board : null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const live = useRef(true);
  useEffect(() => () => void (live.current = false), []);

  const reload = useCallback(
    async (force = true) => {
      if (!accessToken) return null;
      if (!force && cache && cache.token === accessToken && Date.now() - cache.at < FRESH_MS) {
        setBoard(cache.board);
        return cache.board;
      }
      setLoading(true);
      setError(null);
      try {
        const b = await fetchComposioBoard({ data: { accessToken } });
        if (b) cache = { token: accessToken, at: Date.now(), board: b };
        if (live.current) setBoard(b);
        return b;
      } catch (e) {
        if (live.current) setError(e instanceof Error ? e.message : "Couldn't load connectors.");
        return null;
      } finally {
        if (live.current) setLoading(false);
      }
    },
    [accessToken],
  );

  useEffect(() => {
    if (enabled && accessToken) void reload(false);
  }, [enabled, accessToken, reload]);

  const entries: ConnectorEntry[] = useMemo(
    () => buildEntries([], {}, board && board.configured ? board : null),
    [board],
  );
  return {
    entries,
    loading,
    error: error ?? board?.error ?? null,
    /** false when the server has no COMPOSIO_API_KEY, so only the built-in apps are listed. */
    catalogueOn: board?.configured ?? false,
    reload,
  };
}
