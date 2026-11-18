process.env["DOCUMENT_LINK_SECRET"] = "test-secret-value";
import { safeEqual, signFileLink, verifyFileLink } from "@/lib/server/signed-links";
import { UnsafeUrlError, assertPublicHttpUrl, isPrivateAddress } from "@/lib/server/url-safety";
import { buildCsp, securityHeaders, withSecurityHeaders } from "@/lib/security-headers";
import { maxBodyBytes, rejectOversizedBody } from "@/lib/request-limits";

const ok = (c: unknown, m: string) => { if (!c) { console.error("FAIL", m); process.exit(1); } console.log("ok  ", m); };
const rejects = async (p: Promise<unknown>) => { try { await p; return false; } catch (e) { return e instanceof UnsafeUrlError; } };

(async () => {
  // ---- signed links ----
  const id = "11111111-1111-4111-8111-111111111111", me = "user-a", other = "user-b";
  const now = 1_700_000_000_000;
  const { exp, sig } = signFileLink(id, me, 600, now);
  ok(verifyFileLink(id, me, exp, sig, now + 1000), "a fresh link for the right file and person is accepted");
  ok(!verifyFileLink(id, other, exp, sig, now), "the same link is refused for another person");
  ok(!verifyFileLink("22222222-2222-4222-8222-222222222222", me, exp, sig, now), "the same link is refused for another file");
  ok(!verifyFileLink(id, me, exp + 3600, sig, now), "changing the expiry breaks the signature");
  ok(!verifyFileLink(id, me, exp, sig, now + 601_000), "an expired link is refused");
  ok(!verifyFileLink(id, me, exp, "0".repeat(64), now), "a forged signature is refused");
  ok(!verifyFileLink(id, me, exp, "short", now), "a malformed signature is refused");
  ok(!verifyFileLink(id, me, NaN, sig, now), "a missing expiry is refused");
  ok(safeEqual("Bearer abc", "Bearer abc") && !safeEqual("Bearer abc", "Bearer abd") && !safeEqual("x", undefined) && !safeEqual("", ""), "secret comparison accepts only exact, non-empty matches");

  // ---- SSRF guard ----
  for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.0.5", "172.31.255.1", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "fd00::1", "fe80::1", "::ffff:10.0.0.1"])
    ok(isPrivateAddress(ip), `${ip} is treated as private`);
  for (const ip of ["8.8.8.8", "1.1.1.1", "172.32.0.1", "2606:4700:4700::1111"]) ok(!isPrivateAddress(ip), `${ip} is public`);
  const pub = async () => ["93.184.216.34"];
  ok((await assertPublicHttpUrl("https://n8n.example.com/", pub)) === "https://n8n.example.com", "a normal public address passes and loses its trailing slash");
  ok(await rejects(assertPublicHttpUrl("http://169.254.169.254/latest/meta-data", pub)), "the cloud metadata address is blocked");
  ok(await rejects(assertPublicHttpUrl("http://localhost:5678", pub)), "localhost is blocked");
  ok(await rejects(assertPublicHttpUrl("https://db.internal", pub)), ".internal names are blocked");
  ok(await rejects(assertPublicHttpUrl("file:///etc/passwd", pub)), "non-web schemes are blocked");
  ok(await rejects(assertPublicHttpUrl("https://user:pass@example.com", pub)), "addresses with embedded passwords are blocked");
  ok(await rejects(assertPublicHttpUrl("https://sneaky.example.com", async () => ["10.0.0.7"])), "a name that resolves to a private address is blocked");
  ok(await rejects(assertPublicHttpUrl("https://mixed.example.com", async () => ["8.8.8.8", "192.168.0.1"])), "any private answer among several blocks it");
  ok(await rejects(assertPublicHttpUrl("https://nowhere.example.com", async () => { throw new Error("nxdomain"); })), "an unresolvable name is refused");
  ok(await rejects(assertPublicHttpUrl("not a url", pub)), "garbage is refused");

  // ---- headers ----
  const h = securityHeaders({ NODE_ENV: "production", SUPABASE_URL: "https://abc.supabase.co" });
  const csp = h["content-security-policy"]!;
  ok(csp.includes("frame-ancestors 'none'") && csp.includes("object-src 'none'") && csp.includes("base-uri 'self'"), "CSP blocks framing, plugins and base-tag tricks");
  ok(!/script-src[^;]*https:/.test(csp), "scripts can't be loaded from other websites");
  ok(csp.includes("wss://abc.supabase.co") && csp.includes("upgrade-insecure-requests"), "CSP allows the project's realtime socket and upgrades http in production");
  ok(h["strict-transport-security"]!.includes("max-age=63072000") && h["x-content-type-options"] === "nosniff" && h["x-frame-options"] === "DENY", "HSTS, nosniff and frame denial are set");
  ok(!("strict-transport-security" in securityHeaders({})), "HSTS is not sent outside production");
  ok("content-security-policy-report-only" in securityHeaders({ CSP_MODE: "report-only" }), "report-only mode is available");
  ok(buildCsp({ CSP_CONNECT_EXTRA: "https://api.example.com" }).includes("https://api.example.com"), "extra connect hosts can be added by env");
  const req = new Request("https://app.test/api/anything");
  const r = withSecurityHeaders(new Response("hi", { headers: { "x-powered-by": "x", "cache-control": "public" } }), req, {});
  ok(r.headers.get("x-content-type-options") === "nosniff" && !r.headers.has("x-powered-by") && r.headers.get("cache-control") === "public", "headers are added, powered-by removed, a route's own cache-control kept");
  ok(withSecurityHeaders(new Response("x"), req, {}).headers.get("cache-control") === "no-store", "API responses default to no-store");
  ok((await withSecurityHeaders(new Response("body"), req, {}).text()) === "body", "the body passes through");

  // ---- body size ----
  const post = (path: string, len: number) => new Request(`https://app.test${path}`, { method: "POST", headers: { "content-length": String(len) }, body: "x" });
  ok(maxBodyBytes("/api/chat") === 2 * 1024 * 1024 && maxBodyBytes("/api/transcribe") > maxBodyBytes("/api/chat"), "limits differ by route");
  ok(rejectOversizedBody(post("/api/chat", 5 * 1024 * 1024))?.status === 413, "a 5 MB chat request is refused with 413");
  ok(rejectOversizedBody(post("/api/chat", 1000)) === null, "a normal chat request passes");
  ok(rejectOversizedBody(post("/api/transcribe", 20 * 1024 * 1024)) === null, "an audio chunk is allowed more room");
  ok(rejectOversizedBody(new Request("https://app.test/api/chat")) === null, "GET requests are never size-checked");

  console.log("done");
})();
