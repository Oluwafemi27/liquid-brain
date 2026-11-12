import "@tanstack/react-start/server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

// When the server is asked to call a web address that a person typed (their n8n instance, say),
// that address must point at the public internet. Otherwise someone could aim the server at its
// own internal network or the cloud's metadata service (169.254.169.254) and read what it holds.

/** True for loopback, private, link-local (including cloud metadata), CGNAT, multicast and reserved addresses. */
export function isPrivateAddress(ip: string): boolean {
  const v = isIP(ip);
  if (v === 4) {
    const [a, b] = ip.split(".").map(Number) as [number, number, number, number];
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }
  if (v === 6) {
    const x = ip.toLowerCase();
    if (x === "::" || x === "::1") return true;
    const mapped = x.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateAddress(mapped[1]!);
    return (
      /^f[cd]/.test(x) ||
      /^fe[89ab]/.test(x) ||
      x.startsWith("ff") ||
      x.startsWith("64:ff9b") ||
      x.startsWith("2001:db8")
    );
  }
  return true; // not an IP at all: treat as unsafe
}

export class UnsafeUrlError extends Error {}

/** Throws unless `raw` is an http(s) address on the public internet. Returns the cleaned URL (no trailing slash). */
export async function assertPublicHttpUrl(
  raw: string,
  resolve: (host: string) => Promise<string[]> = defaultResolve,
): Promise<string> {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new UnsafeUrlError("That isn't a valid web address.");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:")
    throw new UnsafeUrlError("Use an http:// or https:// address.");
  if (url.username || url.password)
    throw new UnsafeUrlError("Don't put a username or password in the address.");
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".lan")
  ) {
    throw new UnsafeUrlError("That address points inside a private network, which isn't allowed.");
  }
  const addresses = isIP(host) ? [host] : await resolve(host).catch(() => []);
  if (addresses.length === 0)
    throw new UnsafeUrlError("Couldn't find that address on the internet.");
  if (addresses.some(isPrivateAddress))
    throw new UnsafeUrlError("That address points inside a private network, which isn't allowed.");
  return url.toString().replace(/\/+$/, "");
}

async function defaultResolve(host: string): Promise<string[]> {
  return (await lookup(host, { all: true })).map((r) => r.address);
}

/** fetch() for a person-supplied address: checks it first and refuses redirects (a redirect could lead somewhere private). */
export async function safeFetch(url: string, init: RequestInit = {}): Promise<Response> {
  await assertPublicHttpUrl(url);
  return fetch(url, {
    ...init,
    redirect: "manual",
    signal: init.signal ?? AbortSignal.timeout(20_000),
  });
}
