// Client-safe catalog of every platform ADUF can connect to. The Settings hub, the server's status
// list and the display names all derive from this one list — add a connector here (plus its
// credential fields in connector-catalog.ts or its OAuth entry on the server) and it appears everywhere.

export const CONNECTOR_CATEGORIES = [
  "Payments",
  "Commerce",
  "CRM & Sales",
  "Marketing & Email",
  "Messaging",
  "Social & Ads",
  "Analytics & SEO",
  "Productivity",
  "Files & Data",
  "Marketplaces",
] as const;
export type ConnectorCategory = (typeof CONNECTOR_CATEGORIES)[number];

/** How you connect: a browser sign-in, pasted credentials, or a bot token. */
export type ConnectorAuth = "oauth" | "key" | "bot";
/** What ADUF can pull in from it today (feeds Analytics). */
export type ConnectorImport = "sales" | "leads" | "deals" | "traffic" | "tables";

export interface ConnectorDef {
  id: string;
  name: string;
  category: ConnectorCategory;
  auth: ConnectorAuth;
  blurb: string;
  imports?: ConnectorImport[];
  popular?: boolean;
  /** Especially useful for businesses in Nigeria / Africa. */
  africa?: boolean;
}

export const CONNECTORS: ConnectorDef[] = [
  // ---- Payments
  {
    id: "paystack",
    name: "Paystack",
    category: "Payments",
    auth: "key",
    blurb: "Import your successful payments as sales.",
    imports: ["sales"],
    popular: true,
    africa: true,
  },
  {
    id: "flutterwave",
    name: "Flutterwave",
    category: "Payments",
    auth: "key",
    blurb: "Import successful transactions as sales.",
    imports: ["sales"],
    popular: true,
    africa: true,
  },
  {
    id: "stripe",
    name: "Stripe",
    category: "Payments",
    auth: "key",
    blurb: "Import paid charges as sales (use a read-only key).",
    imports: ["sales"],
  },
  {
    id: "paypal",
    name: "PayPal",
    category: "Payments",
    auth: "key",
    blurb: "Connect your PayPal business account.",
  },
  {
    id: "square",
    name: "Square",
    category: "Payments",
    auth: "key",
    blurb: "Connect your Square locations and payments.",
  },
  // ---- Commerce
  {
    id: "shopify",
    name: "Shopify",
    category: "Commerce",
    auth: "oauth",
    blurb: "Orders, products and customers from your store.",
    popular: true,
  },
  {
    id: "woocommerce",
    name: "WooCommerce",
    category: "Commerce",
    auth: "key",
    blurb: "Import completed orders from your WordPress store.",
    imports: ["sales"],
    popular: true,
  },
  {
    id: "bigcommerce",
    name: "BigCommerce",
    category: "Commerce",
    auth: "key",
    blurb: "Connect your BigCommerce store.",
  },
  {
    id: "wordpress",
    name: "WordPress",
    category: "Commerce",
    auth: "key",
    blurb: "Connect a self-hosted WordPress site.",
  },
  {
    id: "webflow",
    name: "Webflow",
    category: "Commerce",
    auth: "key",
    blurb: "Connect your Webflow sites.",
  },
  // ---- CRM & Sales
  {
    id: "hubspot",
    name: "HubSpot",
    category: "CRM & Sales",
    auth: "key",
    blurb: "Import contacts as leads and deals into your pipeline.",
    imports: ["leads", "deals"],
    popular: true,
  },
  {
    id: "pipedrive",
    name: "Pipedrive",
    category: "CRM & Sales",
    auth: "key",
    blurb: "Import your deals into the pipeline board.",
    imports: ["deals"],
  },
  // ---- Marketing & Email
  {
    id: "mailchimp",
    name: "Mailchimp",
    category: "Marketing & Email",
    auth: "key",
    blurb: "Connect your email audiences and campaigns.",
    popular: true,
  },
  {
    id: "sendgrid",
    name: "SendGrid",
    category: "Marketing & Email",
    auth: "key",
    blurb: "Connect your transactional email account.",
  },
  {
    id: "brevo",
    name: "Brevo",
    category: "Marketing & Email",
    auth: "key",
    blurb: "Connect email and SMS marketing.",
  },
  {
    id: "klaviyo",
    name: "Klaviyo",
    category: "Marketing & Email",
    auth: "key",
    blurb: "Connect e-commerce email and SMS flows.",
  },
  // ---- Messaging
  {
    id: "whatsapp",
    name: "WhatsApp Business",
    category: "Messaging",
    auth: "key",
    blurb: "Connect your WhatsApp Business Cloud number.",
    popular: true,
    africa: true,
  },
  {
    id: "telegram",
    name: "Telegram",
    category: "Messaging",
    auth: "bot",
    blurb: "Customer chats, alerts and your daily summary.",
    popular: true,
  },
  {
    id: "gmail",
    name: "Gmail",
    category: "Messaging",
    auth: "oauth",
    blurb: "Count new people who email you as leads (headers only).",
    imports: ["leads"],
  },
  {
    id: "twilio",
    name: "Twilio",
    category: "Messaging",
    auth: "key",
    blurb: "Connect SMS and voice.",
  },
  {
    id: "termii",
    name: "Termii",
    category: "Messaging",
    auth: "key",
    blurb: "Nigerian SMS and WhatsApp messaging.",
    africa: true,
  },
  {
    id: "africastalking",
    name: "Africa's Talking",
    category: "Messaging",
    auth: "key",
    blurb: "SMS, USSD and voice across Africa.",
    africa: true,
  },
  {
    id: "slack",
    name: "Slack",
    category: "Messaging",
    auth: "key",
    blurb: "Connect a Slack workspace with a bot token.",
  },
  {
    id: "discord",
    name: "Discord",
    category: "Messaging",
    auth: "oauth",
    blurb: "Your username and servers.",
  },
  // ---- Social & Ads
  {
    id: "meta",
    name: "Meta Ads",
    category: "Social & Ads",
    auth: "oauth",
    blurb: "Read your Facebook and Instagram ad results.",
  },
  {
    id: "instagram",
    name: "Instagram",
    category: "Social & Ads",
    auth: "oauth",
    blurb: "Your business profile, comments and messages.",
  },
  {
    id: "tiktok",
    name: "TikTok",
    category: "Social & Ads",
    auth: "oauth",
    blurb: "Profile stats and your videos.",
  },
  {
    id: "youtube",
    name: "YouTube",
    category: "Social & Ads",
    auth: "oauth",
    blurb: "Channel and video performance (read-only).",
  },
  // ---- Analytics & SEO
  {
    id: "ga",
    name: "Google Analytics",
    category: "Analytics & SEO",
    auth: "oauth",
    blurb: "Website traffic, sign-ups and revenue by month.",
    imports: ["traffic"],
    popular: true,
  },
  {
    id: "gsc",
    name: "Search Console",
    category: "Analytics & SEO",
    auth: "oauth",
    blurb: "How people find you on Google Search (read-only).",
  },
  {
    id: "semrush",
    name: "Semrush",
    category: "Analytics & SEO",
    auth: "key",
    blurb: "SEO and keyword data from your plan.",
  },
  // ---- Productivity
  {
    id: "gcal",
    name: "Google Calendar",
    category: "Productivity",
    auth: "oauth",
    blurb: "See your schedule so reminders fit around it.",
  },
  {
    id: "airtable",
    name: "Airtable",
    category: "Productivity",
    auth: "key",
    blurb: "Connect your Airtable account.",
  },
  {
    id: "notion",
    name: "Notion",
    category: "Productivity",
    auth: "key",
    blurb: "Connect a Notion workspace.",
  },
  {
    id: "typeform",
    name: "Typeform",
    category: "Productivity",
    auth: "key",
    blurb: "Connect your forms and responses.",
  },
  {
    id: "calendly",
    name: "Calendly",
    category: "Productivity",
    auth: "key",
    blurb: "Connect your booking links.",
  },
  // ---- Files & Data
  {
    id: "sheets",
    name: "Google Sheets",
    category: "Files & Data",
    auth: "oauth",
    blurb: "Import any sheet of sales, leads, customers or deals.",
    imports: ["tables"],
    popular: true,
  },
  {
    id: "drive",
    name: "Google Drive",
    category: "Files & Data",
    auth: "oauth",
    blurb: "Browse your spreadsheets and CSV files.",
    imports: ["tables"],
  },
  // ---- Marketplaces
  {
    id: "jumia",
    name: "Jumia",
    category: "Marketplaces",
    auth: "key",
    blurb: "Connect your Jumia vendor application.",
    africa: true,
  },
  {
    id: "aliexpress",
    name: "AliExpress",
    category: "Marketplaces",
    auth: "oauth",
    blurb: "Connect your AliExpress seller account.",
  },
  {
    id: "alibaba",
    name: "Alibaba",
    category: "Marketplaces",
    auth: "oauth",
    blurb: "Connect your Alibaba supplier account.",
  },
];

