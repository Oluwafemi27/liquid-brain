import { createFileRoute } from "@tanstack/react-router";
import { Database, Network, Plus } from "lucide-react";
import { useState } from "react";
import { AppShell, PageHeader } from "@/components/aduf/app-shell";
import { GlassCard } from "@/components/aduf/liquid";
import { MemoryGlobe } from "@/components/aduf/memory-globe";
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
  const { sources, connectSource, memoryNodes, memoryEdges } = useAduf();
  const [focus, setFocus] = useState<string | null>(null);
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

          <div className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Data Sources
            </h2>
            {sources.map((s, i) => (
              <GlassCard key={s.id} delay={i * 0.05} className="flex items-center gap-3 p-4">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10">
                  <Database className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{s.name}</p>
                  <p className="text-[11px] text-muted-foreground">{s.category}</p>
                </div>
                {s.connected ? (
                  <span className="shrink-0 rounded-full bg-white/10 px-3 py-1.5 text-[11px]">
                    Synced
                  </span>
                ) : (
                  <button
                    onClick={() => connectSource(s.id)}
                    className="shrink-0 rounded-full px-3.5 py-1.5 text-[11px] font-medium text-background"
                    style={{ background: "var(--gradient-accent)" }}
                  >
                    Connect
                  </button>
                )}
              </GlassCard>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
