import "@tanstack/react-start/server-only";
import type { Automation, Goal } from "@/lib/aduf-types";
import { DEFAULT_WORKSPACE_ID, getSupabaseAdmin } from "./supabase";
import { verifyAccessToken } from "./survey";

/** Checks the `admins` allowlist table. Every admin-only server function
 *  must call this itself (never trust a client-side "isAdmin" flag alone —
 *  the UI hiding a button isn't security, this check is). */
export async function isAdminEmail(email: string | null | undefined): Promise<boolean> {
  if (!email) return false;
  const db = getSupabaseAdmin();
  if (!db) return false;
  const { data, error } = await db
    .from("admins")
    .select("email")
    .eq("email", email.toLowerCase())
    .maybeSingle();
  if (error) {
    console.error("[admin] failed to check admin allowlist", error);
    return false;
  }
  return Boolean(data);
}

export interface AdminUserRow {
  id: string;
  email: string | null;
  name: string;
  createdAt: string;
  lastSignInAt: string | null;
  isAdmin: boolean;
}

/** Full user list for the admin panel, via the Supabase Auth admin API
 *  (requires the service-role client). Cross-references the `admins`
 *  allowlist so the panel can show/toggle admin status per user. */
export async function listAllUsers(accessToken: string): Promise<AdminUserRow[]> {
  const requester = await verifyAccessToken(accessToken);
  if (!(await isAdminEmail(requester?.email))) return [];
  const db = getSupabaseAdmin();
  if (!db) return [];

  const { data: authData, error: authError } = await db.auth.admin.listUsers({
    perPage: 200,
  });
  if (authError) {
    console.error("[admin] failed to list auth users", authError);
    return [];
  }

  const { data: adminRows } = await db.from("admins").select("email");
  const adminEmails = new Set((adminRows ?? []).map((r) => (r["email"] as string).toLowerCase()));

  return (authData?.users ?? []).map((u) => ({
    id: u.id,
    email: u.email ?? null,
    name:
      (u.user_metadata?.["full_name"] as string | undefined) ??
      (u.user_metadata?.["name"] as string | undefined) ??
      (u.email ? (u.email.split("@")[0] ?? "Unknown") : "Unknown"),
    createdAt: u.created_at,
    lastSignInAt: u.last_sign_in_at ?? null,
    isAdmin: u.email ? adminEmails.has(u.email.toLowerCase()) : false,
  }));
}

/** Grants or revokes admin status for an email — only callable by an
 *  existing admin. Never lets the last remaining admin remove themselves,
 *  so the panel can't accidentally lock everyone out. */
export async function setAdminStatus(
  accessToken: string,
  targetEmail: string,
  makeAdmin: boolean,
): Promise<{ ok: boolean; message?: string }> {
  const requester = await verifyAccessToken(accessToken);
  if (!(await isAdminEmail(requester?.email))) {
    return { ok: false, message: "Not authorized." };
  }
  const db = getSupabaseAdmin();
  if (!db) return { ok: false, message: "Backend not configured." };

  const normalized = targetEmail.toLowerCase();
  if (!makeAdmin) {
    const { count } = await db.from("admins").select("email", { count: "exact", head: true });
    if ((count ?? 0) <= 1) {
      return { ok: false, message: "Can't remove the last remaining admin." };
    }
    const { error } = await db.from("admins").delete().eq("email", normalized);
    if (error) return { ok: false, message: error.message };
    return { ok: true };
  }

  const { error } = await db.from("admins").insert({ email: normalized }).select().maybeSingle();
  if (error && !error.message.includes("duplicate")) {
    return { ok: false, message: error.message };
  }
  return { ok: true };
}

export interface AdminOverview {
  totalUsers: number;
  totalGoals: number;
  totalAutomations: number;
  liveAutomations: number;
  totalAutomationRuns: number;
  totalChatMessages: number;
}

/** Site-wide counters for the admin dashboard's overview cards, summed
 *  across every real user (each row is scoped by its own user_id — see
 *  migration 014 — workspace_id is now just a leftover legacy tag every
 *  row still carries, not a tenant boundary). */
export async function getAdminOverview(accessToken: string): Promise<AdminOverview | null> {
  const requester = await verifyAccessToken(accessToken);
  if (!(await isAdminEmail(requester?.email))) return null;
  const db = getSupabaseAdmin();
  if (!db) return null;

  const [{ data: authData }, goals, automations, runs, messages] = await Promise.all([
    db.auth.admin.listUsers({ perPage: 200 }),
    db
      .from("goals")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", DEFAULT_WORKSPACE_ID),
    db.from("automations").select("id, enabled").eq("workspace_id", DEFAULT_WORKSPACE_ID),
    db
      .from("automation_runs")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", DEFAULT_WORKSPACE_ID),
    db
      .from("chat_messages")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", DEFAULT_WORKSPACE_ID),
  ]);

  const automationRows = (automations.data ?? []) as Array<{ enabled: boolean }>;

  return {
    // Accurate up to 200 users (Supabase Auth admin listUsers' single-page
    // ceiling) — plenty for a small/medium business team; swap in
    // pagination if this workspace ever exceeds that.
    totalUsers: authData?.users?.length ?? 0,
    totalGoals: goals.count ?? 0,
    totalAutomations: automationRows.length,
    liveAutomations: automationRows.filter((a) => a.enabled).length,
    totalAutomationRuns: runs.count ?? 0,
    totalChatMessages: messages.count ?? 0,
  };
}

