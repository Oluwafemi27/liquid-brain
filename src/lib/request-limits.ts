// How large a request body each kind of route accepts. Anything bigger is refused up front, before
// it is read, so one oversized or hostile request can't tie up memory. (Browsers send files
// straight to storage, so only a few routes legitimately take big bodies.)

const MB = 1024 * 1024;

/** Largest body, in bytes, accepted for a request to `pathname`. */
export function maxBodyBytes(pathname: string): number {
  if (pathname === "/api/documents/upload") return 22 * MB; // 15 MB file as base64
  if (pathname === "/api/transcribe") return 26 * MB; // one audio chunk
  if (pathname === "/api/attachments/video") return 8 * MB; // frames + transcript
  if (pathname.startsWith("/_serverFn")) return 8 * MB; // data imports from the browser
  return 2 * MB;
}

/** A 413 response when the declared body size is over the route's limit, otherwise null. */
export function rejectOversizedBody(request: Request): Response | null {
  if (request.method === "GET" || request.method === "HEAD" || request.method === "OPTIONS")
    return null;
  const declared = Number(request.headers.get("content-length"));
  if (!Number.isFinite(declared) || declared <= 0) return null;
  const path = new URL(request.url).pathname;
  if (declared <= maxBodyBytes(path)) return null;
  return new Response(JSON.stringify({ error: "That request is too large." }), {
    status: 413,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
