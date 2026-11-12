import "@tanstack/react-start/server-only";
import { DEFAULT_WORKSPACE_ID, getSupabaseAdmin } from "./supabase";

export interface AgentSkill {
  id: string;
  category: string;
  title: string;
  description: string;
  systemPrompt: string;
  enabled: boolean;
}

export async function listSkills(): Promise<AgentSkill[]> {
  const db = getSupabaseAdmin();
  if (!db) return [];
  const { data, error } = await db
    .from("agent_skills")
    .select("id, category, title, description, system_prompt, enabled")
    .eq("workspace_id", DEFAULT_WORKSPACE_ID)
    .order("sort_order");
  if (error) {
    console.error("[skills] failed to list skills", error);
    return [];
  }
  return (data ?? []).map((r) => ({
    id: r.id as string,
    category: r.category as string,
    title: r.title as string,
    description: r.description as string,
    systemPrompt: r.system_prompt as string,
    enabled: r.enabled as boolean,
  }));
}

export async function setSkillEnabled(id: string, enabled: boolean): Promise<void> {
  const db = getSupabaseAdmin();
  if (!db) throw new Error("No backend configured.");
  const { error } = await db
    .from("agent_skills")
    .update({ enabled, updated_at: new Date().toISOString() })
    .eq("workspace_id", DEFAULT_WORKSPACE_ID)
    .eq("id", id);
  if (error) throw new Error(`Failed to update skill: ${error.message}`);
}

/** Builds the block of instructions folded into the agent's system prompt
 *  from every currently-enabled skill. Empty string if none are enabled or
 *  no backend is configured — the core persona still works without it. */
export function buildSkillsBlock(skills: AgentSkill[]): string {
  const enabled = skills.filter((s) => s.enabled);
  if (!enabled.length) return "";
  return (
    "\n\nYou also have these business skills available — apply the relevant one(s) " +
    "based on what's being asked, without announcing which skill you're using:\n\n" +
    enabled.map((s) => `### ${s.title}\n${s.systemPrompt}`).join("\n\n")
  );
}
