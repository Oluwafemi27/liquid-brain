import { Loader2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { KEY_CONNECTORS } from "@/lib/connector-catalog";
import { useAuth } from "@/store/auth-store";

/** Connect dialog for providers that use pasted credentials (Semrush, Jumia,
 *  Paystack). Values go straight to the server over HTTPS and are stored
 *  encrypted; they are never shown again. */
export function KeyConnectorDialog({
  providerId,
  providerName,
  onClose,
  onConnected,
}: {
  providerId: string | null;
  providerName: string;
  onClose: () => void;
  onConnected: (id: string) => void;
}) {
  const { accessToken } = useAuth();
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const def = providerId ? KEY_CONNECTORS[providerId] : undefined;
  const complete = def?.fields.every((f) => (values[f.name] ?? "").trim().length >= 4) ?? false;

  const close = () => {
    setValues({});
    setError(null);
    onClose();
  };

  const save = async () => {
    if (!providerId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/connectors/${providerId}/manage`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${accessToken ?? ""}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(values),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Couldn't save those credentials.");
      onConnected(providerId);
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save those credentials.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={Boolean(providerId && def)} onOpenChange={(open) => !open && close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect {providerName}</DialogTitle>
          <DialogDescription>{def?.help}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {def?.fields.map((f) => (
            <label key={f.name} className="block space-y-1 text-xs">
              <span className="text-muted-foreground">{f.label}</span>
              <Input
                type={f.secret ? "password" : "text"}
                autoComplete="off"
                value={values[f.name] ?? ""}
                placeholder={f.placeholder}
                onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}
              />
            </label>
          ))}
          {error ? <p className="text-xs text-amber-400">{error}</p> : null}
          <div className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0" />
            <span>Stored encrypted on the server and never displayed again.</span>
          </div>
          <Button onClick={save} disabled={!complete || saving} className="w-full">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Connect"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
