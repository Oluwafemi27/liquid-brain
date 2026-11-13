import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowUpRight, History, SquarePen } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/aduf/app-shell";
import { GlassCard } from "@/components/aduf/liquid";
import { AgentQuestion } from "@/components/aduf/agent-question";
import { ServerActionCard, SourcesRow } from "@/components/aduf/action-card";
import { DailyVerdictCard } from "@/components/aduf/verdict-card";
import { AgentTracePanel } from "@/components/aduf/agent-trace";
import { ChatAttachmentCard } from "@/components/aduf/chat-attachment";
import { ChatComposer } from "@/components/aduf/chat-composer";
import { ChatMarkdown } from "@/components/aduf/chat-markdown";
import { MessageActions, MessageEditor } from "@/components/aduf/message-actions";
import { InsightToastStack } from "@/components/aduf/insight-toast";
import { AdufAnalysisCard } from "@/components/aduf/aduf-analysis-card";
import { SESSION_STORAGE_KEY, useAduf } from "@/store/aduf-store";
import { useAuth } from "@/store/auth-store";
import { fetchChatHistoryFn, listChatSessionsFn } from "@/lib/server-fns";
import { cn } from "@/lib/utils";

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
    editMessage,
  } = useAduf();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [recentChats, setRecentChats] = useState<
    Array<{ sessionId: string; preview: string; updatedAt: string }>
  >([]);
  const hello = useMemo(greeting, []);
  const scrollRef = useRef<HTMLDivElement>(null);
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

  return (
    <AppShell>
      <InsightToastStack />
      <div className="mx-auto flex max-w-[1100px] flex-col px-4 py-4 sm:px-6 lg:py-8">
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
        <DailyVerdictCard />

        <GlassCard hover={false} className="flex h-[75dvh] min-h-[460px] flex-col p-0">
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
                {editingId === m.id ? (
                  <MessageEditor
                    initial={m.text}
                    onCancel={() => setEditingId(null)}
                    onSave={(t) => {
                      setEditingId(null);
                      editMessage(m.id, t);
                    }}
                  />
                ) : (
                  <div
                    className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      m.role === "user" ? "bg-white/12" : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {m.role === "user" ? (
                      <span className="whitespace-pre-wrap break-words">{m.text}</span>
                    ) : (
                      <ChatMarkdown content={m.text} />
                    )}
                  </div>
                )}
                {editingId !== m.id && m.text ? (
                  <MessageActions message={m} onEdit={() => setEditingId(m.id)} />
                ) : null}
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
                {m.role === "aduf" && (m.sources?.length || m.dataGaps?.length) ? (
                  <SourcesRow sources={m.sources} gaps={m.dataGaps} />
                ) : null}
                {m.proposedAction ? (
                  <ServerActionCard actionId={m.proposedAction.actionId} />
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

          <ChatComposer
            sessionId={sessionId}
            thinking={thinking}
            onSend={(text, files) => sendMessage(text, files)}
          />
        </GlassCard>
      </div>
    </AppShell>
  );
}
