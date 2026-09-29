import "@tanstack/react-start/server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { OAuthProviderConfig } from "./oauth-providers";

export interface ExchangedTokens {
  access_token?: string | undefined;
  refresh_token?: string | undefined;
  token_type?: string | undefined;
  scope?: string | undefined;
  /** Seconds until the access token expires. */
  expires_in?: number | undefined;
  /** Provider-specific ids worth keeping (Shopify shop, TikTok open_id, …). */
  metadata?: Record<string, unknown>;
}

// --- Shopify -----------------------------------------------------------------

/** Accepts "my-store", "my-store.myshopify.com" or a pasted admin URL and
 *  returns the canonical "my-store.myshopify.com" — or null if it isn't a
 *  valid Shopify domain (so a crafted `shop` can't point the token exchange
 *  at an arbitrary host). */
export function normalizeShop(input: string | null | undefined): string | null {
  if (!input) return null;
  let v = input.trim().toLowerCase();
  v = v.replace(/^https?:\/\//, "").split(/[/?#]/)[0] ?? "";
  if (!v) return null;
  if (!v.includes(".")) v = `${v}.myshopify.com`;
  return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(v) ? v : null;
}

/** Shopify signs every callback: HMAC-SHA256 (hex) of the sorted query string
 *  minus `hmac`, keyed with the app's client secret. */
export function verifyShopifyHmac(params: URLSearchParams, clientSecret: string): boolean {
  const given = params.get("hmac");
  if (!given) return false;
  const message = [...params.entries()]
    .filter(([k]) => k !== "hmac" && k !== "signature")
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
  const expected = createHmac("sha256", clientSecret).update(message).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

// --- Exchange ----------------------------------------------------------------

async function readJson(res: Response, label: string): Promise<Record<string, unknown>> {
  const text = await res.text().catch(() => "");
  if (!res.ok) throw new Error(`${label} failed ${res.status}: ${text.slice(0, 200)}`);
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(`${label} returned non-JSON: ${text.slice(0, 120)}`);
  }
}

const str = (v: unknown) => (typeof v === "string" && v ? v : undefined);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);

async function exchangeStandard(
  p: OAuthProviderConfig,
  tokenUrl: string,
  code: string,
  redirectUri: string,
): Promise<ExchangedTokens> {
  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body: new URLSearchParams({
      client_id: p.clientId!,
      client_secret: p.clientSecret!,
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const j = await readJson(res, "token exchange");
  return {
    access_token: str(j["access_token"]),
    refresh_token: str(j["refresh_token"]),
    token_type: str(j["token_type"]),
    scope: str(j["scope"]),
    expires_in: num(j["expires_in"]),
  };
}

async function exchangeTiktok(
  p: OAuthProviderConfig,
  code: string,
  redirectUri: string,
): Promise<ExchangedTokens> {
  const res = await fetch(p.tokenUrl, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "cache-control": "no-cache",
    },
    body: new URLSearchParams({
      client_key: p.clientId!,
      client_secret: p.clientSecret!,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });
  const j = await readJson(res, "TikTok token exchange");
  if (!str(j["access_token"])) {
    throw new Error(`TikTok rejected the code: ${str(j["error_description"]) ?? str(j["error"])}`);
  }
  return {
    access_token: str(j["access_token"]),
    refresh_token: str(j["refresh_token"]),
    token_type: str(j["token_type"]),
    scope: str(j["scope"]),
    expires_in: num(j["expires_in"]),
    metadata: { open_id: str(j["open_id"]) },
  };
}

async function exchangeInstagram(
  p: OAuthProviderConfig,
  code: string,
  redirectUri: string,
): Promise<ExchangedTokens> {
  const res = await fetch(p.tokenUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: p.clientId!,
      client_secret: p.clientSecret!,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code: code.replace(/#_$/, ""),
    }),
  });
  const j = await readJson(res, "Instagram token exchange");
  // Newer responses wrap the token in `data: [{...}]`; older ones are flat.
  const row = (Array.isArray(j["data"]) ? (j["data"][0] as Record<string, unknown>) : j) ?? j;
  const shortLived = str(row["access_token"]);
  if (!shortLived) throw new Error("Instagram returned no access token");
  const userId = row["user_id"] !== undefined ? String(row["user_id"]) : undefined;
  const permissions = str(row["permissions"]);

  // Short-lived tokens last ~1 hour; swap for a ~60-day one. If the swap
  // fails, keep the short-lived token rather than losing the connection.
  try {
    const longUrl = new URL("https://graph.instagram.com/access_token");
    longUrl.search = new URLSearchParams({
      grant_type: "ig_exchange_token",
      client_secret: p.clientSecret!,
      access_token: shortLived,
    }).toString();
    const long = await readJson(await fetch(longUrl), "Instagram long-lived exchange");
    return {
      access_token: str(long["access_token"]) ?? shortLived,
      token_type: str(long["token_type"]) ?? "bearer",
      expires_in: num(long["expires_in"]) ?? 3600,
      scope: permissions,
      metadata: { user_id: userId },
    };
  } catch (error) {
    console.error("[connectors/instagram] long-lived exchange failed", error);
    return {
      access_token: shortLived,
      token_type: "bearer",
      expires_in: 3600,
      scope: permissions,
      metadata: { user_id: userId },
    };
  }
}

