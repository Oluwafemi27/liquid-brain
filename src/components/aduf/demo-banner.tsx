import { useEffect, useState } from "react";
import { Hourglass } from "lucide-react";
import { untilText } from "@/lib/usage-notices";
import { useAuth } from "@/store/auth-store";

/** Shown to demo visitors on every page: how long is left, and the way to keep their work. When the time
 *  runs out the visit ends on screen too (the server has already stopped accepting it). */
export function DemoBanner() {
  const { user, demoExpiresAt, signInWithGoogle, signOut } = useAuth();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const ended = Boolean(demoExpiresAt) && new Date(demoExpiresAt!).getTime() <= now;
  useEffect(() => {
    if (!ended) return;
    try {
      window.localStorage.setItem("aduf-demo-ended", "1");
    } catch {
      /* storage unavailable */
    }
    void signOut();
  }, [ended, signOut]);

  if (!user?.demo) return null;

  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-cyan/30 bg-cyan/10 px-4 py-2 text-xs"
    >
      <Hourglass className="h-3.5 w-3.5 text-cyan" aria-hidden />
      <span>
        <strong className="font-semibold">Demo</strong>
        {demoExpiresAt ? ` · ends in ${untilText(demoExpiresAt, now)}` : ""} · everything here is
        deleted when it ends
      </span>
      <button
        type="button"
        onClick={() => void signInWithGoogle()}
        className="rounded-full bg-foreground px-3 py-1 font-medium text-background"
      >
        Sign in with Google
      </button>
    </div>
  );
}
