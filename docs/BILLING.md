# Plans, tokens, promo codes & payments

**Money flow:** customers pay *you* through **Paystack only** (NGN). Set `PAYSTACK_SECRET_KEY` and add
`https://YOUR-APP/api/billing/paystack-webhook` as the webhook in Paystack. Without the key, nobody can pay
(promo codes still work). This is separate from the "Paystack" *connector*, which reads a customer's own store payments.

## What a plan controls (all enforced on the server)
| Limit | Where it's enforced |
|---|---|
| Monthly **AI tokens** | the single model-call function (`callProviderChat`) — checked before, charged after, using the provider's reported usage |
| Custom automations | `createAutomation` (the six built-in channel switches don't count) |
| Data sources | `replaceImport` (new sources only; re-syncs are free) |
| n8n workflows / code execution / daily summary & pushed alerts | `requireFeature()` in the action executor, sandbox and alerts |

Tokens: the monthly allowance resets every 30 days (lazily, no cron needed); **bonus tokens** (top-ups, promos, admin grants)
never expire and are spent after the allowance. Every change is a row in `token_ledger`. The model key is workspace-wide
(yours), so tokens are how you recover that cost. If a user runs out, chat/plan/reply calls stop with a clear "top up or upgrade" message.

## Checkout & lifecycle
- Prices come from the database (admin-editable), never from the browser. Amounts are verified against Paystack before anything is delivered.
- The browser callback **and** the webhook can both arrive; a conditional update makes delivery idempotent.
- **Auto-renew:** admin → Plans → "Enable auto-renew on Paystack" creates Paystack plans at today's prices. Changing a price switches auto-renew off until re-synced (otherwise Paystack would bill the old amount). Without a Paystack plan code, each purchase is one prepaid period.
- A discount code makes that first charge a one-off prepaid period (Paystack can't discount a fixed recurring plan).
- Renewal failures → `past_due` with a 3-day grace, then back to Free. Cancel keeps access until the period ends. Expiry is evaluated lazily on every request.
- New users can get an automatic trial (admin → Plans → Free trial), then fall back to Free.

## Promo codes (admin-only to create)
Types: **% off checkout**, **free plan for N days**, **bonus tokens**. Random codes use a 32-symbol alphabet (no 0/O/1/I), 12 random symbols (~60 bits) — e.g. `ADUF-7K3Q-9XPM-4TWD`. Bulk generation (≤200, single-use by default),
custom codes, expiry, usage limits, enable/disable. One use per person per code, atomic in SQL. Wrong guesses are throttled (8 per 15 min).

## Connectors
41 platforms (see `src/lib/connector-registry.ts`). 23 new ones connect by pasted credentials that are **verified live before saving**; 3 more (Search Console, Calendar, YouTube) reuse your Google OAuth app — enable *Search Console API*, *Google Calendar API*, *YouTube Data API v3* and *YouTube Analytics API* in Google Cloud.
Real data importers (last 12 months, ≤2,000 records per kind): Paystack, Stripe, Flutterwave, WooCommerce → sales; HubSpot → leads + deals; Pipedrive → deals. They re-sync daily with the other imports.
User-typed store URLs (WooCommerce, WordPress) pass an SSRF guard (https, public domain names only).
To add a connector: add it to `connector-registry.ts`, its fields to `connector-catalog.ts` (or an OAuth entry in `oauth-providers.ts`), a verify probe in `connector-verify.ts`, and its access text in `permissions-catalog.ts`; `/tmp`-free test: `tools/check-permissions.mjs` and the registry test fail if any piece is missing.

## Security fixes shipped with this
`/api/model-keys`, `/api/n8n-connection`, `/api/skills`, `/api/sandbox/run`, `/api/tasks/run`, `/api/skills/reply` and document writes previously accepted **anonymous** requests. They now require a signed-in user (admin for workspace secrets / code execution).
Document download/preview links remain capability URLs (unguessable ids) so they work in iframes.
