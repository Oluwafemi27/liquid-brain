import { createFileRoute } from "@tanstack/react-router";
import { Network, Plus } from "lucide-react";
import { useState } from "react";
import { AppShell, PageHeader } from "@/components/aduf/app-shell";
import { GlassCard } from "@/components/aduf/liquid";
import { ConnectorPicker } from "@/components/aduf/connector-picker";
import { MemoryGlobe } from "@/components/aduf/memory-globe";
import { SourceExplorer } from "@/components/aduf/source-explorer";
import { useAduf } from "@/store/aduf-store";

export const Route = createFileRoute("/memory")({
  head: () => ({
    meta: [
      { title: "Business Memory — ADUF AI" },
      {
        name: "description",
        content:
          "See everything ADUF knows about your business as a living knowledge graph of customers, products, revenue and traffic.",
      },
      { property: "og:title", content: "Business Memory — ADUF AI" },
      {
        property: "og:description",
        content: "A living knowledge graph of every fact ADUF has learned about your business.",
      },
    ],
  }),
  component: MemoryPage,
});

function MemoryPage() {
  const { memoryNodes, memoryEdges } = useAduf();
  const [focus, setFocus] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const nodes = memoryNodes;
  // The core "ADUF" node and the orbiting rings are the globe itself — they
  // stay on screen regardless of data. "Satellites" are the real data
  // clusters (customers/products/revenue/traffic); only they disappear
  // when there's nothing to show yet.
  const satellites = nodes.filter((n) => n.group !== "core");
  const hasData = satellites.length > 0;
  const active = nodes.find((n) => n.id === focus) ?? null;
  return (
    <AppShell>
      <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:py-8">
        <PageHeader eyebrow="Business Memory" title="What ADUF knows">
          <button
            onClick={() => setPickerOpen(true)}
            className="flex items-center gap-1.5 rounded-full px-4 py-2.5 text-xs font-medium text-background transition-transform hover:scale-[1.03]"
            style={{ background: "var(--gradient-accent)" }}
          >
            <Plus className="h-4 w-4" /> Connect New Data Source
          </button>
        </PageHeader>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <GlassCard hover={false} className="min-w-0 p-4 sm:p-6">
            <MemoryGlobe nodes={nodes} edges={memoryEdges} focus={focus} onFocus={setFocus} />
            <p className="mt-3 text-center text-xs text-muted-foreground">
              {hasData ? (
                active ? (
                  `${active.label} — ${active.facts.toLocaleString()} facts learned, linked to ${
                    memoryEdges.filter((e) => e.from === active.id || e.to === active.id).length
                  } clusters`
                ) : (
                  "Tap any node to inspect the cluster"
                )
              ) : (
                <span className="inline-flex items-center gap-1.5">
                  <Network className="h-3 w-3" /> No memory yet — connect a data source or start
                  using ADUF and clusters will appear here live.
                </span>
              )}
            </p>
          </GlassCard>

          <SourceExplorer />
        </div>
      </div>
      <ConnectorPicker open={pickerOpen} onOpenChange={setPickerOpen} />
    </AppShell>
  );
}
