import "@tanstack/react-start/server-only";
import { createHash } from "node:crypto";

// A small shared "memory" for the whole fleet of servers. With REDIS_URL set, every server uses the
// same Redis, so rate limits, sign-in checks and cached data are shared and a change made on one server is
// seen by all. Without it, each server keeps its own in-memory copy (fine for one server, and the
// app works the same, just without sharing). If Redis goes down mid-flight the app quietly carries
// on with the in-memory copy and retries Redis a little later, so a Redis outage never takes the app down.

export interface Kv {
  readonly kind: "redis" | "memory";
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttlSeconds: number): Promise<void>;
  del(key: string): Promise<void>;
  /** Adds one to a counter that disappears after `ttlSeconds` (set when the counter is first created). Returns the new count. */
  incr(key: string, ttlSeconds: number): Promise<number>;
}

// ---- in-memory implementation ----------------------------------------------------------------
const MAX_KEYS = 20_000;

export function createMemoryKv(now: () => number = Date.now): Kv {
  const store = new Map<string, { value: unknown; until: number }>();
  const live = (key: string) => {
    const e = store.get(key);
    if (!e) return undefined;
    if (e.until <= now()) {
      store.delete(key);
      return undefined;
    }
    return e;
  };
  const put = (key: string, value: unknown, ttlSeconds: number) => {
    if (store.size >= MAX_KEYS && !store.has(key))
      store.delete(store.keys().next().value as string);
    store.set(key, { value, until: now() + ttlSeconds * 1000 });
  };
  return {
    kind: "memory",
    async get<T>(key: string) {
      return (live(key)?.value as T | undefined) ?? null;
    },
    async set(key, value, ttl) {
      put(key, value, ttl);
    },
    async del(key) {
      store.delete(key);
    },
    async incr(key, ttl) {
      const e = live(key);
      const n = (typeof e?.value === "number" ? e.value : 0) + 1;
      if (e) e.value = n;
      else put(key, n, ttl);
      return n;
    },
  };
}

// ---- Redis implementation --------------------------------------------------------------------
interface RedisLike {
  get(k: string): Promise<string | null>;
  set(k: string, v: string, mode: "EX", ttl: number): Promise<unknown>;
  del(k: string): Promise<unknown>;
  eval(script: string, numKeys: number, ...args: Array<string | number>): Promise<unknown>;
  on(event: "error", cb: (e: Error) => void): unknown;
}

const INCR_SCRIPT =
  "local n = redis.call('INCR', KEYS[1]) if n == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end return n";

export function createRedisKv(client: RedisLike, fallback: Kv, now: () => number = Date.now): Kv {
  let downUntil = 0;
  const run = async <T>(op: () => Promise<T>, local: () => Promise<T>): Promise<T> => {
    if (now() < downUntil) return local();
    try {
      return await op();
    } catch (e) {
      downUntil = now() + 10_000; // skip Redis for 10 seconds, then try again
      console.error(
        "[kv] Redis unavailable, using in-memory fallback:",
        e instanceof Error ? e.message : e,
      );
      return local();
    }
  };
  return {
    kind: "redis",
    get: <T>(key: string) =>
      run(
        async () => {
          const v = await client.get(key);
          return v === null ? null : (JSON.parse(v) as T);
        },
        () => fallback.get<T>(key),
      ),
    set: (key, value, ttl) =>
      run(
        async () => {
          await client.set(key, JSON.stringify(value), "EX", Math.max(1, Math.ceil(ttl)));
        },
        () => fallback.set(key, value, ttl),
      ),
    del: (key) =>
      run(
        async () => {
          await Promise.all([client.del(key), fallback.del(key)]);
        },
        () => fallback.del(key),
      ),
    incr: (key, ttl) =>
      run(
        async () => Number(await client.eval(INCR_SCRIPT, 1, key, Math.max(1, Math.ceil(ttl)))),
        () => fallback.incr(key, ttl),
      ),
  };
}

let instance: Kv | null = null;

/** The shared store for this server: Redis when REDIS_URL is set, otherwise in-memory. */
export async function getKv(env: Record<string, string | undefined> = process.env): Promise<Kv> {
  if (instance) return instance;
  const memory = createMemoryKv();
  const url = env["REDIS_URL"];
  if (!url) return (instance = memory);
  try {
    const { default: Redis } = await import("ioredis");
    const client = new Redis(url, {
      lazyConnect: true,
      connectTimeout: 2_000,
      commandTimeout: 1_500,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      retryStrategy: (n: number) => Math.min(n * 500, 5_000),
    });
    client.on("error", () => undefined); // failures are handled per call, with the in-memory fallback
    // Wait for the connection once, so the first requests use Redis instead of racing it. If Redis
    // isn't reachable it keeps retrying in the background and calls use memory until it is.
    await client.connect().catch(() => undefined);
    return (instance = createRedisKv(client as unknown as RedisLike, memory));
  } catch (e) {
    console.error(
      "[kv] Couldn't start Redis, using in-memory store:",
      e instanceof Error ? e.message : e,
    );
    return (instance = memory);
  }
}

/** Short, non-reversible key part for secrets like access tokens, so they are never written to Redis in the clear. */
export const hashKey = (secret: string) =>
  createHash("sha256").update(secret).digest("hex").slice(0, 32);

/** For tests only. */
export function _setKv(kv: Kv | null) {
  instance = kv;
}