export const CONNECTOR_BY_ID: Record<string, ConnectorDef> = Object.fromEntries(
  CONNECTORS.map((c) => [c.id, c]),
);
export const CONNECTOR_IDS = CONNECTORS.map((c) => c.id);

const IMPORT_LABEL: Record<ConnectorImport, string> = {
  sales: "sales",
  leads: "leads",
  deals: "deals",
  traffic: "traffic",
  tables: "any table",
};
export const importLabel = (c: ConnectorDef) =>
  (c.imports ?? []).map((i) => IMPORT_LABEL[i]).join(", ");

/** A few good places to start, based on the business type the owner told us about. */
export function recommendConnectors(profile: string): string[] {
  const p = profile.toLowerCase();
  if (/shop|store|e-?commerce|retail|fashion|boutique|sell/.test(p))
    return ["paystack", "shopify", "woocommerce", "whatsapp"];
  if (/agency|consult|service|b2b|freelanc|coach|studio/.test(p))
    return ["hubspot", "gcal", "gmail", "sheets"];
  if (/creator|content|influenc|media|blog|youtube|social/.test(p))
    return ["instagram", "youtube", "ga", "mailchimp"];
  if (/restaurant|food|cafe|bakery|catering/.test(p))
    return ["paystack", "whatsapp", "sheets", "instagram"];
  return ["ga", "sheets", "paystack", "whatsapp"];
}
