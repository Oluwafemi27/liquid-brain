/** The public address of the app (no trailing slash). Accepts APP_URL, or the NEXT_PUBLIC_SITE_URL / SITE_URL
 *  names people commonly set on Vercel, so any of them works. */
export function appBaseUrl(
  env: Record<string, string | undefined> = process.env,
  fallback = "",
): string {
  const v = env["APP_URL"] || env["NEXT_PUBLIC_SITE_URL"] || env["SITE_URL"] || fallback;
  return v.trim().replace(/\/+$/, "");
}
