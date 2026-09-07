import { createFileRoute } from "@tanstack/react-router";
import { Activity, BarChart3, Radio, Shield, ShieldOff, Target, Users, Waves } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell, PageHeader } from "@/components/aduf/app-shell";
import { GlassCard } from "@/components/aduf/liquid";
import { useAuth } from "@/store/auth-store";
import {
  adminListUsersFn,
  adminOverviewFn,
  adminSetAdminStatusFn,
  checkIsAdminFn,
} from "@/lib/server-fns";
import type { AdminOverview, AdminUserRow } from "@/lib/server/admin";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Panel — ADUF AI" },
      { name: "description", content: "Workspace-wide admin controls for ADUF AI." },
    ],
  }),
  component: AdminPage,
});

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: number | string;
}) {
  return (
    <GlassCard className="flex items-center gap-4 p-5">
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-cyan/15 text-cyan">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-2xl font-semibold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </GlassCard>
  );
}

function AdminPage() {
  const { status, accessToken, user } = useAuth();
  const [checked, setChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [busyEmail, setBusyEmail] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (!accessToken) {
      setChecked(true);
      setIsAdmin(false);
      return;
    }
    checkIsAdminFn({ data: { accessToken } })
      .then((res) => {
        setIsAdmin(res.isAdmin);
        setChecked(true);
      })
      .catch(() => setChecked(true));
  }, [status, accessToken]);

  useEffect(() => {
    if (!isAdmin || !accessToken) return;
    adminOverviewFn({ data: { accessToken } })
      .then(setOverview)
      .catch((err) => console.error("[admin] overview failed", err));
    adminListUsersFn({ data: { accessToken } })
      .then(setUsers)
      .catch((err) => console.error("[admin] list users failed", err));
  }, [isAdmin, accessToken]);

  function toggleAdmin(target: AdminUserRow) {
    if (!accessToken || !target.email) return;
    setBusyEmail(target.email);
    setNotice(null);
    adminSetAdminStatusFn({
      data: { accessToken, targetEmail: target.email, makeAdmin: !target.isAdmin },
    })
      .then((res) => {
        if (res.ok) {
          setUsers((prev) =>
            prev.map((u) => (u.email === target.email ? { ...u, isAdmin: !u.isAdmin } : u)),
          );
        } else {
          setNotice(res.message ?? "Something went wrong.");
        }
      })
      .catch((err) => setNotice(err instanceof Error ? err.message : "Something went wrong."))
      .finally(() => setBusyEmail(null));
  }

  if (!checked) {
    return (
      <AppShell>
        <div className="mx-auto max-w-[1200px] px-4 py-10 text-center text-sm text-muted-foreground">
          Checking access…
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
              ? `${user.email} isn't on the admin allowlist for this workspace.`
              : "Sign in with an admin account to view this page."}
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6 lg:py-8">
        <PageHeader eyebrow="Admin" title="Workspace control panel">
          <div className="glass flex items-center gap-1.5 rounded-full px-4 py-2 text-xs text-muted-foreground">
            <Shield className="h-3.5 w-3.5 text-cyan" /> Signed in as admin
          </div>
        </PageHeader>

        {overview ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard icon={Users} label="Users" value={overview.totalUsers} />
            <StatCard icon={Target} label="Goals tracked" value={overview.totalGoals} />
            <StatCard
              icon={Waves}
              label="Automations (live / total)"
              value={`${overview.liveAutomations}/${overview.totalAutomations}`}
            />
            <StatCard
              icon={Activity}
              label="Automation runs"
              value={overview.totalAutomationRuns}
            />
            <StatCard icon={BarChart3} label="Chat messages" value={overview.totalChatMessages} />
            <StatCard icon={Radio} label="Status" value="All systems live" />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Loading workspace overview…</p>
        )}

        <GlassCard hover={false} className="mt-6 p-0">
          <div className="flex items-center justify-between gap-3 border-b border-border p-5">
            <div>
              <h2 className="text-base font-semibold">Users</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Grant or revoke admin access. There must always be at least one admin.
              </p>
            </div>
          </div>
          {notice ? (
            <p className="border-b border-border px-5 py-2 text-xs text-amber-300">{notice}</p>
          ) : null}
          <div className="divide-y divide-border">
            {users.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted-foreground">No users yet.</p>
            ) : (
              users.map((u) => (
                <div key={u.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{u.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {u.email ?? "no email"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {u.isAdmin ? (
                      <span className="rounded-full border border-cyan/40 px-2.5 py-1 text-[10px] uppercase tracking-wide text-cyan">
                        Admin
                      </span>
                    ) : null}
                    <button
                      onClick={() => toggleAdmin(u)}
                      disabled={busyEmail === u.email || !u.email}
                      className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-white/8 hover:text-foreground disabled:opacity-40"
                    >
                      {u.isAdmin ? "Revoke admin" : "Make admin"}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </GlassCard>
      </div>
    </AppShell>
  );
}
