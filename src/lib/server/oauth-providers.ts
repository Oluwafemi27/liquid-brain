import "@tanstack/react-start/server-only";
import { KEY_CONNECTORS } from "@/lib/connector-catalog";

export interface OAuthProviderConfig {
  id: string;
  displayName: string;
  authorizeUrl: string;
  tokenUrl: string;
  scope: string;
  clientId: string | undefined;
  clientSecret: string | undefined;
  /** Extra fixed query params the provider's authorize URL needs. */
  extraAuthorizeParams?: Record<string, string>;
  /** Shopify needs a per-merchant shop domain; others don't. */
  requiresShopParam?: boolean;
  /** Query-param name for the app id on the authorize/token requests.
   *  Defaults to "client_id"; TikTok calls it "client_key". */
  clientIdParam?: string;
  /** How the code→token exchange differs from plain OAuth 2.0:
   *  - "standard": form POST with client_id/secret (Google, Discord, Shopify, Meta)
   *  - "tiktok":   like standard, but client_key + flat response with open_id
   *  - "instagram": short-lived token, then swapped for a ~60-day one
   *  - "iop":      Alibaba/AliExpress Open Platform — HMAC-SHA256 signed request */
  flavor?: "standard" | "tiktok" | "instagram" | "iop";
}

/** true if this provider isn't OAuth at all (e.g. Paystack, which connects
 *  via a secret API key pasted by the owner, not a redirect flow). */
export interface KeyBasedProviderConfig {
  id: string;
  displayName: string;
  keyBased: true;
  /** Field names accepted by POST /api/connectors/:id/manage (see connector-catalog.ts). */
  fieldNames?: string[];
}

export type ProviderConfig = OAuthProviderConfig | KeyBasedProviderConfig;

function isOAuth(p: ProviderConfig): p is OAuthProviderConfig {
  return !("keyBased" in p);
}

/**
 * One entry per Automation Grid / Settings source id (see initial-data.ts
 * `initialDataSources`). Populate the matching *_CLIENT_ID / *_CLIENT_SECRET
 * env vars once you've registered an OAuth app with each provider — the
 * authorize/callback routes work as soon as they're set, no code changes.
 */
