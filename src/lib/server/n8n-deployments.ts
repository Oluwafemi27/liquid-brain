import "@tanstack/react-start/server-only";
import { DEFAULT_WORKSPACE_ID, getSupabaseAdmin } from "./supabase";
import { activateN8nWorkflow, deactivateN8nWorkflow, deployN8nWorkflow } from "./n8n-client";
import { getDeployableTemplateJson } from "./n8n-templates";
import { buildWorkflowFromBrief } from "./n8n-builder";

export interface N8nDeployment {
  id: string;
  automationId: string | null;
  templateId: string | null;
  n8nWorkflowId: string | null;
  name: string;
  status: "draft" | "inactive" | "active" | "error" | "archived";
  safeMode: boolean;
  builtFrom: "template" | "generated";
  reasoning: string;
  lastError: string | null;
  deployedAt: string;
  activatedAt: string | null;
}

const SELECT_COLS =
  "id, automation_id, template_id, n8n_workflow_id, name, status, safe_mode, built_from, reasoning, last_error, deployed_at, activated_at";

function fromRow(row: Record<string, unknown>): N8nDeployment {
  return {
    id: row["id"] as string,
    automationId: (row["automation_id"] as string | null) ?? null,
    templateId: (row["template_id"] as string | null) ?? null,
    n8nWorkflowId: (row["n8n_workflow_id"] as string | null) ?? null,
    name: row["name"] as string,
    status: row["status"] as N8nDeployment["status"],
    safeMode: Boolean(row["safe_mode"]),
    builtFrom: row["built_from"] as N8nDeployment["builtFrom"],
    reasoning: row["reasoning"] as string,
    lastError: (row["last_error"] as string | null) ?? null,
    deployedAt: row["deployed_at"] as string,
    activatedAt: (row["activated_at"] as string | null) ?? null,
  };
}

export async function listN8nDeployments(): Promise<N8nDeployment[]> {
  const db = getSupabaseAdmin();
  if (!db) return [];
  const { data, error } = await db
    .from("n8n_deployments")
    .select(SELECT_COLS)
    .eq("workspace_id", DEFAULT_WORKSPACE_ID)
    .order("deployed_at", { ascending: false });
  if (error) return [];
  return (data ?? []).map(fromRow);
}

/** Builds a workflow from a template (or a fresh AI-generated JSON) and
 *  pushes it to the owner's n8n — ALWAYS inactive. This is "Safe Mode":
 *  the row is created with status 'inactive' and safe_mode true, and the
 *  UI must show "I built it. Want me to turn it on?" rather than any
 *  auto-activation path. Nothing here ever sets active: true. */
export async function createSafeModeDeployment(input: {
  name: string;
  reasoning: string;
  automationId?: string | undefined;
  templateId?: string | undefined;
  buildBrief?: string | undefined;
  generatedJson?: Record<string, unknown> | undefined;
}): Promise<N8nDeployment> {
  const db = getSupabaseAdmin();
  if (!db) throw new Error("No backend configured.");

  let workflowJson: Record<string, unknown>;
  let builtFrom: "template" | "generated" = "generated";
  if (input.templateId) {
    const deployable = await getDeployableTemplateJson(input.templateId);
    if (!deployable) throw new Error("Template not found.");
    workflowJson = deployable.workflowJson;
    builtFrom = "template";
  } else if (input.generatedJson) {
    workflowJson = input.generatedJson;
  } else if (input.buildBrief) {
    // "Build one from the available workflows" — no template matched
    // closely enough, so generate one grounded in the closest scaffolds.
    workflowJson = await buildWorkflowFromBrief(input.buildBrief, input.name);
  } else {
    throw new Error("One of templateId, generatedJson, or buildBrief is required.");
  }

  let status: N8nDeployment["status"] = "draft";
  let n8nWorkflowId: string | null = null;
  let lastError: string | null = null;
  try {
    const created = await deployN8nWorkflow(workflowJson, input.name);
    n8nWorkflowId = created.id;
    status = "inactive"; // deployed, never active — Safe Mode
  } catch (err) {
    status = "error";
    lastError = err instanceof Error ? err.message : "Deploy failed";
  }

  const { data, error } = await db
    .from("n8n_deployments")
    .insert({
      workspace_id: DEFAULT_WORKSPACE_ID,
      automation_id: input.automationId ?? null,
      template_id: input.templateId ?? null,
      n8n_workflow_id: n8nWorkflowId,
      name: input.name,
      status,
      safe_mode: true,
      built_from: builtFrom,
      reasoning: input.reasoning,
      last_error: lastError,
    })
    .select(SELECT_COLS)
    .single();
  if (error || !data) throw new Error(`Failed to record deployment: ${error?.message}`);
  return fromRow(data);
}

/** The ONLY path that turns a workflow on — called exclusively from the
 *  owner tapping "Turn it on" in the UI (see automations.tsx), never
 *  automatically. */
export async function activateDeployment(deploymentId: string): Promise<N8nDeployment> {
  const db = getSupabaseAdmin();
  if (!db) throw new Error("No backend configured.");
  const { data: row } = await db
    .from("n8n_deployments")
    .select(SELECT_COLS)
    .eq("id", deploymentId)
    .eq("workspace_id", DEFAULT_WORKSPACE_ID)
    .single();
  if (!row) throw new Error("Deployment not found.");
  const deployment = fromRow(row);
  if (!deployment.n8nWorkflowId) throw new Error("This deployment failed to reach n8n — nothing to activate.");

  await activateN8nWorkflow(deployment.n8nWorkflowId);

  const { data, error } = await db
    .from("n8n_deployments")
    .update({ status: "active", activated_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", deploymentId)
    .select(SELECT_COLS)
    .single();
  if (error || !data) throw new Error("Activated on n8n but failed to update local status.");
  return fromRow(data);
}

export async function deactivateDeployment(deploymentId: string): Promise<N8nDeployment> {
  const db = getSupabaseAdmin();
  if (!db) throw new Error("No backend configured.");
  const { data: row } = await db
    .from("n8n_deployments")
    .select(SELECT_COLS)
    .eq("id", deploymentId)
    .single();
  if (!row) throw new Error("Deployment not found.");
  const deployment = fromRow(row);
  if (deployment.n8nWorkflowId) await deactivateN8nWorkflow(deployment.n8nWorkflowId);

  const { data, error } = await db
    .from("n8n_deployments")
    .update({ status: "inactive", updated_at: new Date().toISOString() })
    .eq("id", deploymentId)
    .select(SELECT_COLS)
    .single();
  if (error || !data) throw new Error("Failed to update local status.");
  return fromRow(data);
}
