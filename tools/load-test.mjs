#!/usr/bin/env node
// Simulates many people using the app at once and reports how it held up.
//
//   node tools/load-test.mjs https://your-app.example.com --users 500 --seconds 60
//   node tools/load-test.mjs http://localhost:3000 --users 200 --paths /,/api/health
//
// Each virtual user waits a random moment, then keeps requesting one path after another with a
// short "think time" in between, like a real person clicking around. Public pages and
// /api/health are safe to hit. Don't point this at routes that spend AI money.
// Optional: --token <supabase access token> adds an Authorization header (use a test account).

const args = process.argv.slice(2);
const base = args.find((a) => /^https?:\/\//.test(a));
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
if (!base) {
  console.error("Usage: node tools/load-test.mjs <base-url> [--users 500] [--seconds 60] [--paths /,/api/health] [--think 800] [--token <jwt>]");
  process.exit(2);
}
const users = Number(flag("users", 200));
const seconds = Number(flag("seconds", 30));
const think = Number(flag("think", 800));
const paths = flag("paths", "/,/api/health").split(",");
const token = flag("token", "");
const rampMs = Math.min(seconds * 1000 * 0.25, 15000);

const latencies = [];
const statuses = new Map();
let errors = 0;
const started = Date.now();
const endAt = started + seconds * 1000;

async function one(path) {
  const t0 = performance.now();
  try {
    const res = await fetch(base + path, {
      headers: token ? { authorization: `Bearer ${token}` } : {},
      signal: AbortSignal.timeout(20000),
    });
    await res.arrayBuffer();
    latencies.push(performance.now() - t0);
    statuses.set(res.status, (statuses.get(res.status) ?? 0) + 1);
  } catch {
    errors++;
  }
}

async function user(i) {
  await new Promise((r) => setTimeout(r, Math.random() * rampMs));
  let n = i;
  while (Date.now() < endAt) {
    await one(paths[n++ % paths.length]);
    await new Promise((r) => setTimeout(r, think * (0.5 + Math.random())));
  }
}

const pct = (p) => latencies.length ? latencies.slice().sort((a, b) => a - b)[Math.min(latencies.length - 1, Math.floor((p / 100) * latencies.length))] : 0;

console.log(`Load test: ${users} users for ${seconds}s on ${base}  paths: ${paths.join(", ")}`);
const tick = setInterval(() => process.stdout.write(`  ${Math.round((Date.now() - started) / 1000)}s  requests ${latencies.length + errors}  errors ${errors}\r`), 2000);
await Promise.all(Array.from({ length: users }, (_, i) => user(i)));
clearInterval(tick);

const total = latencies.length + errors;
const elapsed = (Date.now() - started) / 1000;
const bad = [...statuses].filter(([s]) => s >= 500).reduce((n, [, c]) => n + c, 0) + errors;
console.log(`\nRequests: ${total}  (${(total / elapsed).toFixed(1)}/s)   Failed: ${bad} (${total ? ((bad / total) * 100).toFixed(2) : 0}%)`);
console.log(`Status codes: ${[...statuses].map(([s, c]) => `${s}x${c}`).join("  ")}${errors ? `  network-errors x${errors}` : ""}`);
console.log(`Latency ms: p50 ${pct(50).toFixed(0)}  p95 ${pct(95).toFixed(0)}  p99 ${pct(99).toFixed(0)}  max ${pct(100).toFixed(0)}`);
const pass = total > 0 && bad / total < 0.01 && pct(95) < 2000;
console.log(pass ? "RESULT: PASS (under 1% failures, p95 under 2s)" : "RESULT: NEEDS ATTENTION (more than 1% failures or p95 over 2s)");
process.exit(pass ? 0 : 1);
