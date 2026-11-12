import { LIMITS, checkRateLimit, sharedRetryAfter, tooManyRequests } from "@/lib/server/rate-limit";
import {
  buildAttachmentContext,
  loadAttachments,
  loadImageMedia,
  toChatAttachment,
} from "@/lib/server/attachments";
import { analyzeMedia } from "@/lib/server/vision";
import {
  EntitlementError,
  QuotaExceededError,
  assertTokensAvailable,
  withBilling,
} from "@/lib/server/billing";
import { proposeAction } from "@/lib/server/actions";
import { buildFactsSheet } from "@/lib/server/verdict";
import { connectedAppsContext } from "@/lib/server/composio-sync";
import type { SourceRef } from "@/lib/aduf-types";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { NoModelConfiguredError, callAgent } from "@/lib/server/agent";
import { HarnessExhaustedError, runWithHarness } from "@/lib/server/agent-harness";
import { createDocument } from "@/lib/server/documents";
import { resolveDefaultModelKey } from "@/lib/server/model-keys";
import { getSupabaseAdmin } from "@/lib/server/supabase";
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
  text: z.string().max(60_000),
  question: z.any().optional(),
  answeredValues: z.array(z.string().max(500)).max(50).optional(),
  trace: z.any().optional(),
  /** Files shown on an earlier message, so later questions can still use them. */
  attachments: z
    .array(z.object({ id: z.string().max(100) }))
    .max(20)
    .optional(),
});

const attachmentShape = z.object({
  id: z.string(),
  filename: z.string(),
  format: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number(),
  previewText: z.string().nullable().optional(),
});

const bodySchema = z.object({
  message: z.string().max(12000),
  history: z.array(chatMessageShape).max(500).optional(),
  sessionId: z.string().min(1).max(200).optional(),
  accessToken: z.string().min(1).nullable().optional(),
  /** A file the user attached via the paperclip menu — already uploaded to
   *  storage client-side (see /api/documents/upload) before this request is
   *  sent, so this is just its metadata + extracted preview text. */
  attachment: attachmentShape.optional(),
  /** Files attached with the + menu (documents, images, audio, video): ids of rows already read by
   *  /api/attachments/*. The server loads the extracted text itself; the browser never resends it. */
  attachments: z
    .array(z.object({ id: z.string().uuid() }))
    .max(8)
    .optional(),
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function logMessage(
  userId: string | undefined,
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
    sources?: SourceRef[] | null;
  } = {},
) {
  const db = getSupabaseAdmin();
  // No verified user, no row — there is no "shared" chat history to fall
  // back to anymore, and writing without an owner would be exactly the bug
  // this was fixed to prevent.
  if (!db || !userId) return;
  const { error } = await db.from("chat_messages").insert({
    user_id: userId,
    session_id: sessionId,
    role,
    text,
    question: extra.question ?? null,
    answered_values: extra.answeredValues ?? null,
    trace: extra.trace ?? null,
    attachments: extra.attachments ?? null,
    analysis: extra.analysis ?? null,
    proposed_action: extra.proposedAction ?? null,
    sources: extra.sources ?? null,
  });
  if (error) console.error("[api/chat] failed to persist message", error);
}

/** Renders the agent's requested document and returns it as a chat
 *  attachment. Retried by the harness like any other agent step — a
 *  transient storage hiccup shouldn't lose a deliverable the model already
 *  wrote. Returns null (never throws) so a document failure degrades to
 *  "reply without the file" instead of losing the whole chat turn. */
async function attachDocumentIfRequested(
  userId: string | undefined,
  sessionId: string,
  document:
    { filename: string; format: "txt" | "md" | "docx" | "pdf"; content: string } | null | undefined,
): Promise<ChatAttachment[] | undefined> {
  if (!document || !userId) return undefined;
  try {
    const { result } = await runWithHarness(
      "chat-document-create",
      () => createDocument({ userId, sessionId, ...document }),
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
        const done: Array<() => void> = [];
        try {
          return await handleChat(request, (fn) => done.push(fn));
        } finally {
          for (const fn of done) fn();
        }
      },
    },
  },
});

