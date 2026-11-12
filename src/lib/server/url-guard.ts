import "@tanstack/react-start/server-only";

/** Server-side requests to an address the USER typed (WooCommerce, WordPress…) are an SSRF risk:
 *  without checks someone could point us at localhost or a cloud metadata address. We only accept a
 *  plain public https site and reduce it to its origin. */
export function assertPublicHttpsUrl(raw: string): string {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    throw new Error(
      "That doesn't look like a web address. Use the full address, like https://mystore.com.",
    );
  }
  if (u.protocol !== "https:")
    throw new Error(
      "The address must start with https:// — ADUF won't send credentials over plain http.",
    );
  if (u.username || u.password) throw new Error("Remove the username/password from the address.");
  if (u.port && u.port !== "443") throw new Error("Only the standard https port is allowed.");
  const host = u.hostname.toLowerCase().replace(/\.$/, "");
  const isIp = /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(":") || host.startsWith("[");
  const internal =
    /(^|\.)(localhost|local|internal|lan|home|corp|intranet|localdomain|test|example|invalid)$/.test(
      host,
    );
  const labels = host.split(".");
  const tld = labels.at(-1) ?? "";
  if (isIp || internal || labels.length < 2 || !/^([a-z]{2,}|xn--[a-z0-9-]+)$/.test(tld)) {
    throw new Error(
      "Use your store's public address (a domain name), not an IP or internal address.",
    );
  }
  return u.origin;
}
