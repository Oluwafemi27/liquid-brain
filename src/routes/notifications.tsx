import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence } from "framer-motion";
import { BellOff, CheckCheck } from "lucide-react";
import { AppShell, PageHeader } from "@/components/aduf/app-shell";
import { GlassCard } from "@/components/aduf/liquid";
import { InsightRow } from "@/components/aduf/insight-feed";
import { useAduf } from "@/store/aduf-store";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — ADUF AI" },
      {
        name: "description",
        content:
          "Every insight ADUF has surfaced — goals hit, automations toggled, sources connected — in one feed.",
      },
      { property: "og:title", content: "Notifications — ADUF AI" },
      {
        property: "og:description",
        content: "The full history of what your business brain has noticed.",
      },
    ],
  }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { insights, markInsightRead, markAllInsightsRead, dismissInsight } = useAduf();
  const unread = insights.filter((i) => !i.read).length;

  return (
    <AppShell>
      <div className="mx-auto max-w-[820px] px-4 py-6 sm:px-6 lg:py-8">
        <PageHeader eyebrow="Signals" title="Notifications">
          {insights.length > 0 && unread > 0 ? (
            <button
              onClick={markAllInsightsRead}
              className="flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs text-muted-foreground hover:bg-white/8 hover:text-foreground"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </button>
          ) : null}
        </PageHeader>

        <GlassCard hover={false} className="p-3 sm:p-4">
          {insights.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <BellOff className="h-6 w-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">You're all caught up.</p>
              <p className="max-w-xs text-xs text-muted-foreground/70">
                Toggle an automation, set a goal, or connect a data source and ADUF will start
                logging what happens here.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <AnimatePresence initial={false}>
                {insights.map((insight) => (
                  <InsightRow
                    key={insight.id}
                    insight={insight}
                    onRead={markInsightRead}
                    onDismiss={dismissInsight}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </GlassCard>
      </div>
    </AppShell>
  );
}
