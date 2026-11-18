import { creditsFor, DEFAULT_TOKENS_PER_CREDIT } from "@/lib/server/billing";
import { formatTokens } from "@/lib/billing-types";
import { DEFAULT_PLANS } from "@/lib/plan-defaults";

const ok = (c: unknown, m: string) => { if (!c) { console.error("FAIL", m); process.exit(1); } console.log("ok  ", m); };

ok(creditsFor(0, DEFAULT_TOKENS_PER_CREDIT) === 0, "nothing used costs nothing");
ok(creditsFor(1, DEFAULT_TOKENS_PER_CREDIT) === 1, "a tiny reply still costs 1 credit");
ok(creditsFor(12_000, 12_000) === 1, "exactly one credit's worth costs 1");
ok(creditsFor(12_001, 12_000) === 2, "anything over rounds up");
ok(creditsFor(30_000, 12_000) === 3, "a heavy reply costs more");
ok(creditsFor(5, 0) >= 1, "a bad ratio never divides by zero");
ok(formatTokens(160) === "160" && formatTokens(20) === "20", "credits show as plain numbers");
const monthly = Object.fromEntries(DEFAULT_PLANS.map((p) => [p.id, p.monthlyTokens]));
ok(monthly["free"] === 20 && monthly["starter"] === 40 && monthly["growth"] === 80 && monthly["scale"] === 160, "tiers are exactly 20, 40, 80 and 160");
