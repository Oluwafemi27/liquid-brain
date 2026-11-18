import { PlanSummaryCard } from "@/components/aduf/plan-summary";
import { DataPrivacyPanel } from "@/components/aduf/data-privacy-panel";
import { IntegrationAccess } from "@/components/aduf/integration-access";
import { SafetyPanel } from "@/components/aduf/safety-panel";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  BadgeCheck,
  ChevronRight,
  KeyRound,
  Lock,
  Plug,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell, PageHeader } from "@/components/aduf/app-shell";
import { GlassCard } from "@/components/aduf/liquid";
import { cn } from "@/lib/utils";
import { ModelKeysPanel } from "@/components/aduf/model-keys-panel";
import { N8nConnectionPanel } from "@/components/aduf/n8n-connection-panel";
import { SkillsPanel } from "@/components/aduf/skills-panel";
import { TelegramConnectionPanel } from "@/components/aduf/telegram-connection-panel";
import { useAduf } from "@/store/aduf-store";
import { useAuth } from "@/store/auth-store";
import { checkIsAdminFn } from "@/lib/server-fns";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — ADUF AI" },
      {
        name: "description",
        content: "Your profile, plan, connected apps, safety rules and privacy in one place.",
      },
      { property: "og:title", content: "Settings — ADUF AI" },
      {
        property: "og:description",
        content: "Control how much ADUF can act on its own, and what it is connected to.",
      },
    ],
  }),
  component: SettingsPage,
});

const CONNECTOR_ERROR_COPY: Record<string, string> = {
  not_configured: "This integration isn't set up yet — add its API app credentials on the server.",
  not_oauth: "This integration connects with an API key, not a redirect — use the form below.",
  backend_not_configured:
    "No backend is connected yet, so ADUF can't securely store this connection.",
  missing_shop: "Enter your shop domain to connect Shopify.",
  invalid_shop: "That doesn't look like a Shopify store domain (e.g. my-store.myshopify.com).",
  invalid_signature: "Shopify's response couldn't be verified — try connecting again.",
  invalid_state: "That connection attempt expired or wasn't recognised — try again.",
  expired_state: "That connection attempt expired — try again.",
  provider_denied: "The connection was cancelled.",
  token_exchange_failed: "The provider rejected that connection — try again.",
  storage_failed: "Connected, but ADUF couldn't save it — try again.",
  server_error: "Something went wrong starting that connection — try again.",
  unknown_provider: "Unknown integration.",
};

type TabId = "plan" | "connections" | "safety" | "privacy" | "admin";
const TABS: { id: TabId; label: string; icon: LucideIcon; adminOnly?: true }[] = [
  { id: "plan", label: "Plan & credits", icon: BadgeCheck },
  { id: "connections", label: "Connections", icon: Plug },
  { id: "safety", label: "Safety", icon: ShieldCheck },
  { id: "privacy", label: "Data & privacy", icon: Lock },
  { id: "admin", label: "Workspace admin", icon: KeyRound, adminOnly: true },
];

function tabFromLocation(): TabId {
  if (typeof window === "undefined") return "plan";
  const q = new URLSearchParams(window.location.search);
  // Coming back from a connector sign-in, or a deep link to the Telegram box.
  if (q.get("connected") || q.get("connectorError") || window.location.hash === "#telegram-panel")
    return "connections";
  const h = window.location.hash.slice(1);
  return TABS.some((t) => t.id === h) ? (h as TabId) : "plan";
}

