import { Loader2, RefreshCw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Badge, KpiCard, Pager, SearchBox, SectionHeader, Table, Td } from "@/components/admin/ui";
import { HealthBadge } from "@/components/aduf/health-badge";
import { Button } from "@/components/ui/button";
import { ageLabel } from "@/lib/sources";
import {
  adminAuditFn,
  adminRemoveUserFn,
  adminSecurityChecksFn,
  adminSetAdminStatusFn,
  adminTrustSummaryFn,
  adminUserDetailFn,
  adminWorkspaceHealthFn,
  adminSetAutomationEnabledFn,
  adminDeleteGoalFn,
} from "@/lib/server-fns";
import type {
  AdminAutomationRow,
  AdminGoalRow,
  AdminOverview,
  AdminUserRow,
} from "@/lib/server/admin";
import type {
  AdminAuditRow,
  AdminHealthView,
  AdminTrustSummary,
  AdminUserDetail,
  SecurityCheck,
} from "@/lib/server/admin-trust";
import { PLATFORM_NAMES } from "@/lib/permissions-catalog";
import { useAuth } from "@/store/auth-store";

const PAGE = 10;

// ---------------------------------------------------------------- Overview

export function OverviewSection({
  overview,
  users,
  goTo,
}: {
  overview: AdminOverview | null;
  users: AdminUserRow[];
  goTo: (s: string) => void;
}) {
  const accessToken = useAuth((s) => s.accessToken);
  const [t, setT] = useState<AdminTrustSummary | null>(null);
  useEffect(() => {
    adminTrustSummaryFn({ data: { accessToken } })
      .then(setT)
      .catch(() => undefined);
  }, [accessToken]);

  const attention: { text: string; to: string; tone: "bad" | "warn" }[] = [];
  if (t && t.brokenConnections > 0)
    attention.push({
      text: `${t.brokenConnections} connection${t.brokenConnections === 1 ? " is" : "s are"} broken`,
      to: "Connections",
      tone: "bad",
    });
  if (t && t.syncFailures > 0)
    attention.push({
      text: `${t.syncFailures} data sync${t.syncFailures === 1 ? "" : "s"} failing`,
      to: "Connections",
      tone: "bad",
    });
  if (t && t.pendingApprovals > 0)
    attention.push({
      text: `${t.pendingApprovals} action${t.pendingApprovals === 1 ? "" : "s"} waiting on owners' approval`,
      to: "Activity",
      tone: "warn",
    });

  return (
    <div>
      <SectionHeader title="Dashboard" description="How the workspace is doing right now." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Users"
          value={overview?.totalUsers ?? "—"}
          hint={t ? `${t.activeUsers7d} active in 7 days` : undefined}
        />
        <KpiCard
          label="Automations live"
          value={overview ? `${overview.liveAutomations}/${overview.totalAutomations}` : "—"}
          hint={overview ? `${overview.totalAutomationRuns} runs total` : undefined}
        />
        <KpiCard label="Goals" value={overview?.totalGoals ?? "—"} />
        <KpiCard label="Chat messages" value={overview?.totalChatMessages ?? "—"} />
        <KpiCard
          label="Actions (7 days)"
          value={t?.actions7d ?? "—"}
          hint="Proposed, approved or run by ADUF"
        />
        <KpiCard
          label="Waiting for approval"
          value={t?.pendingApprovals ?? "—"}
          {...(t && t.pendingApprovals > 0 ? { tone: "warn" as const } : {})}
        />
        <KpiCard
          label="Broken connections"
          value={t?.brokenConnections ?? "—"}
          {...(t && t.brokenConnections > 0 ? { tone: "bad" as const } : {})}
        />
        <KpiCard
          label="Imports"
          value={t?.importsTotal ?? "—"}
          hint={
            t && t.syncFailures ? `${t.syncFailures} failing to sync` : "Customer rows are private"
          }
        />
      </div>

      <h3 className="mb-2 mt-8 text-sm font-semibold">Needs attention</h3>
      {attention.length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-muted-foreground">
          {t ? "Nothing needs attention." : "Checking…"}
        </p>
      ) : (
        <ul className="space-y-2">
          {attention.map((a) => (
            <li
              key={a.text}
              className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm"
            >
              <span className="flex items-center gap-2">
                <Badge tone={a.tone}>{a.tone === "bad" ? "Problem" : "Waiting"}</Badge>
                {a.text}
              </span>
              <button
                className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
                onClick={() => goTo(a.to)}
              >
                Open
              </button>
            </li>
          ))}
        </ul>
      )}

      <h3 className="mb-2 mt-8 text-sm font-semibold">Newest users</h3>
      <Table
        head={["Name", "Email", "Joined"]}
        empty={users.length === 0 ? "No users yet." : undefined}
      >
        {[...users]
          .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
          .slice(0, 5)
          .map((u) => (
            <tr key={u.id}>
              <Td>{u.name}</Td>
              <Td className="text-muted-foreground">{u.email ?? "—"}</Td>
              <Td className="text-muted-foreground">
                {new Date(u.createdAt).toLocaleDateString()}
              </Td>
            </tr>
          ))}
      </Table>
    </div>
  );
}

