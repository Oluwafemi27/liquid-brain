import { createFileRoute, Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Mic, Paperclip, Plug, Plus, Send, Target } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { AppShell } from "@/components/aduf/app-shell";
import { GlassCard, ProgressRing } from "@/components/aduf/liquid";
import { InsightRow } from "@/components/aduf/insight-feed";
import { AgentQuestion } from "@/components/aduf/agent-question";
import { AgentTracePanel } from "@/components/aduf/agent-trace";
import { ChatAttachmentCard } from "@/components/aduf/chat-attachment";
import { AdufAnalysisCard } from "@/components/aduf/aduf-analysis-card";
import { useAduf } from "@/store/aduf-store";
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

const suggestions = [
  "Why did sales drop?",
  "Where should I spend ₦50k?",
  "How are my goals tracking?",
  "Summarise this week for me",
];

const RING_COLORS = ["var(--accent)", "var(--violet)", "var(--cyan)"];

/** Top-of-page dashboard: up to 3 goals as progress rings, with dashed
 *  placeholder slots (linking to /goals) filling any remaining space. */
function GoalProgressBanner() {
  const goals = useAduf((s) => s.goals);
  const top = goals.slice(0, 3);
  const placeholders = Math.max(0, 3 - top.length);

  return (
    <GlassCard hover={false} className="mb-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Today</p>
          <h2 className="mt-0.5 truncate text-base font-semibold sm:text-lg">
            Goal Progress Dashboard
          </h2>
        </div>
        <Link
          to="/goals"
          className="flex shrink-0 items-center gap-1 rounded-full border border-border px-3 py-1.5 text-[11px] text-muted-foreground hover:bg-white/8 hover:text-foreground"
        >
          Goals
          <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>

      {goals.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-4 text-center">
          <p className="text-sm text-muted-foreground">No goals set yet.</p>
          <Link
            to="/goals"
            className="rounded-full px-4 py-2 text-xs font-medium text-background"
            style={{ background: "var(--gradient-accent)" }}
          >
            Set your first goal
          </Link>
        </div>
      ) : (
        <div className="flex flex-wrap justify-center gap-6 sm:justify-between sm:gap-4">
          {top.map((g, i) => {
            const pct = Math.round((g.current / g.target) * 100);
            return (
              <ProgressRing
                key={g.id}
                value={pct}
                label={`${Math.min(100, pct)}%`}
                sublabel={g.title}
                color={RING_COLORS[i % RING_COLORS.length] ?? "var(--accent)"}
              />
            );
          })}
          {Array.from({ length: placeholders }).map((_, i) => (
            <Link key={`ph-${i}`} to="/goals" className="group">
              <ProgressRing value={0} label="+" sublabel="Add goal" dashed />
            </Link>
          ))}
        </div>
      )}
    </GlassCard>
  );
}

/** Compact insight/notification preview — the full history lives on
 *  /notifications; this shows the freshest few inline on the Brain page. */
function InsightFeedCard() {
  const { insights, markInsightRead } = useAduf();
  const unread = insights.filter((i) => !i.read).length;
  const recent = insights.slice(0, 3);

  return (
    <GlassCard hover={false} className="mb-4 p-3 sm:p-4">
      <div className="mb-1 flex items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">Insight Feed</h2>
          {unread > 0 ? (
            <span className="rounded-full bg-cyan/15 px-2 py-0.5 text-[10px] font-medium text-cyan">
              {unread} new
            </span>
          ) : null}
        </div>
        <Link
          to="/notifications"
          className="flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
        >
          View all
          <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>
      {recent.length === 0 ? (
        <p className="px-1 py-3 text-xs text-muted-foreground">
          Nothing yet — ADUF will drop signals here as your business moves.
        </p>
      ) : (
        <div className="space-y-1">
          {recent.map((insight) => (
            <InsightRow key={insight.id} insight={insight} onRead={markInsightRead} compact />
          ))}
        </div>
      )}
    </GlassCard>
  );
}

function BrainPage() {
  const { userName, messages, thinking, sendMessage, answerQuestion } = useAduf();
  const [draft, setDraft] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const hello = useMemo(greeting, []);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  /** Draft text as it was the moment the mic was turned on — speech is
   *  appended after this, never overwrites what was already typed/said. */
  const baseDraftRef = useRef("");
  /** Speech confirmed as final since the mic turned on, kept separate from
   *  the current in-flight interim guess so each onresult tick can replace
   *  just the interim tail without losing earlier finalized words. */
  const finalizedRef = useRef("");

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
    finalizedRef.current = "";

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
          finalizedRef.current += (finalizedRef.current ? " " : "") + chunk.trim();
        } else {
          interim += chunk;
        }
      }
      const finalized = finalizedRef.current;
      setDraft(baseDraftRef.current + finalized + (finalized && interim ? " " : "") + interim);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }

  function handleFileChosen(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setDraft((d) => (d ? `${d} 📎 ${file.name}` : `📎 ${file.name}`));
    }
    e.target.value = "";
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-[880px] px-4 py-4 sm:px-6 lg:py-8">
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

        <GoalProgressBanner />
        <InsightFeedCard />

        <GlassCard hover={false} className="flex h-[60vh] min-h-[420px] max-h-[640px] flex-col p-0">
          <div className="flex shrink-0 items-center gap-2 border-b border-border p-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ripple absolute inset-0 rounded-full bg-cyan" />
              <span className="relative h-2 w-2 rounded-full bg-cyan" />
            </span>
            <h2 className="text-sm font-semibold">Brain Chat</h2>
            <span className="ml-auto text-[11px] text-muted-foreground">always on</span>
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
                  {m.text}
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

          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(draft);
              setDraft("");
            }}
            className="flex shrink-0 items-center gap-2 p-4"
          >
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
                      className="glass absolute bottom-full left-0 z-50 mb-2 w-60 overflow-hidden p-1.5"
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
          </form>
        </GlassCard>
      </div>
    </AppShell>
  );
}
