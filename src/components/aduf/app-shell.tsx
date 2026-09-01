import { Link } from "@tanstack/react-router";
import {
  BarChart3,
  Bell,
  Brain,
  CalendarClock,
  Network,
  Settings,
  Sparkles,
  Target,
  Waves,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { useAduf } from "@/store/aduf-store";
import { useAuth } from "@/store/auth-store";
import { LiquidBackground } from "./liquid";
import { AuthBootstrap } from "./auth-bootstrap";
import { GoalsBootstrap } from "./goals-bootstrap";
import { SignInGate } from "./sign-in-gate";
import { SignInModal } from "./sign-in-modal";
import { SurveyModal } from "./survey-modal";

const nav = [
  { to: "/", label: "Brain", icon: Brain },
  { to: "/goals", label: "Goals", icon: Target },
  { to: "/automations", label: "Grid", icon: Waves },
  { to: "/schedule", label: "Schedule", icon: CalendarClock },
  { to: "/memory", label: "Memory", icon: Network },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/settings", label: "Me", icon: Settings },
] as const;

const mobileNav = nav.filter((n) => n.label !== "Analytics" && n.label !== "Notifications");

function initials(name: string) {
  const trimmed = name.trim();
  return trimmed ? trimmed.slice(0, 2).toUpperCase() : "—";
}

/** Compact identity chip — used wherever we need a small header footprint
 *  with room for the username. Doubles as the sign-in/sign-out control:
 *  tapping it opens Google sign-in when signed out, or signs out when
 *  signed in. */
function UserChip({ className }: { className?: string }) {
  const { userName } = useAduf();
  const { status, user, openSignIn, signOut } = useAuth();
  const displayName = status === "signed-in" ? user?.name || userName : userName;

  return (
    <button
      type="button"
      onClick={() => (status === "signed-in" ? void signOut() : openSignIn())}
      title={status === "signed-in" ? "Sign out" : "Sign in with Google"}
      className={`flex min-w-0 items-center gap-2 text-left ${className ?? ""}`}
    >
      {status === "signed-in" && user?.avatarUrl ? (
        <img
          src={user.avatarUrl}
          alt=""
          className="h-8 w-8 shrink-0 rounded-full object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-semibold text-background"
          style={{ background: "var(--gradient-accent)" }}
        >
          {initials(displayName)}
        </div>
      )}
      <div className="min-w-0 leading-tight">
        <p className="truncate text-xs font-medium">{displayName || "Add your name"}</p>
        <p className="truncate text-[10px] text-muted-foreground">
          {status === "signed-in" ? "Signed in" : "Sign in"}
        </p>
      </div>
    </button>
  );
}

/** Bell icon linking to /notifications, with an unread-count badge. Used in
 *  the mobile header (which has no bottom-nav slot for Notifications) and
 *  can be dropped in anywhere else a quick shortcut is useful. */
function NotificationBell({ className }: { className?: string }) {
  const unread = useAduf((s) => s.insights.filter((i) => !i.read).length);
  return (
    <Link
      to="/notifications"
      aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
      className={`relative grid h-9 w-9 shrink-0 place-items-center rounded-full hover:bg-white/8 ${className ?? ""}`}
    >
      <Bell className="h-4.5 w-4.5" />
      {unread > 0 ? (
        <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-cyan px-1 text-[9px] font-semibold leading-none text-background">
          {unread > 9 ? "9+" : unread}
        </span>
      ) : null}
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { sources, memoryNodes, insights, userName, setUserName } = useAduf();
  const { status, user } = useAuth();
  const connectedCount = sources.filter((s) => s.connected).length;
  const totalFacts = memoryNodes.reduce((sum, n) => sum + n.facts, 0);
  const unread = insights.filter((i) => !i.read).length;

  // Adopt the Google account's name as the dashboard's display name the
  // first time someone signs in, without clobbering a name they've since
  // customised in Settings.
  useEffect(() => {
    if (status === "signed-in" && user?.name && !userName) {
      setUserName(user.name);
    }
  }, [status, user, userName, setUserName]);

  // Gate the entire app behind Google sign-in. AuthBootstrap still has to
  // mount so the session listener runs and can flip `status` to
  // "signed-in" once a session is found (or restored after redirect).
  if (status !== "signed-in") {
    return (
      <div className="min-h-screen">
        <AuthBootstrap />
        <LiquidBackground />
        <SignInGate loading={status === "loading"} />
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden">
      <AuthBootstrap />
      <GoalsBootstrap />
      <SignInModal />
      <SurveyModal />
      <LiquidBackground />

      <aside className="glass fixed left-4 top-4 bottom-4 z-30 hidden w-[236px] flex-col rounded-3xl p-4 lg:flex">
        <div className="flex items-center justify-between gap-2 px-1 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <div
              className="grid h-8 w-8 shrink-0 place-items-center rounded-xl"
              style={{ background: "var(--gradient-accent)" }}
            >
              <Sparkles className="h-4 w-4 text-background" />
            </div>
            <p className="truncate font-display text-sm font-semibold">ADUF AI</p>
          </div>
        </div>

        <div className="glass mt-1 flex items-center justify-between gap-2 rounded-2xl p-2.5">
          <UserChip />
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ripple absolute inset-0 rounded-full bg-cyan" />
            <span className="relative h-2 w-2 rounded-full bg-cyan" />
          </span>
        </div>

        <nav className="mt-4 flex flex-1 flex-col gap-1">
          {nav.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to === "/" }}
              className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-white/8 hover:text-foreground"
              activeProps={{
                className: "bg-white/12 text-foreground shadow-[var(--glow-cyan)]",
              }}
            >
              <span className="relative shrink-0">
                <Icon className="h-4.5 w-4.5" />
                {label === "Notifications" && unread > 0 ? (
                  <span className="absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full bg-cyan" />
                ) : null}
              </span>
              <span className="truncate">{label}</span>
              {label === "Notifications" && unread > 0 ? (
                <span className="ml-auto shrink-0 text-[10px] text-cyan">{unread}</span>
              ) : null}
            </Link>
          ))}
        </nav>

        <div className="glass mt-2 rounded-2xl p-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ripple absolute inset-0 rounded-full bg-cyan" />
              <span className="relative h-2 w-2 rounded-full bg-cyan" />
            </span>
            <span className="text-muted-foreground">ADUF is Active</span>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
            {connectedCount === 0
              ? "No data sources connected yet"
              : `Watching ${connectedCount} ${connectedCount === 1 ? "source" : "sources"} · ${totalFacts.toLocaleString()} facts learned`}
          </p>
        </div>
      </aside>

      <header className="glass fixed inset-x-3 top-3 z-30 flex items-center justify-between gap-3 rounded-2xl px-3 py-2 lg:hidden">
        <div className="flex min-w-0 items-center gap-2">
          <div
            className="grid h-7 w-7 shrink-0 place-items-center rounded-lg"
            style={{ background: "var(--gradient-accent)" }}
          >
            <Sparkles className="h-3.5 w-3.5 text-background" />
          </div>
          <p className="truncate font-display text-xs font-semibold">ADUF AI</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <NotificationBell />
          <UserChip className="flex-row-reverse text-right" />
        </div>
      </header>

      <main className="min-w-0 overflow-x-hidden pb-24 pt-16 lg:pb-8 lg:pt-0 lg:pl-[268px]">
        {children}
      </main>

      <nav className="glass fixed inset-x-3 bottom-3 z-40 grid grid-cols-6 rounded-3xl p-1.5 lg:hidden">
        {mobileNav.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact: to === "/" }}
            className="flex flex-col items-center gap-1 rounded-2xl py-2 text-[10px] text-muted-foreground transition-colors"
            activeProps={{ className: "bg-white/12 text-foreground" }}
          >
            <Icon className="h-5 w-5" />
            <span className="truncate">{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <header className="mb-7 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:flex-wrap sm:justify-between">
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{eyebrow}</p>
        <h1 className="mt-1 truncate text-xl font-semibold sm:text-2xl">
          <span className="text-gradient">{title}</span>
        </h1>
      </div>
      {children ? <div className="shrink-0">{children}</div> : null}
    </header>
  );
}