// ------------------------------------------------------------------- Users

export function UsersSection({
  users,
  setUsers,
  selfId,
}: {
  users: AdminUserRow[];
  setUsers: (u: AdminUserRow[]) => void;
  selfId: string | undefined;
}) {
  const accessToken = useAuth((s) => s.accessToken);
  const [q, setQ] = useState("");
  const [role, setRole] = useState<"all" | "admin" | "member">("all");
  const [sort, setSort] = useState<"recent" | "joined" | "name">("recent");
  const [page, setPage] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState<AdminUserRow | null>(null);
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [confirm, setConfirm] = useState("");

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return users
      .filter((u) => (role === "all" ? true : role === "admin" ? u.isAdmin : !u.isAdmin))
      .filter(
        (u) =>
          !needle ||
          u.name.toLowerCase().includes(needle) ||
          (u.email ?? "").toLowerCase().includes(needle),
      )
      .sort((a, b) =>
        sort === "name"
          ? a.name.localeCompare(b.name)
          : sort === "joined"
            ? a.createdAt < b.createdAt
              ? 1
              : -1
            : (b.lastSignInAt ?? "") > (a.lastSignInAt ?? "")
              ? 1
              : -1,
      );
  }, [users, q, role, sort]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const shown = rows.slice(page * PAGE, page * PAGE + PAGE);
  useEffect(() => setPage(0), [q, role, sort]);

  const toggleAdmin = async (u: AdminUserRow) => {
    if (!u.email) return;
    setBusy(u.id);
    setNotice(null);
    try {
      const res = await adminSetAdminStatusFn({
        data: { accessToken: accessToken!, targetEmail: u.email, makeAdmin: !u.isAdmin },
      });
      if (res.ok) setUsers(users.map((x) => (x.id === u.id ? { ...x, isAdmin: !x.isAdmin } : x)));
      else setNotice(res.message ?? "Something went wrong.");
    } catch {
      setNotice("Something went wrong.");
    } finally {
      setBusy(null);
    }
  };

  const view = async (u: AdminUserRow) => {
    setOpen(u);
    setDetail(null);
    setConfirm("");
    setNotice(null);
    setDetail(await adminUserDetailFn({ data: { accessToken, userId: u.id } }));
  };

  const remove = async (u: AdminUserRow) => {
    setBusy(u.id);
    const res = await adminRemoveUserFn({
      data: { accessToken, userId: u.id, confirmEmail: confirm },
    });
    setNotice(res.message);
    if (res.ok) {
      setUsers(users.filter((x) => x.id !== u.id));
      setOpen(null);
    }
    setBusy(null);
  };

  return (
    <div>
      <SectionHeader
        title="Users"
        description="Roles and account management. Admins see account-level counts only — never a user's customer data."
      >
        <SearchBox value={q} onChange={setQ} placeholder="Search name or email" />
        <select
          aria-label="Role"
          className="rounded-xl border border-white/10 bg-white/6 px-3 py-2 text-sm"
          value={role}
          onChange={(e) => setRole(e.target.value as typeof role)}
        >
          <option value="all">All roles</option>
          <option value="admin">Admins</option>
          <option value="member">Members</option>
        </select>
        <select
          aria-label="Sort"
          className="rounded-xl border border-white/10 bg-white/6 px-3 py-2 text-sm"
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
        >
          <option value="recent">Recently active</option>
          <option value="joined">Newest</option>
          <option value="name">Name</option>
        </select>
      </SectionHeader>
      {notice ? (
        <p role="status" className="mb-3 rounded-xl bg-amber-400/10 p-3 text-xs text-amber-200">
          {notice}
        </p>
      ) : null}
      <Table
        head={["User", "Role", "Last active", "Joined", ""]}
        empty={shown.length === 0 ? "No users match." : undefined}
      >
        {shown.map((u) => (
          <tr key={u.id} className="hover:bg-white/[0.03]">
            <Td>
              <p className="font-medium">
                {u.name}
                {u.id === selfId ? (
                  <span className="ml-2 text-[10px] text-muted-foreground">(you)</span>
                ) : null}
              </p>
              <p className="text-xs text-muted-foreground">{u.email ?? "no email"}</p>
            </Td>
            <Td>{u.isAdmin ? <Badge tone="info">Admin</Badge> : <Badge>Member</Badge>}</Td>
            <Td className="text-muted-foreground">
              {u.lastSignInAt ? ageLabel(u.lastSignInAt) : "never"}
            </Td>
            <Td className="text-muted-foreground">{new Date(u.createdAt).toLocaleDateString()}</Td>
            <Td className="text-right">
              <Button size="sm" variant="ghost" onClick={() => void view(u)}>
                Details
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busy === u.id || !u.email}
                onClick={() => void toggleAdmin(u)}
              >
                {u.isAdmin ? "Revoke admin" : "Make admin"}
              </Button>
            </Td>
          </tr>
        ))}
      </Table>
      <Pager page={page} pages={pages} onPage={setPage} />

      {open ? (
        <div
          role="dialog"
          aria-label={`Details for ${open.name}`}
          className="fixed inset-y-0 right-0 z-50 w-full max-w-sm overflow-y-auto border-l border-white/10 bg-background p-5 shadow-2xl"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold">{open.name}</p>
              <p className="text-xs text-muted-foreground">{open.email}</p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setOpen(null)}>
              Close
            </Button>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {detail ? (
              <>
                <KpiCard label="Goals" value={detail.goals} />
                <KpiCard label="Automations" value={detail.automations} />
                <KpiCard label="Imports" value={detail.imports} />
                <KpiCard label="ADUF actions" value={detail.actions} />
                <KpiCard label="Chat messages" value={detail.chatMessages} />
                <KpiCard
                  label="Last platform activity"
                  value={detail.lastActivityAt ? ageLabel(detail.lastActivityAt) : "—"}
                />
              </>
            ) : (
              <p className="col-span-2 text-sm text-muted-foreground">Loading…</p>
            )}
          </div>
          {open.id !== selfId && !open.isAdmin ? (
            <div className="mt-8 rounded-2xl border border-red-400/30 bg-red-400/[0.05] p-4">
              <p className="flex items-center gap-2 text-sm font-medium">
                <Trash2 className="h-4 w-4" /> Remove user and all data
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Permanently deletes their account, goals, automations, chats, imports and activity.
                Type their email to confirm.
              </p>
              <input
                aria-label="Type the user's email to confirm"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder={open.email ?? ""}
                className="mt-3 w-full rounded-xl border border-white/10 bg-white/6 px-3 py-2 text-sm outline-none"
              />
              <Button
                className="mt-3"
                variant="destructive"
                size="sm"
                disabled={
                  busy === open.id ||
                  confirm.trim().toLowerCase() !== (open.email ?? "").toLowerCase()
                }
                onClick={() => void remove(open)}
              >
                {busy === open.id ? <Loader2 className="animate-spin" /> : null}Remove permanently
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

// ------------------------------------------------------------- Connections

export function ConnectionsSection() {
  const accessToken = useAuth((s) => s.accessToken);
  const [view, setView] = useState<AdminHealthView | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(
    async (force: boolean) => {
      setBusy(true);
      try {
        setView(await adminWorkspaceHealthFn({ data: { accessToken, force } }));
      } finally {
        setBusy(false);
      }
    },
    [accessToken],
  );
  useEffect(() => {
    void load(false);
  }, [load]);

  return (
    <div>
      <SectionHeader
        title="Connections"
        description="Whether each connected platform is live, delayed or broken — and what to do about it."
      >
        <Button size="sm" variant="outline" disabled={busy} onClick={() => void load(true)}>
          {busy ? <Loader2 className="animate-spin" /> : <RefreshCw />}Check now
        </Button>
      </SectionHeader>
      <Table
        head={["Platform", "Status", "What's happening", "Last OK", "Checked"]}
        empty={view && view.connections.length === 0 ? "No platforms are connected." : undefined}
      >
        {(view?.connections ?? []).map((c) => (
          <tr key={c.id}>
            <Td className="font-medium">{c.name}</Td>
            <Td>
              <HealthBadge state={c.state} />
            </Td>
            <Td className="text-muted-foreground">
              {c.message}{" "}
              {c.state !== "live" ? (
                <Link to="/settings" className="underline underline-offset-4">
                  Fix in Settings
                </Link>
              ) : null}
              <span className="ml-1 text-[11px]">
                ({c.method === "live-check" ? "checked live" : "saved login only"})
              </span>
            </Td>
            <Td className="text-muted-foreground">{c.lastOkAt ? ageLabel(c.lastOkAt) : "never"}</Td>
            <Td className="text-muted-foreground">{ageLabel(c.checkedAt)}</Td>
          </tr>
        ))}
      </Table>
      {!view ? <p className="mt-3 text-sm text-muted-foreground">Checking…</p> : null}
      {view && view.syncIssues.length > 0 ? (
        <>
          <h3 className="mb-2 mt-8 text-sm font-semibold">Failing syncs</h3>
          <Table head={["Source", "File / property", "Owner", "Error"]}>
            {view.syncIssues.map((s, i) => (
              <tr key={i}>
                <Td>{PLATFORM_NAMES[s.source] ?? s.source}</Td>
                <Td>{s.label}</Td>
                <Td className="text-muted-foreground">{s.owner}</Td>
                <Td className="text-red-300">{s.error}</Td>
              </tr>
            ))}
          </Table>
        </>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------- Activity

const STATUS_TONE: Record<string, "good" | "warn" | "bad" | "neutral" | "info"> = {
  approved: "good",
  auto_executed: "info",
  proposed: "warn",
  declined: "neutral",
  expired: "neutral",
  undone: "neutral",
  failed: "bad",
};

export function ActivitySection() {
  const accessToken = useAuth((s) => s.accessToken);
  const [status, setStatus] = useState("all");
  const [rows, setRows] = useState<AdminAuditRow[] | null>(null);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  useEffect(() => {
    setRows(null);
    adminAuditFn({ data: { accessToken, status } })
      .then((r) => setRows(r ?? []))
      .catch(() => setRows([]));
  }, [accessToken, status]);
  const filtered = (rows ?? []).filter(
    (r) =>
      !q ||
      r.title.toLowerCase().includes(q.toLowerCase()) ||
      r.owner.toLowerCase().includes(q.toLowerCase()),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  useEffect(() => setPage(0), [q, status]);

  return (
    <div>
      <SectionHeader
        title="Activity"
        description="Everything ADUF proposed, ran, or was asked to approve — and who decided. Titles and outcomes only."
      >
        <SearchBox value={q} onChange={setQ} placeholder="Search action or user" />
        <select
          aria-label="Status"
          className="rounded-xl border border-white/10 bg-white/6 px-3 py-2 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="all">All outcomes</option>
          <option value="proposed">Waiting</option>
          <option value="approved">Approved</option>
          <option value="auto_executed">Ran automatically</option>
          <option value="declined">Declined</option>
          <option value="undone">Undone</option>
          <option value="failed">Failed</option>
          <option value="expired">Expired</option>
        </select>
      </SectionHeader>
      {!rows ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <Table
            head={["When", "User", "Action", "Risk", "Outcome", "Decided by"]}
            empty={filtered.length === 0 ? "No activity yet." : undefined}
          >
            {filtered.slice(page * PAGE, page * PAGE + PAGE).map((r) => (
              <tr key={r.id}>
                <Td className="whitespace-nowrap text-muted-foreground">{ageLabel(r.at)}</Td>
                <Td className="text-muted-foreground">{r.owner}</Td>
                <Td>
                  {r.title}
                  {r.overLimit ? <Badge tone="bad">over limit</Badge> : null}
                </Td>
                <Td className="text-muted-foreground">{r.risk}</Td>
                <Td>
                  <Badge tone={STATUS_TONE[r.status] ?? "neutral"}>
                    {r.status.replace("_", " ")}
                  </Badge>
                </Td>
                <Td className="text-muted-foreground">
                  {r.decidedBy === "auto"
                    ? "ADUF (low-risk)"
                    : r.decidedBy === "owner"
                      ? "Owner"
                      : "—"}
                </Td>
              </tr>
            ))}
          </Table>
          <Pager page={page} pages={pages} onPage={setPage} />
        </>
      )}
    </div>
  );
}

// ------------------------------------------------------- Automations, Goals

export function AutomationsSection({
  rows,
  setRows,
  loading,
}: {
  rows: AdminAutomationRow[];
  setRows: (r: AdminAutomationRow[]) => void;
  loading: boolean;
}) {
  const accessToken = useAuth((s) => s.accessToken);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const filtered = rows.filter(
    (a) => !q || `${a.name} ${a.ownerLabel}`.toLowerCase().includes(q.toLowerCase()),
  );
  useEffect(() => setPage(0), [q]);
  const toggle = async (a: AdminAutomationRow) => {
    setBusy(a.id + a.ownerId);
    try {
      const { ok } = await adminSetAutomationEnabledFn({
        data: {
          accessToken: accessToken!,
          ownerId: a.ownerId,
          automationId: a.id,
          enabled: !a.enabled,
        },
      });
      if (ok)
        setRows(
          rows.map((x) =>
            x.id === a.id && x.ownerId === a.ownerId ? { ...x, enabled: !x.enabled } : x,
          ),
        );
    } finally {
      setBusy(null);
    }
  };
  return (
    <div>
      <SectionHeader title="Automations" description="Every automation across the workspace.">
        <SearchBox value={q} onChange={setQ} placeholder="Search automation or owner" />
      </SectionHeader>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <Table
            head={["Automation", "Owner", "Runs", "Status", ""]}
            empty={filtered.length === 0 ? "No automations." : undefined}
          >
            {filtered.slice(page * PAGE, page * PAGE + PAGE).map((a) => (
              <tr key={a.ownerId + a.id}>
                <Td>
                  <p className="font-medium">{a.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.trigger} → {a.action}
                  </p>
                </Td>
                <Td className="text-muted-foreground">{a.ownerLabel}</Td>
                <Td className="tabular-nums">{a.runs}</Td>
                <Td>{a.enabled ? <Badge tone="good">On</Badge> : <Badge>Off</Badge>}</Td>
                <Td className="text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy === a.id + a.ownerId}
                    onClick={() => void toggle(a)}
                  >
                    {a.enabled ? "Turn off" : "Turn on"}
                  </Button>
                </Td>
              </tr>
            ))}
          </Table>
          <Pager
            page={page}
            pages={Math.max(1, Math.ceil(filtered.length / PAGE))}
            onPage={setPage}
          />
        </>
      )}
    </div>
  );
}

export function GoalsSection({
  rows,
  setRows,
  loading,
}: {
  rows: AdminGoalRow[];
  setRows: (r: AdminGoalRow[]) => void;
  loading: boolean;
}) {
  const accessToken = useAuth((s) => s.accessToken);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const filtered = rows.filter(
    (g) => !q || `${g.title} ${g.ownerLabel}`.toLowerCase().includes(q.toLowerCase()),
  );
  useEffect(() => setPage(0), [q]);
  const remove = async (g: AdminGoalRow) => {
    setConfirmId(null);
    setRows(rows.filter((x) => !(x.id === g.id && x.ownerId === g.ownerId)));
    await adminDeleteGoalFn({
      data: { accessToken: accessToken!, ownerId: g.ownerId, goalId: g.id },
    }).catch(() => undefined);
  };
  return (
    <div>
      <SectionHeader title="Goals" description="Every goal across the workspace.">
        <SearchBox value={q} onChange={setQ} placeholder="Search goal or owner" />
      </SectionHeader>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <Table
            head={["Goal", "Owner", "Progress", "Due", ""]}
            empty={filtered.length === 0 ? "No goals." : undefined}
          >
            {filtered.slice(page * PAGE, page * PAGE + PAGE).map((g) => {
              const pct =
                g.target > 0 ? Math.min(100, Math.round((g.current / g.target) * 100)) : 0;
              return (
                <tr key={g.ownerId + g.id}>
                  <Td className="font-medium">{g.title}</Td>
                  <Td className="text-muted-foreground">{g.ownerLabel}</Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-white/60"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs tabular-nums text-muted-foreground">{pct}%</span>
                    </div>
                  </Td>
                  <Td className="text-muted-foreground">{g.due || "—"}</Td>
                  <Td className="text-right">
                    {confirmId === g.id ? (
                      <>
                        <Button size="sm" variant="destructive" onClick={() => void remove(g)}>
                          Delete
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setConfirmId(null)}>
                          Keep
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Delete ${g.title}`}
                        onClick={() => setConfirmId(g.id)}
                      >
                        <Trash2 />
                      </Button>
                    )}
                  </Td>
                </tr>
              );
            })}
          </Table>
          <Pager
            page={page}
            pages={Math.max(1, Math.ceil(filtered.length / PAGE))}
            onPage={setPage}
          />
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Security

export function SecuritySection() {
  const accessToken = useAuth((s) => s.accessToken);
  const [checks, setChecks] = useState<SecurityCheck[] | null>(null);
  useEffect(() => {
    adminSecurityChecksFn({ data: { accessToken } })
      .then(setChecks)
      .catch(() => setChecks([]));
  }, [accessToken]);
  return (
    <div>
      <SectionHeader
        title="Security"
        description="Configuration that protects your users' logins and data. Fix anything marked Needs attention."
      />
      {!checks ? (
        <p className="text-sm text-muted-foreground">Checking…</p>
      ) : (
        <ul className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10">
          {checks.map((c) => (
            <li key={c.id} className="flex items-start gap-3 p-4">
              <Badge tone={c.ok ? "good" : "bad"}>{c.ok ? "OK" : "Needs attention"}</Badge>
              <div>
                <p className="text-sm font-medium">{c.label}</p>
                <p className="text-xs text-muted-foreground">{c.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-xs text-muted-foreground">
        Database tables holding logins, customer data and activity have row-level security on with
        no public policies — only the server can read them.
      </p>
    </div>
  );
}
