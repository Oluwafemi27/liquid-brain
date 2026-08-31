import "@tanstack/react-start/server-only";
import { z } from "zod";
import type { ChatMessage } from "@/lib/aduf-types";
import { MODEL_PROVIDERS, callProviderChat, type ChatTurn } from "./model-providers";
import { resolveDefaultModelKey } from "./model-keys";
import { buildSkillsBlock, listSkills } from "./skills";

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
});

export type AgentReply = z.infer<typeof agentReplySchema>;

const BASE_SYSTEM_PROMPT = `You are ADUF, an always-on AI COO for a small/medium business, embedded in the
"Brain Chat" of the ADUF AI dashboard. Be direct, concrete and brief — you're
a COO giving a fast answer, not a chatty assistant.

When you genuinely need the owner to choose between a small set of options
before you can act (not for every message — most replies need no question),
attach a "question" with 2-6 short, mutually exclusive options they can tap
instead of typing. Prefer this over asking an open-ended question in prose.

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
{"reply": string, "question": {"prompt": string, "multi": boolean, "options": [{"id": string, "label": string, "value": string}]} | null, "document": {"filename": string, "format": "txt"|"md"|"docx"|"pdf", "content": string} | null}`;

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
 *  reply-plus-optional-questionnaire JSON shape. `repairContext`, when
 *  present, is a previous parse/validation failure fed back in so the model
 *  can correct itself — this is what the self-healing harness drives. */
export async function callAgent(
  history: ChatMessage[],
  userText: string,
  repairContext?: string,
): Promise<AgentReply> {
  const key = await resolveDefaultModelKey();
  if (!key) throw new NoModelConfiguredError();

  const provider = MODEL_PROVIDERS[key.providerId];
  if (!provider) throw new Error(`Unknown model provider "${key.providerId}"`);

  const skills = await listSkills();
  const systemPrompt =
    BASE_SYSTEM_PROMPT +
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
