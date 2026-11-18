import { _resetRateLimits, checkRateLimit, tooManyRequests, withRateLimit } from "@/lib/server/rate-limit";
import { resilientFetch } from "@/lib/server/resilient-fetch";
import { jitteredInterval } from "@/hooks/use-live-refresh";

const ok = (c: unknown, m: string) => { if (!c) { console.error("FAIL", m); process.exit(1); } console.log("ok  ", m); };

(async () => {
  // ---- rate limiter ----
  _resetRateLimits();
  const cfg = { limit: 3, windowMs: 1000, maxConcurrent: 2 };
  const a = checkRateLimit("u1", cfg, 0);
  const b = checkRateLimit("u1", cfg, 10);
  ok(a.ok && b.ok, "first two requests pass");
  const c = checkRateLimit("u1", cfg, 20);
  ok(!c.ok, "a third at the same time is refused by the concurrency cap");
  a.release(); a.release(); // releasing twice must not free two slots
  const d = checkRateLimit("u1", cfg, 30);
  ok(d.ok, "a slot opens when one request finishes");
  b.release(); d.release();
  const e = checkRateLimit("u1", cfg, 40);
  ok(!e.ok && e.retryAfter >= 1, "the 4th request inside the window is refused with a retry time");
  ok(checkRateLimit("u1", cfg, 1100).ok, "the window slides: allowed again a second later");
  ok(checkRateLimit("u2", cfg, 40).ok, "another person is unaffected");
  const r = tooManyRequests(7);
  ok(r.status === 429 && r.headers.get("retry-after") === "7", "429 response carries Retry-After");

  _resetRateLimits();
  let ran = 0;
  const cfg2 = { limit: 2, windowMs: 60_000 };
  const res1 = await withRateLimit("k", cfg2, async () => { ran++; return new Response("a"); });
  await withRateLimit("k", cfg2, async () => { ran++; return new Response("b"); });
  const res3 = await withRateLimit("k", cfg2, async () => { ran++; return new Response("c"); });
  ok(res1.status === 200 && res3.status === 429 && ran === 2, "withRateLimit runs the first two and blocks the third");
  _resetRateLimits();
  await withRateLimit("boom", { limit: 5, windowMs: 1000, maxConcurrent: 1 }, async () => { throw new Error("x"); }).catch(() => undefined);
  ok(checkRateLimit("boom", { limit: 5, windowMs: 1000, maxConcurrent: 1 }).ok, "a failing request still frees its slot");

  // many people at once stay independent and bounded
  _resetRateLimits();
  let allowed = 0;
  for (let u = 0; u < 500; u++) for (let i = 0; i < 25; i++) if (checkRateLimit(`user${u}`, { limit: 20, windowMs: 60_000 }, 5).ok) allowed++;
  ok(allowed === 500 * 20, "500 people each get exactly their own 20 requests a minute");

  // ---- resilient fetch ----
  const sleeps: number[] = [];
  const sleep = async (ms: number) => { sleeps.push(ms); };
  let calls = 0;
  const flaky = (async () => { calls++; return calls < 3 ? new Response("busy", { status: 429, headers: { "retry-after": "1" } }) : new Response("fine", { status: 200 }); }) as unknown as typeof fetch;
  const got = await resilientFetch("https://x.test", {}, { fetchImpl: flaky, sleep });
  ok(got.status === 200 && calls === 3, "429 is retried and the third try succeeds");
  ok(sleeps.length === 2 && sleeps.every((s) => s >= 1000 && s < 1300), "waits follow Retry-After with a little jitter");

  calls = 0;
  const bad = (async () => { calls++; return new Response("no", { status: 400 }); }) as unknown as typeof fetch;
  const r400 = await resilientFetch("https://x.test", {}, { fetchImpl: bad, sleep });
  ok(r400.status === 400 && calls === 1, "a 400 is returned straight away, not retried");

  calls = 0;
  const down = (async () => { calls++; throw new Error("network down"); }) as unknown as typeof fetch;
  let threw = false;
  try { await resilientFetch("https://x.test", {}, { fetchImpl: down, sleep, retries: 2 }); } catch { threw = true; }
  ok(threw && calls === 3, "network errors are retried, then surfaced");

  calls = 0;
  const always503 = (async () => { calls++; return new Response("x", { status: 503 }); }) as unknown as typeof fetch;
  const last = await resilientFetch("https://x.test", {}, { fetchImpl: always503, sleep, retries: 1 });
  ok(last.status === 503 && calls === 2, "after the last retry the provider's own error is returned");

  // ---- polling jitter ----
  const lo = jitteredInterval(60_000, () => 0), hi = jitteredInterval(60_000, () => 0.999);
  ok(lo === 48_000 && hi >= 71_900 && hi <= 72_000, "poll interval varies by plus or minus 20%");
  const spread = new Set(Array.from({ length: 200 }, () => jitteredInterval(60_000))).size;
  ok(spread > 100, "real jitter spreads 200 tabs across many different moments");

  console.log("done");
})();
