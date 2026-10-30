import { useState } from "react";
import { ActivityFeed } from "@/components/aduf/activity-feed";
import { GlassCard } from "@/components/aduf/liquid";
import { PLATFORM_NAMES } from "@/lib/permissions-catalog";
import { useAduf } from "@/store/aduf-store";

const selectClass =
  "rounded-xl border border-white/10 bg-white/6 px-3 py-2 text-xs text-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring";

/** One readable log of what happened on every platform you've connected, plus what ADUF did. */
export function ActivityLogSection() {
  const sources = useAduf((s) => s.sources);
  const [platform, setPlatform] = useState("all");
  const [status, setStatus] = useState("all");
  const ids = [...new Set([...sources.filter((s) => s.connected).map((s) => s.id), "csv", "aduf"])];

  return (
    <GlassCard hover={false} className="mt-6">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Activity log</h2>
          <p className="text-xs text-muted-foreground">
            Everything that happened on your connected platforms and everything ADUF did, suggested
            or declined.
          </p>
        </div>
        <div className="flex gap-2">
          <select
            aria-label="Filter by platform"
            className={selectClass}
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
          >
            <option value="all">All platforms</option>
            {ids.map((id) => (
              <option key={id} value={id}>
                {PLATFORM_NAMES[id] ?? id}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter by outcome"
            className={selectClass}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">Everything</option>
            <option value="ok">Worked</option>
            <option value="warn">Needs attention</option>
            <option value="error">Problems</option>
          </select>
        </div>
      </div>
      <ActivityFeed platform={platform} status={status} limit={20} />
    </GlassCard>
  );
}
