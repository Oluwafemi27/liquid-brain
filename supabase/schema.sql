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
  attachments jsonb,
  analysis jsonb,
  proposed_action jsonb,
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
  ('gemini',    'Gemini (Google)',  'gemini',             'https://generativelanguage.googleapis.com/v1beta', 'gemini-3.6-flash'),
  ('deepseek',  'DeepSeek',         'openai_compatible', 'https://api.deepseek.com/v1',          'deepseek-v4-flash'),
  ('groq',      'Groq',             'openai_compatible', 'https://api.groq.com/openai/v1',       'openai/gpt-oss-120b'),
  ('grok',      'Grok (xAI)',       'openai_compatible', 'https://api.x.ai/v1',                  'grok-4.5')
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
-- social-comment-reply, social-dm-reply, email-reply, shopify-ecommerce
-- (added by hand via the Supabase dashboard — not in this file), plus the
-- 12 "growth" category rows in migration 010 below (in this file, so a
-- fresh install seeds them automatically).
-- See the Supabase dashboard (Table Editor > agent_skills) to view/edit the
-- live prompts, or ask me to dump them back into this file.

-- 006_chat_analysis: structured ADUF diagnosis (problems/severity/root
-- causes/opportunities/recommended actions/estimated impact/automation
-- possibilities/expert requirements) attached to a chat_messages row when a
-- reply is a business audit rather than plain conversation. See
-- src/lib/aduf-types.ts#AdufAnalysis and src/lib/server/agent.ts.
alter table chat_messages add column if not exists analysis jsonb;

