import { CircleCheck, Loader2, ShieldCheck, Trash2, Workflow } from "lucide-react";
import { useEffect, useState } from "react";
import { GlassCard } from "@/components/aduf/liquid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface N8nStatus {
  connected: boolean;
  instanceUrl: string | null;
  label: string | null;
  lastVerifiedAt: string | null;
  lastVerifyError: string | null;
}

/** Me > Connections > Connect n8n. All automations ADUF builds run on the
 *  owner's OWN n8n account — this is where they paste in the instance URL
 *  + API key once. Stored encrypted (Supabase Vault), verified against
 *  their instance before saving, never asked for again. */
export function N8nConnectionPanel() {
  const [status, setStatus] = useState<N8nStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [instanceUrl, setInstanceUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    fetch("/api/n8n-connection")
      .then((r) => r.json())
      .then((data: N8nStatus) => setStatus(data))
      .catch(() => setError("Couldn't load n8n connection status."))
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, []);

  const connect = async () => {
    if (instanceUrl.trim().length < 8 || apiKey.trim().length < 8) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/n8n-connection", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ instanceUrl: instanceUrl.trim(), apiKey: apiKey.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to connect");
      setApiKey("");
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
      const res = await fetch("/api/n8n-connection", { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to disconnect");
      setInstanceUrl("");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to disconnect");
    }
  };

  return (
    <GlassCard hover={false} className="min-h-16 space-y-4 rounded-2xl p-4">
      <div className="flex items-center gap-2">
        <Workflow className="h-4 w-4 text-cyan" />
        <h3 className="text-sm font-semibold">n8n</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Every automation ADUF builds runs on <em>your</em> n8n account — never a shared instance.
        Paste your instance URL and API key once; they're encrypted at rest and never shown again.
        New workflows are always deployed turned off — you decide when to switch them on.
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
        </div>
      ) : status?.connected ? (
        <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 p-4 text-sm">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <CircleCheck className="h-4 w-4 shrink-0 text-cyan" />
            <span className="truncate">{status.instanceUrl}</span>
          </div>
          <button
            type="button"
            aria-label="Disconnect n8n"
            onClick={disconnect}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-white/8 hover:text-red-400"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2 md:flex-row">
          <Input
            value={instanceUrl}
            onChange={(e) => setInstanceUrl(e.target.value)}
            placeholder="https://your-instance.app.n8n.cloud"
            className="md:flex-1"
          />
          <Input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="n8n API key"
            className="md:flex-1"
          />
          <Button
            onClick={connect}
            disabled={saving || instanceUrl.trim().length < 8 || apiKey.trim().length < 8}
            className="shrink-0"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Connect"}
          </Button>
        </div>
      )}

      <div className="flex items-start gap-1.5 border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0" />
        <span>
          API key create it under n8n Settings &gt; API. ADUF only ever creates workflows inactive
          — nothing runs against real customers until you tap "Turn it on".
        </span>
      </div>
      {error ? <p className="text-xs text-amber-400">{error}</p> : null}
    </GlassCard>
  );
}
