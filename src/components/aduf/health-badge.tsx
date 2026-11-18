import type { HealthState } from "@/lib/aduf-types";

const STYLE: Record<HealthState, { cls: string; label: string }> = {
  live: { cls: "bg-emerald-400/15 text-emerald-300", label: "Live" },
  delayed: { cls: "bg-amber-400/15 text-amber-300", label: "Delayed" },
  broken: { cls: "bg-red-400/15 text-red-300", label: "Broken" },
  off: { cls: "bg-zinc-400/15 text-zinc-300", label: "Not connected" },
};

/** Live / delayed / broken — always a word as well as a colour. */
export function HealthBadge({ state }: { state: HealthState }) {
  const s = STYLE[state];
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${s.cls}`}>{s.label}</span>
  );
}
