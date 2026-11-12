-- === Migration 018: trust layer (actions, activity, limits, alerts, connection health) ===
-- Everything here is service-role only (RLS on, no policies): the browser never reads these
-- tables directly; server functions verify the caller and scope every query to their user id.

-- Security fix: these three held OAuth tokens / CSRF state / key references with RLS OFF, i.e.
-- readable by anyone with the public anon key. The browser client never reads them.
alter table connectors enable row level security;
alter table oauth_states enable row level security;
alter table user_model_keys enable row level security;

-- Re-sync bookkeeping for imported data: how to repeat an import, when it last worked, why not.
alter table data_imports add column if not exists config jsonb;
alter table data_imports add column if not exists synced_at timestamptz not null default now();
alter table data_imports add column if not exists last_error text;

-- Every change ADUF proposes or makes. Doubles as the approval queue, the undo ledger and the
-- "who approved what" history.
create table if not exists agent_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  reasoning text not null default '',
  params jsonb not null default '{}',
  tier text not null check (tier in ('auto', 'approve')),
  risk text not null check (risk in ('internal', 'ads', 'messages', 'money', 'external')),
  status text not null check (status in ('proposed','auto_executed','approved','declined','undone','expired','failed')),
  source text not null default 'chat',
  preview jsonb,
  result jsonb,
  spend_usd numeric,
  messages integer,
  over_limit boolean not null default false,
  decided_by text check (decided_by in ('auto', 'owner')),
  error text,
  undo_until timestamptz,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  undone_at timestamptz
);
create index if not exists agent_actions_user_idx on agent_actions (user_id, created_at desc);
create index if not exists agent_actions_status_idx on agent_actions (user_id, status);

-- Activity from connected platforms and from ADUF itself (imports, syncs, health changes,
-- connects/disconnects, alerts, messages handled).
create table if not exists platform_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null,
  kind text not null,
  title text not null,
  detail text not null default '',
  status text not null default 'info' check (status in ('ok', 'warn', 'error', 'info')),
  created_at timestamptz not null default now()
);
create index if not exists platform_events_user_idx on platform_events (user_id, created_at desc);
create index if not exists platform_events_platform_idx on platform_events (user_id, platform, created_at desc);

-- Owner-set limits, alert thresholds, quiet hours and digest preferences.
create table if not exists owner_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  ad_change_cap_usd numeric not null default 25 check (ad_change_cap_usd >= 0),
  daily_message_cap integer not null default 50 check (daily_message_cap >= 0),
  alerts_enabled boolean not null default true,
  sales_drop_pct integer not null default 20 check (sales_drop_pct between 1 and 100),
  failed_runs_threshold integer not null default 3 check (failed_runs_threshold between 1 and 100),
  quiet_start text not null default '22:00',
  quiet_end text not null default '07:00',
  timezone text not null default 'Africa/Lagos',
  digest_enabled boolean not null default false,
  digest_channel text not null default 'email' check (digest_channel in ('email', 'telegram')),
  updated_at timestamptz not null default now()
);

-- Last known health of each workspace connection (connectors are workspace-wide).
create table if not exists connector_health (
  workspace_id text not null default 'default',
  id text not null,
  state text not null check (state in ('live', 'delayed', 'broken')),
  message text not null default '',
  action_label text,
  action_href text,
  method text not null default 'token-only' check (method in ('live-check', 'token-only')),
  checked_at timestamptz not null default now(),
  last_ok_at timestamptz,
  primary key (workspace_id, id)
);

alter table agent_actions enable row level security;
alter table platform_events enable row level security;
alter table owner_settings enable row level security;
alter table connector_health enable row level security;
