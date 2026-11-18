import "@tanstack/react-start/server-only";
import { getKv, hashKey } from "./kv";
import { getSupabaseAdmin, DEFAULT_WORKSPACE_ID } from "./supabase";

export interface AuthedUser {
  id: string;
  email: string | null;
  /** False when the address was typed at sign-up but never confirmed: it proves nothing about who owns it. */
  emailVerified: boolean;
}

/** Verifies a Supabase Auth access token (from the browser session) against
 *  the project and returns the user it belongs to, or null if it's missing,
 *  expired, or invalid. Every server-side action gated on "must be signed
 *  in" goes through this — the client's `status === "signed-in"` is only a
 *  UI convenience, never something the server trusts on its own. */
// Checking a token is a network call to Supabase Auth. A valid one is remembered briefly, so a
// busy signed-in user costs one check a minute instead of one per request. A signed-out or
// revoked session is therefore honoured for at most this long.
const TOKEN_CACHE_MS = 45_000;
const TOKEN_CACHE_MAX = 5_000;
const tokenCache = new Map<string, { user: AuthedUser; until: number }>();
const inFlightChecks = new Map<string, Promise<AuthedUser | null>>();

export async function verifyAccessToken(
  token: string | undefined | null,
): Promise<AuthedUser | null> {
  if (!token) return null;
  const db = getSupabaseAdmin();
  if (!db) return null;
  const now = Date.now();
  const hit = tokenCache.get(token);
  if (hit && hit.until > now) return hit.user;
  // Several requests from the same session often arrive together (page load, polling); share one check.
  const pending = inFlightChecks.get(token);
  if (pending) return pending;
  const check = (async (): Promise<AuthedUser | null> => {
    // Another server may already have checked this token: share that answer (Redis only).
    const kv = await getKv();
    const shared = kv.kind === "redis" ? await kv.get<AuthedUser>(`tok:${hashKey(token)}`) : null;
    if (shared) {
      tokenCache.set(token, { user: shared, until: Date.now() + TOKEN_CACHE_MS });
      return shared;
    }
    const { data, error } = await db.auth.getUser(token);
    if (error || !data.user) return null;
    const user = {
      id: data.user.id,
      email: data.user.email ?? null,
      emailVerified: Boolean(data.user.email_confirmed_at),
    };
    if (tokenCache.size >= TOKEN_CACHE_MAX)
      tokenCache.delete(tokenCache.keys().next().value as string);
    tokenCache.set(token, { user, until: Date.now() + TOKEN_CACHE_MS });
    if (kv.kind === "redis") await kv.set(`tok:${hashKey(token)}`, user, TOKEN_CACHE_MS / 1000);
    return user;
  })().finally(() => inFlightChecks.delete(token));
  inFlightChecks.set(token, check);
  return check;
}

/** For tests only. */
export function _clearTokenCache() {
  tokenCache.clear();
  inFlightChecks.clear();
}

export interface BusinessSurvey {
  profession: string;
  websiteUrl: string;
  goal: string;
  businessType: string;
  teamSize: string;
}

/** null = not configured (no backend); undefined = configured, but this
 *  user hasn't submitted the survey yet. */
export async function getSurvey(userId: string): Promise<BusinessSurvey | null | undefined> {
  const db = getSupabaseAdmin();
  if (!db) return null;
  const { data, error } = await db
    .from("business_surveys")
    .select("profession, website_url, goal, business_type, team_size")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    console.error("[survey] failed to load survey", error);
    return undefined;
  }
  if (!data) return undefined;
  return {
    profession: data["profession"] as string,
    websiteUrl: (data["website_url"] as string | null) ?? "",
    goal: data["goal"] as string,
    businessType: data["business_type"] as string,
    teamSize: (data["team_size"] as string | null) ?? "",
  };
}

export async function saveSurvey(
  userId: string,
  email: string | null,
  survey: BusinessSurvey,
): Promise<void> {
  const db = getSupabaseAdmin();
  if (!db) throw new Error("No backend configured.");
  const { error } = await db.from("business_surveys").upsert(
    {
      user_id: userId,
      workspace_id: DEFAULT_WORKSPACE_ID,
      email,
      profession: survey.profession,
      website_url: survey.websiteUrl || null,
      goal: survey.goal,
      business_type: survey.businessType,
      team_size: survey.teamSize || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) throw new Error(`Failed to save survey: ${error.message}`);
}

/** Renders the survey as short natural-language context folded into the
 *  agent's system prompt — see src/lib/server/agent.ts. */
export function surveyToContext(survey: BusinessSurvey): string {
  const lines = [
    `Profession/role: ${survey.profession}`,
    survey.businessType ? `Business type: ${survey.businessType}` : null,
    survey.websiteUrl ? `Website: ${survey.websiteUrl}` : null,
    survey.teamSize ? `Team size: ${survey.teamSize}` : null,
    `Primary goal: ${survey.goal}`,
  ].filter((l): l is string => Boolean(l));
  return lines.join("\n");
}