/** Builds a userId -> display label map from Supabase Auth — shared by the
 *  admin automations/goals listings below so each row can show who it
 *  actually belongs to. */
async function userLabelsById(
  db: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
): Promise<Map<string, string>> {
  const { data } = await db.auth.admin.listUsers({ perPage: 200 });
  const map = new Map<string, string>();
  for (const u of data?.users ?? []) {
    const label =
      (u.user_metadata?.["full_name"] as string | undefined) ??
      (u.user_metadata?.["name"] as string | undefined) ??
      u.email ??
      u.id;
    map.set(u.id, label);
  }
  return map;
}

export interface AdminAutomationRow extends Automation {
  ownerId: string;
  ownerLabel: string;
}

/** Every automation across every user, each tagged with its real owner —
 *  this is what actually fixes the reported bug: the admin Automations tab
 *  used to just read the one shared automations table and present it as
 *  if it were "everyone's" data, when it was really only ever one set.
 *  Now that automations are genuinely per-user, this is the only correct
 *  way for an admin to see "all automations": explicitly fetch across
 *  every user_id and label each row with who it belongs to, rather than
 *  calling the same per-user listAutomations() the regular app uses (which
 *  would now — correctly — only return the admin's own). */
export async function adminListAllAutomations(accessToken: string): Promise<AdminAutomationRow[]> {
  const requester = await verifyAccessToken(accessToken);
  if (!(await isAdminEmail(requester?.email))) return [];
  const db = getSupabaseAdmin();
  if (!db) return [];

  const [{ data: rows, error }, labels] = await Promise.all([
    db
      .from("automations")
      .select(
        "id, user_id, name, enabled, trigger, action, goal, runs, channel, source, steps, goal_id",
      )
      .order("created_at", { ascending: false }),
    userLabelsById(db),
  ]);
  if (error) {
    console.error("[admin] failed to list all automations", error);
    return [];
  }

  return (rows ?? []).map((row) => ({
    id: row["id"] as string,
    ownerId: row["user_id"] as string,
    ownerLabel: labels.get(row["user_id"] as string) ?? "Unknown user",
    name: row["name"] as string,
    enabled: row["enabled"] as boolean,
    trigger: row["trigger"] as string,
    action: row["action"] as string,
    goal: row["goal"] as string,
    runs: row["runs"] as number,
    channel: (row["channel"] as Automation["channel"] | null) ?? undefined,
    source: row["source"] as Automation["source"],
    steps: (row["steps"] as Automation["steps"] | null) ?? undefined,
    goalId: (row["goal_id"] as string | null) ?? undefined,
  }));
}

/** Admin-only: toggles any user's automation by (ownerId, id) — distinct
 *  from the regular setAutomationEnabled(userId, id) in automations.ts,
 *  which only ever lets a user touch their own row. Used solely by the
 *  admin panel, and gated on the caller actually being an admin. */
export async function adminSetAutomationEnabled(
  accessToken: string,
  ownerId: string,
  automationId: string,
  enabled: boolean,
): Promise<{ ok: boolean }> {
  const requester = await verifyAccessToken(accessToken);
  if (!(await isAdminEmail(requester?.email))) return { ok: false };
  const db = getSupabaseAdmin();
  if (!db) return { ok: false };

  const { error } = await db
    .from("automations")
    .update({ enabled, updated_at: new Date().toISOString() })
    .eq("user_id", ownerId)
    .eq("id", automationId);
  if (error) {
    console.error("[admin] failed to toggle automation", error);
    return { ok: false };
  }
  return { ok: true };
}

export interface AdminGoalRow extends Goal {
  ownerId: string;
  ownerLabel: string;
}

/** Every goal across every user, each tagged with its real owner — same
 *  fix as adminListAllAutomations above, applied to Goals. */
export async function adminListAllGoals(accessToken: string): Promise<AdminGoalRow[]> {
  const requester = await verifyAccessToken(accessToken);
  if (!(await isAdminEmail(requester?.email))) return [];
  const db = getSupabaseAdmin();
  if (!db) return [];

  const [{ data: rows, error }, labels] = await Promise.all([
    db
      .from("goals")
      .select("id, user_id, title, target, current, currency, due, sub_tasks")
      .order("created_at", { ascending: false }),
    userLabelsById(db),
  ]);
  if (error) {
    console.error("[admin] failed to list all goals", error);
    return [];
  }

  return (rows ?? []).map((row) => ({
    id: row["id"] as string,
    ownerId: row["user_id"] as string,
    ownerLabel: labels.get(row["user_id"] as string) ?? "Unknown user",
    title: row["title"] as string,
    target: row["target"] as number,
    current: row["current"] as number,
    currency: row["currency"] as string,
    due: row["due"] as string,
    subTasks: (row["sub_tasks"] as Goal["subTasks"]) ?? [],
  }));
}

/** Admin-only: deletes any user's goal by (ownerId, id) — distinct from
 *  the regular deleteGoal(userId, id) in goals.ts, which only ever lets a
 *  user delete their own. Used solely by the admin panel. */
export async function adminDeleteGoal(
  accessToken: string,
  ownerId: string,
  goalId: string,
): Promise<{ ok: boolean }> {
  const requester = await verifyAccessToken(accessToken);
  if (!(await isAdminEmail(requester?.email))) return { ok: false };
  const db = getSupabaseAdmin();
  if (!db) return { ok: false };

  const { error } = await db.from("goals").delete().eq("user_id", ownerId).eq("id", goalId);
  if (error) {
    console.error("[admin] failed to delete goal", error);
    return { ok: false };
  }
  return { ok: true };
}
