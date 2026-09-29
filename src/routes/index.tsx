import { createFileRoute, Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpRight,
  History,
  Loader2,
  Mic,
  Paperclip,
  Plug,
  Plus,
  Send,
  SquarePen,
  Target,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { AppShell } from "@/components/aduf/app-shell";
import { GlassCard } from "@/components/aduf/liquid";
import { AgentQuestion } from "@/components/aduf/agent-question";
import { AgentProposedAction } from "@/components/aduf/agent-proposed-action";
import { AgentTracePanel } from "@/components/aduf/agent-trace";
import { ChatAttachmentCard } from "@/components/aduf/chat-attachment";
import { ChatMarkdown } from "@/components/aduf/chat-markdown";
import { InsightToastStack } from "@/components/aduf/insight-toast";
import { AdufAnalysisCard } from "@/components/aduf/aduf-analysis-card";
import { SESSION_STORAGE_KEY, useAduf } from "@/store/aduf-store";
import { useAuth } from "@/store/auth-store";
import { fetchChatHistoryFn, listChatSessionsFn } from "@/lib/server-fns";
import { cn } from "@/lib/utils";
import type { ChatAttachment } from "@/lib/aduf-types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ADUF AI — The Business Brain for SMBs" },
      {
        name: "description",
        content:
          "ADUF AI is an always-on COO for small businesses: chat with your brain to get live insight, KPI tracking, goals and no-code automations.",
      },
      { property: "og:title", content: "ADUF AI — The Business Brain for SMBs" },
      {
        property: "og:description",
        content:
          "An always-on AI COO that watches your sales, leads and retention, then acts across WhatsApp, ads, CRM and payments.",
      },
    ],
  }),
  component: BrainPage,
});

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 18) return "Good Afternoon";
  return "Good Evening";
}

/** Minimal typings for the (non-standard, vendor-prefixed) Web Speech API —
 *  there's no official DOM lib type for it. */
