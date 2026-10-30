import "@tanstack/react-start/server-only";
import { isAdminEmail } from "./admin";
import { verifyAccessToken } from "./survey";

export type AdminCheck = { ok: true; userId: string } | { ok: false; response: Response };

export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/** Workspace-level credentials may only be read or changed by a signed-in
 *  admin (Supabase session token verified server-side + `admins` allowlist). */
export async function requireAdmin(
  request: Request,
  action = "manage connectors",
): Promise<AdminCheck> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  const user = await verifyAccessToken(token);
  if (!user) return { ok: false, response: json({ error: "Sign in first." }, 401) };
  if (!(await isAdminEmail(user.email))) {
    return {
      ok: false,
      response: json({ error: `Only the workspace admin can ${action}.` }, 403),
    };
  }
  return { ok: true, userId: user.id };
}
