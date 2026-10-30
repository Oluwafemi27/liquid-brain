import { CircleCheck, Loader2, Send, ShieldCheck, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { GlassCard } from "@/components/aduf/liquid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/store/auth-store";

interface TelegramStatus {
  connected: boolean;
  botUsername: string | null;
  botName: string | null;
  lastError: string | null;
}

/** Settings > Connections > Telegram. Telegram has no OAuth: the owner
 *  creates a bot with @BotFather and pastes its token once. The server
 *  verifies it with Telegram, registers the webhook, and stores the token
 *  encrypted (Supabase Vault). The token is never shown again. */
export function TelegramConnectionPanel({ onChange }: { onChange?: (connected: boolean) => void }) {
  const { accessToken } = useAuth();
  const [status, setStatus] = useState<TelegramStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [botToken, setBotToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const authHeaders = useCallback(
    () => ({ authorization: `Bearer ${accessToken ?? ""}`, "content-type": "application/json" }),
    [accessToken],
  );

  const load = useCallback(() => {
    if (!accessToken) return;
    setLoading(true);
    fetch("/api/connectors/telegram", { headers: authHeaders() })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Couldn't load Telegram status.");
        setStatus(data as TelegramStatus);
        onChange?.((data as TelegramStatus).connected);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Couldn't load Telegram status."))
      .finally(() => setLoading(false));
  }, [accessToken, authHeaders, onChange]);

  useEffect(load, [load]);

  const connect = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/connectors/telegram", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ botToken: botToken.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to connect");
      setBotToken("");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to connect");
    } finally {
      setSaving(false);
    }
  };

  const disconnect = async () => {
    setError(null);
    try {
      const res = await fetch("/api/connectors/telegram", {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to disconnect");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to disconnect");
    }
  };

  return (
    <GlassCard hover={false} className="min-h-16 space-y-4 rounded-2xl p-4">
      <div className="flex items-center gap-2">
        <Send className="h-4 w-4 text-cyan" />
        <h3 className="text-sm font-semibold">Telegram</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Connect a Telegram bot so ADUF can receive and send messages. Create one with @BotFather,
        then paste its token here once. It's verified with Telegram, encrypted at rest, and never
        shown again.
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
        </div>
      ) : status?.connected ? (
        <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 p-4 text-sm">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <CircleCheck className="h-4 w-4 shrink-0 text-cyan" />
            <span className="truncate">
              {status.botUsername ? `@${status.botUsername}` : (status.botName ?? "Bot connected")}
            </span>
          </div>
          <button
            type="button"
            aria-label="Disconnect Telegram"
            onClick={disconnect}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-white/8 hover:text-red-400"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2 md:flex-row">
          <Input
            type="password"
            value={botToken}
            onChange={(e) => setBotToken(e.target.value)}
            placeholder="123456789:AA… (bot token)"
            className="md:flex-1"
            autoComplete="off"
          />
          <Button
            onClick={connect}
            disabled={saving || botToken.trim().length < 20}
            className="shrink-0"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Connect"}
          </Button>
        </div>
      )}

      <div className="flex items-start gap-1.5 border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0" />
        <span>
          In Telegram, message @BotFather, send /newbot, and copy the token it gives you. Message
          your bot once after connecting so ADUF can see the chat.
        </span>
      </div>
      {error ? <p className="text-xs text-amber-400">{error}</p> : null}
    </GlassCard>
  );
}
