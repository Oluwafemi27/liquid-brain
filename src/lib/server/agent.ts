import "@tanstack/react-start/server-only";
import { z } from "zod";
import type { AgentTraceStep, ChatMessage } from "@/lib/aduf-types";
import { MODEL_PROVIDERS, callProviderChat, type ChatTurn } from "./model-providers";
import { resolveDefaultModelKey } from "./model-keys";
import { buildSkillsBlock, listSkills } from "./skills";
import { isSandboxConfigured, runInSandbox } from "./sandbox";

const ADUF_SEVERITIES = ["low", "medium", "high", "critical"] as const;

const ADUF_AREAS = [
  "visibility",
  "credibility",
  "customer_journey",
  "conversion",
  "sales",
  "retention",
  "operations",
  "local_presence",
  "search_ai_visibility",
] as const;

const adufFindingSchema = z.object({
  area: z.enum(ADUF_AREAS),
  problem: z.string().min(1),
  severity: z.enum(ADUF_SEVERITIES),
  rootCauses: z.array(z.string().min(1)).min(1).max(6),
  opportunities: z.array(z.string().min(1)).min(1).max(6),
  recommendedActions: z.array(z.string().min(1)).min(1).max(6),
  estimatedImpact: z.string().min(1),
  automationPossible: z.boolean(),
  automationNotes: z.string().optional(),
  expertRequired: z.boolean(),
  expertType: z.string().optional(),
});

export type AdufFinding = z.infer<typeof adufFindingSchema>;

const CHANNEL_IDS = ["website", "whatsapp", "crm", "payments", "ads", "email"] as const;

/** A concrete change to another page the agent wants to make — nothing is
 *  applied anywhere until the owner taps Approve in chat. Keep this a
 *  discriminated union so new action types (e.g. a settings change) can be
 *  added later without touching existing ones. */
const proposedActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("create_goal"),
    title: z.string().min(1).max(120),
    target: z.number().positive(),
    currency: z.string().max(3).optional().default(""),
    reasoning: z.string().min(1).max(400),
  }),
  z.object({
    type: z.literal("toggle_automation"),
    channelId: z.enum(CHANNEL_IDS),
    enabled: z.boolean(),
    reasoning: z.string().min(1).max(400),
  }),
]);

/** A tool the agent can invoke mid-reply instead of guessing — currently
 *  just code execution in the E2B sandbox already wired for the tasks
 *  pipeline. Kept as its own schema (not folded into proposedAction) since
 *  it executes immediately, no owner approval needed — running a read-only
 *  calculation in a throwaway sandbox isn't a change to the business, so
 *  it doesn't need the same gate a real goal/automation change does. */
const toolCallSchema = z.object({
  type: z.literal("run_code"),
  language: z.enum(["python", "javascript", "bash"]).default("python"),
  code: z.string().min(1).max(20_000),
  /** One short phrase shown to the owner while it runs, e.g. "Checking the
   *  math on your margin scenario". */
  purpose: z.string().min(1).max(200),
});

const agentReplySchema = z.object({
  reply: z.string().min(1),
  question: z
    .object({
      prompt: z.string().min(1),
      multi: z.boolean().optional(),
      options: z
        .array(
          z.object({
            id: z.string().min(1),
            label: z.string().min(1),
            value: z.string().min(1),
          }),
        )
        .min(2)
        .max(6),
    })
    .nullable()
    .optional(),
  /** Set when the request calls for an actual deliverable file rather than
   *  just a chat answer — the server renders this into a real file and
   *  attaches it to the reply for preview/download. */
  document: z
    .object({
      filename: z.string().min(1).max(150),
      format: z.enum(["txt", "md", "docx", "pdf"]),
      content: z.string().min(1).max(200_000),
    })
    .nullable()
    .optional(),
  /** Set when the reply is (or includes) a genuine ADUF business audit —
   *  one or more structured findings across the nine analysis areas. Most
   *  replies (small talk, a single follow-up answer, a clarifying question)
   *  have no analysis and this stays null. */
  analysis: z
    .object({
      summary: z.string().min(1),
      findings: z.array(adufFindingSchema).min(1).max(12),
    })
    .nullable()
    .optional(),
  /** Set when the reply proposes a concrete, executable change to the Goals
   *  page or Automation Grid — the owner sees an Approve/Dismiss card and
   *  nothing happens until they tap Approve. Never combine with "question":
   *  ask first, propose once you actually know enough to be specific. */
  proposedAction: proposedActionSchema.nullable().optional(),
  /** Set when the model wants to actually run code before finishing its
   *  reply — see toolCallSchema. Executes immediately (no approval gate,
   *  unlike proposedAction) and its real result is fed back before the
   *  final reply. */
  toolCall: toolCallSchema.nullable().optional(),
});

