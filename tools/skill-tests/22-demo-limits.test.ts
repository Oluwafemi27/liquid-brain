import { buildNotices, minutesUntil, untilText } from "@/lib/usage-notices";
import type { UsageSnapshot } from "@/lib/billing-types";

const ok = (c: unknown, m: string) => {
  if (!c) {
    console.error("FAIL", m);
    process.exit(1);
  }
  console.log("ok  ", m);
};

const NOW = Date.parse("2026-11-18T12:00:00Z");
const iso = (mins: number) => new Date(NOW + mins * 60_000).toISOString();
const base = (over: Partial<UsageSnapshot> = {}): UsageSnapshot => ({
  planId: "pro",
  planName: "Pro",
  credits: { used: 10, limit: 100, bonus: 0, remaining: 90 },
  term: { start: iso(-1000), end: iso(60 * 24 * 10), daysLeft: 10, kind: "month" },
  hour: { used: 0, limit: 10, resetsAt: iso(30) },
  day: { used: 0, limit: 50, resetsAt: iso(600) },
  hitsThisTerm: 10,
  sessionsThisTerm: 3,
  ...over,
});

async function main() {
  ok(buildNotices(base(), NOW).length === 0, "no notices when well under every limit");

  const warn = buildNotices(base({ hour: { used: 8, limit: 10, resetsAt: iso(30) } }), NOW);
  ok(warn.length === 1 && warn[0]!.level === "warning", "warns at 80% of the hourly hit limit");

  const blocked = buildNotices(base({ hour: { used: 10, limit: 10, resetsAt: iso(30) } }), NOW);
  ok(blocked[0]!.level === "blocked" && blocked[0]!.id === "hit-hour-blocked", "blocks at 100%");

  ok(
    buildNotices(base({ hour: { used: 5, limit: 0, resetsAt: iso(30) } }), NOW).length === 0,
    "limit 0 means no cap and no notice",
  );

  const lowCredits = buildNotices(
    base({ credits: { used: 85, limit: 100, bonus: 0, remaining: 15 } }),
    NOW,
  );
  ok(lowCredits[0]!.id === "credits-warn", "warns when credits run low");
  const noCredits = buildNotices(
    base({ credits: { used: 100, limit: 100, bonus: 0, remaining: 0 } }),
    NOW,
  );
  ok(
    noCredits[0]!.id === "credits-blocked" && noCredits[0]!.cta === "topup",
    "credits out → top up",
  );
  ok(
    buildNotices(base({ credits: { used: 100, limit: 100, bonus: 20, remaining: 0 } }), NOW).every(
      (n) => n.id !== "credits-blocked",
    ),
    "bonus credits keep the person unblocked",
  );

  const demo = base({
    planId: "demo",
    planName: "Demo",
    term: { start: iso(-1380), end: iso(45), daysLeft: 0, kind: "demo" },
  });
  const d = buildNotices(demo, NOW);
  ok(
    d.some((n) => n.id === "demo-ending" && n.cta === "signin"),
    "demo shows when it is ending",
  );
  ok(
    buildNotices({ ...demo, term: { ...demo.term, end: iso(600) } }, NOW).length === 0,
    "no ending notice while the demo has hours left",
  );
  const demoBlocked = buildNotices(
    { ...demo, hour: { used: 6, limit: 6, resetsAt: iso(20) } },
    NOW,
  );
  ok(demoBlocked[0]!.cta === "signin", "demo limit points to Google sign-in, not upgrade");

  const many = buildNotices(
    base({
      credits: { used: 100, limit: 100, bonus: 0, remaining: 0 },
      hour: { used: 10, limit: 10, resetsAt: iso(30) },
      day: { used: 50, limit: 50, resetsAt: iso(600) },
      term: { start: iso(-1000), end: iso(45), daysLeft: 0, kind: "demo" },
    }),
    NOW,
  );
  ok(many.length <= 3, "never more than three notices");
  ok(many[0]!.level === "blocked", "most serious first");

  ok(minutesUntil(iso(-5), NOW) === 0, "minutesUntil never goes negative");
  ok(untilText(iso(45), NOW) === "45 min", "untilText minutes");
  ok(untilText(iso(150), NOW) === "2 h 30 min", "untilText hours");

  console.log("done");
}
main();
