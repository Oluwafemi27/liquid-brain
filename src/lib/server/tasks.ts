import "@tanstack/react-start/server-only";
import { z } from "zod";
import { HarnessExhaustedError, runWithHarness } from "./agent-harness";
import { resolveDefaultModelKey } from "./model-keys";
import { MODEL_PROVIDERS, callProviderChat } from "./model-providers";
import { buildSkillsBlock, listSkills } from "./skills";
import { NoModelConfiguredError } from "./agent";
import type { AgentTraceStep } from "@/lib/aduf-types";

const planStepSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  detail: z.string().min(1),
  risk: z.enum(["low", "medium", "high"]),
  successProbability: z.number().min(0).max(100),
  mitigation: z.string().min(1),
  dependsOn: z.array(z.string()).default([]),
});

const planSchema = z.object({
  summary: z.string().min(1),
  steps: z.array(planStepSchema).min(1).max(10),
});

export type PlanStep = z.infer<typeof planStepSchema>;
export type Plan = z.infer<typeof planSchema>;

const PLANNING_SYSTEM_PROMPT = `You are ADUF's planning module. Given a business goal or task, produce a
plan an operator can actually execute — not a vague outline.

For every step, weigh risk and probability honestly:
- "risk": how likely this step is to go wrong or cause damage if it does (low/medium/high)
- "successProbability": your honest 0-100 estimate of this step succeeding as described,
  given typical execution — do not default to 80-90 for everything; vary it based on real
  difficulty, and use low numbers (below 50) when a step genuinely is uncertain
- "mitigation": a concrete way to reduce the risk or recover if it fails — never "monitor closely"
  with nothing else; give an actual fallback action
- "dependsOn": ids of steps that must complete first (empty array if none)

Break the goal into 2-8 steps. Each step should be independently actionable — something a
sub-agent could execute with just its own title/detail, without needing the other steps'
output, unless dependsOn says otherwise.

Respond with ONLY a single JSON object, no markdown fences, no prose outside it:
{"summary": string, "steps": [{"id": string, "title": string, "detail": string, "risk": "low"|"medium"|"high", "successProbability": number, "mitigation": string, "dependsOn": string[]}]}`;

/** Builds a risk/probability-weighted execution plan for a goal. Uses the
 *  harness with extra attempts (this is the "very strong harness" the plan
 *  itself runs under — plan quality matters more than latency here). */
export async function buildPlan(goal: string): Promise<{ plan: Plan; trace: AgentTraceStep[] }> {
  const key = await resolveDefaultModelKey();
  if (!key) throw new NoModelConfiguredError();
  const provider = MODEL_PROVIDERS[key.providerId];
  if (!provider) throw new Error(`Unknown model provider "${key.providerId}"`);

  const { result, trace } = await runWithHarness(
    "plan-goal",
    async (repairContext) => {
      const system = repairContext
        ? `${PLANNING_SYSTEM_PROMPT}\n\nYour previous plan was rejected: ${repairContext}\nTry again, following the JSON shape exactly.`
        : PLANNING_SYSTEM_PROMPT;
      const { text } = await callProviderChat(provider, key.apiKey, {
        system,
        messages: [{ role: "user", content: goal }],
      });
      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(stripCodeFence(text));
      } catch {
        throw new Error(`Plan was not valid JSON (got: ${text.slice(0, 200)})`);
      }
      const parsed = planSchema.safeParse(parsedJson);
      if (!parsed.success) {
        throw new Error(
          `Plan didn't match the required shape: ${parsed.error.message.slice(0, 300)}`,
        );
      }
      return parsed.data;
    },
    { maxAttempts: 4 },
  );
  return { plan: result, trace };
}

export interface SubAgentResult {
  stepId: string;
  title: string;
  status: "success" | "failed";
  output: string;
  attempts: number;
  trace: AgentTraceStep[];
}

/** Runs one plan step as an independent sub-agent call — its own harness,
 *  its own trace, failure in one step never aborts the others. */
async function runSubAgent(
  goal: string,
  step: PlanStep,
  systemSkills: string,
  provider: (typeof MODEL_PROVIDERS)[string],
  apiKey: string,
): Promise<SubAgentResult> {
  const system =
    `You are a focused sub-agent executing exactly one step of a larger plan. ` +
    `Overall goal: ${goal}\n\nYour step: "${step.title}" — ${step.detail}\n\n` +
    `Produce the actual output for this step (a draft, an analysis, a decision — whatever the ` +
    `step calls for), not a description of what you would do. Be concrete and complete.` +
    systemSkills;

  try {
    const { result, trace, attempts } = await runWithHarness(
      `subagent-${step.id}`,
      async () => {
        const { text } = await callProviderChat(provider, apiKey, {
          system,
          messages: [{ role: "user", content: step.detail }],
        });
        if (!text.trim()) throw new Error("Sub-agent returned an empty result.");
        return text.trim();
      },
      { maxAttempts: 3 },
    );
    return {
      stepId: step.id,
      title: step.title,
      status: "success",
      output: result,
      attempts,
      trace,
    };
  } catch (error) {
    const trace = error instanceof HarnessExhaustedError ? error.trace : [];
    const message = error instanceof Error ? error.message : "Sub-agent failed";
    return {
      stepId: step.id,
      title: step.title,
      status: "failed",
      output: message,
      attempts: 3,
      trace,
    };
  }
}

export interface TaskRunResult {
  plan: Plan;
  planTrace: AgentTraceStep[];
  results: SubAgentResult[];
  synthesis: string;
}

/** Full pipeline for a large/multi-part goal: plan it (risk-weighted), then
 *  fan out every step to its own sub-agent running concurrently, then
 *  synthesize the sub-agent outputs into one coherent result. Every model
 *  call in this pipeline — plan, each sub-agent, synthesis — runs under the
 *  self-healing harness independently. */
export async function runTask(goal: string): Promise<TaskRunResult> {
  const key = await resolveDefaultModelKey();
  if (!key) throw new NoModelConfiguredError();
  const provider = MODEL_PROVIDERS[key.providerId];
  if (!provider) throw new Error(`Unknown model provider "${key.providerId}"`);

  const { plan, trace: planTrace } = await buildPlan(goal);
  const skills = await listSkills();
  const skillsBlock = buildSkillsBlock(skills);

  // Concurrent sub-agents — this is the "split into multiple sub-agents"
  // primitive: independent steps run in parallel, not one at a time.
  const results = await Promise.all(
    plan.steps.map((step) => runSubAgent(goal, step, skillsBlock, provider, key.apiKey)),
  );

  const synthesisPrompt =
    `Goal: ${goal}\n\nSub-agent results:\n` +
    results.map((r) => `### ${r.title} (${r.status})\n${r.output}`).join("\n\n");

  const { result: synthesis } = await runWithHarness(
    "synthesize-task",
    async () => {
      const { text } = await callProviderChat(provider, key.apiKey, {
        system:
          "Combine these sub-agent results into one coherent, well-organized answer for the " +
          "business owner. Note any step that failed and what that means for the overall goal. " +
          "Respond with plain text/markdown — no JSON.",
        messages: [{ role: "user", content: synthesisPrompt }],
      });
      if (!text.trim()) throw new Error("Synthesis returned empty output.");
      return text.trim();
    },
    { maxAttempts: 3 },
  );

  return { plan, planTrace, results, synthesis };
}

function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fenced ? (fenced[1] ?? trimmed) : trimmed;
}
