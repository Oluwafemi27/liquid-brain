import { CONNECTORS } from "./connector-registry";

// Client-safe, plain-language description of exactly what each integration lets
// ADUF read and change. Keep in step with the scopes in lib/server/oauth-providers.ts
// (the test in tools/check-permissions.mjs fails the build if they drift).

export interface IntegrationAccess {
  id: string;
  /** What ADUF can see. */
  reads: string[];
  /** What ADUF can change. Empty = nothing. */
  changes: string[];
  /** Things people worry about that ADUF does NOT do. */
  never: string[];
  /** How to cut access off at the provider, beyond disconnecting here. */
  revoke: string;
  /** Scope strings requested (for the drift test). Empty for key-based connectors. */
  scopes: string[];
}

export const INTEGRATION_ACCESS: Record<string, IntegrationAccess> = {
  ga: {
    id: "ga",
    reads: ["Your website traffic, sign-ups/key events and purchase revenue in Google Analytics"],
    changes: [],
    never: ["Edit or delete anything in Analytics"],
    revoke: "myaccount.google.com → Security → Third-party access",
    scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
  },
  sheets: {
    id: "sheets",
    reads: ["The Google Sheets you choose to import (ADUF reads a sheet only when you pick it)"],
    changes: [],
    never: ["Edit your sheets"],
    revoke: "myaccount.google.com → Security → Third-party access",
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  },
  drive: {
    id: "drive",
    reads: [
      "The names of spreadsheets and CSV files in your Drive, and the contents of the one you pick. Google has no narrower option that lets ADUF list files, so this permission technically covers all your Drive files — ADUF only opens ones you choose.",
    ],
    changes: [],
    never: ["Edit, move or delete files", "Read files you didn't pick"],
    revoke: "myaccount.google.com → Security → Third-party access",
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
  },
  gmail: {
    id: "gmail",
    reads: [
      "Who emailed you and when (sender, date and subject lines). Never the text of your emails.",
    ],
    changes: [],
    never: ["Read email bodies or attachments", "Send, delete or label email"],
    revoke: "myaccount.google.com → Security → Third-party access",
    scopes: ["https://www.googleapis.com/auth/gmail.metadata"],
  },
  shopify: {
    id: "shopify",
    reads: ["Your orders, products and customers"],
    changes: [],
    never: ["Change orders, prices or products", "Issue refunds"],
    revoke: "Shopify admin → Settings → Apps and sales channels",
    scopes: ["read_orders,read_products,read_customers"],
  },
  meta: {
    id: "meta",
    reads: ["Your ad accounts' spend and results"],
    changes: [],
    never: ["Change budgets or pause ads — ADUF can only recommend; you make the change"],
    revoke: "facebook.com → Settings → Business integrations",
    scopes: ["ads_read"],
  },
  instagram: {
    id: "instagram",
    reads: ["Your Instagram business profile, comments and direct messages"],
    changes: [
      "Can reply to comments and messages — ADUF doesn't send any today; it only drafts, and sending would need your approval",
    ],
    never: ["Post or delete content"],
    revoke: "Instagram → Settings → Apps and websites",
    scopes: [
      "instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments",
    ],
  },
  tiktok: {
    id: "tiktok",
    reads: ["Your TikTok profile stats and video list"],
    changes: [],
    never: ["Post or delete videos"],
    revoke: "TikTok → Settings → Security → Manage app permissions",
    scopes: ["user.info.basic,user.info.stats,video.list"],
  },
  discord: {
    id: "discord",
    reads: ["Your Discord username and the list of servers you're in"],
    changes: [],
    never: ["Read messages in any server"],
    revoke: "Discord → User Settings → Authorized Apps",
    scopes: ["identify guilds"],
  },
  aliexpress: {
    id: "aliexpress",
    reads: ["Whatever your AliExpress app permissions allow"],
    changes: [],
    never: ["Place orders or spend money"],
    revoke: "AliExpress → Account → Authorized apps",
    scopes: [],
  },
  alibaba: {
    id: "alibaba",
    reads: ["Whatever your Alibaba app permissions allow"],
    changes: [],
    never: ["Place orders or spend money"],
    revoke: "Alibaba → Account → Authorized apps",
    scopes: [],
  },
  telegram: {
    id: "telegram",
    reads: [
      "Messages people send to your bot, and customer chats you explicitly add under Telegram Business",
    ],
    changes: [
      "Replies as your bot. Customer auto-replies are OFF until you switch them on, and stop at your daily message limit",
    ],
    never: ["Read chats you didn't add"],
    revoke: "Telegram → @BotFather → /revoke",
    scopes: [],
  },
  paystack: {
    id: "paystack",
    reads: ["Your Paystack transactions"],
    changes: [
      "Paystack only issues full-access secret keys, so this key could move money. ADUF only reads — it has no code that charges, refunds or pays out.",
    ],
    never: ["Charge, refund or pay out"],
    revoke: "Paystack Dashboard → Settings → API Keys → regenerate the key",
    scopes: [],
  },
  semrush: {
    id: "semrush",
    reads: ["SEO data your Semrush plan includes (uses your API units)"],
    changes: [],
    never: ["Change your Semrush account"],
    revoke: "Semrush → Subscription info → regenerate API key",
    scopes: [],
  },
  jumia: {
    id: "jumia",
    reads: ["Your Jumia vendor data your application token allows"],
    changes: [],
    never: ["Change listings or prices"],
    revoke: "Jumia Vendor Center → Settings → Applications → delete the application",
    scopes: [],
  },
};

