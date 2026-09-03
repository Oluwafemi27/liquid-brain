import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Bot,
  CreditCard,
  Database,
  Globe,
  Mail,
  Megaphone,
  MessageCircle,
  Play,
  Radio,
} from "lucide-react";
import { useState } from "react";
import automationCore from "@/assets/automation-core.png";
import liveFeed from "@/assets/automation-live-feed.webp";
import { AppShell, PageHeader } from "@/components/aduf/app-shell";
import { GlassCard, WaterOrb } from "@/components/aduf/liquid";
import { LiveLogFeed } from "@/components/aduf/live-log-feed";
import { cn } from "@/lib/utils";
import type { ChannelId } from "@/lib/aduf-types";
import { useAduf } from "@/store/aduf-store";

const CHANNEL_ICONS: Record<ChannelId, typeof Globe> = {
  website: Globe,
  whatsapp: MessageCircle,
  crm: Database,
  payments: CreditCard,
  ads: Megaphone,
  email: Mail,
};

/** Icon for a given automation's node — one of the 6 fixed channel icons if
 *  it has a channel, otherwise a generic bot icon for AI-created ones. */
function iconFor(channel: ChannelId | undefined) {
  return channel ? CHANNEL_ICONS[channel] : Bot;
}

/** Hexagon outline, drawn point-up so its six vertices line up with the six
 *  orbiting channel nodes below. Pure decoration — no hit targets. */
function HexRing({
  scale,
  opacity,
  duration,
}: {
  scale: number;
  opacity: number;
  duration: number;
}) {
  const pts = Array.from({ length: 6 }, (_, i) => {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
    const x = 50 + Math.cos(a) * 48 * scale;
    const y = 50 + Math.sin(a) * 48 * scale;
    return `${x},${y}`;
  }).join(" ");
  return (
    <motion.svg
      aria-hidden
      viewBox="0 0 100 100"
      className="absolute inset-0 h-full w-full"
      animate={{ rotate: 360 }}
      transition={{ duration, repeat: Infinity, ease: "linear" }}
      style={{ opacity }}
    >
      <polygon points={pts} fill="none" stroke="var(--border)" strokeWidth="0.4" />
    </motion.svg>
  );
}

export const Route = createFileRoute("/automations")({
  head: () => ({
    meta: [
      { title: "Automation Grid — ADUF AI" },
      {
        name: "description",
        content:
          "Toggle no-code automations across website, WhatsApp, CRM, payments, ads and email from one orbiting channel galaxy.",
      },
      { property: "og:title", content: "Automation Grid — ADUF AI" },
      {
        property: "og:description",
        content: "No-code automations for every channel, wired straight into your goals.",
      },
    ],
  }),
  component: AutomationsPage,
});

