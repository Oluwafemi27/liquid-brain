import "@tanstack/react-start/server-only";
import { appBaseUrl } from "@/lib/server/app-url";
import type { ConnectionHealth } from "@/lib/aduf-types";
import { isAdminEmail } from "./admin";
import { checkAllConnections } from "./connection-health";
import { deleteUserData } from "./data-deletion";
import { emailConfigured } from "./notify";
import { paystackMode, planCodeUsable } from "./paystack";
import { getSupabaseAdmin, DEFAULT_WORKSPACE_ID } from "./supabase";
import { verifyAccessToken } from "./survey";

type Row = Record<string, unknown>;

export async function asAdmin(accessToken: string | null) {
  const user = accessToken ? await verifyAccessToken(accessToken) : null;
  if (!user || !user.emailVerified || !(await isAdminEmail(user.email))) return null;
  const db = getSupabaseAdmin();
  return db ? { user, db } : null;
}

async function ownerLabels(
  db: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
): Promise<Map<string, string>> {
  const { data } = await db.auth.admin.listUsers({ perPage: 200 });
  return new Map((data?.users ?? []).map((u) => [u.id, u.email ?? "unknown"]));
}

export interface AdminTrustSummary {
  activeUsers7d: number;
  pendingApprovals: number;
  actions7d: number;
  brokenConnections: number;
  syncFailures: number;
  importsTotal: number;
}

export async function adminTrustSummary(
  accessToken: string | null,
): Promise<AdminTrustSummary | null> {
  const ctx = await asAdmin(accessToken);
  if (!ctx) return null;
  const { db } = ctx;
  const week = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const [users, pending, acts, health, fails, imports] = await Promise.all([
    db.auth.admin.listUsers({ perPage: 200 }),
    db.from("agent_actions").select("id", { count: "exact", head: true }).eq("status", "proposed"),
    db.from("agent_actions").select("id", { count: "exact", head: true }).gte("created_at", week),
    checkAllConnections().catch(() => [] as ConnectionHealth[]),
    db
      .from("data_imports")
      .select("id", { count: "exact", head: true })
      .not("last_error", "is", null),
    db.from("data_imports").select("id", { count: "exact", head: true }),
  ]);
  return {
    activeUsers7d: (users.data?.users ?? []).filter(
      (u) => u.last_sign_in_at && u.last_sign_in_at >= week,
    ).length,
    pendingApprovals: pending.count ?? 0,
    actions7d: acts.count ?? 0,
    brokenConnections: health.filter((h) => h.state === "broken").length,
    syncFailures: fails.count ?? 0,
    importsTotal: imports.count ?? 0,
  };
}

export interface AdminHealthView {
  connections: ConnectionHealth[];
  syncIssues: { source: string; label: string; error: string; owner: string }[];
}

export async function adminWorkspaceHealth(
  accessToken: string | null,
  force: boolean,
): Promise<AdminHealthView | null> {
  const ctx = await asAdmin(accessToken);
  if (!ctx) return null;
  const [connections, issues, owners] = await Promise.all([
    checkAllConnections(force),
    ctx.db
      .from("data_imports")
      .select("source, label, last_error, user_id")
      .not("last_error", "is", null)
      .limit(50),
    ownerLabels(ctx.db),
  ]);
  return {
    connections,
    syncIssues: (issues.data ?? []).map((r) => ({
      source: r["source"] as string,
      label: r["label"] as string,
      error: r["last_error"] as string,
      owner: owners.get(r["user_id"] as string) ?? "unknown",
    })),
  };
}

export interface AdminAuditRow {
  id: string;
  at: string;
  owner: string;
  title: string;
  tier: string;
  risk: string;
  status: string;
  decidedBy: string | null;
  overLimit: boolean;
}

