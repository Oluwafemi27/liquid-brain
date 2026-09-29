import {
  CircleCheck,
  Loader2,
  MessagesSquare,
  RefreshCw,
  Send,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { GlassCard } from "@/components/aduf/liquid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/store/auth-store";

interface TelegramStatus {
  connected: boolean;
  botUsername: string | null;
  botName: string | null;
  lastError: string | null;
  pairingCode: string | null;
  pairedChats: { chatId: number; name: string | null }[];
  business?: BusinessState;
}

interface BusinessSettings {
  autoReplyEnabled: boolean;
  discloseAi: boolean;
  pauseHours: number;
  maxRepliesPerHour: number;
  businessInfo: string;
}
interface BusinessState {
  connections: { id: string; ownerName: string | null; enabled: boolean; canReply: boolean }[];
  settings: BusinessSettings;
  last24h: { received: number; answered: number };
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
  const [draft, setDraft] = useState<BusinessSettings | null>(null);
  const [busy, setBusy] = useState<"enable" | "save" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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

  // Seed the editable business settings whenever fresh status arrives.
  useEffect(() => {
    if (status?.business) setDraft(status.business.settings);
  }, [status]);

  const post = async (body: unknown) => {
    const res = await fetch("/api/connectors/telegram", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? "Request failed");
  };

  const enableBusiness = async () => {
    setBusy("enable");
    setError(null);
    setNotice(null);
    try {
      await post({ action: "enable_business" });
      setNotice("Business updates enabled. Now add this bot in Telegram (steps below).");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't enable business updates");
    } finally {
      setBusy(null);
    }
  };

  const saveBusiness = async () => {
    if (!draft) return;
    setBusy("save");
    setError(null);
    setNotice(null);
    try {
      await post({ action: "save_business_settings", settings: draft });
      setNotice("Saved.");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save settings");
    } finally {
      setBusy(null);
    }
  };

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

  const resetPairing = async () => {
    setError(null);
    try {
      const res = await fetch("/api/connectors/telegram", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ action: "reset_pairing" }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to reset pairing");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reset pairing");
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
        Chat with ADUF from Telegram: messages you send your bot are answered by the same agent as
        Brain Chat. Create a bot with @BotFather, paste its token here once (verified with Telegram,
        encrypted at rest, never shown again), then pair your chat with the code below.
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
        </div>
      ) : status?.connected ? (
        <div className="space-y-3">
          <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 p-4 text-sm">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <CircleCheck className="h-4 w-4 shrink-0 text-cyan" />
              <span className="truncate">
                {status.botUsername
                  ? `@${status.botUsername}`
                  : (status.botName ?? "Bot connected")}
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

          <div className="rounded-2xl border border-border/60 p-4 text-sm">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Pair your Telegram
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Open your bot in Telegram and send this message. Only paired chats can talk to ADUF.
            </p>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <code className="rounded-lg bg-white/8 px-3 py-1.5 text-sm">
                /start {status.pairingCode ?? "…"}
              </code>
              <button
                type="button"
                onClick={resetPairing}
                className="flex items-center gap-1.5 rounded-full border border-border/60 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <RefreshCw className="h-3 w-3" /> New code &amp; unpair all
              </button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {status.pairedChats.length
                ? `Paired: ${status.pairedChats.map((c) => c.name ?? `chat ${c.chatId}`).join(", ")}`
                : "No chats paired yet."}
            </p>
          </div>

          <div className="space-y-3 rounded-2xl border border-border/60 p-4 text-sm">
            <div className="flex items-center gap-2">
              <MessagesSquare className="h-4 w-4 text-cyan" />
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Customer DMs (Telegram Business)
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Lets ADUF read and answer the private messages customers send to <b>your own</b>{" "}
              Telegram account — no login to your account, no session files. Telegram itself
              connects the bot to your chats and you choose which ones.
            </p>

            {status.business?.connections.length ? (
              <ul className="space-y-1 text-xs">
                {status.business.connections.map((c) => (
                  <li key={c.id} className="flex items-center gap-2">
                    <CircleCheck
                      className={`h-3.5 w-3.5 ${c.enabled ? "text-cyan" : "text-muted-foreground"}`}
                    />
                    <span>
                      {c.ownerName ? `@${c.ownerName}` : "Your account"}
                      {c.enabled ? "" : " (disconnected)"}
                      {c.enabled && !c.canReply ? " — bot isn't allowed to reply yet" : ""}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="space-y-2">
                <ol className="list-decimal space-y-1 pl-4 text-xs text-muted-foreground">
                  <li>
                    @BotFather → /mybots → your bot → Bot Settings → <b>Business Mode</b> → turn on.
                  </li>
                  <li>Press the button below so Telegram starts sending business updates.</li>
                  <li>
                    In Telegram: Settings → <b>Business</b> → <b>Chatbots</b> → add your bot, choose
                    which chats it can access, and allow it to reply.
                  </li>
                </ol>
                <Button size="sm" onClick={enableBusiness} disabled={busy === "enable"}>
                  {busy === "enable" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Enable Business updates"
                  )}
                </Button>
              </div>
            )}

            {draft ? (
              <div className="space-y-3 border-t border-border/60 pt-3">
                <label className="flex items-center justify-between gap-3">
                  <span className="text-xs">
                    <b>Auto-reply to customers</b>
                    <span className="block text-muted-foreground">
                      Off by default. When on, ADUF answers new messages using only your business
                      info below.
                    </span>
                  </span>
                  <Switch
                    checked={draft.autoReplyEnabled}
                    onCheckedChange={(v) => setDraft({ ...draft, autoReplyEnabled: v })}
                  />
                </label>
                <label className="flex items-center justify-between gap-3">
                  <span className="text-xs">
                    <b>Say it&apos;s an automated assistant</b>
                    <span className="block text-muted-foreground">
                      First reply in each chat introduces itself as automated.
                    </span>
                  </span>
                  <Switch
                    checked={draft.discloseAi}
                    onCheckedChange={(v) => setDraft({ ...draft, discloseAi: v })}
                  />
                </label>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <label className="space-y-1">
                    <span className="text-muted-foreground">Pause after you reply (hours)</span>
                    <Input
                      type="number"
                      min={1}
                      max={168}
                      value={draft.pauseHours}
                      onChange={(e) =>
                        setDraft({ ...draft, pauseHours: Number(e.target.value) || 1 })
                      }
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-muted-foreground">Max replies / chat / hour</span>
                    <Input
                      type="number"
                      min={1}
                      max={60}
                      value={draft.maxRepliesPerHour}
                      onChange={(e) =>
                        setDraft({ ...draft, maxRepliesPerHour: Number(e.target.value) || 1 })
                      }
                    />
                  </label>
                </div>
                <label className="block space-y-1 text-xs">
                  <span className="text-muted-foreground">
                    Business info the assistant may use (products, prices, hours, delivery, refund
                    policy, how to pay…). Anything not here gets handed to you.
                  </span>
                  <Textarea
                    rows={6}
                    maxLength={4000}
                    value={draft.businessInfo}
                    onChange={(e) => setDraft({ ...draft, businessInfo: e.target.value })}
                    placeholder="e.g. We sell handmade candles. ₦4,500 each, delivery in Lagos 1–2 days…"
                  />
                </label>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    Last 24h: {status.business?.last24h.received ?? 0} customer messages,{" "}
                    {status.business?.last24h.answered ?? 0} auto-replies
                  </span>
                  <Button size="sm" onClick={saveBusiness} disabled={busy === "save"}>
                    {busy === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  If you type in a chat yourself, or the assistant can&apos;t answer, it goes quiet
                  in that chat for the pause time above and alerts you here in Telegram.
                </p>
              </div>
            ) : null}
          </div>
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
          In Telegram, message @BotFather, send /newbot, and copy the token it gives you. The bot
          only answers chats you pair — everyone else gets a fixed "private assistant" reply and
          never reaches the AI.
        </span>
      </div>
      {notice ? <p className="text-xs text-cyan">{notice}</p> : null}
      {error ? <p className="text-xs text-amber-400">{error}</p> : null}
    </GlassCard>
  );
}
