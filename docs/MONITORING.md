# Monitoring page (Admin > Monitoring)

Shows, for admins only, whether Sentry and Datadog are really connected and what they currently hold, plus
the health of this server and of every connected platform.

## What each card means

| Check | Meaning |
|---|---|
| Server sends errors / logs | `SENTRY_DSN` or `DD_API_KEY` is set. For Datadog the key is also tested live against your region. |
| Dashboard access | The read-only token works, so issues, monitors and logs can be shown. Needs the settings below. |
| Browser reports problems | The `VITE_*` keys were present **when the app was built**. |

Press **Send test event** to push one harmless test error and log line, wait a minute, then **Refresh**: it should show up
as an issue in Sentry and as an error log in Datadog.

## Settings (where the app runs, not only Vercel)

Server settings (Vercel > Environment Variables, or the Azure Container App secrets):
`SENTRY_DSN`, `DD_API_KEY`, `DD_SITE`, and for this page `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `DD_APP_KEY`.

Browser settings are baked in at build time: on Vercel they apply on the next deploy; on Azure they are GitHub
secrets (`VITE_SENTRY_DSN`, `VITE_DD_APPLICATION_ID`, `VITE_DD_CLIENT_TOKEN`) used by the deploy workflow.
Setting them only on the Azure app has no effect on the browser.

Use the **same region** everywhere: `DD_SITE` must match the site your Datadog account lives on, or Datadog rejects the keys.

## Safety

- Admin-only: a verified, allow-listed admin session is checked on every request.
- Read-only: it only reads from Sentry and Datadog. Tokens never reach the browser.
- Requests only go to `sentry.io` (or your `SENTRY_API_BASE`, https only) and to real Datadog regions.
- Issue titles and log lines are scrubbed of emails and tokens before they are shown.
- Results are cached for 60 seconds and Refresh is limited to one real re-check every 15 seconds.
