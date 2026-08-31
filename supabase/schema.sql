-- ADUF AI (Liquid Brain) backend schema.
-- Run this in the Supabase SQL editor (or `supabase db push`) once per project.
-- Single-tenant for now: every row carries workspace_id = 'default' until
-- real accounts/auth land — swap DEFAULT_WORKSPACE_ID in src/lib/server/supabase.ts
-- and add a workspace_id foreign key check once they do.

create extension if not exists pgcrypto;

-- Brain Chat history, including any questionnaire the agent attached and the
-- reasoning trace shown in the collapsible "agent is working" panel.
create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null default 'default',
  session_id text not null default 'default',
  role text not null check (role in ('user', 'aduf')),
  text text not null,
  question jsonb,
  answered_values jsonb,
  trace jsonb,
  created_at timestamptz not null default now()
);
create index if not exists chat_messages_session_idx
  on chat_messages (workspace_id, session_id, created_at);

-- One row per social/tool connector. `connected` mirrors the Automation
-- Grid / Settings "Connected" badge; tokens are written by the OAuth
-- callback route and never sent to the client.
create table if not exists connectors (
  id text not null,                    -- provider id, e.g. 'shopify', 'meta'
  workspace_id text not null default 'default',
  connected boolean not null default false,
  access_token text,
  refresh_token text,
  token_type text,
  expires_at timestamptz,
  scope text,
  metadata jsonb,
  updated_at timestamptz not null default now(),
  primary key (workspace_id, id)
);

-- Short-lived CSRF/state tokens for the OAuth authorize -> callback round trip.
create table if not exists oauth_states (
  state text primary key,
  provider text not null,
  workspace_id text not null default 'default',
  created_at timestamptz not null default now()
);
-- States older than ~10 minutes are rejected by the callback handler; prune
-- periodically with: delete from oauth_states where created_at < now() - interval '1 day';

-- Every self-healing harness run (chat replies, future tool calls) — lets you
-- see what failed, what the agent tried as a fix, and whether it recovered.
create table if not exists agent_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null default 'default',
  label text not null,
  status text not null check (status in ('success', 'failed')),
  attempts int not null,
  trace jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists agent_runs_recent_idx
  on agent_runs (workspace_id, created_at desc);

-- === Migrations 002-004 (already applied to the live "liquid-brain" project) ===
-- Full statements below for reference / re-applying to a fresh project.
-- See src/lib/server/model-keys.ts, model-providers.ts, skills.ts for usage.

-- 002_model_keys: provider registry + Vault-backed BYOK key storage
create table if not exists model_providers (
  id text primary key,
  display_name text not null,
  api_style text not null check (api_style in ('openai_compatible', 'anthropic', 'gemini')),
  default_base_url text not null,
  default_model text not null
);

insert into model_providers (id, display_name, api_style, default_base_url, default_model) values
  ('openai',    'ChatGPT (OpenAI)', 'openai_compatible', 'https://api.openai.com/v1',            'gpt-5-mini'),
  ('anthropic', 'Claude (Anthropic)','anthropic',          'https://api.anthropic.com/v1',         'claude-sonnet-4-6'),
  ('gemini',    'Gemini (Google)',  'gemini',             'https://generativelanguage.googleapis.com/v1beta', 'gemini-2.5-flash'),
  ('deepseek',  'DeepSeek',         'openai_compatible', 'https://api.deepseek.com/v1',          'deepseek-chat'),
  ('groq',      'Groq',             'openai_compatible', 'https://api.groq.com/openai/v1',       'llama-3.3-70b-versatile'),
  ('grok',      'Grok (xAI)',       'openai_compatible', 'https://api.x.ai/v1',                  'grok-4')
on conflict (id) do update set
  display_name = excluded.display_name, api_style = excluded.api_style,
  default_base_url = excluded.default_base_url, default_model = excluded.default_model;

create table if not exists user_model_keys (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null default 'default',
  provider_id text not null references model_providers(id),
  vault_secret_id uuid not null,
  label text,
  is_active boolean not null default true,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, provider_id)
);
create unique index if not exists user_model_keys_one_default
  on user_model_keys (workspace_id) where is_default;

-- 003_model_key_functions: SECURITY DEFINER wrappers around Supabase Vault,
-- service_role only. See migration history in the Supabase dashboard for the
-- exact applied SQL (store_model_key / get_decrypted_model_key /
-- get_default_model_key / delete_model_key) — omitted here for brevity since
-- it's already live; ask me to regenerate this file in full if you need it
-- for a second environment.

-- 004_agent_skills: data-driven business skill prompts
create table if not exists agent_skills (
  id text primary key,
  workspace_id text not null default 'default',
  category text not null,
  title text not null,
  description text not null,
  system_prompt text not null,
  enabled boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Seeded rows: marketing, copywriting, business-management,
-- social-comment-reply, social-dm-reply, email-reply, shopify-ecommerce.
-- See the Supabase dashboard (Table Editor > agent_skills) to view/edit the
-- live prompts, or ask me to dump them back into this file.
