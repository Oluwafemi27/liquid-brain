# Trust layer — how approvals, limits, undo, health and privacy work

All of this is enforced **on the server** (`src/lib/server/*`). The browser only displays it, so it can't be talked past.

## Setup checklist
1. Run migrations `017`, `018`, `019` (already applied to the "liquid-brain" project). `018` also turns **RLS on** for `connectors`, `oauth_states` and `user_model_keys` — they were previously readable with the public anon key.
2. Set env vars (see `.env.example`): `TOKEN_ENCRYPTION_KEY`, `CRON_SECRET`, `APP_URL`, optionally `RESEND_API_KEY`.
3. `vercel.json` schedules `/api/cron/daily` once a day (06:00 UTC = 07:00 Lagos; the only cadence Vercel Hobby allows). It re-checks connections, re-syncs imports, raises alerts and sends daily summaries.
4. Supabase Auth → URL configuration: add your site URL to **Redirect URLs** so the email sign-in link works. Supabase's built-in email sender is heavily rate-limited — add a custom SMTP for real use.
5. Google Cloud: enable Sheets API, Analytics Data API, Analytics Admin API. Gmail now asks only for `gmail.metadata` (headers, not message bodies) — reconnect Gmail to apply.
6. Migrations `014_telegram`, `015`, `016` are **not applied** on the live project; Telegram delivery and Paystack/Semrush/Jumia key storage need them.

## Approval tiers (`src/lib/action-registry.ts` — single source of truth)
| Action | Tier | Undo |
|---|---|---|
| Add a reminder | runs automatically (internal only) | 24h |
| Create goal / turn automation on-off / create automation | needs your OK | 24h |
| Build n8n workflow | needs your OK (created switched off) | no |
| Change ad budget | needs your OK, checked against your cap | no (ADUF can't edit ad accounts; you apply it) |

Invariant (tested): an action can only be automatic if its risk is `internal`. Anything touching ads, money, messages or outside systems always needs approval.

## Limits
`Settings → Safety & limits`: biggest ad-budget increase per change; customer messages per day. Over-limit approvals need an explicit "Approve anyway". The message cap is enforced on Telegram auto-replies (rolling 24h) and logged when it pauses them.

## Connection health
`live` = provider called just now · `delayed` = data hasn't refreshed (>3 days) or login expires soon · `broken` = provider rejects the login or the last sync failed. Non-Google integrations are `token-only` checks (we say so). Imports from Sheets / Drive / Analytics / Gmail re-sync daily; a failed sync keeps the old data and records why.

## Data handling
Logins: AES-256-GCM (`crypto-tokens.ts`). Customer rows, activity and settings tables are service-role only. Admins see counts, never a user's customer data. Disconnecting a Google platform revokes it at Google. Users can delete imports / chats / activity / everything from Settings → Your data; admins can remove a user and their data.

## Tests
`tools/check-permissions.mjs` (`npm run check:permissions`) fails if the permissions text shown to users drifts from the scopes requested.
