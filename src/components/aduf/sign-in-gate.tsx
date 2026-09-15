import { useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  Brain,
  CalendarClock,
  CheckCircle2,
  MessageCircle,
  Network,
  Sparkles,
  Target,
  Waves,
} from "lucide-react";
import { useAuth } from "@/store/auth-store";
import { GoogleGlyph } from "./sign-in-modal";
import auroraBg from "@/assets/aurora-bg.jpg";

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
};

function GoogleCta({
  loading,
  redirecting,
  onClick,
  className,
  label = "Continue with Google",
}: {
  loading: boolean;
  redirecting: boolean;
  onClick: () => void;
  className?: string;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading || redirecting}
      className={`flex items-center justify-center gap-2.5 rounded-full border border-border bg-white px-6 py-3 text-sm font-medium text-neutral-800 transition-opacity hover:opacity-90 disabled:opacity-60 ${className ?? ""}`}
    >
      <GoogleGlyph />
      {redirecting ? "Redirecting…" : loading ? "Loading…" : label}
    </button>
  );
}

const features = [
  {
    icon: Brain,
    title: "Brain Chat",
    body: "Ask ADUF anything about your business in plain language and get a straight answer, backed by your real data — not a canned script.",
  },
  {
    icon: Target,
    title: "Goals Engine",
    body: "Set KPIs like revenue or booking targets, and watch live progress fill in as ADUF breaks each one into sub-tasks it can help you execute.",
  },
  {
    icon: Waves,
    title: "Automation Grid",
    body: "Turn on channels — website, WhatsApp, CRM, payments, ads, email — and let ADUF work across them without you writing a single workflow.",
  },
  {
    icon: BarChart3,
    title: "Analytics & Simulation",
    body: "See sales, leads and retention as live reports, then model what a change in spend or channel mix would actually do before you commit to it.",
  },
];

const steps = [
  {
    title: "Connect your data",
    body: "Link the sources you already use — payments, ads, CRM, messaging — so ADUF has real numbers to work from, not guesses.",
  },
  {
    title: "Chat with your Brain",
    body: "Ask questions, request a plan, or just talk through a decision. ADUF reasons over your data and proposes concrete next steps.",
  },
  {
    title: "Track goals & automate",
    body: "Approve the changes you like, set targets, and let automations run the repetitive parts across every connected channel.",
  },
];

const benefits = [
  "Always-on — ADUF keeps watching your numbers even when you're not looking",
  "No-code automations across WhatsApp, ads, CRM, payments and email",
  "Every goal and chart is built from your real, connected data",
  "One Google sign-in — nothing else to set up or remember",
];

/** Full marketing home page shown instead of the app for anyone who isn't
 *  signed in yet — replaces the old bare "sign in" card. Explains what ADUF
 *  AI is, what it does, and how it helps, with the same Google sign-in flow
 *  as the entry point throughout. Nothing here talks to Supabase or the
 *  agent — it's pure presentation plus the existing signInWithGoogle()
 *  action. */
