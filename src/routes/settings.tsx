import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { BadgeCheck, Bell, Blocks, ShieldCheck, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell, PageHeader } from "@/components/aduf/app-shell";
import { GlassCard } from "@/components/aduf/liquid";
import { ModelKeysPanel } from "@/components/aduf/model-keys-panel";
import { SkillsPanel } from "@/components/aduf/skills-panel";
import { useAduf } from "@/store/aduf-store";
import { fetchConnectorStatuses } from "@/lib/server-fns";

/** Providers with a real OAuth redirect flow (see src/lib/server/oauth-providers.ts).
 *  Everything else (currently just Paystack, which is key-based) keeps the
 *  local demo "pour" animation until a real key-entry flow is built. */
const OAUTH_SOURCE_IDS = new Set(["shopify", "ga", "meta", "whatsapp", "sheets"]);

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
  invalid_state: "That connection attempt expired or wasn't recognised — try again.",
  expired_state: "That connection attempt expired — try again.",
  provider_denied: "The connection was cancelled.",
  token_exchange_failed: "The provider rejected that connection — try again.",
  storage_failed: "Connected, but ADUF couldn't save it — try again.",
  server_error: "Something went wrong starting that connection — try again.",
  unknown_provider: "Unknown integration.",
};

function SettingsPage() {
  const { sources, connectSource, setSourceConnected, userName, setUserName } = useAduf();
  const [pouring, setPouring] = useState<string | null>(null);
  const [configured, setConfigured] = useState<Record<string, boolean>>({});
  const [banner, setBanner] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  // Pull real connection state + which providers have OAuth apps registered.
  useEffect(() => {
    fetchConnectorStatuses()
      .then((statuses) => {
        setConfigured(
          Object.fromEntries(Object.entries(statuses).map(([id, s]) => [id, s.configured])),
        );
        for (const [id, status] of Object.entries(statuses)) {
          setSourceConnected(id, status.connected);
        }
      })
      .catch(() => {
        // No backend yet — sources stay whatever the local mock state says.
      });
  }, [setSourceConnected]);

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
    if (connected || error) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [setSourceConnected]);

  const connect = (id: string) => {
    if (OAUTH_SOURCE_IDS.has(id) && configured[id]) {
      if (id === "shopify") {
        const shop = window.prompt("Your Shopify store domain (e.g. my-store):");
        if (!shop) return;
        window.location.href = `/api/connectors/shopify/authorize?shop=${encodeURIComponent(shop)}`;
        return;
      }
      window.location.href = `/api/connectors/${id}/authorize`;
      return;
    }
    // Not yet configured with real OAuth app credentials, or a key-based
    // provider (Paystack) — fall back to the local demo connect.
    setPouring(id);
    setTimeout(() => {
      connectSource(id);
      setPouring(null);
    }, 1200);
  };

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-md px-4 pt-4 pb-24 lg:max-w-[1500px] lg:px-6 lg:py-8">
        <PageHeader eyebrow="Settings" title="You & your stack" />

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
                <Blocks className="h-4 w-4" /> Integrations
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {sources.map((s, i) => (
                  <GlassCard
                    key={s.id}
                    delay={i * 0.05}
                    className="relative min-h-16 rounded-2xl p-4"
                  >
                    <AnimatePresence>
                      {pouring === s.id ? (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: "100%" }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 1.1, ease: [0.2, 0.8, 0.2, 1] }}
                          className="water-surface pointer-events-none absolute inset-x-0 bottom-0"
                        />
                      ) : null}
                    </AnimatePresence>
                    <div className="relative">
                      <p className="text-xl font-semibold">{s.name}</p>
                      <p className="mt-0.5 text-sm text-gray-400">{s.category}</p>
                      <button
                        onClick={() => !s.connected && connect(s.id)}
                        disabled={s.connected || pouring === s.id}
                        className="mt-4 w-full rounded-full px-4 py-2 text-xs font-medium"
                        style={
                          s.connected
                            ? { border: "1px solid var(--border)" }
                            : {
                                background: "var(--gradient-accent)",
                                color: "var(--background)",
                              }
                        }
                      >
                        {s.connected ? "Connected" : pouring === s.id ? "Pouring…" : "Connect"}
                      </button>
                    </div>
                  </GlassCard>
                ))}
              </div>
            </div>

            <ModelKeysPanel />
            <SkillsPanel />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
