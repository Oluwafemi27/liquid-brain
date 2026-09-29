import "@tanstack/react-start/server-only";
import type { AgentTraceStep } from "@/lib/aduf-types";
import { getSupabaseAdmin, DEFAULT_WORKSPACE_ID } from "./supabase";

export class HarnessExhaustedError extends Error {
  trace: AgentTraceStep[];
  attempts: number;
  constructor(label: string, trace: AgentTraceStep[], attempts: number) {
    super(`"${label}" failed after ${attempts} attempt(s)`);
    this.name = "HarnessExhaustedError";
    this.trace = trace;
    this.attempts = attempts;
  }
}

interface HarnessOptions<T> {
  /** Max total attempts (first try + retries). Default 3. */
  maxAttempts?: number;
  /** Return an error string to force a retry even if `fn` didn't throw
   *  (e.g. the model replied with malformed JSON). Return null when OK. */
  validate?: (result: T) => string | null;
  /** Whether to persist this run to agent_runs. Default true. */
  persist?: boolean;
}

function newStep(label: string): AgentTraceStep {
  return { id: `step-${Date.now()}-${Math.round(Math.random() * 1e6)}`, label, status: "running" };
}

/**
 * Runs `fn` with automatic self-repair: on failure (thrown error, or a
 * failed `validate` check), it records what went wrong, calls `fn` again
 * passing that failure back in as `repairContext` so the caller can adjust
 * its next attempt (e.g. re-prompt the model with the parse error), and
 * repeats up to `maxAttempts`. Every attempt is recorded in the returned
 * trace and, best-effort, in the `agent_runs` table for observability.
 *
 * This is intentionally generic — it's used for the chat model call today,
 * and is the same primitive future tool-calling steps should wrap.
 */
export async function runWithHarness<T>(
  label: string,
  fn: (repairContext?: string) => Promise<T>,
  opts: HarnessOptions<T> = {},
): Promise<{ result: T; trace: AgentTraceStep[]; attempts: number }> {
  const maxAttempts = Math.max(1, opts.maxAttempts ?? 3);
  const trace: AgentTraceStep[] = [];
  let repairContext: string | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const step = newStep(attempt === 1 ? label : `${label} (retry ${attempt - 1})`);
    trace.push(step);
    try {
      const result = await fn(repairContext);
      const validationError = opts.validate?.(result) ?? null;
      if (validationError) {
        step.status = "error";
        step.detail = validationError;
        repairContext = validationError;
        if (attempt === maxAttempts) {
          await persistRun(label, "failed", attempt, trace, opts.persist);
          throw new HarnessExhaustedError(label, trace, attempt);
        }
        continue;
      }
      step.status = "done";
      await persistRun(label, "success", attempt, trace, opts.persist);
      return { result, trace, attempts: attempt };
    } catch (error) {
      if (error instanceof HarnessExhaustedError) throw error;
      const message = error instanceof Error ? error.message : String(error);
      step.status = "error";
      step.detail = message;
      repairContext = message;
      if (attempt === maxAttempts) {
        await persistRun(label, "failed", attempt, trace, opts.persist);
        throw new HarnessExhaustedError(label, trace, attempt);
      }
    }
  }

  // Unreachable — loop always returns or throws — but keeps TS happy.
  throw new HarnessExhaustedError(label, trace, maxAttempts);
}

async function persistRun(
  label: string,
  status: "success" | "failed",
  attempts: number,
  trace: AgentTraceStep[],
  persist = true,
) {
  if (!persist) return;
  const db = getSupabaseAdmin();
  if (!db) return;
  try {
    await db.from("agent_runs").insert({
      workspace_id: DEFAULT_WORKSPACE_ID,
      label,
      status,
      attempts,
      trace,
    });
  } catch (error) {
    // Logging the harness must never take down the harness itself.
    console.error("[agent-harness] failed to persist agent_runs row", error);
  }
}