/** Alibaba / AliExpress Open Platform ("IOP") request signing: HMAC-SHA256
 *  (upper-case hex) over  apiPath + every param sorted by name as name+value. */
export function signIop(secret: string, apiPath: string, params: Record<string, string>): string {
  const base =
    apiPath +
    Object.keys(params)
      .sort()
      .map((k) => `${k}${params[k]}`)
      .join("");
  return createHmac("sha256", secret).update(base).digest("hex").toUpperCase();
}

async function exchangeIop(p: OAuthProviderConfig, code: string): Promise<ExchangedTokens> {
  const url = new URL(p.tokenUrl);
  const apiPath = url.pathname.replace(/^\/rest/, ""); // "/auth/token/create"
  const all: Record<string, string> = {
    app_key: p.clientId!,
    sign_method: "sha256",
    timestamp: String(Date.now()),
    code,
  };
  all["sign"] = signIop(p.clientSecret!, apiPath, all);
  url.search = new URLSearchParams(all).toString();

  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code }),
  });
  const raw = await readJson(res, `${p.displayName} token exchange`);
  const j = (raw["data"] && typeof raw["data"] === "object" ? raw["data"] : raw) as Record<
    string,
    unknown
  >;
  if (!str(j["access_token"])) {
    throw new Error(
      `${p.displayName} rejected the code: ${str(raw["message"]) ?? str(raw["error_message"]) ?? str(raw["code"]) ?? "no access_token"}`,
    );
  }
  const expireTime = num(j["expire_time"]);
  return {
    access_token: str(j["access_token"]),
    refresh_token: str(j["refresh_token"]),
    token_type: "bearer",
    expires_in:
      num(j["expires_in"]) ??
      (expireTime ? Math.max(0, Math.round((expireTime - Date.now()) / 1000)) : undefined),
    metadata: {
      seller_id: j["seller_id"] !== undefined ? String(j["seller_id"]) : undefined,
      user_id: j["user_id"] !== undefined ? String(j["user_id"]) : undefined,
      account: str(j["account"]),
    },
  };
}

export async function exchangeCodeForTokens(
  p: OAuthProviderConfig,
  args: { code: string; redirectUri: string; tokenUrl: string },
): Promise<ExchangedTokens> {
  switch (p.flavor) {
    case "tiktok":
      return exchangeTiktok(p, args.code, args.redirectUri);
    case "instagram":
      return exchangeInstagram(p, args.code, args.redirectUri);
    case "iop":
      return exchangeIop(p, args.code);
    default:
      return exchangeStandard(p, args.tokenUrl, args.code, args.redirectUri);
  }
}
