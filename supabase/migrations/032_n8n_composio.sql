-- Credential-less n8n workflows via Composio.
-- n8n_credentials: Method 1 (hosted n8n) - which n8n credential ADUF created for which user and app.
-- n8n_trigger_routes: Method 2 - which Composio trigger feeds which n8n webhook (server-only tables).
create table if not exists public.n8n_credentials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  app text not null,
  n8n_credential_id text not null,
  n8n_credential_type text not null,
  composio_account_id text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, app)
);
create table if not exists public.n8n_trigger_routes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  deployment_id uuid,
  composio_trigger_id text not null unique,
  trigger_slug text not null,
  webhook_url text not null,
  created_at timestamptz not null default now()
);
create index if not exists n8n_trigger_routes_user_idx on public.n8n_trigger_routes (user_id);
alter table public.n8n_credentials enable row level security;
alter table public.n8n_trigger_routes enable row level security;
-- No policies on purpose: only the server (service role) reads or writes these.
revoke all on public.n8n_credentials, public.n8n_trigger_routes from anon, authenticated;

-- Teaches the n8n builder (search_n8n_docs) the credential-less pattern.
insert into public.n8n_skill_docs (id, source_repo, title, content, tags, sort_order) values (
  'aduf-credentialless-composio', 'aduf', 'Credential-less workflows with Composio (no credential screen in n8n)',
  E'Goal: the owner connects an app once in ADUF; generated workflows never ask for credentials in n8n.\n\nMETHOD 2 (default; any n8n, n8n Cloud, owner-run): only n8n-nodes-base.webhook + n8n-nodes-base.httpRequest. Never native app nodes (Gmail, Slack, Notion, Sheets...). Each app action is one httpRequest: POST {APP_URL}/api/n8n-relay with header Authorization: Bearer <relay token> and jsonBody ={{ { tool: "SLACK_SENDS_A_MESSAGE_TO_A_SLACK_CHANNEL", toolkit: "slack", arguments: {...} } }}. The reply is {successful, data}. AI steps use tool ADUF_AI_TEXT with arguments {instruction, text}. Event triggers: a webhook node whose notes field is aduf-composio-trigger:{"toolkit":"gmail","slug":"GMAIL_NEW_GMAIL_MESSAGE","config":{},"path":"<webhook path>"}; ADUF starts the Composio trigger when the owner turns the workflow on and forwards each event to the webhook. The Composio API key never enters n8n.\n\nMETHOD 1 (N8N_HOSTED=true, ADUF controls n8n): native nodes are allowed; ADUF creates the n8n credential from the owner''s Composio login (POST /api/v1/credentials), stores the id, and injects "credentials": {"gmailOAuth2": {"id": "...", "name": "..."}} into each node before POST /api/v1/workflows. Google OAuth tokens last about an hour, so ADUF refreshes them from Composio on a schedule; Slack/Notion/GitHub tokens do not expire.\n\nRules: never invent credential ids; never put API keys or tokens in node parameters other than the relay placeholder; workflows are always deployed inactive (Safe Mode).',
  array['credentials','composio','webhook','http request','gmail','slack','notion','oauth','relay','trigger','n8n'], 5
) on conflict (id) do nothing;
