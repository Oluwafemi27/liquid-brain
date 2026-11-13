# n8n workflows without credential screens

The owner connects an app once in ADUF (Composio sign-in). Every workflow ADUF builds afterwards works with no credential setup in n8n.

## Which method runs
`N8N_HOSTED=true` -> **Method 1** (auto-inject). Anything else -> **Method 2** (Composio as the node). The choice is `chooseN8nMethod()` in `src/lib/n8n-credentialless.ts`.

| | Method 1: auto-inject | Method 2: Composio as the node |
|---|---|---|
| Use when | ADUF runs the n8n and each user has their own instance or workspace | n8n Cloud, owner-run n8n, or any n8n you don't control |
| In n8n | Native nodes (Gmail, Slack...) with credentials ADUF created | Only Webhook + HTTP Request nodes, no credentials |
| Code | `createN8nCredentialFromComposio`, `injectCredentials`, `refreshN8nCredential` in `src/lib/server/n8n-composio.ts` | `generateCredentiallessWorkflow` in `src/lib/n8n-credentialless.ts` |
| Token expiry | ADUF refreshes from Composio (see below) | Nothing to refresh: Composio holds the login |

Both are wired into the builder (`n8n-builder.ts`: the model is told the rules, a policy check feeds violations back once, and `finalize` injects credential ids or the signed token) and into deployments (`n8n-deployments.ts`: templates get credentials on hosted n8n, triggers start on "Turn it on" and stop on "Turn it off").

## Method 2 in detail
* **Actions:** one HTTP Request node per action, `POST {APP_URL}/api/n8n-relay`, header `Authorization: Bearer <token>`, body `{ tool, toolkit, connectedAccountId, arguments }`. The relay (`n8n-relay.ts`) verifies the token, then runs the tool through Composio with ADUF's key.
* **Why a relay and not Composio's URL with the key in n8n:** a header credential holding `COMPOSIO_API_KEY` inside a customer's own n8n lets that customer read ADUF's master key. The token instead names one user and a list of allowed tools; the user id comes from the token, never the request, so a workflow can only touch its owner's apps. Rotate `N8N_RELAY_SECRET` to revoke every token.
* **The literal Composio-direct version** (Header Auth credential `ADUF Composio API`, `POST https://backend.composio.dev/api/v3/tools/execute/{TOOL}`) is available as `gateway: "composio-direct"`. Use it only on an n8n that only ADUF can open.
* **AI steps:** tool `ADUF_AI_TEXT` with `{ instruction, text }` runs on the owner's own model key and credits, so summarising needs no AI credential in n8n.
* **Triggers:** the Webhook node's `notes` field names the Composio trigger. When the owner turns the workflow on, ADUF creates the trigger for their connected account. Composio sends all events to `{APP_URL}/api/composio-webhook`; ADUF verifies the signature, finds the owner's route (`n8n_trigger_routes`) and forwards the event to that workflow's webhook.

## Method 1 in detail
1. `getConnectionTokens` (Composio client) reads the user's token. 2. `createN8nCredentialFromComposio` -> `POST /api/v1/credentials`, remembered in `n8n_credentials`. 3. `injectCredentials` puts `"credentials": { "gmailOAuth2": { "id", "name" } }` on each node, then the workflow is created inactive.
* **Refresh:** `refreshExpiringN8nCredentials` re-reads a fresh token from Composio, creates a new n8n credential and re-points the user's workflows. Call `GET /api/cron/n8n-credentials` every 30 minutes with `Authorization: Bearer $CRON_SECRET` (Vercel's free plan only allows daily; use QStash or an Azure scheduled job). Slack, Notion, GitHub, Airtable and HubSpot use non-expiring tokens; Google apps expire in about an hour.
* **Limits to know:** Composio's managed login doesn't share its OAuth client, so n8n can't refresh Google tokens on its own (ADUF does it). Composio may hide token values for a project; then Method 1 can't read them and Method 2 is the only option. A shared n8n shares its credential store: use one instance per user (or n8n Enterprise projects) before enabling Method 1 for several users.

## Setup
`APP_URL` (public ADUF address), `COMPOSIO_API_KEY`, `COMPOSIO_WEBHOOK_SECRET` (shown once when the webhook is first registered; also in the Composio dashboard), `N8N_RELAY_SECRET` (any long random string), and `N8N_HOSTED=true` only if ADUF runs the n8n. Run migration `032_n8n_composio.sql`.

## Example
`docs/examples/gmail-to-slack-summary.workflow.json`: Webhook (new Gmail message) -> `ADUF_AI_TEXT` summary -> Slack message. Replace `YOUR-ADUF-URL` and `<SIGNED_RELAY_TOKEN>`; ADUF fills both when it builds the workflow. Check the exact trigger and tool slugs with the Composio tool search before relying on them.
