import "@tanstack/react-start/server-only";
import { z } from "zod";
import { callProviderChat, type ChatTurn, type ModelProvider } from "@/lib/server/model-providers";
import { buildSkillToolsBlock, runSkillTool } from "@/skills/registry";

// Sub-agents: the main agent can split a big job into independent pieces and run them side by side.
//
// Hard limits (all enforced here, not left to the model):
//  - at most MAX_AGENTS helpers per call, each with at most MAX_STEPS model calls (so MAX_STEPS - 1 tool calls)
//  - helpers can ONLY use read-only skill tools (the registry refuses everything else); they cannot
//    propose actions, run code, message anyone, ask the owner questions, or start more helpers
//  - each helper has a wall-clock limit; one helper failing or timing out never loses the others
//  - every model call goes through callProviderChat, so tokens are checked and charged to the owner as usual
//    (the owner's billing context is inherited by the parallel calls)

export const MAX_AGENTS = 4;
const MAX_STEPS = 4;
const agentTimeoutMs = () => Number(process.env["ADUF_SUBAGENT_TIMEOUT_MS"]) || 55_000;
const MAX_RESULT_CHARS = 2500;
const TOOL_RESULT_CHARS = 5000;

export const subTaskSchema = z.object({
  id: z.string().min(1).max(40),
  /** Who the helper is, e.g. "pricing analyst". */
  role: z.string().min(1).max(80),
  /** One self-contained job. The helper sees nothing else from the conversation. */
  goal: z.string().min(1).max(1500),
  /** Facts the helper needs (numbers, URLs, constraints). */
  context: z.string().max(3000).optional(),
});
export type SubTask = z.infer<typeof subTaskSchema>;

export interface SubResult {
  id: string;
  role: string;
  status: "done" | "failed" | "timeout";
  result: string;
  confidence: "high" | "medium" | "low" | null;
  gaps: string[];
  toolsUsed: string[];
}

const helperReplySchema = z.object({
  toolCall: z
    .object({ name: z.string().min(1).max(100), input: z.record(z.unknown()).default({}) })
    .nullable()
    .default(null),
  result: z.string().max(8000).default(""),
  confidence: z.enum(["high", "medium", "low"]).nullable().default(null),
  gaps: z.array(z.string().max(300)).max(8).default([]),
});

function helperSystemPrompt(t: SubTask): string {
  return [
    `You are a focused helper working for a small-business owner's AI assistant (ADUF). Your role: ${t.role}.`,
    "Do ONLY the job below. You cannot talk to the owner, ask questions, change anything, run code, or start other helpers.",
    'You can read information with the tools listed below. Never invent numbers or sources: if you couldn\'t find or check something, put it in "gaps".',
    "Reply with ONLY one JSON object, no markdown:",
    '{"toolCall": {"name": string, "input": object} | null, "result": string, "confidence": "high"|"medium"|"low" | null, "gaps": string[]}',
    "- To use a tool, set toolCall and leave result empty; you will get the tool's result next.",
    "- When finished, set toolCall to null and put your findings in result (plain text, concrete, under 1500 characters), with confidence and gaps.",
    buildSkillToolsBlock() ||
      "\n(No tools are available: answer from the context you were given, and say what you could not check.)",
  ].join("\n");
}

const strip = (t: string) => {
  const s = t.trim();
  const f = s.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return f ? (f[1] ?? s) : s;
};

async function runOne(
  task: SubTask,
  provider: ModelProvider,
  apiKey: string,
  ctx: { userId: string | null; sessionId: string },
  cancel: { stop: boolean },
): Promise<SubResult> {
  const base = { id: task.id, role: task.role, toolsUsed: [] as string[] };
  const turns: ChatTurn[] = [
    {
      role: "user",
      content: `Your job:\n${task.goal}${task.context ? `\n\nContext:\n${task.context}` : ""}`,
    },
  ];
  const system = helperSystemPrompt(task);

  for (let step = 0; step < MAX_STEPS; step++) {
    // A timed-out helper must stop spending the owner's tokens.
    if (cancel.stop)
      return {
        ...base,
        status: "timeout",
        result: "Timed out before finishing.",
        confidence: null,
        gaps: [],
      };
    const { text } = await callProviderChat(provider, apiKey, { system, messages: turns });
    let reply: z.infer<typeof helperReplySchema>;
    try {
      reply = helperReplySchema.parse(JSON.parse(strip(text)));
    } catch {
      if (step === MAX_STEPS - 1)
        return {
          ...base,
          status: "failed",
          result: "Helper returned an unreadable reply.",
          confidence: null,
          gaps: [],
        };
      turns.push({ role: "assistant", content: text.slice(0, 500) });
      turns.push({
        role: "user",
        content: "That wasn't the required JSON object. Reply again with ONLY the JSON object.",
      });
      continue;
    }

    if (!reply.toolCall || step === MAX_STEPS - 1) {
      const final = reply.toolCall
        ? "Ran out of steps before finishing. " + (reply.result || "")
        : reply.result;
      return {
        ...base,
        status: reply.toolCall ? "failed" : "done",
        result: final.slice(0, MAX_RESULT_CHARS),
        confidence: reply.toolCall ? "low" : reply.confidence,
        gaps: reply.gaps,
      };
    }

    base.toolsUsed.push(reply.toolCall.name);
    const out = await runSkillTool(reply.toolCall.name, reply.toolCall.input, ctx);
    turns.push({
      role: "assistant",
      content: JSON.stringify({ toolCall: reply.toolCall, result: "" }),
    });
    turns.push({
      role: "user",
      content:
        `Tool result for ${reply.toolCall.name}:\n` +
        (out.ok
          ? JSON.stringify(out.output).slice(0, Math.min(out.maxChars, TOOL_RESULT_CHARS))
          : `failed (${out.code}): ${out.message}`) +
        "\nFinish now unless one more tool call is truly needed.",
    });
  }
  return {
    ...base,
    status: "failed",
    result: "Helper did not finish.",
    confidence: null,
    gaps: [],
  };
}

/** Runs the helpers in parallel and always returns one result per task, in the order given. */
export async function runSubAgents(
  tasks: SubTask[],
  provider: ModelProvider,
  apiKey: string,
  ctx: { userId: string | null; sessionId: string },
): Promise<SubResult[]> {
  const list = tasks.slice(0, MAX_AGENTS);
  const seen = new Set<string>();
  for (const t of list) {
    if (seen.has(t.id)) throw new Error(`Helper ids must be unique ("${t.id}" is used twice).`);
    seen.add(t.id);
  }
  return Promise.all(
    list.map(async (t): Promise<SubResult> => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const cancel = { stop: false };
      const timeout = new Promise<SubResult>((resolve) => {
        timer = setTimeout(
          () => (
            (cancel.stop = true),
            resolve({
              id: t.id,
              role: t.role,
              status: "timeout",
              result: "Timed out before finishing.",
              confidence: null,
              gaps: [],
              toolsUsed: [],
            })
          ),
          agentTimeoutMs(),
        );
      });
      try {
        return await Promise.race([runOne(t, provider, apiKey, ctx, cancel), timeout]);
      } catch (error) {
        return {
          id: t.id,
          role: t.role,
          status: "failed",
          result: error instanceof Error ? error.message.slice(0, 300) : "Helper failed.",
          confidence: null,
          gaps: [],
          toolsUsed: [],
        };
      } finally {
        if (timer) clearTimeout(timer);
      }
    }),
  );
}
