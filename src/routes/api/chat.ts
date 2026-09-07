import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { NoModelConfiguredError, callAgent } from "@/lib/server/agent";
import { HarnessExhaustedError, runWithHarness } from "@/lib/server/agent-harness";
import { createDocument } from "@/lib/server/documents";
import { resolveDefaultModelKey } from "@/lib/server/model-keys";
import { DEFAULT_WORKSPACE_ID, getSupabaseAdmin } from "@/lib/server/supabase";
import { getSurvey, surveyToContext, verifyAccessToken } from "@/lib/server/survey";
import type {
  AdufAnalysis,
  AgentTraceStep,
  ChatAttachment,
  ChatMessage,
  ProposedAction,
} from "@/lib/aduf-types";

const chatMessageShape = z.object({
  id: z.string(),
  role: z.enum(["user", "aduf"]),
  text: z.string(),
  question: z.any().optional(),
  answeredValues: z.array(z.string()).optional(),
  trace: z.any().optional(),
});

const bodySchema = z.object({
  message: z.string().min(1).max(4000),
  history: z.array(chatMessageShape).optional(),
  sessionId: z.string().min(1).max(200).optional(),
  accessToken: z.string().min(1).nullable().optional(),
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function logMessage(
  sessionId: string,
  role: "user" | "aduf",
  text: string,
  extra: {
    question?: unknown;
    answeredValues?: string[];
    trace?: AgentTraceStep[];
    attachments?: ChatAttachment[] | undefined;
    analysis?: AdufAnalysis | null;
    proposedAction?: ProposedAction | null;
  } = {},
) {
  const db = getSupabaseAdmin();
  if (!db) return;
  const { error } = await db.from("chat_messages").insert({
    workspace_id: DEFAULT_WORKSPACE_ID,
    session_id: sessionId,
    role,
    text,
    question: extra.question ?? null,
    answered_values: extra.answeredValues ?? null,
    trace: extra.trace ?? null,
    attachments: extra.attachments ?? null,
    analysis: extra.analysis ?? null,
    proposed_action: extra.proposedAction ?? null,
  });
  if (error) console.error("[api/chat] failed to persist message", error);
}

/** Renders the agent's requested document and returns it as a chat
 *  attachment. Retried by the harness like any other agent step — a
 *  transient storage hiccup shouldn't lose a deliverable the model already
 *  wrote. Returns null (never throws) so a document failure degrades to
 *  "reply without the file" instead of losing the whole chat turn. */
async function attachDocumentIfRequested(
  sessionId: string,
  document:
    { filename: string; format: "txt" | "md" | "docx" | "pdf"; content: string } | null | undefined,
): Promise<ChatAttachment[] | undefined> {
  if (!document) return undefined;
  try {
    const { result } = await runWithHarness(
      "chat-document-create",
      () => createDocument({ sessionId, ...document }),
      { maxAttempts: 3 },
    );
    return [
      {
        id: result.id,
        filename: result.filename,
        format: result.format,
        mimeType: result.mimeType,
        sizeBytes: result.sizeBytes,
        previewText: result.previewText,
      },
    ];
  } catch (error) {
    console.error("[api/chat] failed to create requested document", error);
    return undefined;
  }
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return json({ error: "Invalid JSON body" }, 400);
        }

        const parsed = bodySchema.safeParse(raw);
        if (!parsed.success) {
          return json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
        }
        const { message, history = [], sessionId = "default", accessToken } = parsed.data;

        // Server-side backstop for the sign-in gate — the chat UI already
        // refuses to call this endpoint while signed out, but that's only a
        // client convenience. If a backend is configured (so identity can
        // actually be checked), a request without a valid session is
        // rejected here too, regardless of what the client claims.
        const isBackendConfigured = Boolean(getSupabaseAdmin());
        const authedUser = isBackendConfigured ? await verifyAccessToken(accessToken) : null;
        if (isBackendConfigured && !authedUser) {
          return json({ error: "sign_in_required" }, 401);
        }

        // Fire-and-forget persistence — never block or fail the reply on this.
        void logMessage(sessionId, "user", message);

        if (!(await resolveDefaultModelKey())) {
          const error = new NoModelConfiguredError();
          void logMessage(sessionId, "aduf", error.message);
          return json({ reply: error.message, question: null, trace: [] });
        }

        const surveyContext = authedUser
          ? await getSurvey(authedUser.id).then((s) => (s ? surveyToContext(s) : undefined))
          : undefined;

        try {
          const { result, trace } = await runWithHarness(
            "brain-chat-reply",
            (repairContext) =>
              callAgent(history as ChatMessage[], message, repairContext, surveyContext),
            { maxAttempts: 3 },
          );
          // The outer harness's trace covers whole-reply retries; the
          // agent's own toolTrace covers any code it actually ran while
          // producing this one reply — merge both so the chat UI's trace
          // panel shows the full picture.
          const fullTrace = [...trace, ...result.toolTrace];
          const attachments = await attachDocumentIfRequested(sessionId, result.document);
          void logMessage(sessionId, "aduf", result.reply, {
            question: result.question ?? null,
            trace: fullTrace,
            attachments,
            analysis: result.analysis ?? null,
            proposedAction: result.proposedAction ?? null,
          });
          return json({
            reply: result.reply,
            question: result.question ?? null,
            trace: fullTrace,
            attachments,
            analysis: result.analysis ?? null,
            proposedAction: result.proposedAction ?? null,
          });
        } catch (error) {
          if (error instanceof NoModelConfiguredError) {
            void logMessage(sessionId, "aduf", error.message);
            return json({ reply: error.message, question: null, trace: [] });
          }
          const trace = error instanceof HarnessExhaustedError ? error.trace : [];
          console.error("[api/chat] agent failed after retries", error);
          const reply =
            "I tried a few times but couldn't put together a good answer to that — mind rephrasing, " +
            "or asking something more specific?";
          void logMessage(sessionId, "aduf", reply, { trace });
          // 200, not 500: the harness already exhausted its retries, and the
          // chat UI should show a graceful in-conversation message, not a
          // network-error toast, for a failure this far downstream.
          return json({ reply, question: null, trace });
        }
      },
    },
  },
});
