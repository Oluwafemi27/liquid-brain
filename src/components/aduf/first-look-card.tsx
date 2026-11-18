import { SourcesRow } from "@/components/aduf/action-card";
import { GlassCard } from "@/components/aduf/liquid";
import { firstInsights } from "@/lib/first-insight";
import { useAduf } from "@/store/aduf-store";

/** Plain-language read of the data just imported — the fast first value after connecting one source. */
export function FirstLookCard() {
  const meta = useAduf((s) => s.businessMeta);
  const series = useAduf((s) => s.series);
  const channelRevenue = useAduf((s) => s.channelRevenue);
  const topCustomers = useAduf((s) => s.topCustomers);
  if (!meta || meta.imports.length === 0) return null;
  const insights = firstInsights({ series, channelRevenue, topCustomers, ...meta });
  if (insights.length === 0) return null;
  return (
    <GlassCard hover={false} className="mb-6">
      <h2 className="text-base font-semibold">What your data says</h2>
      <p className="mb-3 text-xs text-muted-foreground">
        Worked out from what you imported — nothing guessed.
      </p>
      <ul className="space-y-3">
        {insights.map((i) => (
          <li key={i.id} className="text-sm">
            {i.text} <span className="text-xs text-muted-foreground">{i.basis}</span>
            <SourcesRow sources={[i.source]} />
          </li>
        ))}
      </ul>
    </GlassCard>
  );
}
