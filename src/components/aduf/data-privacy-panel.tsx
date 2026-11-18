import { Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { GlassCard } from "@/components/aduf/liquid";
import { Button } from "@/components/ui/button";
import { deleteMyDataFn } from "@/lib/server-fns";
import { useAuth } from "@/store/auth-store";

type Scope = "imports" | "activity" | "chats" | "everything";
const OPTIONS: { scope: Scope; label: string; what: string }[] = [
  {
    scope: "imports",
    label: "Imported business data",
    what: "Every sales, lead, customer, deal and traffic record you imported.",
  },
  { scope: "chats", label: "Chat history", what: "Your conversations with ADUF." },
  {
    scope: "activity",
    label: "Activity log & approvals",
    what: "The history of what ADUF did, suggested or declined.",
  },
  {
    scope: "everything",
    label: "Everything, and my account",
    what: "All of the above plus goals, automations, schedule, alerts and your sign-in. This can't be undone.",
  },
];

/** What's stored, who can see it, and a clear way to delete it. */
export function DataPrivacyPanel() {
  const accessToken = useAuth((s) => s.accessToken);
  const signOut = useAuth((s) => s.signOut);
  const [open, setOpen] = useState<Scope | null>(null);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const run = async (scope: Scope) => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await deleteMyDataFn({ data: { accessToken, scope, confirm } });
      if (!r.ok) return setMsg({ ok: false, text: r.error });
      setMsg({
        ok: true,
        text: scope === "everything" ? "Everything was deleted. Signing you out…" : "Deleted.",
      });
      setOpen(null);
      setConfirm("");
      if (scope === "everything") setTimeout(() => void signOut(), 1200);
    } catch {
      setMsg({ ok: false, text: "Couldn't delete. Try again." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <GlassCard hover={false} className="space-y-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        <Trash2 className="h-4 w-4" /> Your data
      </h2>

      <div className="space-y-2 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">How your data is handled</p>
        <ul className="space-y-1">
          <li>
            · Logins to connected platforms are encrypted before they're stored, and are never shown
            in the app or written to logs.
          </li>
          <li>
            · Your imported customer and sales rows can only be read by you. Admins can see
            account-level counts, not those rows.
          </li>
          <li>
            · Your data is stored with Supabase. It is only sent to your chosen AI provider when
            ADUF answers you, and only the facts needed for that answer.
          </li>
          <li>
            · Disconnecting a Google platform in Settings also revokes ADUF's access at Google.
          </li>
        </ul>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium">Delete my data</p>
        {OPTIONS.map((o) => (
          <div key={o.scope} className="rounded-2xl bg-white/[0.04] p-3">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm">{o.label}</p>
                <p className="text-[11px] text-muted-foreground">{o.what}</p>
              </div>
              {open !== o.scope ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setOpen(o.scope);
                    setConfirm("");
                    setMsg(null);
                  }}
                >
                  Delete…
                </Button>
              ) : null}
            </div>
            {open === o.scope ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input
                  aria-label="Type DELETE to confirm"
                  placeholder="Type DELETE to confirm"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-48 rounded-xl border border-white/10 bg-white/6 px-3 py-2 text-sm outline-none"
                />
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={busy || confirm !== "DELETE"}
                  onClick={() => void run(o.scope)}
                >
                  {busy ? <Loader2 className="animate-spin" /> : null}Delete permanently
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setOpen(null)}>
                  Cancel
                </Button>
              </div>
            ) : null}
          </div>
        ))}
        {msg ? (
          <p
            role={msg.ok ? "status" : "alert"}
            className={`text-xs ${msg.ok ? "text-emerald-300" : "text-red-300"}`}
          >
            {msg.text}
          </p>
        ) : null}
      </div>
    </GlassCard>
  );
}