/** Every proposed / approved / declined / undone action across the workspace — titles and outcomes only. */
export async function adminAudit(
  accessToken: string | null,
  status: string | null,
): Promise<AdminAuditRow[] | null> {
  const ctx = await asAdmin(accessToken);
  if (!ctx) return null;
  let q = ctx.db
    .from("agent_actions")
    .select("id, user_id, title, tier, risk, status, decided_by, over_limit, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (status && status !== "all") q = q.eq("status", status);
  const [{ data }, owners] = await Promise.all([q, ownerLabels(ctx.db)]);
  return (data ?? []).map((r: Row) => ({
    id: r["id"] as string,
    at: r["created_at"] as string,
    owner: owners.get(r["user_id"] as string) ?? "unknown",
    title: r["title"] as string,
    tier: r["tier"] as string,
    risk: r["risk"] as string,
    status: r["status"] as string,
    decidedBy: (r["decided_by"] as string | null) ?? null,
    overLimit: Boolean(r["over_limit"]),
  }));
}

export interface AdminUserDetail {
  goals: number;
  automations: number;
  imports: number;
  actions: number;
  chatMessages: number;
  lastActivityAt: string | null;
}

/** Counts only — admins never see a user's customer rows, chats or imported data. */
export async function adminUserDetail(
  accessToken: string | null,
  userId: string,
): Promise<AdminUserDetail | null> {
  const ctx = await asAdmin(accessToken);
  if (!ctx) return null;
  const count = async (t: string) =>
    (await ctx.db.from(t).select("id", { count: "exact", head: true }).eq("user_id", userId))
      .count ?? 0;
  const [goals, automations, imports, actions, chatMessages, last] = await Promise.all([
    count("goals"),
    count("automations"),
    count("data_imports"),
    count("agent_actions"),
    count("chat_messages"),
    ctx.db
      .from("platform_events")
      .select("created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1),
  ]);
  return {
    goals,
    automations,
    imports,
    actions,
    chatMessages,
    lastActivityAt: (last.data?.[0]?.["created_at"] as string | undefined) ?? null,
  };
}

export async function adminRemoveUser(
  accessToken: string | null,
  userId: string,
  confirmEmail: string,
): Promise<{ ok: boolean; message: string }> {
  const ctx = await asAdmin(accessToken);
  if (!ctx) return { ok: false, message: "Admins only." };
  if (ctx.user.id === userId)
    return {
      ok: false,
      message: "You can't remove your own account here — use Settings → Your data.",
    };
  const { data } = await ctx.db.auth.admin.getUserById(userId);
  const email = data.user?.email;
  if (!email) return { ok: false, message: "User not found." };
  if (email.toLowerCase() !== confirmEmail.trim().toLowerCase())
    return { ok: false, message: "The email you typed doesn't match." };
  if (await isAdminEmail(email))
    return { ok: false, message: "Revoke this person's admin access first." };
  try {
    await deleteUserData(userId, "everything");
    return { ok: true, message: `Removed ${email} and all of their data.` };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Couldn't remove that user." };
  }
}

export interface SecurityCheck {
  id: string;
  label: string;
  ok: boolean;
  detail: string;
}

export async function adminSecurityChecks(
  accessToken: string | null,
): Promise<SecurityCheck[] | null> {
  const ctx = await asAdmin(accessToken);
  if (!ctx) return null;
  const { data: conns } = await ctx.db
    .from("connectors")
    .select("id, access_token, refresh_token")
    .eq("workspace_id", DEFAULT_WORKSPACE_ID)
    .eq("connected", true);
  const plain = (conns ?? []).filter(
    (c) =>
      (c["access_token"] && !String(c["access_token"]).startsWith("enc:v1:")) ||
      (c["refresh_token"] && !String(c["refresh_token"]).startsWith("enc:v1:")),
  ).length;
  const keySet = Boolean(process.env["TOKEN_ENCRYPTION_KEY"]);
  const psMode = paystackMode();
  const { data: planRows } = await ctx.db
    .from("plans")
    .select("id, paystack_plan_month, paystack_plan_year, paystack_plan_mode");
  const staleCodes = (planRows ?? []).filter(
    (p) =>
      (p["paystack_plan_month"] || p["paystack_plan_year"]) &&
      !planCodeUsable(p["paystack_plan_mode"], psMode),
  ).length;
  const appUrl = appBaseUrl();
  const paystackCheck: SecurityCheck = !process.env["PAYSTACK_SECRET_KEY"]
    ? {
        id: "paystack",
        label: "Paystack payments",
        ok: false,
        detail: "Missing (PAYSTACK_SECRET_KEY) — plans and top-ups can't be paid for.",
      }
    : !psMode
      ? {
          id: "paystack",
          label: "Paystack payments",
          ok: false,
          detail:
            "PAYSTACK_SECRET_KEY isn't a Paystack secret key (it should start with sk_test_ or sk_live_).",
        }
      : psMode === "live" && !appUrl.startsWith("https://")
        ? {
            id: "paystack",
            label: "Paystack payments",
            ok: false,
            detail:
              "Live key, but APP_URL isn't an https address, so customers can't be sent back safely.",
          }
        : staleCodes > 0
          ? {
              id: "paystack",
              label: "Paystack payments",
              ok: false,
              detail: `${psMode === "live" ? "Live" : "Test"} key, but ${staleCodes} plan(s) have auto-renew codes from the other mode. Open Admin, Plans and press sync to recreate them.`,
            }
          : {
              id: "paystack",
              label: "Paystack payments",
              ok: true,
              detail:
                psMode === "live"
                  ? "Live key: real money moves. Webhook must point to /api/billing/paystack-webhook in your LIVE Paystack settings."
                  : "Test key: no real money moves.",
            };
  const env = (name: string) => Boolean(process.env[name]);
  return [
    {
      id: "service",
      label: "Server database key",
      ok: env("SUPABASE_SERVICE_ROLE_KEY"),
      detail: env("SUPABASE_SERVICE_ROLE_KEY")
        ? "Set (server only)."
        : "Missing — the server can't read or write data.",
    },
    {
      id: "enc",
      label: "Token encryption key",
      ok: keySet,
      detail: keySet
        ? "Set — new logins are stored encrypted."
        : "Missing — logins are stored unencrypted. Set TOKEN_ENCRYPTION_KEY (32 random bytes, base64).",
    },
    {
      id: "plain",
      label: "Stored logins encrypted",
      ok: plain === 0,
      detail:
        plain === 0
          ? "All connected logins are encrypted."
          : `${plain} connected login(s) still unencrypted — they upgrade automatically the next time they're used once a key is set.`,
    },
    {
      id: "cron",
      label: "Daily job secret",
      ok: env("CRON_SECRET"),
      detail: env("CRON_SECRET")
        ? "Set — daily checks, re-syncs and summaries can run."
        : "Missing — set CRON_SECRET so the daily job is allowed to run.",
    },
    {
      id: "email",
      label: "Email delivery",
      ok: emailConfigured(),
      detail: emailConfigured()
        ? "Set — daily summaries can be emailed."
        : "Not set (RESEND_API_KEY) — email summaries are unavailable.",
    },
    {
      id: "google",
      label: "Google sign-in for integrations",
      ok: env("GOOGLE_CLIENT_ID") && env("GOOGLE_CLIENT_SECRET"),
      detail:
        env("GOOGLE_CLIENT_ID") && env("GOOGLE_CLIENT_SECRET")
          ? "Set."
          : "Missing — Google platforms can't be connected or refreshed.",
    },
    paystackCheck,
    {
      id: "url",
      label: "App URL",
      ok: Boolean(appBaseUrl()),
      detail: appBaseUrl()
        ? "Set — summaries link back to the app."
        : "Missing (APP_URL) — summaries won't include a link.",
    },
  ];
}