interface SpeechRecognitionResultLike {
  0: { transcript: string };
  isFinal: boolean;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

/** Maps a file's extension to one of the 4 formats /api/documents/upload
 *  accepts. Returns null for anything else so the caller can show a clear
 *  "not supported" message instead of silently mangling the file. */
function formatFromFilename(filename: string): "txt" | "md" | "docx" | "pdf" | null {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext === "md" || ext === "markdown") return "md";
  if (ext === "docx") return "docx";
  if (ext === "pdf") return "pdf";
  if (ext === "txt" || ext === "text" || ext === "csv" || ext === "json") return "txt";
  return null;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // reader.result is a data: URL — strip the "data:...;base64," prefix.
      const result = reader.result as string;
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

const suggestions = [
  "Why did sales drop?",
  "Where should I spend ₦50k?",
  "How are my goals tracking?",
  "Summarise this week for me",
];

function BrainPage() {
  const {
    userName,
    messages,
    thinking,
    sessionId,
    sendMessage,
    setMessages,
    startNewChat,
    answerQuestion,
    approveProposedAction,
    dismissProposedAction,
  } = useAduf();
  const [draft, setDraft] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<ChatAttachment | null>(null);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [recentChats, setRecentChats] = useState<
    Array<{ sessionId: string; preview: string; updatedAt: string }>
  >([]);
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const hello = useMemo(greeting, []);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  /** Draft text as it was the moment the mic was turned on — speech is
   *  appended after this, never overwrites what was already typed/said. */
  const baseDraftRef = useRef("");
  /** Speech confirmed as final since the mic turned on, keyed by the Web
   *  Speech API's own result index rather than accumulated by string
   *  concatenation. Some browsers (Chrome included) redeliver an
   *  already-finalized result in a later onresult event — appending it
   *  again (the old `finalizedRef.current += chunk` approach) is what
   *  caused words/phrases to repeat. Writing into a fixed slot per result
   *  index instead means a redelivered result just overwrites its own
   *  slot with the same text, so nothing is ever duplicated. */
  const finalizedChunksRef = useRef<string[]>([]);

  // Reload this session's saved messages whenever the active session
  // changes (first mount, or after "New chat"/"switch chat"). Without
  // this, the chat always started blank even though messages were being
  // saved to Supabase the whole time — nothing ever read them back.
  useEffect(() => {
    let cancelled = false;
    fetchChatHistoryFn({ data: { accessToken: useAuth.getState().accessToken, sessionId } })
      .then((history) => {
        // Guard against a race where the user already sent a message (or
        // switched chats again) while this request was in flight — only
        // apply the fetched history if nothing has happened since.
        if (!cancelled && history.length > 0 && useAduf.getState().messages.length === 0) {
          setMessages(history);
        }
      })
      .catch((err) => console.error("[chat] failed to load history", err));
    return () => {
      cancelled = true;
    };
  }, [sessionId, setMessages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  useEffect(() => {
    const w = window as typeof window & {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    };
    setSpeechSupported(Boolean(w.SpeechRecognition || w.webkitSpeechRecognition));
  }, []);

  function toggleMic() {
    if (!speechSupported) return;
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const w = window as typeof window & {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    };
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SR) return;

    baseDraftRef.current = draft ? `${draft} ` : "";
    finalizedChunksRef.current = [];

    const recognition = new SR();
    recognition.lang = "en-US";
    // continuous + interimResults is what makes this live: without them the
    // browser only reports text after you stop talking, not as you speak.
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        if (!result) continue;
        const chunk = result[0].transcript;
        if (result.isFinal) {
          // Overwrite this result's own slot — if the browser redelivers
          // the same finalized result later, this is a no-op rather than a
          // duplicate.
          finalizedChunksRef.current[i] = chunk.trim();
        } else {
          interim += chunk;
        }
      }
      const finalized = finalizedChunksRef.current.filter(Boolean).join(" ");
      setDraft(baseDraftRef.current + finalized + (finalized && interim ? " " : "") + interim);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }

  /** Actually uploads the chosen file and turns it into a removable chip
   *  above the composer — it used to just dump "📎 filename" as literal
   *  text into the prompt box, mixed in with whatever the user was typing,
   *  which is exactly the bug that was reported. Now the draft stays pure
   *  user text, and the file becomes real, structured context the agent
   *  can actually read (see /api/chat's use of previewText). */
  function handleFileChosen(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setAttachError(null);
    const format = formatFromFilename(file.name);
    if (!format) {
      setAttachError(
        `Can't attach .${file.name.split(".").pop()} files — try .txt, .md, .docx or .pdf.`,
      );
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setAttachError("That file is too large (15MB max).");
      return;
    }

    setUploadingAttachment(true);
    fileToBase64(file)
      .then((base64Content) =>
        fetch("/api/documents/upload", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ sessionId, filename: file.name, format, base64Content }),
        }),
      )
      .then(async (res) => {
        const body = (await res.json()) as { document?: ChatAttachment; error?: string };
        if (!res.ok || !body.document) throw new Error(body.error ?? "Upload failed");
        setPendingAttachment(body.document);
      })
      .catch((err) => {
        console.error("[chat] file upload failed", err);
        setAttachError("Couldn't upload that file — try again.");
      })
      .finally(() => setUploadingAttachment(false));
  }

  return (
    <AppShell>
      <InsightToastStack />
      <div className="mx-auto flex h-[calc(100dvh-10rem)] max-w-[1100px] flex-col px-4 py-4 sm:px-6 lg:h-[calc(100dvh-4rem)] lg:py-8">
        <header className="mb-4 flex shrink-0 items-center justify-between gap-3 lg:mb-6">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              The Brain
            </p>
            <h1 className="mt-1 truncate text-xl font-semibold sm:text-2xl">
              {hello}
              {userName ? (
                <>
                  , <span className="text-gradient">{userName}</span>
                </>
              ) : null}
            </h1>
          </div>
          <div className="glass flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ripple absolute inset-0 rounded-full bg-cyan" />
              <span className="relative h-2 w-2 rounded-full bg-cyan" />
            </span>
            <span className="whitespace-nowrap text-muted-foreground">ADUF is Active</span>
          </div>
        </header>

        {/* Fills the rest of the page now that the Goal Progress Dashboard
         *  and Insight Feed have moved to /goals — this used to be a
         *  short, fixed-height box (60vh, capped at 640px) with a lot of
         *  empty page below it; now it's the page. */}
        <GlassCard hover={false} className="flex min-h-0 flex-1 flex-col p-0">
          <div className="relative flex shrink-0 items-center gap-2 border-b border-border p-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ripple absolute inset-0 rounded-full bg-cyan" />
              <span className="relative h-2 w-2 rounded-full bg-cyan" />
            </span>
            <h2 className="text-sm font-semibold">Brain Chat</h2>
            <span className="ml-auto text-[11px] text-muted-foreground">always on</span>
            <button
              onClick={() => {
                setHistoryOpen((v) => !v);
                if (!historyOpen) {
                  listChatSessionsFn({ data: { accessToken: useAuth.getState().accessToken } })
                    .then(setRecentChats)
                    .catch((err) => console.error("[chat] failed to list sessions", err));
                }
              }}
              aria-label="Chat history"
              className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-white/8 hover:text-foreground"
            >
              <History className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => {
                startNewChat();
                setHistoryOpen(false);
              }}
              aria-label="Start new chat"
              className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-white/8 hover:text-foreground"
            >
              <SquarePen className="h-3.5 w-3.5" />
            </button>

            {historyOpen ? (
              <div className="glass-solid absolute right-4 top-full z-20 mt-1 max-h-72 w-72 overflow-y-auto rounded-2xl p-2 shadow-xl">
                <p className="px-2 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                  Recent chats
                </p>
                {recentChats.length === 0 ? (
                  <p className="px-2 py-3 text-xs text-muted-foreground">No previous chats yet.</p>
                ) : (
                  recentChats.map((chat) => (
                    <button
                      key={chat.sessionId}
                      onClick={() => {
                        useAduf.setState({ sessionId: chat.sessionId, messages: [] });
                        try {
                          window.localStorage.setItem(SESSION_STORAGE_KEY, chat.sessionId);
                        } catch {
                          // Private browsing or storage disabled — the
                          // switch still works for this tab.
                        }
                        setHistoryOpen(false);
                      }}
                      className={cn(
                        "block w-full truncate rounded-xl px-2 py-2 text-left text-xs hover:bg-white/8",
                        chat.sessionId === sessionId ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {chat.preview || "New conversation"}
                    </button>
                  ))
                )}
              </div>
            ) : null}
          </div>

          <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
            {messages.length === 0 && !thinking ? (
              <div className="flex h-full flex-col items-center justify-center gap-1.5 text-center">
                <p className="text-sm text-muted-foreground">
                  Ask ADUF anything about your business.
                </p>
                <p className="text-xs text-muted-foreground/70">
                  Try one of the prompts below to get started.
                </p>
              </div>
            ) : null}
            {messages.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={m.role === "user" ? "ml-auto max-w-[85%]" : "max-w-[85%]"}
              >
                <div
                  className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    m.role === "user" ? "bg-white/12" : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {m.role === "user" ? m.text : <ChatMarkdown content={m.text} />}
                </div>
                {m.trace?.length ? <AgentTracePanel steps={m.trace} /> : null}
                {m.analysis ? <AdufAnalysisCard analysis={m.analysis} /> : null}
                {m.attachments?.map((a) => (
                  <ChatAttachmentCard key={a.id} attachment={a} />
                ))}
                {m.question ? (
                  <AgentQuestion
                    question={m.question}
                    answeredValues={m.answeredValues}
                    disabled={thinking}
                    onAnswer={(values) => {
                      const label = m
                        .question!.options.filter((o) => values.includes(o.value))
                        .map((o) => o.label)
                        .join(", ");
                      answerQuestion(m.id, values, label);
                    }}
                  />
                ) : null}
                {m.proposedAction ? (
                  <AgentProposedAction
                    action={m.proposedAction}
                    status={m.proposedActionStatus}
                    onApprove={() => approveProposedAction(m.id)}
                    onDismiss={() => dismissProposedAction(m.id)}
                  />
                ) : null}
              </motion.div>
            ))}
            {thinking ? (
              <div className="flex w-24 gap-1.5 rounded-2xl bg-secondary px-3.5 py-3">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="h-2 w-2 rounded-full bg-cyan"
                    animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
                  />
                ))}
              </div>
            ) : null}
          </div>

          {messages.length === 0 && !thinking ? (
            <div className="flex shrink-0 flex-wrap gap-2 px-4 pt-3">
              {suggestions.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-[11px] text-muted-foreground hover:bg-white/8 hover:text-foreground"
                >
                  {q}
                  <ArrowUpRight className="h-3 w-3" />
                </button>
              ))}
            </div>
          ) : null}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(draft, pendingAttachment ?? undefined);
              setDraft("");
              setPendingAttachment(null);
            }}
            className="flex shrink-0 flex-col gap-2 p-4"
          >
            {pendingAttachment || uploadingAttachment || attachError ? (
              <div className="flex flex-wrap items-center gap-2 px-1">
                {uploadingAttachment ? (
                  <span className="glass flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Uploading…
                  </span>
                ) : null}
                {pendingAttachment ? (
                  <span className="glass flex items-center gap-1.5 rounded-full py-1.5 pl-3 pr-1.5 text-xs">
                    <Paperclip className="h-3 w-3 text-muted-foreground" />
                    <span className="max-w-[14rem] truncate">{pendingAttachment.filename}</span>
                    <button
                      type="button"
                      onClick={() => setPendingAttachment(null)}
                      aria-label="Remove attachment"
                      className="grid h-4 w-4 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-white/12 hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ) : null}
                {attachError ? (
                  <span className="text-xs text-destructive">{attachError}</span>
                ) : null}
              </div>
            ) : null}
            <div className="flex items-center gap-2">
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setMenuOpen((o) => !o)}
                  aria-label="Add attachment or shortcut"
                  aria-expanded={menuOpen}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-white/8 hover:text-foreground"
                >
                  <Plus className={cn("h-4 w-4 transition-transform", menuOpen && "rotate-45")} />
                </button>

                <AnimatePresence>
                  {menuOpen ? (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setMenuOpen(false)}
                        aria-hidden
                      />
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.96 }}
                        transition={{ duration: 0.15 }}
                        className="glass-solid absolute bottom-full left-0 z-50 mb-2 w-60 overflow-hidden p-1.5"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            fileInputRef.current?.click();
                            setMenuOpen(false);
                          }}
                          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-white/8"
                        >
                          <Paperclip className="h-4 w-4 text-muted-foreground" />
                          Attach a file
                        </button>
                        <Link
                          to="/goals"
                          onClick={() => setMenuOpen(false)}
                          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-white/8"
                        >
                          <Target className="h-4 w-4 text-muted-foreground" />
                          Set a goal
                        </Link>
                        <Link
                          to="/settings"
                          onClick={() => setMenuOpen(false)}
                          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-white/8"
                        >
                          <Plug className="h-4 w-4 text-muted-foreground" />
                          Connect a source
                        </Link>
                      </motion.div>
                    </>
                  ) : null}
                </AnimatePresence>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.md,.markdown,.docx,.pdf,.csv,.json"
                  onChange={handleFileChosen}
                  className="hidden"
                />
              </div>

              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Ask ADUF anything..."
                className="min-w-0 flex-1 rounded-full bg-white/8 px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
              />

              <button
                type="button"
                onClick={toggleMic}
                disabled={!speechSupported}
                aria-pressed={listening}
                aria-label={listening ? "Stop voice input" : "Voice input"}
                title={
                  speechSupported
                    ? listening
                      ? "Stop listening"
                      : "Speak to ADUF"
                    : "Voice input isn't supported in this browser"
                }
                className={cn(
                  "relative grid h-10 w-10 shrink-0 place-items-center rounded-full border transition-colors",
                  listening
                    ? "border-cyan/60 bg-cyan/15 text-cyan"
                    : "border-border text-muted-foreground hover:bg-white/8 hover:text-foreground",
                  !speechSupported && "cursor-not-allowed opacity-40",
                )}
              >
                {listening ? (
                  <span className="animate-ripple absolute inset-0 rounded-full bg-cyan/60" />
                ) : null}
                <Mic className="relative h-4 w-4" />
              </button>

              <button
                type="submit"
                aria-label="Send message"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full transition-transform hover:scale-105"
                style={{ background: "var(--gradient-accent)" }}
              >
                <Send className="h-4 w-4 text-background" />
              </button>
            </div>
          </form>
        </GlassCard>
      </div>
    </AppShell>
  );
}
