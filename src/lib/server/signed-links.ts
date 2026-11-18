import "@tanstack/react-start/server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// Short-lived, tamper-proof links for files opened in a plain browser tab or iframe, which can't
// send an Authorization header. A link is only valid for one file, one person and a few minutes.

const DEFAULT_TTL_SECONDS = 10 * 60;

function key(): string {
  const k = process.env["DOCUMENT_LINK_SECRET"] || process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!k)
    throw new Error(
      "Set DOCUMENT_LINK_SECRET (or SUPABASE_SERVICE_ROLE_KEY) to create file links.",
    );
  // Never use the raw service key as the signing key.
  return `aduf-file-link:v1:${k}`;
}

function mac(id: string, userId: string, expires: number): string {
  return createHmac("sha256", key()).update(`${id}.${userId}.${expires}`).digest("hex");
}

export function signFileLink(
  id: string,
  userId: string,
  ttlSeconds = DEFAULT_TTL_SECONDS,
  now = Date.now(),
): { exp: number; sig: string } {
  const exp = Math.floor(now / 1000) + ttlSeconds;
  return { exp, sig: mac(id, userId, exp) };
}

/** True only for an unexpired link that was issued for exactly this file and person. */
export function verifyFileLink(
  id: string,
  userId: string,
  exp: number,
  sig: string,
  now = Date.now(),
): boolean {
  if (!id || !userId || !Number.isFinite(exp) || !/^[0-9a-f]{64}$/.test(sig)) return false;
  if (exp < Math.floor(now / 1000)) return false;
  const expected = Buffer.from(mac(id, userId, exp), "hex");
  const actual = Buffer.from(sig, "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/** Equal-length-safe string comparison for secrets (cron secret, tokens). */
export function safeEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const x = createHmac("sha256", "cmp").update(a).digest();
  const y = createHmac("sha256", "cmp").update(b).digest();
  return timingSafeEqual(x, y);
}
