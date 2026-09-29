import "@tanstack/react-start/server-only";
import { getSupabaseAdmin } from "./supabase";

export interface N8nTemplateMatch {
  id: string;
  name: string;
  description: string;
  category: string | null;
  integrations: string[];
  triggerType: string | null;
  nodeCount: number;
  tags: string[];
  sourceRepo: string;
  /** Present only when a starred correction exists — the agent MUST apply
   *  this instead of the raw template, and should mention in its reasoning
   *  that it used the corrected version. This is the "reminds the ai
   *  whenever it wants to use the same workflow in future" behavior. */
  correction: { issue: string; note: string; correctedJson: Record<string, unknown> | null } | null;
}

const SELECT_COLS =
  "id, name, description, category, integrations, trigger_type, node_count, tags, source_repo, workflow_json";

/** Full-text + tag search over the imported template library, each result
 *  annotated with any open starred correction on file. This is what the
 *  agent's `search_n8n_templates` tool call runs — "choose a suitable
 *  workflow" means picking from real results here, not inventing one. */
export async function searchN8nTemplates(query: string, limit = 8): Promise<N8nTemplateMatch[]> {
  const db = getSupabaseAdmin();
  if (!db) return [];

  const { data, error } = await db
    .from("n8n_workflow_templates")
    .select(SELECT_COLS)
    .textSearch("search_doc", query.trim().split(/\s+/).join(" & "), {
      type: "websearch",
      config: "english",
    })
    .order("quality_score", { ascending: false })
    .limit(limit);

  let rows = data ?? [];
  if (error || rows.length === 0) {
    // Fall back to a looser ILIKE match — websearch tsquery can return zero
    // rows for short/odd queries where a plain substring match still finds
    // something reasonable.
    const fallback = await db
      .from("n8n_workflow_templates")
      .select(SELECT_COLS)
      .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
      .limit(limit);
    rows = fallback.data ?? [];
  }
  if (!rows.length) return [];

  const ids = rows.map((r) => r["id"] as string);
  const { data: corrections } = await db
    .from("n8n_workflow_corrections")
    .select("template_id, issue, note, corrected_json, status")
    .in("template_id", ids)
    .eq("starred", true)
    .eq("status", "open");
  const correctionByTemplate = new Map((corrections ?? []).map((c) => [c["template_id"] as string, c]));

  return rows.map((row) => {
    const correction = correctionByTemplate.get(row["id"] as string);
    return {
      id: row["id"] as string,
      name: row["name"] as string,
      description: row["description"] as string,
      category: (row["category"] as string | null) ?? null,
      integrations: (row["integrations"] as string[] | null) ?? [],
      triggerType: (row["trigger_type"] as string | null) ?? null,
      nodeCount: (row["node_count"] as number | null) ?? 0,
      tags: (row["tags"] as string[] | null) ?? [],
      sourceRepo: row["source_repo"] as string,
      correction: correction
        ? {
            issue: correction["issue"] as string,
            note: correction["note"] as string,
            correctedJson: (correction["corrected_json"] as Record<string, unknown> | null) ?? null,
          }
        : null,
    };
  });
}

/** The exact workflow JSON to deploy for a given template id — the
 *  corrected version if a starred fix is on file, otherwise the original
 *  import. Callers should never read workflow_json directly. */
export async function getDeployableTemplateJson(
  templateId: string,
): Promise<{ workflowJson: Record<string, unknown>; name: string; usedCorrection: boolean } | null> {
  const db = getSupabaseAdmin();
  if (!db) return null;

  const { data: template } = await db
    .from("n8n_workflow_templates")
    .select("name, workflow_json")
    .eq("id", templateId)
    .maybeSingle();
  if (!template) return null;

  const { data: correction } = await db
    .from("n8n_workflow_corrections")
    .select("corrected_json")
    .eq("template_id", templateId)
    .eq("starred", true)
    .eq("status", "open")
    .not("corrected_json", "is", null)
    .maybeSingle();

  if (correction?.["corrected_json"]) {
    return {
      workflowJson: correction["corrected_json"] as Record<string, unknown>,
      name: template["name"] as string,
      usedCorrection: true,
    };
  }
  return {
    workflowJson: template["workflow_json"] as Record<string, unknown>,
    name: template["name"] as string,
    usedCorrection: false,
  };
}

/** Stars a template as broken + files the correction, or (if a corrected
 *  JSON is supplied) resolves it. This is the persistent "reminder" — every
 *  future search_n8n_templates / getDeployableTemplateJson call for this
 *  template will surface it until status flips to 'fixed'. */
export async function starTemplateCorrection(input: {
  templateId: string;
  issue: string;
  note: string;
  correctedJson?: Record<string, unknown>;
  detectedBy?: "repair_agent" | "deploy_failure" | "manual";
}): Promise<void> {
  const db = getSupabaseAdmin();
  if (!db) throw new Error("No backend configured.");
  const { error } = await db.from("n8n_workflow_corrections").insert({
    template_id: input.templateId,
    starred: true,
    status: input.correctedJson ? "fixed" : "open",
    issue: input.issue,
    note: input.note,
    corrected_json: input.correctedJson ?? null,
    detected_by: input.detectedBy ?? "repair_agent",
  });
  if (error) throw new Error(`Failed to file correction: ${error.message}`);
}
