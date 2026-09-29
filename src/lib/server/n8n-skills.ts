import "@tanstack/react-start/server-only";
import { getSupabaseAdmin } from "./supabase";

export interface N8nSkillDoc {
  id: string;
  title: string;
  content: string;
  tags: string[];
}

/** Keyword search over the ported n8n platform knowledge base (see
 *  tools/n8n-skills-seed for how these rows are populated from n8n-io/skills,
 *  czlonkowski/n8n-skills, yigitkonur/n8n-schema-generator and
 *  freddy-schuetz/ai-launchkit). The agent calls this via the
 *  search_n8n_docs tool call when it needs to know how a node/trigger/
 *  credential actually works before building or repairing a workflow,
 *  instead of guessing n8n JSON syntax from general training knowledge. */
export async function searchN8nSkillDocs(query: string, limit = 4): Promise<N8nSkillDoc[]> {
  const db = getSupabaseAdmin();
  if (!db) return [];
  const words = query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2);
  if (!words.length) return [];

  const { data, error } = await db
    .from("n8n_skill_docs")
    .select("id, title, content, tags")
    .order("sort_order");
  if (error || !data) return [];

  // Simple relevance score over a small, curated corpus — a full FTS index
  // is overkill for a few dozen reference docs; if this grows past a few
  // hundred rows, switch to the same tsvector approach as
  // n8n_workflow_templates.search_doc.
  const scored = data
    .map((row) => {
      const haystack = `${row["title"]} ${row["content"]} ${(row["tags"] as string[]).join(" ")}`.toLowerCase();
      const score = words.reduce((acc, w) => acc + (haystack.includes(w) ? 1 : 0), 0);
      return { row, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored.map(({ row }) => ({
    id: row["id"] as string,
    title: row["title"] as string,
    content: row["content"] as string,
    tags: row["tags"] as string[],
  }));
}
