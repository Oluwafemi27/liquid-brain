import "@tanstack/react-start/server-only";
import { Sandbox } from "@e2b/code-interpreter";
import { DEFAULT_WORKSPACE_ID, getSupabaseAdmin } from "./supabase";

/** True once E2B_API_KEY is set on the server — checked before any sandbox
 *  call so callers can degrade gracefully (skip code execution, tell the
 *  owner it isn't configured yet) instead of throwing deep in a task run. */
export function isSandboxConfigured(): boolean {
  return Boolean(process.env["E2B_API_KEY"]);
}

export interface SandboxRunResult {
  ok: boolean;
  stdout: string;
  stderr: string;
  error: string | null;
}

/** Runs a snippet of code in a fresh E2B cloud sandbox and returns its
 *  stdout/stderr. Each call gets its own sandbox (created, used, torn down)
 *  rather than a pooled/reused one — simplest correct behavior for
 *  occasional agent-triggered runs; worth pooling later if this becomes a
 *  hot path. Every run is logged to `sandbox_runs` (best-effort — a logging
 *  failure never fails the run itself) so Brain Chat / the agent trace can
 *  reference what actually executed.
 *
 *  Requires the `@e2b/code-interpreter` package (already a dependency) and
 *  `E2B_API_KEY` — see .env.example. Throws if E2B_API_KEY isn't set; check
 *  isSandboxConfigured() first if you want to degrade instead of throwing. */
export async function runInSandbox(
  code: string,
  opts: { language?: "python" | "javascript" | "bash"; sessionId?: string } = {},
): Promise<SandboxRunResult> {
  const apiKey = process.env["E2B_API_KEY"];
  if (!apiKey) {
    throw new Error(
      "E2B isn't configured — set E2B_API_KEY on the server to let the agent run code in a sandbox.",
    );
  }

  const language = opts.language ?? "python";
  const sessionId = opts.sessionId ?? "default";
  const runId = await logRunStart(sessionId, language, code);

  let outcome: SandboxRunResult;
  try {
    const sandbox = await Sandbox.create({ apiKey });
    try {
      const execution = await sandbox.runCode(code, { language });
      const stdout = (execution.logs?.stdout ?? []).join("\n");
      const stderr = (execution.logs?.stderr ?? []).join("\n");
      const error = execution.error ? `${execution.error.name}: ${execution.error.value}` : null;
      outcome = { ok: !error, stdout, stderr, error };
    } finally {
      await sandbox.kill().catch(() => {});
    }
  } catch (error) {
    outcome = {
      ok: false,
      stdout: "",
      stderr: "",
      error: error instanceof Error ? error.message : "Sandbox execution failed",
    };
  }

  void logRunFinish(runId, outcome);
  return outcome;
}

async function logRunStart(
  sessionId: string,
  language: string,
  code: string,
): Promise<string | null> {
  const db = getSupabaseAdmin();
  if (!db) return null;
  const { data, error } = await db
    .from("sandbox_runs")
    .insert({
      workspace_id: DEFAULT_WORKSPACE_ID,
      session_id: sessionId,
      language,
      code,
      status: "running",
    })
    .select("id")
    .single();
  if (error) {
    console.error("[sandbox] failed to log run start", error);
    return null;
  }
  return data?.id ?? null;
}

async function logRunFinish(runId: string | null, outcome: SandboxRunResult): Promise<void> {
  if (!runId) return;
  const db = getSupabaseAdmin();
  if (!db) return;
  const { error } = await db
    .from("sandbox_runs")
    .update({
      stdout: outcome.stdout,
      stderr: outcome.stderr,
      error: outcome.error,
      status: outcome.ok ? "ok" : "error",
      finished_at: new Date().toISOString(),
    })
    .eq("id", runId);
  if (error) console.error("[sandbox] failed to log run finish", error);
}
