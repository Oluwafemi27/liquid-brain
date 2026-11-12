import "@tanstack/react-start/server-only";

// Encrypts OAuth tokens at rest (AES-256-GCM) so a database leak or a mis-set
// policy doesn't hand out working logins. The key lives ONLY in the server
// environment (TOKEN_ENCRYPTION_KEY = 32 random bytes, base64) — never in the
// database or the browser. Without the key, tokens fall back to plaintext and
// the admin Security page says so; they are upgraded lazily once a key exists.

const PREFIX = "enc:v1:";

let keyPromise: Promise<CryptoKey | null> | null = null;

function b64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function bytesToB64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function getKey(): Promise<CryptoKey | null> {
  if (!keyPromise) {
    const raw = process.env["TOKEN_ENCRYPTION_KEY"];
    keyPromise = (async () => {
      if (!raw) return null;
      const bytes = b64ToBytes(raw.trim());
      if (bytes.length !== 32) {
        console.error(
          "[crypto-tokens] TOKEN_ENCRYPTION_KEY must be 32 bytes (base64) — tokens stay unencrypted.",
        );
        return null;
      }
      return crypto.subtle.importKey("raw", bytes, "AES-GCM", false, ["encrypt", "decrypt"]);
    })();
  }
  return keyPromise;
}

export async function encryptionEnabled(): Promise<boolean> {
  return (await getKey()) !== null;
}

export const isSealed = (stored: string | null | undefined): boolean =>
  typeof stored === "string" && stored.startsWith(PREFIX);

/** Encrypts for storage. Returns the input unchanged when no key is configured. */
export async function sealToken(plain: string | null | undefined): Promise<string | null> {
  if (!plain) return null;
  const key = await getKey();
  if (!key || isSealed(plain)) return plain;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plain)),
  );
  return `${PREFIX}${bytesToB64(iv)}:${bytesToB64(ct)}`;
}

/** Decrypts a stored token (or passes legacy plaintext through). */
export async function openToken(stored: string | null | undefined): Promise<string | null> {
  if (!stored) return null;
  if (!isSealed(stored)) return stored;
  const key = await getKey();
  if (!key)
    throw new Error(
      "Stored tokens are encrypted but TOKEN_ENCRYPTION_KEY isn't set on this server.",
    );
  const [iv, ct] = stored.slice(PREFIX.length).split(":");
  if (!iv || !ct) throw new Error("Stored token is malformed.");
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: b64ToBytes(iv) },
    key,
    b64ToBytes(ct),
  );
  return new TextDecoder().decode(plain);
}
