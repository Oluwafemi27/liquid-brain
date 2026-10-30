// Client-safe (no secrets, no server-only imports): describes HOW each
// connector connects so Settings can render the right UI and the server can
// validate what it receives. Credentials themselves never live here.

export interface KeyField {
  name: string;
  label: string;
  placeholder?: string;
  /** Rendered as a password input and never echoed back. */
  secret: boolean;
}

export interface KeyConnector {
  /** One-line instruction shown in the connect dialog. */
  help: string;
  fields: KeyField[];
}

/** Connectors that authenticate with credentials the owner pastes in
 *  (no redirect flow exists, or none that a third-party app can use). */
export const KEY_CONNECTORS: Record<string, KeyConnector> = {
  paystack: {
    help: "Paystack Dashboard → Settings → API Keys & Webhooks → copy your Secret key (sk_live_… or sk_test_…).",
    fields: [{ name: "secretKey", label: "Secret key", placeholder: "sk_live_…", secret: true }],
  },
  semrush: {
    help: "Semrush → Subscription info → API units → copy your API key. (Semrush's classic API is key-based; there is no OAuth redirect.)",
    fields: [
      { name: "apiKey", label: "API key", placeholder: "Your Semrush API key", secret: true },
    ],
  },
  jumia: {
    help: "Jumia Vendor Center → Settings → Applications → Create Application, then copy its Client ID and generate a token. Jumia sellers create their own application; there is no public “Login with Jumia” flow.",
    fields: [
      { name: "clientId", label: "Client ID", placeholder: "Application client ID", secret: false },
      { name: "token", label: "Application token", placeholder: "Generated token", secret: true },
    ],
  },
};

export const isKeyConnector = (id: string) => id in KEY_CONNECTORS;

/** Providers that connect through a browser redirect (see server/oauth-providers.ts). */
export const OAUTH_CONNECTOR_IDS = [
  "shopify",
  "ga",
  "sheets",
  "drive",
  "gmail",
  "meta",
  "instagram",
  "tiktok",
  "discord",
  "aliexpress",
  "alibaba",
] as const;
