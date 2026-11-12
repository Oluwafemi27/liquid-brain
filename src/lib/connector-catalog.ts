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

  // ---- Payments
  stripe: {
    help: "Stripe Dashboard → Developers → API keys → Create restricted key with READ access to Charges only (rk_live_…). Never paste a full-access secret key.",
    fields: [
      { name: "secretKey", label: "Restricted key", placeholder: "rk_live_…", secret: true },
    ],
  },
  flutterwave: {
    help: "Flutterwave Dashboard → Settings → API Keys → copy your Secret key (FLWSECK-…).",
    fields: [{ name: "secretKey", label: "Secret key", placeholder: "FLWSECK-…", secret: true }],
  },
  paypal: {
    help: "PayPal Developer → Apps & Credentials (Live) → create an app, then copy its Client ID and Secret.",
    fields: [
      { name: "clientId", label: "Client ID", secret: false },
      { name: "clientSecret", label: "Client secret", secret: true },
    ],
  },
  square: {
    help: "Square Developer Dashboard → your application → Credentials → Production access token.",
    fields: [{ name: "accessToken", label: "Access token", secret: true }],
  },
  // ---- Commerce
  woocommerce: {
    help: "WooCommerce → Settings → Advanced → REST API → Add key with Read permission. Your store must use https.",
    fields: [
      {
        name: "storeUrl",
        label: "Store address",
        placeholder: "https://mystore.com",
        secret: false,
      },
      { name: "consumerKey", label: "Consumer key", placeholder: "ck_…", secret: true },
      { name: "consumerSecret", label: "Consumer secret", placeholder: "cs_…", secret: true },
    ],
  },
  bigcommerce: {
    help: "BigCommerce → Settings → API → Store-level API accounts → create one with read-only scopes. Your store hash is in the API path (stores/HASH).",
    fields: [
      { name: "storeHash", label: "Store hash", secret: false },
      { name: "accessToken", label: "Access token", secret: true },
    ],
  },
  wordpress: {
    help: "WordPress → Users → Profile → Application Passwords → add one named ADUF. Your site must use https.",
    fields: [
      { name: "siteUrl", label: "Site address", placeholder: "https://mysite.com", secret: false },
      { name: "username", label: "Username", secret: false },
      { name: "appPassword", label: "Application password", secret: true },
    ],
  },
  webflow: {
    help: "Webflow → Site settings → Apps & integrations → API access → generate a site token (read-only).",
    fields: [{ name: "apiToken", label: "API token", secret: true }],
  },
  // ---- CRM & Sales
  hubspot: {
    help: "HubSpot → Settings → Integrations → Private Apps → create one with read access to contacts and deals, then copy its access token (pat-…).",
    fields: [
      { name: "accessToken", label: "Private app token", placeholder: "pat-…", secret: true },
    ],
  },
  pipedrive: {
    help: "Pipedrive → your avatar → Personal preferences → API → copy your personal API token.",
    fields: [{ name: "apiToken", label: "API token", secret: true }],
  },
  // ---- Marketing & Email
  mailchimp: {
    help: "Mailchimp → Account → Extras → API keys → Create a key. It ends with a data-centre like -us21.",
    fields: [{ name: "apiKey", label: "API key", placeholder: "xxxxxxxx-us21", secret: true }],
  },
  sendgrid: {
    help: "SendGrid → Settings → API Keys → create a key with Restricted Access (read-only stats).",
    fields: [{ name: "apiKey", label: "API key", placeholder: "SG.…", secret: true }],
  },
  brevo: {
    help: "Brevo → your name → SMTP & API → API Keys → generate a key.",
    fields: [{ name: "apiKey", label: "API key", placeholder: "xkeysib-…", secret: true }],
  },
  klaviyo: {
    help: "Klaviyo → Account → Settings → API keys → create a Private key with read-only access.",
    fields: [{ name: "privateKey", label: "Private API key", placeholder: "pk_…", secret: true }],
  },
  // ---- Messaging
  whatsapp: {
    help: "Meta for Developers → your app → WhatsApp → API setup: copy the permanent access token and the Phone number ID.",
    fields: [
      { name: "accessToken", label: "Access token", secret: true },
      { name: "phoneNumberId", label: "Phone number ID", secret: false },
    ],
  },
  twilio: {
    help: "Twilio Console → Account info: copy your Account SID and Auth token.",
    fields: [
      { name: "accountSid", label: "Account SID", placeholder: "AC…", secret: false },
      { name: "authToken", label: "Auth token", secret: true },
    ],
  },
  termii: {
    help: "Termii Dashboard → API → copy your API key.",
    fields: [{ name: "apiKey", label: "API key", placeholder: "TL…", secret: true }],
  },
  africastalking: {
    help: "Africa's Talking → Settings → API Key. Use your account username (not “sandbox”).",
    fields: [
      { name: "username", label: "Username", secret: false },
      { name: "apiKey", label: "API key", secret: true },
    ],
  },
  slack: {
    help: "api.slack.com/apps → your app → OAuth & Permissions → install to workspace, then copy the Bot User OAuth Token (xoxb-…).",
    fields: [{ name: "botToken", label: "Bot token", placeholder: "xoxb-…", secret: true }],
  },
  // ---- Productivity
  airtable: {
    help: "airtable.com/create/tokens → create a personal access token with read scopes for the bases you want to share.",
    fields: [{ name: "token", label: "Personal access token", placeholder: "pat…", secret: true }],
  },
  notion: {
    help: "notion.so/my-integrations → create an internal integration, copy its secret, then share the pages you want with it.",
    fields: [{ name: "token", label: "Integration secret", placeholder: "secret_…", secret: true }],
  },
  typeform: {
    help: "Typeform → Account → Personal tokens → generate a token with read-only scopes.",
    fields: [{ name: "token", label: "Personal token", secret: true }],
  },
  calendly: {
    help: "Calendly → Integrations → API & Webhooks → generate a personal access token.",
    fields: [{ name: "token", label: "Personal access token", secret: true }],
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
  "gsc",
  "gcal",
  "youtube",
] as const;
