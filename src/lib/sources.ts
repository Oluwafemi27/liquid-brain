import type { SourceRef, SourceState } from "@/lib/aduf-types";

/** Freshness of a piece of data: missing (never), stale (older than `staleAfterDays`) or fresh. */
export function sourceState(
  asOf: string | null,
  staleAfterDays: number,
  now: Date = new Date(),
): SourceState {
  if (!asOf) return "missing";
  const age = now.getTime() - new Date(asOf).getTime();
  return age > staleAfterDays * 86_400_000 ? "stale" : "fresh";
}

export function makeSource(
  label: string,
  href: string,
  asOf: string | null,
  staleAfterDays: number,
  note?: string,
  now: Date = new Date(),
): SourceRef {
  return {
    label,
    href,
    asOf,
    state: sourceState(asOf, staleAfterDays, now),
    ...(note ? { note } : {}),
  };
}

/** "3 days ago" / "today" — plain-language age for UI and messages. */
export function ageLabel(iso: string | null, now: Date = new Date()): string {
  if (!iso) return "never";
  const mins = Math.round((now.getTime() - new Date(iso).getTime()) / 60_000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}