export function SignInGate({ loading }: { loading: boolean }) {
  const { signInWithGoogle } = useAuth();
  const [redirecting, setRedirecting] = useState(false);

  async function handleGoogleClick() {
    setRedirecting(true);
    try {
      await signInWithGoogle();
    } finally {
      setRedirecting(false);
    }
  }

  return (
    <div className="relative z-10 min-h-screen overflow-y-auto">
      {/* Top bar */}
      <header className="mx-auto flex max-w-[1200px] items-center justify-between gap-3 px-4 py-5 sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <div
            className="grid h-8 w-8 shrink-0 place-items-center rounded-xl"
            style={{ background: "var(--gradient-accent)" }}
          >
            <Sparkles className="h-4 w-4 text-background" />
          </div>
          <p className="truncate font-display text-sm font-semibold">ADUF AI</p>
        </div>
        <GoogleCta
          loading={loading}
          redirecting={redirecting}
          onClick={handleGoogleClick}
          label={loading ? "Loading…" : "Sign in"}
          className="px-4 py-2 text-xs"
        />
      </header>

      {/* Hero */}
      <section className="relative mx-auto max-w-[1200px] overflow-hidden rounded-[32px] px-4 py-16 sm:px-6 sm:py-20">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 rounded-[32px] opacity-30"
          style={{
            backgroundImage: `url(${auroraBg})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 rounded-[32px]"
          style={{
            background:
              "linear-gradient(180deg, color-mix(in oklab, var(--background) 20%, transparent) 0%, var(--background) 92%)",
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
          className="mx-auto max-w-2xl text-center"
        >
          <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
            The Business Brain for SMBs
          </p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight sm:text-5xl">
            An always-on AI COO for <span className="text-gradient">your business</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground sm:text-base">
            ADUF AI watches your sales, leads and retention, chats with you about what's happening,
            tracks the goals that matter, and automates the busywork across WhatsApp, ads, CRM and
            payments — so you can run the business, not the spreadsheet.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <GoogleCta loading={loading} redirecting={redirecting} onClick={handleGoogleClick} />
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Sign in with Google — that's the only account you'll need.
          </p>
        </motion.div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6 sm:py-14">
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-xl text-center"
        >
          <h2 className="text-xl font-semibold sm:text-2xl">
            Everything your business brain needs
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Four connected surfaces, one always-on assistant behind all of them.
          </p>
        </motion.div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon: Icon, title, body }, i) => (
            <motion.div
              key={title}
              {...fadeUp}
              transition={{ duration: 0.5, delay: i * 0.06 }}
              className="glass relative overflow-hidden p-5"
            >
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-px"
                style={{ background: "var(--gradient-accent)", opacity: 0.5 }}
              />
              <div
                className="grid h-10 w-10 place-items-center rounded-2xl"
                style={{ background: "var(--gradient-accent)" }}
              >
                <Icon className="h-5 w-5 text-background" />
              </div>
              <h3 className="mt-4 text-sm font-semibold">{title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6 sm:py-14">
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-xl text-center"
        >
          <h2 className="text-xl font-semibold sm:text-2xl">How it works</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Three steps from sign-in to a business that partly runs itself.
          </p>
        </motion.div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              {...fadeUp}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="glass relative overflow-hidden p-5"
            >
              <span
                className="grid h-8 w-8 place-items-center rounded-full text-xs font-semibold text-background"
                style={{ background: "var(--gradient-accent)" }}
              >
                {i + 1}
              </span>
              <h3 className="mt-3 text-sm font-semibold">{step.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{step.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Benefits */}
      <section className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6 sm:py-14">
        <div className="glass relative overflow-hidden p-6 sm:p-10">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px"
            style={{ background: "var(--gradient-accent)", opacity: 0.5 }}
          />
          <div className="grid gap-8 md:grid-cols-2 md:items-center">
            <motion.div {...fadeUp} transition={{ duration: 0.5 }}>
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                Why teams use ADUF
              </p>
              <h2 className="mt-2 text-xl font-semibold sm:text-2xl">
                Built to actually run your day-to-day, not just report on it
              </h2>
              <div className="mt-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                <GoogleCta
                  loading={loading}
                  redirecting={redirecting}
                  onClick={handleGoogleClick}
                />
              </div>
            </motion.div>
            <motion.ul {...fadeUp} transition={{ duration: 0.5, delay: 0.1 }} className="space-y-3">
              {benefits.map((b) => (
                <li key={b} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-cyan" />
                  <span>{b}</span>
                </li>
              ))}
            </motion.ul>
          </div>
        </div>
      </section>

      {/* Secondary features row: rounds out the page nav-parity (Schedule, Memory) */}
      <section className="mx-auto max-w-[1200px] px-4 pb-4 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.5 }}
            className="glass relative overflow-hidden p-5"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-px"
              style={{ background: "var(--gradient-accent)", opacity: 0.5 }}
            />
            <div className="flex items-center gap-2.5">
              <CalendarClock className="h-4 w-4 text-cyan" />
              <h3 className="text-sm font-semibold">Schedule</h3>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              Every task ADUF plans or you set lands on a shared timeline, so nothing important
              slips through.
            </p>
          </motion.div>
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.5, delay: 0.06 }}
            className="glass relative overflow-hidden p-5"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-px"
              style={{ background: "var(--gradient-accent)", opacity: 0.5 }}
            />
            <div className="flex items-center gap-2.5">
              <Network className="h-4 w-4 text-cyan" />
              <h3 className="text-sm font-semibold">Memory</h3>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              ADUF remembers what it learns about your business over time, so every new conversation
              starts smarter than the last.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-[1200px] px-4 py-14 sm:px-6">
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.5 }}
          className="glass relative flex flex-col items-center gap-4 overflow-hidden p-8 text-center sm:p-12"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px"
            style={{ background: "var(--gradient-accent)", opacity: 0.5 }}
          />
          <MessageCircle className="h-8 w-8 text-cyan" />
          <h2 className="text-xl font-semibold sm:text-2xl">
            {loading ? "Checking your session…" : "Ready to talk to your business brain?"}
          </h2>
          <p className="max-w-md text-sm text-muted-foreground">
            {loading
              ? "One moment."
              : "Sign in with Google to get your dashboard, chat, goals and automations — all live in under a minute."}
          </p>
          <GoogleCta loading={loading} redirecting={redirecting} onClick={handleGoogleClick} />
          <p className="text-[11px] text-muted-foreground">
            That's the only sign-in method — no separate email/password account needed.
          </p>
        </motion.div>
      </section>
    </div>
  );
}
