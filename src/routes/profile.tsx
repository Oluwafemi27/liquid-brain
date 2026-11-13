import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ChevronLeft,
  ChevronRight,
  Lock,
  LogOut,
  Plug,
  Settings as SettingsIcon,
  Wallet,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { AppShell } from "@/components/aduf/app-shell";
import { TokenBar, useWallet } from "@/components/aduf/plan-summary";
import { ProfileSection } from "@/components/settings/profile-section";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { useAuth } from "@/store/auth-store";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Your profile — ADUF AI" },
      { name: "description", content: "Your account, sign-up answers and shortcuts." },
    ],
  }),
  component: ProfilePage,
});

function Shortcut({
  to,
  icon,
  title,
  hint,
}: {
  to: string;
  icon: ReactNode;
  title: string;
  hint: string;
}) {
  return (
    <Link
      to={to as never}
      className="group flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-cyan"
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/8 text-muted-foreground group-hover:text-foreground">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{title}</span>
        <span className="block truncate text-xs text-muted-foreground">{hint}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" aria-hidden />
    </Link>
  );
}

function ProfilePage() {
  const { user, status, signOut } = useAuth();
  const ent = useWallet();
  const [busy, setBusy] = useState(false);
  const initial = (user?.name || user?.email || "?").slice(0, 1).toUpperCase();

  async function signOutEverywhere() {
    setBusy(true);
    try {
      await getSupabaseBrowser()?.auth.signOut({ scope: "global" });
    } finally {
      await signOut();
    }
  }

  if (status === "signed-out") {
    return (
      <AppShell>
        <div className="mx-auto max-w-md px-4 py-20 text-center text-sm text-muted-foreground">
          Sign in to see your profile.
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-5xl px-4 pt-4 pb-24 lg:px-8 lg:py-10">
        <Link
          to="/settings"
          className="mb-5 inline-flex items-center gap-1 rounded-lg py-1 pr-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-cyan"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden /> Settings
        </Link>

        {/* Identity: who this is, what plan, how many credits are left. */}
        <header className="relative mb-8 overflow-hidden rounded-3xl border border-white/10 p-5 sm:p-7">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.13]"
            style={{ background: "var(--gradient-accent)" }}
            aria-hidden
          />
          <div className="relative grid grid-cols-[minmax(0,1fr)] gap-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,18rem)] sm:items-center">
            <div className="flex min-w-0 items-center gap-4 sm:gap-5">
              <div
                className="grid h-16 w-16 shrink-0 place-items-center rounded-full text-2xl font-semibold text-background sm:h-20 sm:w-20 sm:text-3xl"
                style={{ background: "var(--gradient-accent)" }}
                aria-hidden
              >
                {initial}
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-xl font-semibold sm:text-2xl">
                  {user?.name || "Your profile"}
                </h1>
                <p className="truncate text-sm text-muted-foreground">{user?.email}</p>
                {ent ? (
                  <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium">
                    {ent.plan.name} plan
                    {ent.subscription.status === "trialing" ? (
                      <span className="text-cyan">· trial</span>
                    ) : null}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="min-w-0">
              {ent ? (
                <>
                  <TokenBar ent={ent} />
                  <Link
                    to="/billing"
                    className="mt-2 inline-block text-xs underline underline-offset-4"
                  >
                    Manage plan &amp; credits
                  </Link>
                </>
              ) : (
                <div className="h-10 animate-pulse rounded-xl bg-white/[0.06]" aria-hidden />
              )}
            </div>
          </div>
        </header>

        <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-12">
          <main className="min-w-0">
            <ProfileSection />
          </main>

          <aside className="space-y-8">
            <section aria-labelledby="shortcuts">
              <h2 id="shortcuts" className="mb-2 text-base font-semibold">
                Shortcuts
              </h2>
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-1.5">
                <Shortcut
                  to="/billing"
                  icon={<Wallet className="h-4 w-4" />}
                  title="Plan & credits"
                  hint="Usage, top-ups and invoices"
                />
                <Shortcut
                  to="/connectors"
                  icon={<Plug className="h-4 w-4" />}
                  title="Connected apps"
                  hint="Add or remove apps"
                />
                <Shortcut
                  to="/settings#privacy"
                  icon={<Lock className="h-4 w-4" />}
                  title="Data & privacy"
                  hint="Export or delete your data"
                />
                <Shortcut
                  to="/settings"
                  icon={<SettingsIcon className="h-4 w-4" />}
                  title="All settings"
                  hint="Safety, connections, plan"
                />
              </div>
            </section>

            <section aria-labelledby="session">
              <h2 id="session" className="mb-2 text-base font-semibold">
                Session
              </h2>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm transition-colors hover:bg-white/5"
                >
                  <LogOut className="h-4 w-4" aria-hidden /> Sign out
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void signOutEverywhere()}
                  className="w-full rounded-xl px-4 py-2 text-xs text-muted-foreground transition-colors hover:text-red-400 disabled:opacity-50"
                >
                  {busy ? "Signing out…" : "Sign out of all devices"}
                </button>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
