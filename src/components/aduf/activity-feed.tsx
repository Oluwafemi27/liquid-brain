import { AlertCircle, AlertTriangle, CheckCircle2, Info, Loader2, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { ActivityItem } from "@/lib/aduf-types";
import { PLATFORM_NAMES } from "@/lib/permissions-catalog";
import { ageLabel } from "@/lib/sources";
import { fetchActivityFn, undoActionFn } from "@/lib/server-fns";
import { useAuth } from "@/store/auth-store";

const ICON = {
  ok: <CheckCircle2 className="h-4 w-4 text-emerald-400" aria-label="OK" />,
  warn: <AlertTriangle className="h-4 w-4 text-amber-400" aria-label="Needs attention" />,
  error: <AlertCircle className="h-4 w-4 text-red-400" aria-label="Problem" />,
  info: <Info className="h-4 w-4 text-muted-foreground" aria-label="Info" />,
} as const;

function timeLeft(iso: string | null): string | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return null;
  const h = Math.floor(ms / 3_600_000);
  return h >= 1 ? `${h}h` : `${Math.max(1, Math.round(ms / 60_000))}m`;
}

/** A readable history of everything on connected platforms and everything ADUF did, suggested or
 *  declined — with who approved it and an Undo while the window is open. */
export function ActivityFeed({
  platform = "all",
  status = "all",
  limit = 20,
  compact = false,
  refreshKey = 0,
}: {
  platform?: string;
  status?: string;
  limit?: number;
  compact?: boolean;
  refreshKey?: number;
}) {
  const accessToken = useAuth((s) => s.accessToken);
  const [items, setItems] = useState<ActivityItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetchActivityFn({ data: { accessToken, platform, status, limit } });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setError(null);
      setItems(res.items);
      setMore(res.items.length >= limit);
    } catch {
      setError("Couldn't load activity.");
    }
  }, [accessToken, platform, status, limit]);

  useEffect(() => {
    setItems(null);
    void load();
  }, [load, refreshKey]);

  const loadMore = async () => {
    const last = items?.at(-1);
    if (!last) return;
    setLoadingMore(true);
    try {
      const res = await fetchActivityFn({
        data: { accessToken, platform, status, limit, before: last.at },
      });
      if (res.ok) {
        setItems((cur) => [
          ...(cur ?? []),
          ...res.items.filter((n) => !(cur ?? []).some((c) => c.id === n.id)),
        ]);
        setMore(res.items.length >= limit);
      }
    } finally {
      setLoadingMore(false);
    }
  };

  const undo = async (id: string) => {
    setBusy(id);
    try {
      const res = await undoActionFn({ data: { accessToken, id } });
      if (!res.ok) setError(res.error);
      await load();
    } finally {
      setBusy(null);
    }
  };

  if (error && !items) return <p className="py-3 text-xs text-muted-foreground">{error}</p>;
  if (!items) return <div className="h-24 animate-pulse rounded-2xl bg-white/[0.05]" aria-hidden />;
  if (items.length === 0) {
    return (
      <p className="py-4 text-center text-xs text-muted-foreground">
        Nothing here yet. Activity appears as you import data, connect platforms and approve
        actions.
      </p>
    );
  }

  return (
    <div>
      <ul className="divide-y divide-white/5">
        {items.map((i) => {
          const left = i.action?.canUndo ? timeLeft(i.action.undoUntil) : null;
          return (
            <li key={i.id} className={`flex gap-3 ${compact ? "py-2" : "py-3"}`}>
              <span className="mt-0.5 shrink-0">{ICON[i.status]}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm break-words">{i.title}</p>
                {i.detail ? (
                  <p className="text-xs text-muted-foreground break-words">{i.detail}</p>
                ) : null}
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {PLATFORM_NAMES[i.platform] ?? i.platform} · {ageLabel(i.at)}
                </p>
              </div>
              {left && i.action ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0"
                  disabled={busy === i.action.id}
                  onClick={() => void undo(i.action!.id)}
                >
                  {busy === i.action.id ? <Loader2 className="animate-spin" /> : <RotateCcw />}Undo
                  · {left}
                </Button>
              ) : null}
            </li>
          );
        })}
      </ul>
      {error ? (
        <p role="alert" className="mt-2 text-xs text-red-300">
          {error}
        </p>
      ) : null}
      {more && !compact ? (
        <div className="pt-3 text-center">
          <Button size="sm" variant="ghost" disabled={loadingMore} onClick={() => void loadMore()}>
            {loadingMore ? <Loader2 className="animate-spin" /> : null}Load older
          </Button>
        </div>
      ) : null}
    </div>
  );
}
