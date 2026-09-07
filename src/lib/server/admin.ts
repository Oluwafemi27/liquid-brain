import "@tanstack/react-start/server-only";
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

/** Workspace-wide counters for the admin dashboard's overview cards. */
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
