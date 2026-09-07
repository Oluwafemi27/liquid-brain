import { useState } from "react";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/store/auth-store";
import { GoogleGlyph } from "./sign-in-modal";

/** Full-screen gate shown instead of the app whenever the user isn't
 *  signed in. Replaces the old "browse freely, sign in only to chat"
 *  behavior — now nothing renders until Google sign-in succeeds. */
export function SignInGate({ loading }: { loading: boolean }) {
  const { signInWithGoogle } = useAuth();
  const [redirecting, setRedirecting] = useState(false);

  async function handleGoogleClick() {
    setRedirecting(true);
    try {
      await signInWithGoogle();
    } finally {
      setRedirecting(false);
    }
  }

  return (
    <div className="relative z-10 grid min-h-screen place-items-center px-4">
      <div className="glass w-full max-w-sm rounded-3xl border border-border bg-background/95 p-6 text-center text-foreground">
        <div
          className="mx-auto grid h-11 w-11 place-items-center rounded-2xl"
          style={{ background: "var(--gradient-accent)" }}
        >
          <Sparkles className="h-5 w-5 text-background" />
        </div>
        <h1 className="mt-3 text-lg font-semibold">
          {loading ? "Checking your session…" : "Sign in to continue"}
        </h1>
        <p className="mt-1.5 text-center text-sm text-muted-foreground">
          {loading
            ? "One moment."
            : "Sign in with Google to access ADUF AI — your dashboard, chat, and data all live here."}
        </p>

        <button
          type="button"
          onClick={handleGoogleClick}
          disabled={loading || redirecting}
          className="mt-5 flex w-full items-center justify-center gap-2.5 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-medium text-neutral-800 transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          <GoogleGlyph />
          {redirecting ? "Redirecting…" : loading ? "Loading…" : "Continue with Google"}
        </button>

        <p className="mt-3 text-center text-[11px] text-muted-foreground">
          That's the only sign-in method — no separate email/password account needed.
        </p>
      </div>
    </div>
  );
}
