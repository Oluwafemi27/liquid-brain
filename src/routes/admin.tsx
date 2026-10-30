import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  BarChart3,
  LayoutDashboard,
  Plug,
  Shield,
  ShieldCheck,
  ShieldOff,
  Target,
  Users,
  Workflow,
} from "lucide-react";
import { useEffect, useState } from "react";
import { AdminAnalyticsSection } from "@/components/admin/analytics-section";
import {
  ActivitySection,
  AutomationsSection,
  ConnectionsSection,
  GoalsSection,
  OverviewSection,
  SecuritySection,
  UsersSection,
} from "@/components/admin/sections";
import { AppShell } from "@/components/aduf/app-shell";
import {
  adminAnalyticsFn,
  adminListAutomationsFn,
  adminListGoalsFn,
  adminListUsersFn,
  adminOverviewFn,
  checkIsAdminFn,
} from "@/lib/server-fns";
import type { AdminAnalytics } from "@/lib/server/admin-analytics";
import type {
  AdminAutomationRow,
  AdminGoalRow,
  AdminOverview,
  AdminUserRow,
} from "@/lib/server/admin";
import { useAuth } from "@/store/auth-store";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — ADUF AI" },
      { name: "description", content: "Workspace administration for ADUF AI." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

const NAV = [
  { id: "Dashboard", icon: LayoutDashboard, group: "Workspace" },
  { id: "Users", icon: Users, group: "Workspace" },
  { id: "Connections", icon: Plug, group: "Workspace" },
  { id: "Activity", icon: Activity, group: "Workspace" },
  { id: "Analytics", icon: BarChart3, group: "Data" },
  { id: "Automations", icon: Workflow, group: "Data" },
  { id: "Goals", icon: Target, group: "Data" },
  { id: "Security", icon: ShieldCheck, group: "System" },
] as const;
type Section = (typeof NAV)[number]["id"];

function AdminPage() {
  const { status, accessToken, user } = useAuth();
  const [checked, setChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [section, setSection] = useState<Section>("Dashboard");

  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [automations, setAutomations] = useState<AdminAutomationRow[] | null>(null);
  const [goals, setGoals] = useState<AdminGoalRow[] | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (!accessToken) {
      setChecked(true);
      return;
    }
    checkIsAdminFn({ data: { accessToken } })
      .then((res) => setIsAdmin(res.isAdmin))
      .catch(() => setIsAdmin(false))
      .finally(() => setChecked(true));
  }, [status, accessToken]);

  useEffect(() => {
    if (!isAdmin || !accessToken) return;
    adminOverviewFn({ data: { accessToken } })
      .then(setOverview)
      .catch(() => undefined);
    adminListUsersFn({ data: { accessToken } })
      .then(setUsers)
      .catch(() => undefined);
  }, [isAdmin, accessToken]);

  // Heavier sections load the first time they're opened.
  useEffect(() => {
    if (!isAdmin || !accessToken) return;
    if (section === "Analytics" && !analytics && !analyticsLoading) {
      setAnalyticsLoading(true);
      adminAnalyticsFn({ data: { accessToken } })
        .then(setAnalytics)
        .catch(() => undefined)
        .finally(() => setAnalyticsLoading(false));
    }
    if (section === "Automations" && automations === null)
      adminListAutomationsFn({ data: { accessToken } })
        .then(setAutomations)
        .catch(() => setAutomations([]));
    if (section === "Goals" && goals === null)
      adminListGoalsFn({ data: { accessToken } })
        .then(setGoals)
        .catch(() => setGoals([]));
  }, [section, isAdmin, accessToken, analytics, analyticsLoading, automations, goals]);

  if (!checked) {
    return (
      <AppShell>
        <div className="mx-auto max-w-[1200px] px-4 py-10" aria-busy="true">
          <div className="h-6 w-40 animate-pulse rounded bg-white/10" />
        </div>
      </AppShell>
    );
  }
  if (!isAdmin) {
    return (
      <AppShell>
        <div className="mx-auto max-w-[1200px] px-4 py-16 text-center">
          <ShieldOff className="mx-auto h-8 w-8 text-muted-foreground" />
          <h1 className="mt-4 text-lg font-semibold">Admins only</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {user?.email
              ? `${user.email} isn't on the admin list for this workspace.`
              : "Sign in with an admin account to view this page."}
          </p>
        </div>
      </AppShell>
    );
  }

  const groups = [...new Set(NAV.map((n) => n.group))];
  return (
    <AppShell>
      <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:py-8">
        <div className="mb-6 flex items-center gap-2">
          <Shield className="h-5 w-5 text-cyan" aria-hidden />
          <h1 className="text-xl font-semibold">Admin</h1>
          <span className="text-sm text-muted-foreground">/ {section}</span>
        </div>

        <div className="lg:grid lg:grid-cols-[210px_minmax(0,1fr)] lg:gap-8">
          {/* Sidebar on desktop, scrolling pills on phones */}
          <nav aria-label="Admin sections" className="mb-6 lg:mb-0">
            <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 lg:sticky lg:top-6 lg:block lg:space-y-5 lg:overflow-visible">
              {groups.map((g) => (
                <div key={g} className="flex gap-1 lg:block lg:space-y-1">
                  <p className="hidden px-3 pb-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground lg:block">
                    {g}
                  </p>
                  {NAV.filter((n) => n.group === g).map((n) => {
                    const active = section === n.id;
                    return (
                      <button
                        key={n.id}
                        type="button"
                        aria-current={active ? "page" : undefined}
                        onClick={() => setSection(n.id)}
                        className={`flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors lg:w-full ${active ? "bg-white/12 text-foreground" : "text-muted-foreground hover:bg-white/6 hover:text-foreground"}`}
                      >
                        <n.icon className="h-4 w-4" aria-hidden />
                        {n.id}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </nav>

          <main className="min-w-0">
            {section === "Dashboard" ? (
              <OverviewSection
                overview={overview}
                users={users}
                goTo={(s) => setSection(s as Section)}
              />
            ) : null}
            {section === "Users" ? (
              <UsersSection users={users} setUsers={setUsers} selfId={user?.id} />
            ) : null}
            {section === "Connections" ? <ConnectionsSection /> : null}
            {section === "Activity" ? <ActivitySection /> : null}
            {section === "Analytics" ? (
              <div>
                <h2 className="mb-4 text-lg font-semibold">Usage analytics</h2>
                <AdminAnalyticsSection analytics={analytics} loading={analyticsLoading} />
              </div>
            ) : null}
            {section === "Automations" ? (
              <AutomationsSection
                rows={automations ?? []}
                setRows={setAutomations}
                loading={automations === null}
              />
            ) : null}
            {section === "Goals" ? (
              <GoalsSection rows={goals ?? []} setRows={setGoals} loading={goals === null} />
            ) : null}
            {section === "Security" ? <SecuritySection /> : null}
          </main>
        </div>
      </div>
    </AppShell>
  );
}