async function handleChat(
  request: Request,
  onDone: (release: () => void) => void,
): Promise<Response> {
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
  const {
    message,
    history = [],
    sessionId = "default",
    accessToken,
    attachment,
    attachments,
  } = parsed.data;

  // Server-side backstop for the sign-in gate — the chat UI already
  // refuses to call this endpoint while signed out, but that's only a
  // client convenience. If a backend is configured (so identity can
  // actually be checked), a request without a valid session is
  // rejected here too, regardless of what the client claims.
  if (!message.trim() && !attachment && !attachments?.length) {
    return json({ error: "Message or attachment required" }, 400);
  }

  const isBackendConfigured = Boolean(getSupabaseAdmin());
  const authedUser = isBackendConfigured ? await verifyAccessToken(accessToken) : null;
  if (isBackendConfigured && !authedUser) {
    return json({ error: "sign_in_required" }, 401);
  }
  const userId = authedUser?.id;

  // One person can't flood the model: a few chats at a time, and a steady pace per minute.
  if (userId) {
    const gate = checkRateLimit(`chat:${userId}`, LIMITS.chat);
    if (!gate.ok)
      return tooManyRequests(
        gate.retryAfter,
        "Easy there — ADUF is still working on your last messages. Try again in a few seconds.",
      );
    onDone(gate.release);
  }

  // What the model actually reads: the text of every attached file (read once, on upload),
  // plus files shared earlier in this chat so follow-up questions still work, ahead of what
  // the person typed. The *persisted* + *displayed* user message stays exactly what they typed.
  const ids = (attachments ?? []).map((a) => a.id);
  const loaded = authedUser ? await loadAttachments(authedUser.id, ids).catch(() => []) : [];
  const earlierIds = authedUser
    ? [...new Set(history.slice(-12).flatMap((h) => (h.attachments ?? []).map((a) => a.id)))]
        .filter((id) => !ids.includes(id))
        .slice(-4)
    : [];
  const earlier = authedUser
    ? await loadAttachments(authedUser.id, earlierIds).catch(() => [])
    : [];
  const images = loaded.filter((l) => l.row.kind === "image").slice(0, 4);

  // A second, question-aware look at the actual pictures (the upload-time description is generic).
  let imageNote: string | undefined;
  const lookAtImages = async (): Promise<string> => {
    if (imageNote !== undefined) return imageNote;
    imageNote = "";
    if (!authedUser || images.length === 0 || !message.trim()) return imageNote;
    try {
      const media = (
        await Promise.all(images.map((i) => loadImageMedia(authedUser.id, i.row)))
      ).filter((m): m is NonNullable<typeof m> => m !== null);
      if (media.length > 0) {
        imageNote = await analyzeMedia(
          authedUser.id,
          media,
          `The person asked: "${message.slice(0, 1500)}"\nLook at the image(s) and report what is visible that helps answer this. Quote exact text and numbers. If the image does not show what was asked, say so plainly. Plain text, no preamble.`,
        );
      }
    } catch (e) {
      console.warn("[api/chat] image follow-up skipped", e instanceof Error ? e.message : e);
    }
    return imageNote;
  };
  const composeForAgent = async (): Promise<string> => {
    const parts: string[] = [];
    if (attachment)
      parts.push(
        `[Attached file: ${attachment.filename}]\n${attachment.previewText ?? "(no extractable text)"}`,
      );
    if (earlier.length)
      parts.push(`[Files shared earlier in this chat]\n${buildAttachmentContext(earlier, 40_000)}`);
    if (loaded.length) parts.push(buildAttachmentContext(loaded));
    const note = await lookAtImages();
    if (note) parts.push(`[Closer look at the image(s) for this question]\n${note}`);
    parts.push(
      message.trim() ||
        "(The person attached files without a message. Briefly say what each file contains, then ask what they want done with it.)",
    );
    return parts.join("\n\n");
  };

  // Fire-and-forget persistence — never block or fail the reply on this.
  void logMessage(userId, sessionId, "user", message, {
    attachments: loaded.length
      ? loaded.map((l) => toChatAttachment(l.row))
      : attachment
        ? [{ ...attachment, previewText: attachment.previewText ?? null }]
        : undefined,
  });

  if (!(await resolveDefaultModelKey(userId ?? null))) {
    const error = new NoModelConfiguredError();
    void logMessage(userId, sessionId, "aduf", error.message);
    return json({ reply: error.message, question: null, trace: [] });
  }

  const surveyBase = authedUser
    ? await getSurvey(authedUser.id).then((s) => (s ? surveyToContext(s) : undefined))
    : undefined;
  const appsContext = authedUser ? await connectedAppsContext(authedUser.id) : undefined;
  const surveyContext = [surveyBase, appsContext].filter(Boolean).join("\n\n") || undefined;

  // What ADUF actually knows right now — numbered so the answer can cite it.
  const facts = authedUser
    ? await buildFactsSheet(authedUser.id).catch((e) => {
        console.error("[api/chat] facts sheet failed", e);
        return null;
      })
    : null;

  try {
    const run = () =>
      runWithHarness(
        "brain-chat-reply",
        async (repairContext) =>
          callAgent(
            userId ?? null,
            history as ChatMessage[],
            await composeForAgent(),
            repairContext,
            surveyContext,
            facts?.text,
          ),
        { maxAttempts: 3 },
      );
    if (authedUser) await assertTokensAvailable(authedUser.id);
    const { result, trace } = authedUser
      ? await withBilling({ userId: authedUser.id, feature: "chat" }, run)
      : await run();
    // Resolve [S#] citations to real sources; strip the markers from what the owner reads.
    const cited = new Set([...result.reply.matchAll(/\[S(\d+)\]/g)].map((m) => `S${m[1]}`));
    const sources = (facts?.sources ?? [])
      .filter((s) => cited.has(s.id))
      .map(({ id: _id, ...ref }) => ref);
    const dataGaps = (facts?.sources ?? [])
      .filter((s) => s.state !== "fresh")
      .map((s) => `${s.label}: ${s.state === "missing" ? "no data" : "out of date"}`);
    const cleanReply = result.reply.replace(/\s*\[S\d+\]/g, "");
    result.reply = cleanReply;

    // Record the proposal on the server. Low-risk internal ones run now; the rest wait for a tap.
    let proposedAction: ProposedAction | null = result.proposedAction ?? null;
    let actionRecord = null;
    if (proposedAction && authedUser) {
      try {
        const {
          type,
          reasoning,
          actionId: _a,
          ...params
        } = proposedAction as unknown as Record<string, unknown>;
        actionRecord = await proposeAction(authedUser.id, {
          type: String(type),
          params,
          reasoning: String(reasoning ?? ""),
        });
        proposedAction = { ...proposedAction, actionId: actionRecord.id };
      } catch (e) {
        console.error("[api/chat] couldn't record proposed action", e);
        proposedAction = null; // never show an Approve card the server can't back
      }
    }
    // The outer harness's trace covers whole-reply retries; the
    // agent's own toolTrace covers any code it actually ran while
    // producing this one reply — merge both so the chat UI's trace
    // panel shows the full picture.
    const fullTrace = [...trace, ...result.toolTrace];
    const attachments = await attachDocumentIfRequested(userId, sessionId, result.document);
    void logMessage(userId, sessionId, "aduf", result.reply, {
      question: result.question ?? null,
      trace: fullTrace,
      attachments,
      analysis: result.analysis ?? null,
      proposedAction,
      sources,
    });
    return json({
      reply: result.reply,
      question: result.question ?? null,
      trace: fullTrace,
      attachments,
      analysis: result.analysis ?? null,
      proposedAction,
      actionRecord,
      sources,
      dataGaps,
    });
  } catch (error) {
    if (error instanceof QuotaExceededError || error instanceof EntitlementError) {
      void logMessage(userId, sessionId, "aduf", error.message);
      return json({ reply: error.message, question: null, trace: [], paywall: true });
    }
    if (error instanceof NoModelConfiguredError) {
      void logMessage(userId, sessionId, "aduf", error.message);
      return json({ reply: error.message, question: null, trace: [] });
    }
    const trace = error instanceof HarnessExhaustedError ? error.trace : [];
    console.error("[api/chat] agent failed after retries", error);
    const reply =
      "I tried a few times but couldn't put together a good answer to that — mind rephrasing, " +
      "or asking something more specific?";
    void logMessage(userId, sessionId, "aduf", reply, { trace });
    // 200, not 500: the harness already exhausted its retries, and the
    // chat UI should show a graceful in-conversation message, not a
    // network-error toast, for a failure this far downstream.
    return json({ reply, question: null, trace });
  }
}
