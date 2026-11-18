import { AlertTriangle, Ban, Info, X } from "lucide-react";
import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import type { LimitNotice } from "@/lib/billing-types";
import { buildNotices } from "@/lib/usage-notices";
import { useAuth } from "@/store/auth-store";
import { useUsage } from "@/store/usage-store";

const STYLE = {
  info: { box: "border-cyan/30 bg-cyan/10 text-foreground", Icon: Info, tone: "text-cyan" },
  warning: {
    box: "border-amber-400/40 bg-amber-400/10 text-foreground",
    Icon: AlertTriangle,
    tone: "text-amber-300",
  },
  blocked: {
    box: "border-red-400/40 bg-red-400/10 text-foreground",
    Icon: Ban,
    tone: "text-red-300",
  },
} as const;

function Cta({ n }: { n: LimitNotice }) {
  const { signInWithGoogle } = useAuth();
  const cls =
    "shrink-0 rounded-full bg-foreground px-3.5 py-1.5 text-xs font-medium text-background";
  if (n.cta === "signin")
    return (
      <button type="button" onClick={() => void signInWithGoogle()} className={cls}>
        Sign in with Google
      </button>
    );
  if (n.cta === "upgrade" || n.cta === "topup")
    return (
      <Link to="/billing" className={cls}>
        {n.cta === "upgrade" ? "See plans" : "Top up"}
      </Link>
    );
  return null;
}

/** Tells people, in plain words, when they're close to a limit or have hit one, and when it resets.
 *  Lives above every page so a blocked chat is never a silent failure. */
export function UsageNotices() {
  const usage = useUsage((s) => s.usage);
  const dismissed = useUsage((s) => s.dismissed);
  const dismiss = useUsage((s) => s.dismiss);

  const notices = useMemo(
    () => (usage ? buildNotices(usage).filter((n) => !dismissed.includes(n.id)) : []),
    [usage, dismissed],
  );
  if (!notices.length) return null;

  return (
    <div
      className="mx-auto w-full max-w-5xl space-y-2 px-4 pt-3 lg:px-8 lg:pt-6"
      aria-live="polite"
    >
      {notices.map((n) => {
        const { box, Icon, tone } = STYLE[n.level];
        return (
          <div
            key={n.id}
            role={n.level === "blocked" ? "alert" : "status"}
            className={`flex items-start gap-3 rounded-2xl border p-3 text-sm ${box}`}
          >
            <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${tone}`} aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="font-medium">{n.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>
            </div>
            <Cta n={n} />
            {n.level !== "blocked" ? (
              <button
                type="button"
                onClick={() => dismiss(n.id)}
                aria-label="Dismiss"
                className="shrink-0 rounded-full p-1 text-muted-foreground hover:bg-white/10"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
