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
