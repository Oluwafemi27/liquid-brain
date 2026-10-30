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

/** Display names, so server and client agree. */
export const PLATFORM_NAMES: Record<string, string> = {
  ga: "Google Analytics",
  sheets: "Google Sheets",
  drive: "Google Drive",
  gmail: "Gmail",
  shopify: "Shopify",
  meta: "Meta Ads",
  instagram: "Instagram",
  tiktok: "TikTok",
  discord: "Discord",
  aliexpress: "AliExpress",
  alibaba: "Alibaba",
  telegram: "Telegram",
  paystack: "Paystack",
  semrush: "Semrush",
  jumia: "Jumia",
  csv: "File uploads",
  aduf: "ADUF",
};
