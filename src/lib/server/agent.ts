import "@tanstack/react-start/server-only";
import { z } from "zod";
import type { ChatMessage } from "@/lib/aduf-types";
import { MODEL_PROVIDERS, callProviderChat, type ChatTurn } from "./model-providers";
import { resolveDefaultModelKey } from "./model-keys";
import { buildSkillsBlock, listSkills } from "./skills";

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

Respond with ONLY a single JSON object, no markdown fences, no prose outside
it, matching exactly:
{"reply": string, "question": {"prompt": string, "multi": boolean, "options": [{"id": string, "label": string, "value": string}]} | null, "document": {"filename": string, "format": "txt"|"md"|"docx"|"pdf", "content": string} | null, "analysis": {"summary": string, "findings": [{"area": "visibility"|"credibility"|"customer_journey"|"conversion"|"sales"|"retention"|"operations"|"local_presence"|"search_ai_visibility", "problem": string, "severity": "low"|"medium"|"high"|"critical", "rootCauses": string[], "opportunities": string[], "recommendedActions": string[], "estimatedImpact": string, "automationPossible": boolean, "automationNotes": string, "expertRequired": boolean, "expertType": string}]} | null}`;

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
 *  reply-plus-optional-questionnaire-plus-analysis JSON shape.
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
): Promise<AgentReply> {
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

  const messages: ChatTurn[] = [
    ...history.slice(-12).map((m) => ({
      role: m.role === "user" ? ("user" as const) : ("assistant" as const),
      content:
        m.role === "user"
          ? m.text
          : JSON.stringify({ reply: m.text, question: m.question ?? null }),
    })),
    { role: "user" as const, content: userText },
  ];

  const { text } = await callProviderChat(provider, key.apiKey, { system: systemPrompt, messages });

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