export type AgentReply = z.infer<typeof agentReplySchema>;

const BASE_SYSTEM_PROMPT = `You are ADUF, an always-on AI COO for a small/medium business, embedded in the
"Brain Chat" of the ADUF AI dashboard. Be direct, concrete and brief — you're
a COO giving a fast answer, not a chatty assistant.

=== Your core method: the ADUF Diagnostic ===
When the owner's request calls for actually analyzing their business (not
just a quick factual question), you diagnose across these nine areas —
only the ones relevant to what they asked, never pad with irrelevant ones:
- Visibility — do the right people know the business exists
- Credibility — trust signals: reviews, proof, professionalism, consistency
- Customer journey — the path from discovery to purchase to repeat
- Conversion — where interested people fail to become customers
- Sales — pipeline, pricing, close rate, deal velocity
- Retention — repeat purchase, churn, loyalty
- Operations — fulfillment, response time, internal workflow friction
- Local presence — for businesses with a physical/local footprint
- Search/AI visibility — findability in search engines and AI answer engines

For each real problem you find in a relevant area, work it through in full:
Problem -> Severity -> Root cause(s) -> Opportunity -> Recommended action(s)
-> Estimated impact -> whether it's automatable -> whether it needs a human
expert (and what kind — e.g. a photographer, a web developer, an accountant,
a paid-ads specialist). Put this in the "analysis" field, not buried in
prose. Severity is one of low/medium/high/critical, judged by how much it's
likely costing the business relative to the fix effort. Only set
"analysis" when you're actually delivering a diagnosis with at least one
real, specific finding — never invent findings to fill the shape, and never
attach it to a reply that's just conversation, a clarifying question, or a
single follow-up answer.

=== Stay accurate: ask before you diagnose ===
A generic-sounding audit is worse than useless — it's actively misleading.
Before producing (or substantially updating) an analysis, make sure you
actually have enough to go on: what the business does, what's already
known from their setup profile below, and specifically what they're asking
about right now. When you don't have enough — the request is vague, you're
guessing at facts, or a plausible answer depends on something only they
know — do NOT guess. Attach a "question" with 2-6 concrete, mutually
exclusive options instead of a free-text ask, and hold off on "analysis"
until you have what you need. This applies throughout the conversation, not
just the first message — keep narrowing with questions whenever precision
would otherwise suffer. Most short/simple replies still need no question at
all; use it when it actually changes what a good answer looks like.

When the request calls for an actual deliverable — a report, a draft
document, a written plan, a document to send someone — rather than just a
chat answer, attach a "document" with the full file content, a filename,
and the best format (txt for plain notes, md for anything with structure,
docx for something formatted to send/print, pdf for a finished
document/report). Put the real, complete content in it, not a summary of
what it would contain. Only do this when a file is actually the right
deliverable — most replies still need no document.

=== Acting on other pages: proposedAction ===
You are not limited to talking — when a reply calls for an actual change to
the Goals page or the Automation Grid, attach "proposedAction" with the
specific change. The owner always sees it as an Approve/Dismiss card first;
nothing is created or toggled anywhere until they tap Approve, so propose
freely whenever it's the right next step, but only when you actually have
what a real goal or automation needs (a concrete title and target; a
specific channel and on/off state) — if you don't, ask a "question" instead
and propose once you know. Never set "question" and "proposedAction" on the
same reply. Two shapes exist today:
- {"type": "create_goal", "title": string, "target": number, "currency": string, "reasoning": string} —
  currency is "₦" (or another symbol) for money goals, "" for a plain count
  (bookings, signups, etc). "reasoning" is one short sentence the owner
  reads on the approval card explaining why this goal, shown to them, not
  hidden reasoning.
- {"type": "toggle_automation", "channelId": "website"|"whatsapp"|"crm"|"payments"|"ads"|"email", "enabled": boolean, "reasoning": string} —
  propose this to turn a channel automation on or off with a clear reason.

=== Tool execution: toolCall ===
When actually getting the answer right requires running code — a real
calculation, checking a formula against real numbers, processing data the
owner pasted in — set "toolCall" instead of guessing. It runs for real in
a sandboxed environment and you'll see its actual stdout/stderr before you
give your final "reply"; you can do this a few times in one reply if the
first result tells you something you need to check further. Shape:
{"type": "run_code", "language": "python"|"javascript"|"bash", "code": string, "purpose": string} —
"purpose" is one short phrase the owner sees while it runs (e.g. "Checking
the math on your margin scenario"). Only set this when execution is
genuinely the right way to get it right — most replies need no tool call.
Never claim you ran or checked something unless you actually set toolCall
to do it; if the sandbox isn't configured or a run fails, say so plainly
in your reply rather than pretending it worked. This executes immediately
with no approval step (unlike proposedAction) — never use it to touch the
owner's real data, only to compute/verify something.

Respond with ONLY a single JSON object, no markdown fences, no prose outside
it, matching exactly:
{"reply": string, "question": {"prompt": string, "multi": boolean, "options": [{"id": string, "label": string, "value": string}]} | null, "document": {"filename": string, "format": "txt"|"md"|"docx"|"pdf", "content": string} | null, "analysis": {"summary": string, "findings": [{"area": "visibility"|"credibility"|"customer_journey"|"conversion"|"sales"|"retention"|"operations"|"local_presence"|"search_ai_visibility", "problem": string, "severity": "low"|"medium"|"high"|"critical", "rootCauses": string[], "opportunities": string[], "recommendedActions": string[], "estimatedImpact": string, "automationPossible": boolean, "automationNotes": string, "expertRequired": boolean, "expertType": string}]} | null, "proposedAction": {"type": "create_goal", "title": string, "target": number, "currency": string, "reasoning": string} | {"type": "toggle_automation", "channelId": "website"|"whatsapp"|"crm"|"payments"|"ads"|"email", "enabled": boolean, "reasoning": string} | null, "toolCall": {"type": "run_code", "language": "python"|"javascript"|"bash", "code": string, "purpose": string} | null}`;

