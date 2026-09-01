import { CircleCheck, KeyRound, Loader2, Star, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { GlassCard } from "@/components/aduf/liquid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ProviderStatus {
  providerId: string;
  displayName: string;
  connected: boolean;
  label: string | null;
  isDefault: boolean;
}

export function ModelKeysPanel() {
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string>("");
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    fetch("/api/model-keys")
      .then((r) => r.json())
      .then((data: { providers: ProviderStatus[] }) => {
        setProviders(data.providers);
        if (!selected && data.providers.length) {
          setSelected(
            data.providers.find((p) => !p.connected)?.providerId ??
              data.providers[0]?.providerId ??
              "",
          );
        }
      })
      .catch(() => setError("Couldn't load model connections."))
      .finally(() => setLoading(false));
  };

  // Intentional: only auto-selects a provider on first load; load() is also
  // called after mutations, when `selected` is already set and this no-ops.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, []);

  const save = async () => {
    if (!selected || apiKey.trim().length < 8) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/model-keys", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          providerId: selected,
          apiKey: apiKey.trim(),
          makeDefault: !providers.some((p) => p.isDefault),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save key");
      setApiKey("");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save key");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (providerId: string) => {
    setError(null);
    try {
      const res = await fetch("/api/model-keys", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ providerId }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to remove key");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove key");
    }
  };

  const makeDefault = async (providerId: string) => {
    setError(null);
    try {
      const res = await fetch("/api/model-keys", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ providerId }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to set default");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to set default");
    }
  };

  return (
    <GlassCard hover={false} className="space-y-4">
      <div className="flex items-center gap-2">
        <KeyRound className="h-4 w-4 text-cyan" />
        <h3 className="text-sm font-semibold">AI Model Keys</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Bring your own API key for any model. The one marked{" "}
        <span className="inline-flex items-center gap-0.5 text-cyan">
          <Star className="h-3 w-3 fill-current" /> Default
        </span>{" "}
        powers Brain Chat and every skill. Keys are encrypted at rest and never shown again.
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
        </div>
      ) : (
        <div className="space-y-2">
          {providers.map((p) => (
            <div
              key={p.providerId}
              className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5 rounded-xl border border-border/60 px-3 py-2 text-sm"
            >
              <div className="flex min-w-0 flex-1 items-center gap-2">
                {p.connected ? (
                  <CircleCheck className="h-4 w-4 shrink-0 text-cyan" />
                ) : (
                  <span className="h-4 w-4 shrink-0 rounded-full border border-border" />
                )}
                <span className="truncate">{p.displayName}</span>
                {p.isDefault ? (
                  <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-cyan/15 px-1.5 py-0.5 text-[10px] text-cyan">
                    <Star className="h-2.5 w-2.5 fill-current" /> Default
                  </span>
                ) : null}
              </div>
              {p.connected ? (
                <div className="flex shrink-0 items-center gap-1">
                  {!p.isDefault ? (
                    <button
                      type="button"
                      onClick={() => makeDefault(p.providerId)}
                      className="text-[11px] text-muted-foreground hover:text-foreground"
                    >
                      Set default
                    </button>
                  ) : null}
                  <button
                    type="button"
                    aria-label={`Remove ${p.displayName} key`}
                    onClick={() => remove(p.providerId)}
                    className="grid h-7 w-7 place-items-center rounded-full text-muted-foreground hover:bg-white/8 hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2 border-t border-border/60 pt-3 md:flex-row">
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger className="md:w-44">
            <SelectValue placeholder="Provider" />
          </SelectTrigger>
          <SelectContent>
            {providers.map((p) => (
              <SelectItem key={p.providerId} value={p.providerId}>
                {p.displayName}
                {p.connected ? " (replace)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Paste API key"
          className="flex-1"
        />
        <Button onClick={save} disabled={saving || apiKey.trim().length < 8} className="shrink-0">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
        </Button>
      </div>
      {error ? <p className="text-xs text-amber-400">{error}</p> : null}
    </GlassCard>
  );
}
