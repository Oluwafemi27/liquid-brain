import "@tanstack/react-start/server-only";

export interface ScrapeResult {
  url: string;
  title: string | null;
  statusCode: number | null;
  markdown: string;
  truncated: boolean;
}

/** Firecrawl v2 scrape (POST https://api.firecrawl.dev/v2/scrape, Bearer key). */
export async function firecrawlScrape(url: string, maxChars = 8000): Promise<ScrapeResult> {
  const key = process.env["FIRECRAWL_API_KEY"];
  if (!key) throw new Error("FIRECRAWL_API_KEY isn't set.");
  const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
    signal: AbortSignal.timeout(60_000),
  });
  const body = (await res.json().catch(() => null)) as {
    success?: boolean;
    error?: string;
    data?: { markdown?: string; metadata?: { title?: string; statusCode?: number } };
  } | null;
  if (!res.ok || !body?.success || !body.data) {
    throw new Error(
      `Firecrawl couldn't scrape that page (${res.status}${body?.error ? `: ${body.error}` : ""}).`,
    );
  }
  const md = body.data.markdown ?? "";
  return {
    url,
    title: body.data.metadata?.title ?? null,
    statusCode: body.data.metadata?.statusCode ?? null,
    markdown: md.slice(0, maxChars),
    truncated: md.length > maxChars,
  };
}
