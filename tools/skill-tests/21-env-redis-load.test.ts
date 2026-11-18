import { appBaseUrl } from "@/lib/server/app-url";
import {
  createRedisKv,
  createMemoryKv,
  createUpstashRestClient,
  redisConfig,
} from "@/lib/server/kv";
import { createLoadGate } from "@/lib/server/load-gate";

const ok = (c: unknown, m: string) => {
  if (!c) {
    console.error("FAIL", m);
    process.exit(1);
  }
  console.log("ok  ", m);
};

ok(
  appBaseUrl({ NEXT_PUBLIC_SITE_URL: "https://aduf.me/" }) === "https://aduf.me",
  "NEXT_PUBLIC_SITE_URL works and loses the trailing slash",
);
ok(
  appBaseUrl({ APP_URL: "https://a.com", NEXT_PUBLIC_SITE_URL: "https://b.com" }) ===
    "https://a.com",
  "APP_URL wins when both are set",
);
ok(appBaseUrl({}, "https://x.io") === "https://x.io", "falls back to the request address");

ok(redisConfig({}) === null, "no Redis vars means in-memory");
ok(redisConfig({ REDIS_URL: "redis://h" })?.mode === "tcp", "REDIS_URL uses the socket client");
ok(
  redisConfig({
    UPSTASH_REDIS_REST_URL: "https://u.upstash.io/",
    UPSTASH_REDIS_REST_TOKEN: "t",
    REDIS_URL: "redis://h",
  })?.mode === "rest",
  "Upstash web credentials win",
);
ok(
  redisConfig({ KV_REST_API_URL: "https://u.upstash.io", KV_REST_API_TOKEN: "t" })?.mode === "rest",
  "Vercel KV names are accepted",
);

async function main() {
  const calls: unknown[][] = [];
  const fake = (async (_u: unknown, init: { body: string; headers: Record<string, string> }) => {
    const cmd = JSON.parse(init.body) as unknown[];
    calls.push(cmd);
    ok(init.headers["Authorization"] === "Bearer tok", "token is sent as a bearer header");
    const result = cmd[0] === "GET" ? JSON.stringify({ a: 1 }) : cmd[0] === "EVAL" ? 3 : "OK";
    return { ok: true, status: 200, json: async () => ({ result }) };
  }) as unknown as typeof fetch;
  const kv = createRedisKv(
    createUpstashRestClient("https://u.upstash.io", "tok", fake),
    createMemoryKv(),
  );
  await kv.set("k", { a: 1 }, 60);
  ok(
    JSON.stringify(calls[0]) === JSON.stringify(["SET", "k", '{"a":1}', "EX", 60]),
    "set sends SET with expiry",
  );
  ok(JSON.stringify(await kv.get("k")) === '{"a":1}', "get parses JSON back");
  ok((await kv.incr("c", 60)) === 3, "incr runs the counter script");

  const failing = (async () => ({
    ok: false,
    status: 500,
    json: async () => ({ error: "boom" }),
  })) as unknown as typeof fetch;
  const safe = createRedisKv(
    createUpstashRestClient("https://u.upstash.io", "tok", failing),
    createMemoryKv(),
  );
  await safe.set("z", 5, 60);
  ok((await safe.get<number>("z")) === 5, "a Redis outage falls back to memory instead of failing");

  const gate = createLoadGate(2);
  const a = gate.enter(),
    b = gate.enter(),
    c = gate.enter();
  ok(a && b && c === null, "gate refuses work past its cap");
  a!();
  a!();
  ok(gate.inflight() === 1, "releasing twice only frees one slot");
  ok(gate.enter() !== null, "a freed slot can be used again");
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
