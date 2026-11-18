import "@tanstack/react-start/server-only";

// Calls to AI providers fail in predictable, temporary ways when many people are using the app at
// once (429 "slow down", 502/503/504 from the provider). One quiet retry with a short, randomised
// pause fixes most of them; a timeout stops a hung provider from holding a server slot forever.

const RETRY_STATUS = new Set([429, 500, 502, 503, 504]);

function retryDelayMs(res: Response | null, attempt: number): number {
  const header = res?.headers.get("retry-after");
  const seconds = header ? Number(header) : NaN;
  const base = Number.isFinite(seconds) ? Math.min(seconds, 4) * 1000 : 400 * 2 ** attempt;
  return base + Math.floor(Math.random() * 250);
}

export async function resilientFetch(
  url: string,
  init: RequestInit,
  opts: {
    timeoutMs?: number;
    retries?: number;
    fetchImpl?: typeof fetch;
    sleep?: (ms: number) => Promise<void>;
  } = {},
): Promise<Response> {
  const {
    timeoutMs = 90_000,
    retries = 2,
    fetchImpl = fetch,
    sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
  } = opts;
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetchImpl(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
      if (!RETRY_STATUS.has(res.status) || attempt === retries) return res;
      await sleep(retryDelayMs(res, attempt));
    } catch (e) {
      lastError = e;
      if (attempt === retries) break;
      await sleep(retryDelayMs(null, attempt));
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("The AI provider didn't respond. Try again in a moment.");
}
