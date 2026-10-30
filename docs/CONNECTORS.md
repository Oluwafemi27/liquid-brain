# Connector setup

Redirect URI for every OAuth provider: `{APP_URL}/api/connectors/<id>/callback`
(`APP_URL` must be your real public https origin.) Restart after changing env vars.

| Connector | id | How it connects | Env vars | Notes |
|---|---|---|---|---|
| Google Analytics / Sheets | `ga`, `sheets` | OAuth | `GOOGLE_CLIENT_ID/SECRET` | already set up |
| Google Drive | `drive` | OAuth | same Google pair | Enable the Drive API; add `…/drive/callback` as a redirect URI. Scope: `drive.readonly` |
| Gmail | `gmail` | OAuth | same Google pair | Enable the Gmail API; add `…/gmail/callback`. Scopes `gmail.readonly` + `gmail.send` are **restricted**: only your listed test users can connect until Google verifies the app |
| Instagram | `instagram` | OAuth | `INSTAGRAM_CLIENT_ID/SECRET` | Meta app → "Instagram API with Instagram Login" (its own id/secret, not the Meta Ads pair). Needs an Instagram Business/Creator account. Callback swaps the 1h token for a ~60-day one |
| TikTok | `tiktok` | OAuth | `TIKTOK_CLIENT_KEY/SECRET` | developers.tiktok.com → app → Login Kit. TikTok calls the id a *client key*. Scopes must be approved for your app |
| Discord | `discord` | OAuth | `DISCORD_CLIENT_ID/SECRET` | Discord Developer Portal → OAuth2 → add redirect. Scopes `identify guilds` only. Reading server messages needs a **bot token** + Message Content intent (not OAuth) |
| AliExpress | `aliexpress` | OAuth (signed) | `ALIEXPRESS_APP_KEY/SECRET` | open.aliexpress.com → app → set callback URL. Token call is HMAC-SHA256 signed (`oauth-exchange.ts`) |
| Alibaba | `alibaba` | OAuth (signed) | `ALIBABA_APP_KEY/SECRET` | open.alibaba.com app. Same signed exchange as AliExpress |
| Shopify / Meta Ads | `shopify`, `meta` | OAuth | see `.env.example` | Shopify callback is now HMAC-verified and the shop domain validated |
| Semrush | `semrush` | pasted API key | none | Settings → Integrations → Connect. Stored encrypted (Supabase Vault) |
| Jumia | `jumia` | pasted app credentials | none | Vendor Center → Settings → Applications. No public "Login with Jumia" exists |
| Paystack | `paystack` | pasted secret key | none | Same dialog as above |
| Telegram | `telegram` | bot token + **Telegram Business** | none | see below |

Run `supabase/migrations/016_connector_keys_and_telegram_business.sql` first.

## Telegram: reading and answering your own customer DMs

Telegram's bot API cannot read a personal account's chats, and Telegram has no OAuth for
message access. The official mechanism is **Telegram Business → Chatbots**:

1. @BotFather → `/mybots` → your bot → Bot Settings → **Business Mode** → on.
2. Settings → Telegram → **Enable Business updates**.
3. In Telegram: Settings → **Business** → **Chatbots** → add your bot, choose which chats it can
   see, allow it to reply.
4. Back in ADUF, add your business info and switch **Auto-reply** on (off by default).

Customer messages then arrive as `business_message` webhooks and replies go out from your
account. Auto-replies use a separate customer-safe assistant: no tools, no access to your
business data, only the info you wrote. It goes quiet in a chat when you type there yourself,
hands off (and alerts you) when it can't answer, and is capped per chat per hour.

## Importing business data (Analytics page)

Run `supabase/migrations/017_business_data_import.sql` first (creates `data_imports`,
`business_records`, `traffic_snapshots` — RLS on, no policies: service-role only, because they hold
customer names/emails). Analytics → **Import / manage data** then offers four sources:

| Source | Needs | What it imports |
|---|---|---|
| Upload CSV | nothing | Sales, leads, customers or deals. Columns are auto-detected and editable; a preview shows exactly what will be saved. `.xlsx` isn't read directly — export to CSV or open it in Google Sheets |
| Sheets & Drive | `drive` and/or `sheets` connected | Same as CSV, from a Sheet tab or a CSV in Drive. Drive lists files; with only Sheets connected, paste a link |
| Analytics | `ga` connected | Last 6 months of sessions, key events, purchase revenue by month and by channel group (GA4). Only used for the Sales / Leads / Channel panels when you haven't imported your own records |
| Gmail | `gmail` connected | Each new sender in the latest 200 primary-inbox emails (last 6 months) as a lead. Headers only — never message text; newsletters / no-reply mail ignored |

Google Cloud APIs to enable for the OAuth project (on top of Drive/Gmail above): **Google Sheets API**,
**Google Analytics Data API**, **Google Analytics Admin API**. A disabled API shows its name and a link in the
error on the import panel. Access tokens are refreshed automatically from the saved refresh token.

Rules worth knowing: re-importing the same file / property / mailbox **replaces** what it added before (no
double counting); amounts are stored in the currency you pick and converted to USD for display with live
rates; rows that can't be read are skipped and reported, never guessed; lost deals are skipped (the board
shows active pipeline only); a file's max is 10,000 rows.
