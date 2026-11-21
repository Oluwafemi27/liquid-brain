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

/** The https origin of a configured address, tolerating the usual typing slips (spaces, quotes, no
 *  "https://"). Undefined when it can't be read, so a bad setting can never take the site down. */
export function safeOrigin(raw: string | undefined): string | undefined {
  const v = (raw ?? "").trim().replace(/^["']|["']$/g, "");
  if (!v) return undefined;
  for (const candidate of [v, `https://${v}`]) {
    try {
      const u = new URL(candidate);
      if (u.protocol === "https:" || u.protocol === "http:") return u.origin;
    } catch {
      // try the next form
    }
  }
  return undefined;
}

export function buildCsp(env: Env = {}): string {
  const supabaseHost =
    safeOrigin(env["SUPABASE_URL"]) ??
    safeOrigin(env["VITE_SUPABASE_URL"]) ??
    "https://*.supabase.co";
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
  let extra: Record<string, string>;
  try {
    extra = securityHeaders(env);
  } catch (error) {
    // Headers are protection, not content: if they can't be built, still serve the page.
    console.error("[security-headers] using the safe baseline", error);
    extra = securityHeaders({ NODE_ENV: env["NODE_ENV"] });
  }
  for (const [k, v] of Object.entries(extra)) if (!headers.has(k)) headers.set(k, v);
  let path = "/";
  try {
    path = new URL(request.url).pathname;
  } catch {
    // keep "/"
  }
  if (path.startsWith("/api/") && !headers.has("cache-control"))
    headers.set("cache-control", "no-store");
  headers.delete("x-powered-by");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