export const OAUTH_PROVIDERS: Record<string, ProviderConfig> = {
  shopify: {
    id: "shopify",
    displayName: "Shopify",
    authorizeUrl: "https://{shop}.myshopify.com/admin/oauth/authorize",
    tokenUrl: "https://{shop}.myshopify.com/admin/oauth/access_token",
    scope: "read_orders,read_products,read_customers",
    clientId: process.env["SHOPIFY_CLIENT_ID"],
    clientSecret: process.env["SHOPIFY_CLIENT_SECRET"],
    requiresShopParam: true,
  },
  ga: {
    id: "ga",
    displayName: "Google Analytics",
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scope: "https://www.googleapis.com/auth/analytics.readonly",
    clientId: process.env["GOOGLE_CLIENT_ID"],
    clientSecret: process.env["GOOGLE_CLIENT_SECRET"],
    extraAuthorizeParams: { access_type: "offline", prompt: "consent" },
  },
  sheets: {
    id: "sheets",
    displayName: "Google Sheets",
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
    clientId: process.env["GOOGLE_CLIENT_ID"],
    clientSecret: process.env["GOOGLE_CLIENT_SECRET"],
    extraAuthorizeParams: { access_type: "offline", prompt: "consent" },
  },
  drive: {
    id: "drive",
    displayName: "Google Drive",
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scope: "https://www.googleapis.com/auth/drive.readonly",
    clientId: process.env["GOOGLE_CLIENT_ID"],
    clientSecret: process.env["GOOGLE_CLIENT_SECRET"],
    extraAuthorizeParams: { access_type: "offline", prompt: "consent" },
  },
  gmail: {
    id: "gmail",
    displayName: "Gmail",
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    // Restricted scopes: Google requires app verification (and a security
    // assessment) before anyone outside your test-user list can grant these.
    scope:
      "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send",
    clientId: process.env["GOOGLE_CLIENT_ID"],
    clientSecret: process.env["GOOGLE_CLIENT_SECRET"],
    extraAuthorizeParams: { access_type: "offline", prompt: "consent" },
  },
  instagram: {
    id: "instagram",
    displayName: "Instagram",
    // "Instagram API with Instagram Login" — separate app id/secret from your Meta Ads app.
    authorizeUrl: "https://www.instagram.com/oauth/authorize",
    tokenUrl: "https://api.instagram.com/oauth/access_token",
    scope:
      "instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments",
    clientId: process.env["INSTAGRAM_CLIENT_ID"],
    clientSecret: process.env["INSTAGRAM_CLIENT_SECRET"],
    flavor: "instagram",
  },
  tiktok: {
    id: "tiktok",
    displayName: "TikTok",
    authorizeUrl: "https://www.tiktok.com/v2/auth/authorize/",
    tokenUrl: "https://open.tiktokapis.com/v2/oauth/token/",
    scope: "user.info.basic,user.info.stats,video.list",
    clientId: process.env["TIKTOK_CLIENT_KEY"],
    clientSecret: process.env["TIKTOK_CLIENT_SECRET"],
    clientIdParam: "client_key",
    flavor: "tiktok",
  },
  discord: {
    id: "discord",
    displayName: "Discord",
    authorizeUrl: "https://discord.com/oauth2/authorize",
    tokenUrl: "https://discord.com/api/oauth2/token",
    // User-level OAuth only. Reading/answering server messages needs a bot
    // token + Message Content intent — a separate credential, not OAuth.
    scope: "identify guilds",
    clientId: process.env["DISCORD_CLIENT_ID"],
    clientSecret: process.env["DISCORD_CLIENT_SECRET"],
  },
  aliexpress: {
    id: "aliexpress",
    displayName: "AliExpress",
    authorizeUrl: "https://api-sg.aliexpress.com/oauth/authorize",
    // Signed endpoint — see exchangeIop() in the callback route.
    tokenUrl: "https://api-sg.aliexpress.com/rest/auth/token/create",
    scope: "",
    clientId: process.env["ALIEXPRESS_APP_KEY"],
    clientSecret: process.env["ALIEXPRESS_APP_SECRET"],
    extraAuthorizeParams: { force_auth: "true" },
    flavor: "iop",
  },
  alibaba: {
    id: "alibaba",
    displayName: "Alibaba",
    authorizeUrl: "https://open-api.alibaba.com/oauth/authorize",
    tokenUrl: "https://open-api.alibaba.com/rest/auth/token/create",
    scope: "",
    clientId: process.env["ALIBABA_APP_KEY"],
    clientSecret: process.env["ALIBABA_APP_SECRET"],
    flavor: "iop",
  },
  meta: {
    id: "meta",
    displayName: "Meta Ads",
    authorizeUrl: "https://www.facebook.com/v21.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v21.0/oauth/access_token",
    scope: "ads_read,business_management",
    clientId: process.env["META_CLIENT_ID"],
    clientSecret: process.env["META_CLIENT_SECRET"],
  },
  paystack: {
    id: "paystack",
    displayName: "Paystack",
    keyBased: true,
    fieldNames: KEY_CONNECTORS["paystack"]!.fields.map((f) => f.name),
  },
  semrush: {
    id: "semrush",
    displayName: "Semrush",
    keyBased: true,
    fieldNames: KEY_CONNECTORS["semrush"]!.fields.map((f) => f.name),
  },
  jumia: {
    id: "jumia",
    displayName: "Jumia",
    keyBased: true,
    fieldNames: KEY_CONNECTORS["jumia"]!.fields.map((f) => f.name),
  },
  // Bot token from @BotFather, pasted in Settings — see src/lib/server/telegram.ts.
  telegram: {
    id: "telegram",
    displayName: "Telegram",
    keyBased: true,
  },
};

export function getProvider(id: string): ProviderConfig | undefined {
  return OAUTH_PROVIDERS[id];
}

export { isOAuth };
