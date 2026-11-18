import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/store/auth-store";

/** "Continue as demo": a one-tap way in, no account. Hidden when the owner switches the demo off. */
export function DemoCta({ className }: { className?: string }) {
  const { signInAsDemo } = useAuth();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [hours, setHours] = useState(24);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    fetch("/api/demo")
      .then((r) => r.json())
      .then((d: { enabled?: boolean; hours?: number }) => {
        setEnabled(d.enabled !== false);
        if (d.hours) setHours(d.hours);
      })
      .catch(() => setEnabled(true));
    try {
      setEnded(window.localStorage.getItem("aduf-demo-ended") === "1");
    } catch {
      /* storage unavailable */
    }
  }, []);

  if (enabled === false) return null;

  async function start() {
    setBusy(true);
    setError(null);
    const res = await signInAsDemo();
    if (!res.ok) {
      setError(res.message ?? "Couldn't start the demo.");
      setBusy(false);
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={start}
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-full border border-border bg-white/5 px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-white/10 disabled:opacity-60"
      >
        <Sparkles className="h-4 w-4 text-cyan" aria-hidden />
        {busy ? "Setting up your demo…" : "Continue as demo"}
      </button>
      <p className="mt-2 text-center text-[11px] text-muted-foreground">
        {ended
          ? "Your last demo ended and was deleted. Start a new one any time."
          : `No sign-up. Your own private ${hours}-hour sandbox, deleted afterwards.`}
      </p>
      {error ? (
        <p role="alert" className="mt-1.5 text-center text-xs text-amber-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}