function AutomationsPage() {
  const { automations, toggleAutomation, runAutomation, insights } = useAduf();
  const [open, setOpen] = useState<string | null>(null);
  const active = automations.find((a) => a.id === open) ?? null;
  const liveCount = automations.filter((a) => a.enabled).length;

  return (
    <AppShell>
      <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:py-8">
        <PageHeader eyebrow="Automation Grid" title="Command Center">
          <div className="glass rounded-full px-4 py-2 text-xs text-muted-foreground">
            {liveCount}/{automations.length} channels live
          </div>
        </PageHeader>

        {/* Command core */}
        <GlassCard hover={false} className="relative overflow-hidden p-6 sm:p-10">
          <div className="mb-6 flex justify-center">
            <div className="glass flex items-center gap-2 rounded-full px-4 py-1.5">
              <Radio className="h-3 w-3 text-cyan" />
              <span className="font-display text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Automation Command Center
              </span>
            </div>
          </div>

          {automations.length === 0 ? (
            <div className="flex min-h-64 items-center justify-center text-center text-sm text-muted-foreground">
              No live automations yet. Connected automation records will appear here in real time.
            </div>
          ) : null}

          <div
            className={cn(
              "grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_300px]",
              automations.length === 0 && "hidden",
            )}
          >
            <div className="relative mx-auto aspect-square w-full max-w-[560px] lg:mx-0">
              <HexRing scale={1} opacity={0.7} duration={90} />
              <HexRing scale={0.78} opacity={0.4} duration={70} />

              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                <WaterOrb
                  fill={automations.length ? (liveCount / automations.length) * 100 : 0}
                  size={140}
                  float={false}
                >
                  <img
                    src={automationCore}
                    alt=""
                    aria-hidden
                    className="h-10 w-10 object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)]"
                  />
                  <span className="mt-1 font-display text-[11px] font-semibold">
                    Automation Core
                  </span>
                  <span className="text-[10px] text-muted-foreground">AI CORE // LIVE</span>
                </WaterOrb>
              </div>

              {automations.map((a, i) => {
                const angle = (i / automations.length) * Math.PI * 2 - Math.PI / 2;
                const r = 44; // % radius
                const left = 50 + Math.cos(angle) * r;
                const top = 50 + Math.sin(angle) * r;
                const Icon = iconFor(a.channel);
                const isOpen = open === a.id;
                return (
                  <div
                    key={a.id}
                    className="absolute -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${left}%`, top: `${top}%` }}
                  >
                    {a.enabled ? (
                      <div
                        aria-hidden
                        className="pointer-events-none absolute left-1/2 top-1/2 origin-left"
                        style={{
                          width: `${r * 5.4}px`,
                          transform: `rotate(${angle + Math.PI}rad)`,
                        }}
                      >
                        {/* pipe casing — the glass tube itself, always faintly lit */}
                        <div
                          className="absolute inset-y-0 left-0 h-[2px] w-full rounded-full"
                          style={{
                            background: "color-mix(in oklab, var(--cyan) 22%, transparent)",
                          }}
                        />
                        {/* shooting light — same fiber-optic pulse as the server rack pipes,
                            travelling from the core out to the channel node on a fast loop */}
                        <div
                          className="animate-pipe-shoot absolute top-1/2 h-[3px] w-10 -translate-y-1/2 rounded-full"
                          style={{
                            background:
                              "linear-gradient(90deg, transparent, var(--cyan) 35%, oklch(1 0 0 / 95%) 55%, var(--violet) 75%, transparent)",
                            boxShadow: "0 0 8px 1px var(--cyan)",
                            animationDelay: `${i * 0.18}s`,
                          }}
                        />
                      </div>
                    ) : null}

                    <span className="absolute left-1/2 -top-6 -translate-x-1/2 whitespace-nowrap font-display text-[9px] font-semibold tracking-widest text-muted-foreground">
                      {a.source === "ai" ? "AI" : `0${i + 1}`}
                    </span>

                    <button
                      onClick={() => setOpen(a.id)}
                      onDoubleClick={() => toggleAutomation(a.id)}
                      className="relative block"
                      aria-label={`Open ${a.name} automation`}
                    >
                      <WaterOrb fill={a.enabled ? 74 : 0} size={96}>
                        <Icon
                          className={cn(
                            "h-4 w-4",
                            a.enabled ? "text-cyan" : "text-muted-foreground",
                          )}
                        />
                        <span className="mt-1 whitespace-nowrap font-display text-[9px] font-semibold uppercase tracking-wide leading-none">
                          {a.name}
                        </span>
                        <span className="mt-1 text-[8px] leading-none text-muted-foreground">
                          {a.enabled ? "ON" : "OFF"}
                        </span>
                      </WaterOrb>
                      {isOpen ? (
                        <span
                          aria-hidden
                          className="absolute inset-[-6px] rounded-full"
                          style={{ boxShadow: "0 0 0 1.5px var(--foreground)" }}
                        />
                      ) : null}
                    </button>
                  </div>
                );
              })}
            </div>

            <LiveLogFeed
              insights={insights}
              automations={automations}
              className="h-[320px] lg:h-[500px]"
            />
          </div>
          <p className="mt-5 text-center text-xs text-muted-foreground">
            Tap a node to open its live feed · double-tap to toggle
          </p>
        </GlassCard>

        {/* Live feed detail panel */}
        <GlassCard hover={false} className="mt-6 overflow-hidden p-0">
          <div className="grid lg:grid-cols-[minmax(0,1fr)_260px]">
            <div className="p-6 sm:p-8">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    {active ? `Channel detail // ${active.id.toUpperCase()}` : "Channel detail"}
                  </p>
                  <h2 className="mt-1 truncate text-xl font-semibold">
                    {active ? active.name : "Select a channel"}
                  </h2>
                </div>
                {active ? (
                  <span
                    className={cn(
                      "shrink-0 rounded-full border px-3 py-1 text-[10px] font-medium uppercase tracking-wider",
                      active.enabled
                        ? "border-cyan/40 text-cyan"
                        : "border-border text-muted-foreground",
                    )}
                  >
                    {active.enabled ? "Live" : "Standby"}
                  </span>
                ) : null}
              </div>

              {active ? (
                <>
                  <div className="mt-5 space-y-3">
                    {[
                      { k: "Trigger", v: active.trigger },
                      { k: "Action", v: active.action },
                      { k: "Goal it affects", v: active.goal || "Not linked to a goal yet" },
                    ].map((row) => (
                      <div key={row.k} className="rounded-2xl bg-white/6 p-4">
                        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                          {row.k}
                        </p>
                        <p className="mt-1 text-sm">{row.v}</p>
                      </div>
                    ))}
                  </div>

                  {active.steps && active.steps.length > 0 ? (
                    <div className="mt-4">
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        Pipeline
                      </p>
                      <ol className="mt-2 space-y-2">
                        {active.steps.map((step, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-2 rounded-xl bg-white/4 px-3 py-2 text-xs"
                          >
                            <span className="mt-0.5 shrink-0 rounded-full border border-border px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-muted-foreground">
                              {step.kind === "get_data"
                                ? "Get"
                                : step.kind === "process_data"
                                  ? "Process"
                                  : "Send"}
                            </span>
                            <span>{step.label}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  ) : null}

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground">
                      {active.runs.toLocaleString()} runs all time
                      {active.source === "ai" ? " · created by ADUF" : ""}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => runAutomation(active.id)}
                        disabled={!active.enabled}
                        className="flex items-center gap-1.5 rounded-full border border-border px-4 py-2.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Play className="h-3 w-3" />
                        Run now
                      </button>
                      <button
                        onClick={() => toggleAutomation(active.id)}
                        className="rounded-full px-5 py-2.5 text-xs font-medium"
                        style={
                          active.enabled
                            ? { border: "1px solid var(--border)" }
                            : { background: "var(--gradient-accent)", color: "var(--background)" }
                        }
                      >
                        {active.enabled ? "Turn off" : "Turn on"}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <p className="mt-4 max-w-md text-sm text-muted-foreground">
                  Tap any node in the command center above to inspect its trigger, its action, and
                  the goal it feeds — then turn it on right from here.
                </p>
              )}
            </div>

            {/* Live feed visual */}
            <div className="relative min-h-[220px] border-t border-border lg:border-l lg:border-t-0">
              <img
                src={liveFeed}
                alt=""
                aria-hidden
                className={cn(
                  "absolute inset-0 h-full w-full object-cover object-top transition-all duration-500",
                  active?.enabled ? "opacity-70 saturate-100" : "opacity-30 saturate-0",
                )}
              />
              <div
                aria-hidden
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(180deg, oklch(0.145 0.018 258 / 20%), oklch(0.145 0.018 258 / 90%) 85%)",
                }}
              />
              <div className="absolute inset-x-3 top-3 flex items-center justify-between">
                <span className="glass rounded-full px-2.5 py-1 font-display text-[9px] font-semibold uppercase tracking-widest">
                  {active ? active.id : "core"}
                </span>
              </div>
              <div className="absolute inset-x-3 bottom-3 flex items-center gap-1.5">
                <span className="relative flex h-2 w-2 shrink-0">
                  {active?.enabled ? (
                    <span className="animate-ripple absolute inset-0 rounded-full bg-cyan" />
                  ) : null}
                  <span
                    className={cn(
                      "relative h-2 w-2 rounded-full",
                      active?.enabled ? "bg-cyan" : "bg-muted-foreground",
                    )}
                  />
                </span>
                <span className="font-display text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Live feed
                </span>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>
    </AppShell>
  );
}
