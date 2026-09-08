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
