import { useState } from "react";
import { Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/store/auth-store";

export function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47c-.28 1.5-1.13 2.78-2.41 3.63v3h3.9c2.28-2.1 3.6-5.2 3.6-8.82z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.9-3c-1.08.73-2.46 1.16-4.05 1.16-3.11 0-5.75-2.1-6.69-4.92H1.28v3.1C3.26 21.3 7.29 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.31 14.34a7.2 7.2 0 0 1 0-4.62v-3.1H1.28a12 12 0 0 0 0 10.82l4.03-3.1z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.35.6 4.6 1.79l3.45-3.45C17.95 1.19 15.24 0 12 0 7.29 0 3.26 2.7 1.28 6.62l4.03 3.1C6.25 6.9 8.89 4.77 12 4.77z"
      />
    </svg>
  );
}

/** Google-only sign-in overlay. Deliberately never offers email/password —
 *  the app has exactly one auth path. Renders as a Dialog, so the interface
 *  behind it stays visible (per the product requirement: people can look
 *  around before signing in, but any attempt to actually use the AI opens
 *  this). */
export function SignInModal() {
  const { signInModalOpen, closeSignIn, signInWithGoogle, status } = useAuth();
  const [loading, setLoading] = useState(false);

  // Never show this once signed in, and never let it be dismissed into a
  // false "signed in" state mid-flow.
  if (status === "signed-in") return null;

  async function handleGoogleClick() {
    setLoading(true);
    try {
      await signInWithGoogle();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={signInModalOpen} onOpenChange={(open) => !open && closeSignIn()}>
      <DialogContent className="glass max-w-sm border-border bg-background/95 text-foreground">
        <DialogHeader className="items-center text-center">
          <div
            className="grid h-11 w-11 place-items-center rounded-2xl"
            style={{ background: "var(--gradient-accent)" }}
          >
            <Sparkles className="h-5 w-5 text-background" />
          </div>
          <DialogTitle className="mt-2 text-lg">Sign in to talk to ADUF</DialogTitle>
          <DialogDescription className="text-center">
            You can look around the dashboard freely, but chatting with ADUF — or running an
            analysis — needs a signed-in account so your business context is saved.
          </DialogDescription>
        </DialogHeader>

        <button
          type="button"
          onClick={handleGoogleClick}
          disabled={loading}
          className="mt-2 flex w-full items-center justify-center gap-2.5 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-medium text-neutral-800 transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          <GoogleGlyph />
          {loading ? "Redirecting…" : "Continue with Google"}
        </button>

        <p className="mt-1 text-center text-[11px] text-muted-foreground">
          That's the only sign-in method — no separate email/password account needed.
        </p>
      </DialogContent>
    </Dialog>
  );
}