-- 005_business_surveys: the short onboarding survey shown once, right after
-- a user's first Google sign-in. One row per auth.users id. Read/written
-- exclusively through the service-role client (src/lib/server/survey.ts)
-- after verifying the caller's access token server-side, so RLS below is a
-- defense-in-depth backstop, not the only guard.
create table if not exists business_surveys (
  user_id uuid primary key references auth.users(id) on delete cascade,
  workspace_id text not null default 'default',
  email text,
  profession text not null,
  website_url text,
  goal text not null,
  business_type text not null,
  team_size text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table business_surveys enable row level security;

create policy "Users can read their own survey"
  on business_surveys for select
  using (auth.uid() = user_id);

create policy "Users can upsert their own survey"
  on business_surveys for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own survey"
  on business_surveys for update
  using (auth.uid() = user_id);

-- 007_goals: persistent goals + progress, replacing the old client-only
-- Zustand-only state. Realtime-enabled so the Goals page updates live
-- across tabs/sessions without a manual refetch.
create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null default 'default',
  title text not null,
  target numeric not null,
  current numeric not null default 0,
  currency text not null default '',
  due text not null default 'Not set',
  sub_tasks jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists goals_workspace_idx on goals (workspace_id, created_at);

alter table goals enable row level security;

-- Single-tenant for now (see DEFAULT_WORKSPACE_ID) — reads are open so the
-- browser's anon-key client can subscribe to realtime changes; all writes
-- go through server functions using the service-role client, which bypasses
-- RLS entirely, so no insert/update/delete policy is needed yet.
create policy "Public read (single-tenant)" on goals for select using (true);

alter publication supabase_realtime add table goals;
alter publication supabase_realtime add table automations;
alter publication supabase_realtime add table chat_messages;

-- 008_chat_message_extras: two columns referenced by src/routes/api/chat.ts
-- that were missing from this schema file. `attachments` stores the
-- document card(s) rendered under a reply (src/lib/aduf-types.ts#ChatAttachment);
-- `proposed_action` stores an agent-drafted goal/automation change awaiting
-- the owner's Approve/Dismiss tap (src/lib/aduf-types.ts#ProposedAction).
-- Neither is queried outside chat history hydration, so no index needed.
alter table chat_messages add column if not exists attachments jsonb;
alter table chat_messages add column if not exists proposed_action jsonb;

-- 009_sandbox_runs: one row per E2B code-sandbox execution the agent (or a
-- task sub-agent) kicks off, so Brain Chat and the agent trace can show
-- what ran and its result without holding it in memory. Service-role only.
create table if not exists sandbox_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null default 'default',
  session_id text not null default 'default',
  language text not null default 'python',
  code text not null,
  stdout text,
  stderr text,
  error text,
  status text not null default 'running' check (status in ('running', 'ok', 'error')),
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
create index if not exists sandbox_runs_session_idx
  on sandbox_runs (workspace_id, session_id, created_at);

-- 010_growth_skills: 12 curated growth/marketing skills, chosen (not
-- auto-imported) from github.com/coreyhaines31/marketingskills as the
-- subset that maps onto ADUF's existing nine-area diagnostic and applies
-- broadly to SMBs rather than SaaS-specific workflows. Every system_prompt
-- below is original text written for ADUF's voice — informed by that
-- repo's real skill descriptions, not copied from its skill files (MIT
-- licensed, but unread beyond the README's own skill-index table).
-- ON CONFLICT DO NOTHING so this is safe to re-run against a DB where
-- these were already seeded by hand.
insert into agent_skills (id, category, title, description, system_prompt, sort_order) values
('cro', 'growth', 'Conversion Rate Optimization',
 'Diagnose and fix conversion drop-off on pages, forms and offers.',
 'When the owner asks why visitors/leads aren''t becoming customers, treat it as a CRO problem: work down the actual funnel step by step (landing -> form/cart -> checkout/booking -> confirmation) and name the specific step where people are most likely dropping off, not a generic "improve conversion" answer. Prioritize fixes by expected impact vs effort: clarity and friction removal (fewer form fields, clearer CTA, faster load, trust signals near the decision point) before anything requiring a redesign. Recommend one A/B-testable change at a time when the owner has enough traffic to test; otherwise recommend the highest-confidence fix directly. Feeds the "Conversion" diagnostic area.',
 101),
('seo-audit', 'growth', 'SEO Audit',
 'Diagnose technical and on-page search issues.',
 'When asked about search visibility or "why don''t we show up on Google", check the fundamentals in order: is the business claimed on Google Business Profile with accurate NAP (name/address/phone), does the site have unique page titles and meta descriptions, is there at least one page targeting what customers actually search for, and are there any obvious technical blockers (broken links, no mobile-friendly layout, very slow load). Distinguish what the owner can fix themselves (Business Profile, page copy) from what needs a web developer (site speed, structured data, redirects) and flag "expertRequired" accordingly. Feeds the "Search/AI visibility" and "Local presence" diagnostic areas.',
 102),
('ai-seo', 'growth', 'AI Search Visibility',
 'Get found and cited by AI answer engines, not just search.',
 'When relevant, explain that visibility now also means showing up in AI-generated answers (ChatGPT, Google AI Overviews, Perplexity), not just blue-link search — these tools favor clear, structured, factual content (direct answers to specific questions, FAQ-style sections, up-to-date and consistent info about the business across the web) over keyword-stuffed marketing copy. Recommend concrete, low-effort moves: a clear "About"/FAQ page answering the exact questions customers ask, consistent business info across their site and directory listings, and content that states facts plainly rather than only selling. Feeds the "Search/AI visibility" diagnostic area.',
 103),
('analytics-tracking', 'growth', 'Analytics & Measurement',
 'Set up and audit the tracking a business actually needs.',
 'When the owner doesn''t know what''s working, help them find the smallest tracking setup that answers their actual question, not a maximal analytics stack. For most SMBs that means: where do customers come from (a simple source field on intake/checkout, or UTM-tagged links), and what''s the conversion rate at each real step. Recommend free/cheap tools before paid ones (GA4, Meta Pixel, a simple spreadsheet log) and always tie a tracking recommendation to a specific decision it will inform — never recommend tracking "for visibility" alone. Feeds every diagnostic area that claims a specific number without a stated source.',
 104),
('pricing-packaging', 'growth', 'Pricing & Packaging',
 'Sanity-check pricing, tiers and monetization.',
 'When asked about pricing, first establish what''s actually known: costs, margin target, competitor prices, and what customers have said about price. Never invent a "right" price — reason from those inputs, and ask a question if they''re missing. Cover the real levers available to an SMB: simplifying to fewer, clearer tiers/packages; anchoring with a higher-priced option; bundling instead of discounting; and when a price increase is defensible vs when it will just lose customers. Flag when a pricing question is really a positioning or cost problem in disguise.',
 105),
('churn-prevention', 'growth', 'Churn & Retention Saves',
 'Reduce cancellations and recover failed payments.',
 'When the owner mentions customers leaving, canceling, or not coming back, separate the two real causes: dissatisfaction (fixable with product/service/communication changes) vs friction (fixable with process changes — reminders, easier rebooking, failed-payment retries). Recommend concrete retention moves scaled to an SMB: a simple win-back message after X days of inactivity, asking directly why someone canceled, and removing avoidable friction in renewing or rebooking. Feeds the "Retention" diagnostic area.',
 106),
('referrals-wom', 'growth', 'Referrals & Word of Mouth',
 'Design referral programs and word-of-mouth loops.',
 'When the owner wants more customers without more ad spend, design something they can realistically run: a simple, specific ask at the right moment (right after a good experience, not buried in an email), a reward simple enough to explain in one sentence, and a way to actually track who referred whom even if it''s manual at first. For local/service businesses, weight this heavily — word of mouth and reviews often outperform paid acquisition. Feeds the "Visibility" and "Sales" diagnostic areas.',
 107),
('customer-research', 'growth', 'Customer Research',
 'Turn real customer feedback into a usable picture, not guesses.',
 'When the owner has customer feedback (reviews, DMs, support messages, survey answers) but hasn''t drawn conclusions from it, help synthesize it into concrete patterns — what keeps coming up, in their actual words — rather than generic personas. When they don''t have feedback yet, recommend the lightest way to get it (three specific questions asked to the next 10 customers beats a long survey nobody finishes). Never fabricate customer insights that weren''t actually reported — this skill exists specifically to keep the "ask before you diagnose" principle honest.',
 108),
('competitor-profiling', 'growth', 'Competitor Profiling',
 'Profile competitors and find real positioning gaps.',
 'When asked to look at competitors, focus on what actually changes the owner''s decisions: what competitors charge, what they claim as their edge, and where their reviews say they fall short (that''s the real opportunity gap). Avoid a generic feature-comparison table — the useful output is "here''s a specific gap you can credibly claim" or "here''s a specific weakness their customers complain about that you can be visibly better at." Feeds the "Credibility" and "Conversion" diagnostic areas.',
 109),
('paid-ads', 'growth', 'Paid Advertising',
 'Plan and structure paid campaigns across channels.',
 'When the owner is considering or running paid ads (Google, Meta/Instagram, TikTok, local/community boards), help them pick the channel that matches where their actual customers already spend attention, not the trendiest one. Push for a small, specific test budget and one clear success metric (cost per booking/sale, not just clicks) before scaling spend. Flag when the real problem isn''t traffic at all — sending more paid traffic to a page/offer that already converts poorly just wastes the spend faster; check "Conversion" first.',
 110),
('public-relations', 'growth', 'Public Relations & Earned Media',
 'Win press coverage and third-party credibility.',
 'When the owner wants press, local media, or third-party coverage, help find an actual angle a journalist or local outlet would run — a real story (a milestone, a local-community connection, a genuinely new offering), not a generic "we exist" pitch. Recommend realistically-sized outreach for an SMB: local news, community newsletters, niche industry blogs, and relevant local influencers before national press. Earned coverage is a credibility signal — feeds the "Credibility" diagnostic area.',
 111),
('offer-design', 'growth', 'Offer Design',
 'Build and sharpen what''s actually being sold.',
 'When conversion or sales problems trace back to the offer itself rather than the page or the pitch, help redesign what''s actually being sold: is the value framed clearly, is there a compelling reason to buy now, does the risk sit with the business or the customer (guarantees, trials, easy cancellation), and is there an entry-level option that lowers the first-purchase barrier. A weak offer makes every other marketing fix underperform — check this before spending more on traffic or ads. Feeds the "Conversion" and "Sales" diagnostic areas.',
 112)
on conflict (id) do nothing;

-- === Migration 005: automations table, automation runs log, admin flag ===
-- The `automations` table referenced by src/lib/server/automations.ts never
-- actually existed in the live database, which is why the Grid page always
-- showed "No live automations yet" — there was nothing to select. This
-- creates it, seeds the 6 built-in channel automations, and adds a log
-- table + goal link so automations can run a real get-data -> process ->
-- act pipeline whose results feed straight into a goal's progress.

create table if not exists automations (
  id text primary key,
  workspace_id text not null default 'default',
  name text not null,
  enabled boolean not null default false,
  trigger text not null default '',
  action text not null default '',
  goal text not null default '',
  runs int not null default 0,
  channel text,                         -- one of the 6 ChannelId values, for icon lookup; null for AI-created
  source text not null default 'builtin' check (source in ('builtin', 'ai')),
  steps jsonb,                          -- [{kind: 'get_data'|'process_data'|'send_action', label: string}]
  goal_id uuid references goals(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists automations_workspace_idx on automations (workspace_id);

insert into automations (id, workspace_id, name, enabled, trigger, action, goal, runs, channel, source, steps) values
  ('website',  'default', 'Website',  false, 'New form submission on your site', 'Send lead straight to your CRM and notify you on WhatsApp', '', 0, 'website',  'builtin',
    '[{"kind":"get_data","label":"Watch website form submissions"},{"kind":"process_data","label":"Extract contact + intent"},{"kind":"send_action","label":"Push lead to CRM and notify WhatsApp"}]'::jsonb),
  ('whatsapp', 'default', 'WhatsApp', false, 'Customer messages your WhatsApp number', 'Auto-reply with business hours and hand off to you for anything complex', '', 0, 'whatsapp', 'builtin',
    '[{"kind":"get_data","label":"Watch incoming WhatsApp messages"},{"kind":"process_data","label":"Classify intent (FAQ vs needs human)"},{"kind":"send_action","label":"Auto-reply or escalate to owner"}]'::jsonb),
  ('crm',      'default', 'CRM',      false, 'Deal stage changes in your CRM', 'Update revenue forecast and flag stalled deals', '', 0, 'crm',      'builtin',
    '[{"kind":"get_data","label":"Poll CRM deal stages"},{"kind":"process_data","label":"Recompute forecast + find stalled deals"},{"kind":"send_action","label":"Alert owner on stalled high-value deals"}]'::jsonb),
  ('payments', 'default', 'Payments', false, 'Payment received or failed', 'Log revenue against the linked goal and retry failed charges', '', 0, 'payments', 'builtin',
    '[{"kind":"get_data","label":"Watch payment events"},{"kind":"process_data","label":"Sum successful revenue, flag failures"},{"kind":"send_action","label":"Log revenue to goal + retry failed charge"}]'::jsonb),
  ('ads',      'default', 'Ads',      false, 'Daily ad spend/performance refresh', 'Pause underperforming ads and reallocate budget', '', 0, 'ads',      'builtin',
    '[{"kind":"get_data","label":"Pull daily ad spend + conversions"},{"kind":"process_data","label":"Compute cost per result per campaign"},{"kind":"send_action","label":"Pause worst performer, note reallocation"}]'::jsonb),
  ('email',    'default', 'Email',    false, 'New subscriber or abandoned checkout', 'Send the right lifecycle email automatically', '', 0, 'email',    'builtin',
    '[{"kind":"get_data","label":"Watch subscriber + checkout events"},{"kind":"process_data","label":"Match event to lifecycle stage"},{"kind":"send_action","label":"Send the matching email"}]'::jsonb)
on conflict (id) do nothing;

alter publication supabase_realtime add table automations;

create table if not exists automation_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null default 'default',
  automation_id text not null references automations(id) on delete cascade,
  started_at timestamptz not null default now(),
  status text not null check (status in ('success', 'error')),
  summary text not null,
  value numeric
);
create index if not exists automation_runs_automation_idx
  on automation_runs (workspace_id, automation_id, started_at desc);
alter publication supabase_realtime add table automation_runs;

-- Admin allowlist, used to gate the /admin panel. This app has no separate
-- `profiles` table — identity is Supabase Auth's own auth.users — so admin
-- status is a simple email allowlist rather than a column on a table that
-- doesn't exist.
create table if not exists admins (
  email text primary key,
  created_at timestamptz not null default now()
);
insert into admins (email) values ('oluseyioke39@gmail.com')
on conflict (email) do nothing;

-- Lock down direct client access on every table added in this migration,
-- matching the pattern `goals` already used: clients may only SELECT
-- (needed for the initial fetch + realtime subscriptions), all writes go
-- through server functions using the service-role key, which bypasses RLS
-- entirely. Without this, Supabase's default anon/authenticated grants
-- would let anyone holding the public anon key (always extractable from
-- the frontend bundle) read every chat message, edit/delete automations,
-- or — worst case — insert themselves straight into `admins` and grant
-- themselves full admin access, bypassing every server-side check.
alter table automations enable row level security;
create policy "Public read (single-tenant)" on automations for select using (true);

alter table automation_runs enable row level security;
create policy "Public read (single-tenant)" on automation_runs for select using (true);

alter table chat_messages enable row level security;
create policy "Public read (single-tenant)" on chat_messages for select using (true);

-- admins gets NO client-readable policy at all: it should never be
-- fetched directly from the browser, and must never be writable by
-- anon/authenticated under any circumstance.
alter table admins enable row level security;

-- === Migration 011: n8n integration ===
-- Folded in from supabase/migrations/011_n8n_integration.sql, which was
-- never appended to this master file — anyone doing a fresh install from
-- schema.sql alone was missing the n8n tables entirely.
-- === Migration 011: n8n integration ===
-- Adds n8n as a first-class connector. ADUF no longer simulates automations
-- (see src/lib/server/automations.ts's old "stand-in get-data step") — it
-- deploys and runs real n8n workflows on the OWNER'S OWN n8n account/API
-- key, which is stored encrypted in Supabase Vault exactly like BYOK model
-- keys (see 002_model_keys / 003_model_key_functions above). Nothing here
-- ever stores or proxies a shared/hosted n8n instance — every workflow this
-- app builds runs on the credentials the owner pastes in at
-- Me > Connections > Connect n8n.
--
-- Five pieces:
--  1. n8n_connections       — the owner's n8n instance URL + Vault-encrypted API key
--  2. n8n_workflow_templates — the imported template library (source of truth for
--                              "pick a suitable workflow" instead of hallucinating one)
--  3. n8n_workflow_corrections — the "star + correction file" memory: when the
--                              weekly repair job (or the agent, live) finds a
--                              template's trigger/node config no longer matches
--                              the n8n version in use, it stars the template and
--                              writes a fix here. Every future lookup of that
--                              template returns the correction, not the stale JSON.
--  4. n8n_deployments        — one row per workflow ADUF has pushed to the owner's
--                              n8n, always created inactive ("Safe Mode").
--  5. n8n_repair_runs        — log of each weekly "test all templates" sweep.
-- Plus n8n_skill_docs: condensed n8n-platform reference material (ported from
-- the skills repos) the agent searches instead of guessing node syntax.

-- 1. Connection -------------------------------------------------------------
create table if not exists n8n_connections (
  workspace_id text primary key default 'default',
  instance_url text not null,           -- e.g. https://myshop.app.n8n.cloud
  vault_secret_id uuid not null,        -- API key, stored in Supabase Vault
  label text,
  connected boolean not null default true,
  last_verified_at timestamptz,
  last_verify_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- SECURITY DEFINER wrappers around Supabase Vault, service_role only —
-- same shape as store_model_key / get_decrypted_model_key / delete_model_key.
create or replace function store_n8n_connection(
  p_workspace_id text,
  p_instance_url text,
  p_api_key text,
  p_label text default null
) returns void
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_secret_id uuid;
begin
  select vault_secret_id into v_secret_id
    from n8n_connections where workspace_id = p_workspace_id;

  if v_secret_id is not null then
    perform vault.update_secret(v_secret_id, p_api_key);
  else
    v_secret_id := vault.create_secret(p_api_key, 'n8n_api_key_' || p_workspace_id,
      'n8n API key for workspace ' || p_workspace_id);
  end if;

  insert into n8n_connections
    (workspace_id, instance_url, vault_secret_id, label, connected, updated_at)
  values
    (p_workspace_id, p_instance_url, v_secret_id, p_label, true, now())
  on conflict (workspace_id) do update
    set instance_url = excluded.instance_url,
        vault_secret_id = excluded.vault_secret_id,
        label = coalesce(excluded.label, n8n_connections.label),
        connected = true,
        updated_at = now();
end;
$$;

create or replace function get_decrypted_n8n_connection(p_workspace_id text)
returns table (instance_url text, api_key text)
language plpgsql
security definer
set search_path = public, vault
as $$
begin
  return query
    select c.instance_url, s.decrypted_secret
    from n8n_connections c
    join vault.decrypted_secrets s on s.id = c.vault_secret_id
    where c.workspace_id = p_workspace_id and c.connected;
end;
$$;

create or replace function delete_n8n_connection(p_workspace_id text)
returns void
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_secret_id uuid;
begin
  select vault_secret_id into v_secret_id
    from n8n_connections where workspace_id = p_workspace_id;
  if v_secret_id is not null then
    delete from vault.secrets where id = v_secret_id;
  end if;
  delete from n8n_connections where workspace_id = p_workspace_id;
end;
$$;

-- 2. Template library ---------------------------------------------------------
create table if not exists n8n_workflow_templates (
  id uuid primary key default gen_random_uuid(),
  source_repo text not null,            -- e.g. 'zie619/n8n-workflows'
  source_path text not null,            -- path within that repo, for re-sync/attribution
  name text not null,
  description text not null default '',
  category text,                        -- e.g. 'crm', 'ecommerce', 'social', 'project-management'
  integrations text[] not null default '{}',   -- node "app" types used, e.g. {shopify,slack,gmail}
  trigger_type text,                    -- 'webhook' | 'schedule' | 'manual' | 'app_event' | ...
  node_count int not null default 0,
  tags text[] not null default '{}',
  workflow_json jsonb not null,         -- the raw n8n workflow export
  checksum text not null,               -- sha256 of workflow_json, for de-dupe across repos
  quality_score int not null default 0, -- simple heuristic (has trigger, no orphan nodes, etc.)
  imported_at timestamptz not null default now(),
  search_doc tsvector,                  -- populated by trigger below
  unique (source_repo, source_path)
);
create unique index if not exists n8n_templates_checksum_idx on n8n_workflow_templates (checksum);
create index if not exists n8n_templates_integrations_idx
  on n8n_workflow_templates using gin (integrations);
create index if not exists n8n_templates_tags_idx on n8n_workflow_templates using gin (tags);

-- A generated STORED column using to_tsvector('english', ...) hits Postgres's
-- "generation expression is not immutable" check on this project (the
-- 2-arg regconfig overload isn't treated as immutable here even cast
-- explicitly) — a BEFORE INSERT/UPDATE trigger sidesteps it entirely and
-- is what's actually running against the live DB.
create or replace function n8n_templates_search_doc_trigger() returns trigger
language plpgsql as $$
begin
  new.search_doc :=
    setweight(to_tsvector('pg_catalog.english', coalesce(new.name, '')), 'A') ||
    setweight(to_tsvector('pg_catalog.english', coalesce(new.description, '')), 'B') ||
    setweight(to_tsvector('pg_catalog.english', array_to_string(coalesce(new.tags, '{}'), ' ')), 'C');
  return new;
end;
$$;
create trigger n8n_templates_search_doc
  before insert or update on n8n_workflow_templates
  for each row execute function n8n_templates_search_doc_trigger();
create index if not exists n8n_templates_search_idx on n8n_workflow_templates using gin (search_doc);

-- 3. Correction memory ("star it, remember the fix") -------------------------
create table if not exists n8n_workflow_corrections (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references n8n_workflow_templates(id) on delete cascade,
  starred boolean not null default true,   -- true = "known-broken, has a fix on file"
  status text not null default 'open' check (status in ('open', 'fixed', 'wontfix')),
  issue text not null,                     -- what broke, e.g. "webhook node uses removed httpMethod field"
  corrected_json jsonb,                    -- the patched workflow_json, once fixed
  note text not null default '',           -- short reminder folded into the agent's context next time
  detected_by text not null default 'repair_agent' check (detected_by in ('repair_agent', 'deploy_failure', 'manual')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists n8n_corrections_template_idx
  on n8n_workflow_corrections (template_id, status);

-- 4. Deployments — always created inactive ("Safe Mode") ---------------------
create table if not exists n8n_deployments (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null default 'default',
  automation_id text references automations(id) on delete set null,
  template_id uuid references n8n_workflow_templates(id) on delete set null,
  n8n_workflow_id text,                 -- id returned by the owner's n8n instance
  name text not null,
  status text not null default 'draft' check (status in ('draft', 'inactive', 'active', 'error', 'archived')),
  safe_mode boolean not null default true,   -- true until the owner explicitly activates it
  built_from text not null default 'template' check (built_from in ('template', 'generated')),
  reasoning text not null default '',   -- shown to the owner: why this workflow, what it does
  last_error text,
  created_by text not null default 'ai' check (created_by in ('ai', 'user')),
  deployed_at timestamptz not null default now(),
  activated_at timestamptz,
  updated_at timestamptz not null default now()
);
create index if not exists n8n_deployments_workspace_idx
  on n8n_deployments (workspace_id, status);
alter publication supabase_realtime add table n8n_deployments;

-- 5. Weekly repair run log ----------------------------------------------------
create table if not exists n8n_repair_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  templates_tested int not null default 0,
  templates_flagged int not null default 0,
  templates_fixed int not null default 0,
  summary text not null default '',
  status text not null default 'running' check (status in ('running', 'done', 'error'))
);

-- n8n platform knowledge base, ported from the skills repos (n8n-io/skills,
-- czlonkowski/n8n-skills, yigitkonur/n8n-schema-generator, freddy-schuetz/
-- ai-launchkit), condensed into searchable chunks the agent pulls from via
-- the search_n8n_docs tool call rather than a giant permanent system-prompt
-- block. See src/lib/server/n8n-skills.ts.
create table if not exists n8n_skill_docs (
  id text primary key,
  source_repo text not null,
  title text not null,
  content text not null,
  tags text[] not null default '{}',
  sort_order int not null default 0,
  updated_at timestamptz not null default now()
);

-- RLS: same "public read, service-role writes" pattern as automations/goals.
-- n8n_connections holds only a Vault secret *reference* (uuid), never the
-- key itself, so it's safe to allow read of connection status — but lock
-- write entirely to the service role (server-only functions above).
alter table n8n_connections enable row level security;
create policy "Public read (single-tenant)" on n8n_connections for select using (true);

alter table n8n_workflow_templates enable row level security;
create policy "Public read (single-tenant)" on n8n_workflow_templates for select using (true);

alter table n8n_workflow_corrections enable row level security;
create policy "Public read (single-tenant)" on n8n_workflow_corrections for select using (true);

alter table n8n_deployments enable row level security;
create policy "Public read (single-tenant)" on n8n_deployments for select using (true);

alter table n8n_repair_runs enable row level security;
create policy "Public read (single-tenant)" on n8n_repair_runs for select using (true);

alter table n8n_skill_docs enable row level security;
create policy "Public read (single-tenant)" on n8n_skill_docs for select using (true);

-- === Migration 012: insights + schedule_events ===
-- Folded in from supabase/migrations/012_insights_and_schedule.sql, same
-- gap as above.
-- === Migration 012: insights + schedule_events ===
-- Both the Notifications feed and the Schedule page were pure client-only
-- Zustand state (see the old initialInsights/initialScheduleEvents in
-- lib/initial-data.ts) — anything logged or booked vanished on reload and
-- never synced across tabs/devices. This brings them in line with how
-- goals/automations already work: persisted in Supabase, realtime-enabled,
-- with all writes going through server functions on the service-role
-- client (see src/lib/server/insights.ts, src/lib/server/schedule.ts).

create table if not exists insights (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null default 'default',
  title text not null,
  body text not null default '',
  severity text not null default 'info' check (severity in ('info', 'success', 'warning')),
  source text not null default '',
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists insights_workspace_idx on insights (workspace_id, created_at desc);

alter table insights enable row level security;
-- Same single-tenant shape as goals/automations: reads open for the
-- browser's anon-key realtime subscription, all writes via service role.
create policy "Public read (single-tenant)" on insights for select using (true);

create table if not exists schedule_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null default 'default',
  title text not null,
  day text not null check (day in ('Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun')),
  start_time text not null,             -- 24h "HH:MM"
  end_time text not null,               -- 24h "HH:MM"
  category text not null default 'other'
    check (category in ('meeting', 'content', 'campaign', 'automation', 'followup', 'other')),
  notes text not null default '',
  done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists schedule_events_workspace_idx on schedule_events (workspace_id, day);

alter table schedule_events enable row level security;
create policy "Public read (single-tenant)" on schedule_events for select using (true);

alter publication supabase_realtime add table insights;
alter publication supabase_realtime add table schedule_events;

-- === Migration 013: reconcile supabase_realtime publication ===
-- See supabase/migrations/013_reconcile_realtime_publication.sql for why
-- this is here even though 012 above already has these two lines: the
-- live project was missing them despite 012 existing, so a fresh
-- install from a version of this file predating this fix would be too.
