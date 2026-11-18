// Per-server load shedding. Azure's ingress already spreads requests over replicas; this stops any ONE
// replica from taking on more AI work than it can finish. Over the cap it answers "busy, retry shortly"
// (503 + Retry-After) so the load moves to another replica (or the person retries) instead of the
// server running out of memory and falling over. Cheap pages and APIs are never gated.

export interface LoadGate {
  /** Returns a release function, or null when this server is full. */
  enter(): (() => void) | null;
  inflight(): number;
  max: number;
}

export function createLoadGate(max: number): LoadGate {
  let n = 0;
  return {
    max,
    inflight: () => n,
    enter() {
      if (n >= max) return null;
      n++;
      let released = false;
      return () => {
        if (!released) {
          released = true;
          n--;
        }
      };
    },
  };
}

const envInt = (name: string, fallback: number) => {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : fallback;
};

/** Simultaneous AI replies one server will run. Raise with MAX_INFLIGHT_AI on bigger machines. */
export const aiGate: LoadGate = createLoadGate(envInt("MAX_INFLIGHT_AI", 40));

export function serverBusy(retryAfter = 3) {
  return new Response(
    JSON.stringify({
      error: "ADUF is very busy right now. Try again in a few seconds.",
      retryAfter,
    }),
    {
      status: 503,
      headers: { "content-type": "application/json", "retry-after": String(retryAfter) },
    },
  );
}
