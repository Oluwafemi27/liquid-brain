import "@tanstack/react-start/server-only";
import { getKv } from "./kv";

// Protects the expensive routes (AI, file reading, transcription) from one person, a runaway
// browser tab or a script exhausting model quota and server time for everyone else.
//
// State lives in this server instance's memory (no extra database round trip per request). With
// several instances the real limit is roughly limit x instances, which is plenty for abuse
// protection; hard spending limits are enforced separately by the token wallet in billing.ts.

interface Bucket {
  hits: number[];
  inFlight: number;
}

const buckets = new Map<string, Bucket>();
const MAX_KEYS = 20_000;

function sweep(now: number, windowMs: number) {
  if (buckets.size < MAX_KEYS) return;
  for (const [key, b] of buckets) {
    if (b.inFlight === 0 && (b.hits.length === 0 || now - b.hits[b.hits.length - 1]! > windowMs))
      buckets.delete(key);
  }
  // Still full of active keys: drop the oldest entries rather than grow without bound.
  if (buckets.size >= MAX_KEYS) {
    let drop = Math.ceil(MAX_KEYS * 0.1);
    for (const key of buckets.keys()) {
      if (drop-- <= 0) break;
      buckets.delete(key);
    }
  }
}

export interface LimitResult {
  ok: boolean;
  /** Seconds until another request is allowed (0 when ok). */
  retryAfter: number;
  /** Call when the request finishes, to free its concurrency slot. */
  release: () => void;
}

/**
 * Sliding-window limit: at most `limit` requests per `windowMs` for `key`, and at most
 * `maxConcurrent` running at the same time (0 = no concurrency cap).
 */
export function checkRateLimit(
  key: string,
  opts: { limit: number; windowMs: number; maxConcurrent?: number },
  now = Date.now(),
): LimitResult {
  sweep(now, opts.windowMs);
  let b = buckets.get(key);
  if (!b) {
    b = { hits: [], inFlight: 0 };
    buckets.set(key, b);
  }
  const cutoff = now - opts.windowMs;
  while (b.hits.length > 0 && b.hits[0]! <= cutoff) b.hits.shift();

  if (b.hits.length >= opts.limit) {
    const retryAfter = Math.max(1, Math.ceil((b.hits[0]! + opts.windowMs - now) / 1000));
    return { ok: false, retryAfter, release: () => undefined };
  }
  if (opts.maxConcurrent && b.inFlight >= opts.maxConcurrent) {
    return { ok: false, retryAfter: 2, release: () => undefined };
  }
  b.hits.push(now);
  b.inFlight += 1;
  let released = false;
  return {
    ok: true,
    retryAfter: 0,
    release: () => {
      if (released) return;
      released = true;
      const cur = buckets.get(key);
      if (cur && cur.inFlight > 0) cur.inFlight -= 1;
    },
  };
}

/** A ready-made 429 response with a Retry-After header. */
export function tooManyRequests(
  retryAfter: number,
  message = "You're going a bit fast. Wait a moment and try again.",
) {
  return new Response(JSON.stringify({ error: message, retryAfter }), {
    status: 429,
    headers: { "content-type": "application/json", "retry-after": String(retryAfter) },
  });
}

/**
 * With Redis, the per-minute count is shared by every server, so a person can't get N times the limit
 * by landing on N servers. Returns seconds to wait when over the limit, otherwise 0. Without Redis it
 * does nothing (the in-memory limit above already applies).
 */
export async function sharedRetryAfter(
  key: string,
  cfg: { limit: number; windowMs: number },
  now = Date.now(),
): Promise<number> {
  const kv = await getKv();
  if (kv.kind !== "redis") return 0;
  const bucket = Math.floor(now / cfg.windowMs);
  const count = await kv.incr(`rl:${key}:${bucket}`, Math.ceil(cfg.windowMs / 1000) + 1);
  if (count <= cfg.limit) return 0;
  return Math.max(1, Math.ceil(((bucket + 1) * cfg.windowMs - now) / 1000));
}

/** Runs `run` only if `key` is under its limit; otherwise answers 429. Frees the slot when done. */
export async function withRateLimit(
  key: string,
  cfg: { limit: number; windowMs: number; maxConcurrent?: number },
  run: () => Promise<Response>,
): Promise<Response> {
  const gate = checkRateLimit(key, cfg);
  if (!gate.ok) return tooManyRequests(gate.retryAfter);
  const shared = await sharedRetryAfter(key, cfg);
  if (shared > 0) {
    gate.release();
    return tooManyRequests(shared);
  }
  try {
    return await run();
  } finally {
    gate.release();
  }
}

/** Limits per person for each kind of route. One place to tune them. */
export const LIMITS = {
  chat: { limit: 20, windowMs: 60_000, maxConcurrent: 3 },
  upload: { limit: 40, windowMs: 60_000 },
  read: { limit: 30, windowMs: 60_000, maxConcurrent: 4 },
  transcribe: { limit: 60, windowMs: 60_000, maxConcurrent: 4 },
  video: { limit: 6, windowMs: 60_000, maxConcurrent: 1 },
} as const;

/** For tests only. */
export function _resetRateLimits() {
  buckets.clear();
}
