import "@tanstack/react-start/server-only";
import { resolveN8nConnection } from "./n8n-connection";

/** Thin wrapper around the owner's own n8n REST API (/api/v1). Every call
 *  here runs against the credentials stored by n8n-connection.ts — nothing
 *  in this app ever touches a shared/hosted n8n instance. */

export class N8nNotConnectedError extends Error {
  constructor() {
    super("n8n isn't connected yet — go to Me > Connections > Connect n8n first.");
    this.name = "N8nNotConnectedError";
  }
}

interface N8nRequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
}

async function n8nRequest<T>(path: string, opts: N8nRequestOptions = {}): Promise<T> {
  const conn = await resolveN8nConnection();
  if (!conn) throw new N8nNotConnectedError();

  const res = await fetch(`${conn.instanceUrl}/api/v1${path}`, {
    method: opts.method ?? "GET",
    headers: {
      "X-N8N-API-KEY": conn.apiKey,
      "content-type": "application/json",
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`n8n API ${opts.method ?? "GET"} ${path} failed (${res.status}): ${text.slice(0, 300)}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export interface N8nWorkflowSummary {
  id: string;
  name: string;
  active: boolean;
  updatedAt: string;
}

/** Strips fields n8n's create-workflow endpoint rejects (id, tags with
 *  metadata, versionId, etc.) and forces `active: false` no matter what the
 *  source template says — this is the actual Safe Mode enforcement point.
 *  Every path that puts a workflow onto the owner's n8n goes through this
 *  function, so there is exactly one place "never auto-activate" can be
 *  accidentally violated, and it's guarded here. */
function toSafeModePayload(workflowJson: Record<string, unknown>, name: string) {
  const { id: _id, active: _active, tags: _tags, versionId: _versionId, ...rest } = workflowJson;
  return {
    ...rest,
    name,
    active: false,
    settings: (workflowJson["settings"] as object | undefined) ?? {},
  };
}

/** Deploys a workflow to the owner's n8n — ALWAYS inactive. Callers must go
 *  through activateN8nWorkflow() as a separate, explicit step (which in
 *  turn is only ever called after the owner taps "Turn it on" in the UI —
 *  see n8n_deployments.status transition draft/inactive -> active). */
export async function deployN8nWorkflow(
  workflowJson: Record<string, unknown>,
  name: string,
): Promise<N8nWorkflowSummary> {
  const created = await n8nRequest<{ id: string; name: string; active: boolean; updatedAt: string }>(
    "/workflows",
    { method: "POST", body: toSafeModePayload(workflowJson, name) },
  );
  return { id: created.id, name: created.name, active: created.active, updatedAt: created.updatedAt };
}

export async function activateN8nWorkflow(n8nWorkflowId: string): Promise<void> {
  await n8nRequest(`/workflows/${n8nWorkflowId}/activate`, { method: "POST" });
}

export async function deactivateN8nWorkflow(n8nWorkflowId: string): Promise<void> {
  await n8nRequest(`/workflows/${n8nWorkflowId}/deactivate`, { method: "POST" });
}

export async function getN8nWorkflow(n8nWorkflowId: string): Promise<Record<string, unknown>> {
  return n8nRequest(`/workflows/${n8nWorkflowId}`);
}

export async function deleteN8nWorkflow(n8nWorkflowId: string): Promise<void> {
  await n8nRequest(`/workflows/${n8nWorkflowId}`, { method: "DELETE" });
}

/** Validates a template against the owner's live n8n instance WITHOUT
 *  leaving anything behind: deploy (inactive) then immediately delete.
 *  This is what the weekly Template Repair Agent uses as its real
 *  correctness check — n8n's own create-workflow validation catches
 *  unknown node types, removed parameters, and malformed connections that
 *  a static JSON check would miss. Returns the error text on failure. */
export async function testDeployWorkflow(
  workflowJson: Record<string, unknown>,
  name: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const created = await deployN8nWorkflow(workflowJson, `[test] ${name}`);
    await deleteN8nWorkflow(created.id);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown deploy error" };
  }
}
