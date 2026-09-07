import "@tanstack/react-start/server-only";
import { getSupabaseAdmin, DEFAULT_WORKSPACE_ID } from "./supabase";

export interface AuthedUser {
  id: string;
  email: string | null;
}

/** Verifies a Supabase Auth access token (from the browser session) against
 *  the project and returns the user it belongs to, or null if it's missing,
 *  expired, or invalid. Every server-side action gated on "must be signed
 *  in" goes through this — the client's `status === "signed-in"` is only a
 *  UI convenience, never something the server trusts on its own. */
export async function verifyAccessToken(
  token: string | undefined | null,
): Promise<AuthedUser | null> {
  if (!token) return null;
  const db = getSupabaseAdmin();
  if (!db) return null;
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email ?? null };
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
