import "@tanstack/react-start/server-only";

/** Actors the agent may run. Each run costs the owner's Apify credit, so the list is closed:
 *  override with APIFY_ALLOWED_ACTORS (comma-separated `username~actor-name`). */
export function allowedActors(): string[] {
  const raw = process.env["APIFY_ALLOWED_ACTORS"];
  return (raw ? raw.split(",") : ["apify~website-content-crawler", "apify~facebook-ads-scraper"])
    .map((a) => a.trim())
    .filter(Boolean);
}

/** POST /v2/acts/{actor}/run-sync-get-dataset-items. Apify cuts synchronous runs off at 300 s. */
export async function apifyRunSync(
  actor: string,
  input: Record<string, unknown>,
  maxItems = 20,
): Promise<unknown[]> {
  const token = process.env["APIFY_TOKEN"];
  if (!token) throw new Error("APIFY_TOKEN isn't set.");
  if (!allowedActors().includes(actor)) {
    throw new Error(`Actor "${actor}" isn't allowed. Allowed: ${allowedActors().join(", ")}.`);
  }
  const qs = new URLSearchParams({
    timeout: "120",
    limit: String(maxItems),
    maxItems: String(maxItems),
    clean: "true",
  });
  const res = await fetch(
    `https://api.apify.com/v2/acts/${encodeURIComponent(actor)}/run-sync-get-dataset-items?${qs}`,
    {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(150_000),
    },
  );
  if (!res.ok) {
    const text = (await res.text().catch(() => "")).slice(0, 200);
    throw new Error(`Apify run failed (${res.status}). ${text}`);
  }
  const items = (await res.json()) as unknown;
  return Array.isArray(items) ? items.slice(0, maxItems) : [];
}