/** Max code-execution round trips inside a single reply — bounds latency
 *  and cost; almost every reply that needs a tool call needs it once. */
const MAX_TOOL_CALLS = 3;

export class NoModelConfiguredError extends Error {
  constructor() {
    super(
      "No AI model is connected yet — add a model API key in Settings, or set " +
        "ANTHROPIC_API_KEY on the server.",
    );
    this.name = "NoModelConfiguredError";
  }
}

/** Calls the agent's configured model with the ADUF persona plus every
 *  enabled business skill, asking for a reply in the app's structured
 *  reply-plus-optional-questionnaire-plus-analysis JSON shape. When the
 *  model asks for a "toolCall", this actually runs it in the E2B sandbox
 *  and feeds the real result back for another round before the final
 *  reply — up to MAX_TOOL_CALLS times — so the agent can genuinely
 *  execute code, not just describe what it would do.
 *  `repairContext`, when present, is a previous parse/validation failure
 *  fed back in so the model can correct itself — this is what the
 *  self-healing harness drives. `surveyContext`, when present, is the
 *  owner's onboarding-survey answers (profession, business type, website,
 *  goal, ...) folded in as background so the diagnosis is about their
 *  actual business, not a generic one. */
export async function callAgent(
  history: ChatMessage[],
  userText: string,
  repairContext?: string,
  surveyContext?: string,
): Promise<AgentReply & { toolTrace: AgentTraceStep[] }> {
  const key = await resolveDefaultModelKey();
  if (!key) throw new NoModelConfiguredError();

  const provider = MODEL_PROVIDERS[key.providerId];
  if (!provider) throw new Error(`Unknown model provider "${key.providerId}"`);

  const skills = await listSkills();
  const systemPrompt =
    BASE_SYSTEM_PROMPT +
    (surveyContext
      ? `\n\n=== Owner's setup profile (from their onboarding survey) ===\n${surveyContext}\nUse this as background context for every reply — don't re-ask for it, but do ask follow-up questions to fill in whatever it doesn't cover and your diagnosis needs.`
      : "\n\nThis owner hasn't completed their setup survey yet, so you have no business profile for them — ask what you need to know as you go.") +
    buildSkillsBlock(skills) +
    (repairContext
      ? `\n\nYour previous reply was rejected: ${repairContext}\nReply again, following the JSON shape exactly.`
      : "");

  const turns: ChatTurn[] = [
    ...history.slice(-12).map((m) => ({
      role: m.role === "user" ? ("user" as const) : ("assistant" as const),
      content:
        m.role === "user"
          ? m.text
          : JSON.stringify({ reply: m.text, question: m.question ?? null }),
    })),
    { role: "user" as const, content: userText },
  ];

  const toolTrace: AgentTraceStep[] = [];
  let toolCallsUsed = 0;

  for (let iteration = 0; iteration <= MAX_TOOL_CALLS; iteration++) {
    const { text } = await callProviderChat(provider, key.apiKey, {
      system: systemPrompt,
      messages: turns,
    });
    const parsed = parseAgentReply(text);

    if (!parsed.toolCall || toolCallsUsed >= MAX_TOOL_CALLS) {
      return { ...parsed, toolTrace };
    }

    toolCallsUsed++;
    const { language, code, purpose } = parsed.toolCall;
    const step: AgentTraceStep = {
      id: `tool-${Date.now()}-${toolCallsUsed}`,
      label: `Ran code: ${purpose}`,
      status: "running",
    };
    toolTrace.push(step);

    // Keep the transcript coherent for the model's next turn: its own
    // structured reply goes back in as an assistant turn, same shape it
    // was asked to produce.
    turns.push({
      role: "assistant",
      content: JSON.stringify({ reply: parsed.reply, question: null }),
    });

    if (!isSandboxConfigured()) {
      step.status = "error";
      step.detail = "No code sandbox configured (E2B_API_KEY not set on the server).";
      turns.push({
        role: "user",
        content:
          "Tool call failed: no code sandbox is configured on this server. Don't request " +
          "run_code again — answer using only what you already know, and mention plainly " +
          "in your reply that live code execution isn't available yet.",
      });
      continue;
    }

    try {
      const run = await runInSandbox(code, { language, sessionId: "brain-chat" });
      step.status = run.ok ? "done" : "error";
      step.detail = run.ok
        ? run.stdout.slice(0, 300) || "(no output)"
        : run.error || run.stderr.slice(0, 300);
      turns.push({
        role: "user",
        content:
          `Tool result for run_code ("${purpose}"):\n` +
          `stdout:\n${run.stdout.slice(0, 4000) || "(empty)"}\n` +
          (run.stderr ? `stderr:\n${run.stderr.slice(0, 1000)}\n` : "") +
          (run.error ? `error: ${run.error}\n` : "") +
          `\nUse this real result to finish your answer. Give your final "reply" now unless ` +
          `another run_code call is genuinely necessary.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sandbox execution failed";
      step.status = "error";
      step.detail = message;
      turns.push({
        role: "user",
        content: `Tool call failed: ${message}. Don't retry the same call — answer using what you have.`,
      });
    }
  }

  // Unreachable in practice (the loop always returns once toolCallsUsed
  // reaches MAX_TOOL_CALLS), but keeps the return type honest.
  throw new Error("Agent reply loop ended without a final answer.");
}

function parseAgentReply(text: string): AgentReply {
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(stripCodeFence(text));
  } catch {
    throw new Error(
      `Reply was not valid JSON (got: ${text.slice(0, 200)}). Respond with ONLY the JSON object.`,
    );
  }

  const parsed = agentReplySchema.safeParse(parsedJson);
  if (!parsed.success) {
    throw new Error(`Reply didn't match the required shape: ${parsed.error.message.slice(0, 300)}`);
  }
  return parsed.data;
}

function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fenced ? (fenced[1] ?? trimmed) : trimmed;
}
