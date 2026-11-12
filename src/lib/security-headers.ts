// Browser-side protections sent with every response. They limit what a page may load or do, so
// that even if something slipped in (a bad link, an injected script) the browser refuses to let
// it phone home, load code from elsewhere, or put ADUF inside another site's frame.

type Env = Record<string, string | undefined>;

const DATADOG_HOSTS = [
  "https://browser-intake-datadoghq.com",
  "https://browser-intake-datadoghq.eu",
  "https://*.browser-intake-us3-datadoghq.com",
  "https://*.browser-intake-us5-datadoghq.com",
  "https://*.browser-intake-ap1-datadoghq.com",
  "https://*.datadoghq.com",
  "https://*.datadoghq.eu",
];

export function buildCsp(env: Env = {}): string {
  const supabase = env["SUPABASE_URL"] || env["VITE_SUPABASE_URL"];
  const supabaseHost = supabase ? new URL(supabase).origin : "https://*.supabase.co";
  const supabaseWs = supabaseHost.replace(/^https:/, "wss:");
  const extra = (env["CSP_CONNECT_EXTRA"] ?? "").split(/[\s,]+/).filter(Boolean);
  const connect = [
    "'self'",
    supabaseHost,
    supabaseWs,
    "https://*.supabase.co",
    "wss://*.supabase.co",
    "https://*.sentry.io",
    ...DATADOG_HOSTS,
    ...extra,
  ];
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    // The page itself uses a few inline bootstrap scripts, so inline is allowed, but no script
    // can be loaded from any other website.
    "script-src": ["'self'", "'unsafe-inline'"],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", "https:"],
    "media-src": ["'self'", "blob:", supabaseHost, "https://*.supabase.co"],
    "font-src": ["'self'", "data:"],
    "connect-src": connect,
    "frame-src": ["'self'", "blob:", supabaseHost, "https://*.supabase.co"],
    "worker-src": ["'self'", "blob:"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };
  const parts = Object.entries(directives).map(([k, v]) => `${k} ${[...new Set(v)].join(" ")}`);
  if (env["NODE_ENV"] === "production") parts.push("upgrade-insecure-requests");
  return parts.join("; ");
}

export function securityHeaders(env: Env = {}): Record<string, string> {
  const headers: Record<string, string> = {
    // Set CSP_MODE=report-only to watch for breakage without blocking anything.
    [env["CSP_MODE"] === "report-only"
      ? "content-security-policy-report-only"
      : "content-security-policy"]: buildCsp(env),
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "referrer-policy": "strict-origin-when-cross-origin",
    // Microphone is allowed for this site only (voice input). Camera, location etc. are off.
    "permissions-policy": "camera=(), geolocation=(), payment=(), usb=(), microphone=(self)",
    "cross-origin-opener-policy": "same-origin",
    "x-permitted-cross-domain-policies": "none",
  };
  if (env["NODE_ENV"] === "production")
    headers["strict-transport-security"] = "max-age=63072000; includeSubDomains";
  return headers;
}

/** Copies a response and adds the headers (never overriding one a route set on purpose). API answers are never cached. */
export function withSecurityHeaders(response: Response, request: Request, env: Env = {}): Response {
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(securityHeaders(env))) if (!headers.has(k)) headers.set(k, v);
  const path = new URL(request.url).pathname;
  if (path.startsWith("/api/") && !headers.has("cache-control"))
    headers.set("cache-control", "no-store");
  headers.delete("x-powered-by");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
