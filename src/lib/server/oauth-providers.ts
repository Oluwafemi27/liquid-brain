import "@tanstack/react-start/server-only";

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
}

/** true if this provider isn't OAuth at all (e.g. Paystack, which connects
 *  via a secret API key pasted by the owner, not a redirect flow). */
export interface KeyBasedProviderConfig {
  id: string;
  displayName: string;
  keyBased: true;
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
  meta: {
    id: "meta",
    displayName: "Meta Ads",
    authorizeUrl: "https://www.facebook.com/v21.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v21.0/oauth/access_token",
    scope: "ads_read,business_management",
    clientId: process.env["META_CLIENT_ID"],
    clientSecret: process.env["META_CLIENT_SECRET"],
  },
  whatsapp: {
    id: "whatsapp",
    displayName: "WhatsApp Business",
    authorizeUrl: "https://www.facebook.com/v21.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v21.0/oauth/access_token",
    scope: "whatsapp_business_management,whatsapp_business_messaging",
    clientId: process.env["META_CLIENT_ID"],
    clientSecret: process.env["META_CLIENT_SECRET"],
  },
  paystack: {
    id: "paystack",
    displayName: "Paystack",
    keyBased: true,
  },
};

export function getProvider(id: string): ProviderConfig | undefined {
  return OAUTH_PROVIDERS[id];
}

export { isOAuth };
