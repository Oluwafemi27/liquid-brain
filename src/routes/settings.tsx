import { PlanSummaryCard } from "@/components/aduf/plan-summary";
import { DataPrivacyPanel } from "@/components/aduf/data-privacy-panel";
import { IntegrationAccess } from "@/components/aduf/integration-access";
import { SafetyPanel } from "@/components/aduf/safety-panel";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { BadgeCheck, Bell, Blocks, LogOut, Plug, ShieldCheck, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell, PageHeader } from "@/components/aduf/app-shell";
import { GlassCard } from "@/components/aduf/liquid";
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
      { title: "Settings & Integrations — ADUF AI" },
      {
        name: "description",
        content:
          "Manage your ADUF profile, autonomy level and connected integrations — commerce, payments, ads and messaging in one place.",
      },
      { property: "og:title", content: "Settings & Integrations — ADUF AI" },
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

function SettingsPage() {
  const {
    sources,
    connectorsConfigured: configured,
    setSourceConnected,
    userName,
    setUserName,
  } = useAduf();
  const { accessToken, status, signOut } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [banner, setBanner] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  // Only shows the Admin Panel link if this signed-in user is actually on
  // the server-side admin allowlist — the link's absence isn't security by
  // itself (the /admin route re-checks server-side too), just avoids
  // showing a dead end to everyone else.
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
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [setSourceConnected]);

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-md px-4 pt-4 pb-24 lg:max-w-[1500px] lg:px-6 lg:py-8">
        <PageHeader eyebrow="Settings" title="You & your stack" />

        {isAdmin ? (
          <Link to="/admin" className="mb-4 block">
            <GlassCard className="flex items-center gap-3 p-4">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-cyan/15 text-cyan">
                <ShieldCheck className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium">Admin Panel</p>
                <p className="text-xs text-muted-foreground">
                  Manage users, admins, and workspace-wide stats
                </p>
              </div>
            </GlassCard>
          </Link>
        ) : null}

        <Link
          to="/connectors"
          className="mb-4 block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan"
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
              Open connectors
            </span>
          </GlassCard>
        </Link>

        {banner ? (
          <GlassCard
            hover={false}
            className={`mb-4 min-h-16 rounded-2xl p-4 text-sm ${banner.kind === "success" ? "text-cyan" : "text-amber-400"}`}
          >
            {banner.text}
          </GlassCard>
        ) : null}

        <div className="grid gap-4 sm:gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div className="space-y-4">
            <GlassCard hover={false} className="min-h-16 rounded-2xl p-4 text-center sm:p-5">
              <div
                className="mx-auto grid h-12 w-12 place-items-center rounded-full sm:h-16 sm:w-16"
                style={{ background: "var(--gradient-accent)" }}
              >
                <UserRound className="h-5 w-5 text-background sm:h-7 sm:w-7" />
              </div>
              <input
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Add your name"
                className="mt-3 w-full rounded-full bg-white/8 px-3 py-2 text-center text-base font-semibold outline-none placeholder:text-base placeholder:font-normal placeholder:text-muted-foreground/70 focus:ring-2 focus:ring-ring sm:text-lg"
              />
              <p className="mt-1 text-xs text-muted-foreground">Owner</p>
              {status === "signed-in" ? (
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-border py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-red-400/40 hover:bg-red-400/10 hover:text-red-400"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign out
                </button>
              ) : null}
            </GlassCard>

            {[
              { icon: ShieldCheck, label: "Autonomy", value: "Not set" },
              { icon: Bell, label: "Alerts", value: "Not set" },
              { icon: BadgeCheck, label: "Plan", value: "Free" },
            ].map(({ icon: Icon, label, value }, i) => (
              <GlassCard
                key={label}
                delay={i * 0.05}
                className="flex min-h-16 items-center gap-3 rounded-2xl p-4"
              >
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/10">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
                  <p className="truncate text-sm">{value}</p>
                </div>
              </GlassCard>
            ))}
          </div>

          <div className="min-w-0 space-y-5 sm:space-y-8">
            <div>
              <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                <Blocks className="h-4 w-4" /> Connections
              </h2>
              <N8nConnectionPanel />
              {isAdmin ? (
                <div id="telegram-panel" className="mt-4">
                  <TelegramConnectionPanel
                    onChange={(connected) => setSourceConnected("telegram", connected)}
                  />
                </div>
              ) : null}
            </div>

            <PlanSummaryCard />
            <SafetyPanel />
            {isAdmin ? <ModelKeysPanel /> : null}
            {isAdmin ? <SkillsPanel /> : null}
            <DataPrivacyPanel />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
