import "@tanstack/react-start/server-only";
import type { ChatMessage } from "@/lib/aduf-types";
import { DEFAULT_WORKSPACE_ID, getSupabaseAdmin } from "./supabase";

interface ChatMessageRow {
  id: string;
  role: "user" | "aduf";
  text: string;
  question: ChatMessage["question"] | null;
  answered_values: string[] | null;
  trace: ChatMessage["trace"] | null;
  attachments: ChatMessage["attachments"] | null;
  analysis: ChatMessage["analysis"] | null;
  proposed_action: ChatMessage["proposedAction"] | null;
  created_at: string;
}

function fromRow(row: ChatMessageRow): ChatMessage {
  return {
    id: row.id,
    role: row.role,
    text: row.text,
    question: row.question ?? undefined,
    answeredValues: row.answered_values ?? undefined,
    trace: row.trace ?? undefined,
    attachments: row.attachments ?? undefined,
    analysis: row.analysis ?? undefined,
    proposedAction: row.proposed_action ?? undefined,
  };
}

/** Every persisted message for a chat session, oldest first. Powers the
 *  chat page reloading its history on refresh instead of always starting
 *  blank — the messages were already being saved by /api/chat, nothing was
 *  ever reading them back. Returns [] if no backend is configured or the
 *  session has no history yet (both are normal, not errors). */
export async function fetchChatHistory(sessionId: string): Promise<ChatMessage[]> {
  const db = getSupabaseAdmin();
  if (!db || !sessionId) return [];

  const { data, error } = await db
    .from("chat_messages")
    .select(
      "id, role, text, question, answered_values, trace, attachments, analysis, proposed_action, created_at",
    )
    .eq("workspace_id", DEFAULT_WORKSPACE_ID)
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("[chat-history] failed to load chat history", error);
    return [];
  }
  return (data ?? []).map((row) => fromRow(row as ChatMessageRow));
}

/** Distinct chat sessions for the workspace, most recent first, each with a
 *  short label taken from its first user message — used to populate a
 *  "recent chats" switcher so old conversations are never permanently lost
 *  behind a fresh session id. */
export async function listChatSessions(): Promise<
  Array<{ sessionId: string; preview: string; updatedAt: string }>
> {
  const db = getSupabaseAdmin();
  if (!db) return [];

  const { data, error } = await db
    .from("chat_messages")
    .select("session_id, role, text, created_at")
    .eq("workspace_id", DEFAULT_WORKSPACE_ID)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error || !data) {
    console.error("[chat-history] failed to list chat sessions", error);
    return [];
  }

  const bySession = new Map<string, { preview: string; updatedAt: string }>();
  for (const row of data as Array<{
    session_id: string;
    role: string;
    text: string;
    created_at: string;
  }>) {
    const existing = bySession.get(row.session_id);
    if (!existing) {
      bySession.set(row.session_id, { preview: row.text, updatedAt: row.created_at });
    } else if (row.role === "user") {
      // Rows arrive newest-first, so the *earliest* user message overwrites
      // as we keep walking backward — ends up as the first user line, a
      // much better label than the most recent one.
      existing.preview = row.text;
    }
  }

  return Array.from(bySession.entries())
    .map(([sessionId, v]) => ({ sessionId, ...v }))
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    .slice(0, 30);
}
