import { WARN_AT, type HitWindow, type LimitNotice, type UsageSnapshot } from "@/lib/billing-types";

type Basis = Pick<UsageSnapshot, "planId" | "planName" | "credits" | "term" | "hour" | "day">;

const clock = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

/** Whole minutes from `now` until `iso`, never negative. */
export const minutesUntil = (iso: string, now = Date.now()) =>
  Math.max(0, Math.ceil((new Date(iso).getTime() - now) / 60_000));

export function untilText(iso: string, now = Date.now()): string {
  const m = minutesUntil(iso, now);
  if (m < 60) return `${Math.max(1, m)} min`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h} h ${m % 60 ? `${m % 60} min` : ""}`.trim() : `${Math.round(h / 24)} days`;
}

function windowNotice(
  w: HitWindow,
  scope: "hour" | "day",
  planId: string,
  planName: string,
): LimitNotice | null {
  if (w.limit <= 0) return null;
  const used = Math.min(w.used, w.limit);
  const label = scope === "hour" ? "this hour" : "today";
  const cta = planId === "demo" ? "signin" : "upgrade";
  if (used >= w.limit) {
    return {
      id: `hit-${scope}-blocked`,
      level: "blocked",
      title: `You've reached the limit ${label}`,
      body:
        `${planName} allows ${w.limit} AI ${w.limit === 1 ? "reply" : "replies"} ${scope === "hour" ? "an hour" : "a day"}. ` +
        `You can send another at ${clock(w.resetsAt)}.`,
      resetsAt: w.resetsAt,
      cta,
    };
  }
  if (used / w.limit >= WARN_AT) {
    const left = w.limit - used;
    return {
      id: `hit-${scope}-warn`,
      level: "warning",
      title: `${left} ${left === 1 ? "reply" : "replies"} left ${label}`,
      body: `${planName} allows ${w.limit} ${scope === "hour" ? "an hour" : "a day"}. The count resets at ${clock(w.resetsAt)}.`,
      resetsAt: w.resetsAt,
      cta,
    };
  }
  return null;
}

/** What to tell the person about their limits right now. Most serious first, at most three, so the
 *  screen never fills with banners. Pure: the server builds it, tests exercise it directly. */
export function buildNotices(b: Basis, now = Date.now()): LimitNotice[] {
  const out: LimitNotice[] = [];
  const { credits } = b;
  const total = credits.limit + credits.bonus;
  const left = credits.remaining + credits.bonus;

  if (total > 0 && left <= 0) {
    out.push({
      id: "credits-blocked",
      level: "blocked",
      title: b.planId === "demo" ? "The demo credits are used up" : "You're out of credits",
      body:
        b.planId === "demo"
          ? "Sign in with Google to keep going with your own credits."
          : `Your ${b.planName} credits come back on ${new Date(b.term.end).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}. Top up or upgrade to keep going now.`,
      resetsAt: b.term.end,
      cta: b.planId === "demo" ? "signin" : "topup",
    });
  } else if (total > 0 && left / total <= 1 - WARN_AT) {
    out.push({
      id: "credits-warn",
      level: "warning",
      title: `${left} ${left === 1 ? "credit" : "credits"} left`,
      body:
        b.planId === "demo"
          ? "Sign in with Google for your own monthly credits."
          : `That's ${Math.round((left / total) * 100)}% of your ${b.planName} allowance, renewing ${new Date(b.term.end).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}.`,
      resetsAt: b.term.end,
      cta: b.planId === "demo" ? "signin" : "topup",
    });
  }

  for (const n of [
    windowNotice(b.hour, "hour", b.planId, b.planName),
    windowNotice(b.day, "day", b.planId, b.planName),
  ])
    if (n) out.push(n);

  if (b.term.kind === "demo" && minutesUntil(b.term.end, now) <= 120) {
    out.push({
      id: "demo-ending",
      level: "info",
      title: `This demo ends in ${untilText(b.term.end, now)}`,
      body: "Everything from this visit is deleted when it ends. Sign in with Google to keep your work.",
      resetsAt: b.term.end,
      cta: "signin",
    });
  }

  const rank = { blocked: 0, warning: 1, info: 2 } as const;
  return out.sort((a, c) => rank[a.level] - rank[c.level]).slice(0, 3);
}
