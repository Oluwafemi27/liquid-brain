import { Lock } from "lucide-react";
import { useAuth } from "@/store/auth-store";
import { GlassCard } from "./liquid";

/** Stands in for pages and panels that connect outside accounts or take payment, which the demo can't use. */
export function DemoLocked({ what }: { what: string }) {
  const { signInWithGoogle } = useAuth();
  return (
    <div className="mx-auto w-full max-w-xl px-4 py-16">
      <GlassCard
        hover={false}
        className="flex flex-col items-center gap-3 rounded-3xl p-8 text-center"
      >
        <Lock className="h-7 w-7 text-cyan" aria-hidden />
        <h2 className="text-lg font-semibold">{what} isn't part of the demo</h2>
        <p className="text-sm text-muted-foreground">
          The demo is a private look around with a small AI allowance. Connecting apps, Telegram,
          n8n, your own model keys and payments need a real account.
        </p>
        <button
          type="button"
          onClick={() => void signInWithGoogle()}
          className="mt-2 rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background"
        >
          Sign in with Google
        </button>
      </GlassCard>
    </div>
  );
}