const verifyOnly =
  "Nothing yet — ADUF only checks that this connection works. Data import for it isn't built.";
const full = (what: string) =>
  `This credential can ${what}. ADUF has no code that does so, and only reads.`;
const mk = (
  id: string,
  reads: string[],
  changes: string[],
  never: string[],
  revoke: string,
  scopes: string[] = [],
): IntegrationAccess => ({ id, reads, changes, never, revoke, scopes });

Object.assign(INTEGRATION_ACCESS, {
  gsc: mk(
    "gsc",
    ["How people find you on Google Search: queries, pages, clicks and impressions"],
    [],
    ["Change your Search Console settings"],
    "myaccount.google.com → Security → Third-party access",
    ["https://www.googleapis.com/auth/webmasters.readonly"],
  ),
  gcal: mk(
    "gcal",
    ["Your calendar events (titles and times)"],
    [],
    ["Create, edit or delete events"],
    "myaccount.google.com → Security → Third-party access",
    ["https://www.googleapis.com/auth/calendar.readonly"],
  ),
  youtube: mk(
    "youtube",
    ["Your channel, videos and their view/watch statistics"],
    [],
    ["Upload, edit or delete videos"],
    "myaccount.google.com → Security → Third-party access",
    [
      "https://www.googleapis.com/auth/youtube.readonly",
      "https://www.googleapis.com/auth/yt-analytics.readonly",
    ],
  ),
  stripe: mk(
    "stripe",
    ["Your paid charges (amount, date, customer name/email) — imported as sales"],
    [],
    ["Charge, refund or pay out. Use a restricted READ-ONLY key so it can't even if misused."],
    "Stripe Dashboard → Developers → API keys → roll or delete the key",
  ),
  flutterwave: mk(
    "flutterwave",
    ["Your successful transactions — imported as sales"],
    [full("move money, because Flutterwave secret keys have full access")],
    ["Charge, refund or transfer"],
    "Flutterwave Dashboard → Settings → API Keys → regenerate",
  ),
  paypal: mk(
    "paypal",
    [verifyOnly],
    [full("act on your PayPal account within the app's permissions")],
    ["Send or refund payments"],
    "PayPal Developer → Apps → delete the app or reset its secret",
  ),
  square: mk(
    "square",
    [verifyOnly],
    [full("act on your Square account within the token's permissions")],
    ["Take payments or refund"],
    "Square Developer Dashboard → revoke the access token",
  ),
  woocommerce: mk(
    "woocommerce",
    [
      "Your completed and processing orders (amount, date, customer name/email) — imported as sales",
    ],
    [],
    ["Change orders, products or prices (use a Read-only key)"],
    "WooCommerce → Settings → Advanced → REST API → Revoke key",
  ),
  bigcommerce: mk(
    "bigcommerce",
    [verifyOnly],
    [],
    ["Change products or orders (use read-only scopes)"],
    "BigCommerce → Settings → API → delete the account",
  ),
  wordpress: mk(
    "wordpress",
    [verifyOnly],
    [full("act as that WordPress user — use a low-privilege user")],
    ["Publish or edit content"],
    "WordPress → Users → Profile → revoke the application password",
  ),
  webflow: mk(
    "webflow",
    [verifyOnly],
    [],
    ["Publish or edit your site (use a read-only token)"],
    "Webflow → Site settings → API access → revoke",
  ),
  hubspot: mk(
    "hubspot",
    ["Your contacts (imported as leads) and deals (imported to your pipeline)"],
    [],
    ["Create, edit or delete CRM records (give the private app read scopes only)"],
    "HubSpot → Settings → Private Apps → delete or rotate the token",
  ),
  pipedrive: mk(
    "pipedrive",
    ["Your deals (title, value, stage, owner) — imported to your pipeline"],
    [full("do anything you can do in Pipedrive, because personal tokens aren't scoped")],
    ["Create, edit or delete deals"],
    "Pipedrive → Personal preferences → API → generate a new token",
  ),
  mailchimp: mk(
    "mailchimp",
    [verifyOnly],
    [full("manage your audiences and send campaigns, because Mailchimp keys aren't scoped")],
    ["Send campaigns"],
    "Mailchimp → Account → Extras → API keys → disable",
  ),
  sendgrid: mk(
    "sendgrid",
    [verifyOnly],
    [],
    ["Send email (use a restricted key)"],
    "SendGrid → Settings → API Keys → delete",
  ),
  brevo: mk(
    "brevo",
    [verifyOnly],
    [full("manage contacts and send email/SMS, because Brevo keys aren't scoped")],
    ["Send campaigns"],
    "Brevo → SMTP & API → delete the key",
  ),
  klaviyo: mk(
    "klaviyo",
    [verifyOnly],
    [],
    ["Send campaigns (use a read-only private key)"],
    "Klaviyo → Settings → API keys → revoke",
  ),
  whatsapp: mk(
    "whatsapp",
    [verifyOnly],
    [full("send WhatsApp messages from your business number")],
    ["Send any message — ADUF doesn't send through WhatsApp today"],
    "Meta Business Suite → System users → revoke the token",
  ),
  twilio: mk(
    "twilio",
    [verifyOnly],
    [full("send messages, make calls and spend your Twilio balance")],
    ["Send messages or calls"],
    "Twilio Console → Account → Auth tokens → rotate",
  ),
  termii: mk(
    "termii",
    [verifyOnly],
    [full("send SMS and spend your Termii balance")],
    ["Send messages"],
    "Termii Dashboard → API → regenerate the key",
  ),
  africastalking: mk(
    "africastalking",
    [verifyOnly],
    [full("send SMS and spend your balance")],
    ["Send messages"],
    "Africa's Talking → Settings → API Key → regenerate",
  ),
  slack: mk(
    "slack",
    [verifyOnly],
    ["Whatever the bot's scopes allow (post messages, read channels it's in)"],
    ["Post anything — ADUF doesn't post to Slack today"],
    "api.slack.com/apps → your app → uninstall",
  ),
  airtable: mk(
    "airtable",
    [verifyOnly],
    [],
    ["Edit records (grant read scopes only)"],
    "airtable.com/create/tokens → delete the token",
  ),
  notion: mk(
    "notion",
    [verifyOnly],
    [],
    ["Edit pages (the integration only sees pages you share with it)"],
    "notion.so/my-integrations → delete the integration",
  ),
  typeform: mk(
    "typeform",
    [verifyOnly],
    [],
    ["Edit forms (use read-only scopes)"],
    "Typeform → Account → Personal tokens → delete",
  ),
  calendly: mk(
    "calendly",
    [verifyOnly],
    [],
    ["Create or cancel bookings"],
    "Calendly → Integrations → API & Webhooks → revoke the token",
  ),
});

/** Display names, so server and client agree (derived from the connector registry). */
export const PLATFORM_NAMES: Record<string, string> = {
  ...Object.fromEntries(CONNECTORS.map((c) => [c.id, c.name])),
  csv: "File uploads",
  aduf: "ADUF",
};
