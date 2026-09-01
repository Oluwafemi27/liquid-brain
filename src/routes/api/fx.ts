import { createFileRoute } from "@tanstack/react-router";

interface FxCache {
  rates: Record<string, number>;
  fetchedAt: number;
}

let cache: FxCache | null = null;
const CACHE_MS = 60 * 60 * 1000; // 1 hour — rates don't move fast enough to justify more.

async function getRates(): Promise<FxCache> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_MS) return cache;
  const res = await fetch("https://open.er-api.com/v6/latest/USD");
  if (!res.ok) throw new Error(`FX provider error ${res.status}`);
  const data = (await res.json()) as { result: string; rates?: Record<string, number> };
  if (data.result !== "success" || !data.rates) throw new Error("FX provider returned no rates");
  cache = { rates: data.rates, fetchedAt: Date.now() };
  return cache;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", "cache-control": "public, max-age=1800" },
  });
}

export const Route = createFileRoute("/api/fx")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const { rates, fetchedAt } = await getRates();
          return json({ base: "USD", rates, updatedAt: fetchedAt });
        } catch (error) {
          // Stale cache beats no data — only fail if we've truly never fetched.
          if (cache)
            return json({
              base: "USD",
              rates: cache.rates,
              updatedAt: cache.fetchedAt,
              stale: true,
            });
          const message = error instanceof Error ? error.message : "Failed to fetch exchange rates";
          return json({ error: message }, 502);
        }
      },
    },
  },
});