function SettingsPage() {
  const { setSourceConnected } = useAduf();
  const { accessToken, status, user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [tab, setTab] = useState<TabId>("plan");
  const [banner, setBanner] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  useEffect(() => setTab(tabFromLocation()), []);

  function pick(id: TabId) {
    setTab(id);
    window.history.replaceState({}, "", `${window.location.pathname}#${id}`);
  }

  // The Admin tab only shows for people on the server-side admin allowlist (the /admin route and every
  // admin call re-check on the server; hiding the tab just avoids a dead end for everyone else).
  useEffect(() => {
    if (status !== "signed-in" || !accessToken) {
      setIsAdmin(false);
      return;
    }
    checkIsAdminFn({ data: { accessToken } })
      .then((res) => setIsAdmin(res.isAdmin))
      .catch(() => setIsAdmin(false));
  }, [status, accessToken]);

  // Surface the redirect back from /api/connectors/:provider/callback.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("connected");
    const error = params.get("connectorError");
    const provider = params.get("provider");
    if (connected) {
      setSourceConnected(connected, true);
      setBanner({ kind: "success", text: `${provider ?? connected} connected.` });
    } else if (error) {
      setBanner({
        kind: "error",
        text: CONNECTOR_ERROR_COPY[error] ?? "That connection didn't go through.",
      });
    }
    // Opened from the chat's connector panel as a popup: tell the opener, then close.
    if ((connected || error) && window.opener && window.opener !== window) {
      window.opener.postMessage(
        { type: "aduf-connector", id: connected, error },
        window.location.origin,
      );
      window.close();
      return;
    }
    if (connected || error) {
      window.history.replaceState({}, "", `${window.location.pathname}#connections`);
    }
  }, [setSourceConnected]);

  const tabs = TABS.filter((t) => !t.adminOnly || isAdmin);
  const active = tabs.some((t) => t.id === tab) ? tab : "plan";

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-5xl px-4 pt-4 pb-24 lg:px-8 lg:py-10">
        <PageHeader eyebrow="Settings" title="Settings" />

        {/* The profile is its own page; this card is the way in (most visible on a phone). */}
        {status === "signed-in" ? (
          <Link
            to="/profile"
            className="mb-8 block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan lg:max-w-xl"
          >
            <GlassCard className="flex items-center gap-4 rounded-2xl p-4">
              <span
                className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-lg font-semibold text-background"
                style={{ background: "var(--gradient-accent)" }}
                aria-hidden
              >
                {(user?.name || user?.email || "?").slice(0, 1).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">
                  {user?.name || "Your profile"}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {user?.email ?? "View your profile"}
                </span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            </GlassCard>
          </Link>
        ) : null}

        <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[210px_minmax(0,1fr)] lg:gap-14">
          <nav aria-label="Settings sections" className="min-w-0 lg:sticky lg:top-8 lg:self-start">
            <ul className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0">
              {tabs.map(({ id, label, icon: Icon }) => (
                <li key={id} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => pick(id)}
                    aria-current={active === id ? "page" : undefined}
                    className={cn(
                      "flex w-full items-center gap-2.5 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-cyan",
                      active === id
                        ? "bg-white/10 font-medium text-foreground"
                        : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden />
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <div className="min-w-0 w-full max-w-2xl [&_*]:min-w-0">
            {banner ? (
              <GlassCard
                hover={false}
                className={`mb-6 rounded-2xl p-4 text-sm ${banner.kind === "success" ? "text-cyan" : "text-amber-400"}`}
              >
                {banner.text}
              </GlassCard>
            ) : null}

            {active === "plan" ? <PlanSummaryCard /> : null}

            {active === "connections" ? (
              <div className="space-y-6">
                <Link
                  to="/connectors"
                  className="block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan"
                >
                  <GlassCard className="flex items-center gap-4 rounded-2xl p-4">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/10">
                      <Plug className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">Connect your apps</p>
                      <p className="text-xs text-muted-foreground">
                        Browse hundreds of apps, sign in once and let ADUF use them.
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-foreground px-4 py-1.5 text-xs font-medium text-background">
                      Open
                    </span>
                  </GlassCard>
                </Link>
                <N8nConnectionPanel />
                {isAdmin ? (
                  <div id="telegram-panel">
                    <TelegramConnectionPanel
                      onChange={(connected) => setSourceConnected("telegram", connected)}
                    />
                  </div>
                ) : null}
              </div>
            ) : null}

            {active === "safety" ? <SafetyPanel /> : null}

            {active === "privacy" ? <DataPrivacyPanel /> : null}

            {active === "admin" && isAdmin ? (
              <div className="space-y-6">
                <Link to="/admin" className="block">
                  <GlassCard className="flex items-center gap-3 rounded-2xl p-4">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-cyan/15 text-cyan">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">Admin Panel</p>
                      <p className="text-xs text-muted-foreground">
                        Users, admins, billing and workspace-wide stats
                      </p>
                    </div>
                  </GlassCard>
                </Link>
                <ModelKeysPanel />
                <SkillsPanel />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
