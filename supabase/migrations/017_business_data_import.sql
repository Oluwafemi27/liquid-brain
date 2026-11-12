-- === Migration 017: business data import (sales, leads, customers, deals, traffic) ===
-- The Analytics page used to say "importing sales, leads and customers from
-- connected sources isn't built yet". This is the storage behind the feature
-- that replaced that message. Everything the Analytics panels show is computed
-- from these rows — nothing is simulated.
--
-- Privacy: customer names / emails live here, so unlike goals/insights these
-- tables are NOT publicly readable. RLS is on with no policies, which means
-- only the service-role client (server functions) can touch them, and every
-- server function filters by the verified user id.

create table if not exists data_imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null check (source in ('csv', 'sheets', 'drive', 'ga', 'gmail')),
  kind text not null check (kind in ('sale', 'lead', 'customer', 'deal', 'traffic')),
  label text not null,                 -- file name / GA property / "Inbound email"
  source_ref text not null,            -- stable key: file id, GA property id, filename…
  currency text not null default 'USD',
  rows_imported integer not null default 0,
  rows_skipped integer not null default 0,
  note text not null default '',
  created_at timestamptz not null default now(),
  unique (user_id, source_ref, kind)
);
create index if not exists data_imports_user_idx on data_imports (user_id, created_at desc);

create table if not exists business_records (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references data_imports(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('sale', 'lead', 'customer', 'deal')),
  occurred_on date,                    -- sale date / lead date / last order / deal date
  amount numeric,                      -- sale amount, customer LTV, deal value
  currency text not null default 'USD',
  name text,                           -- customer / lead / deal contact name
  company text,
  email text,
  channel text,                        -- where it came from (Instagram, Referral…)
  stage text,                          -- deals: New / Contacted / Negotiation / Won
  probability numeric,                 -- deals: 0-100
  owner text,
  segment text,                        -- customers
  orders integer,                      -- customers
  created_at timestamptz not null default now()
);
create index if not exists business_records_user_kind_idx on business_records (user_id, kind, occurred_on);
create index if not exists business_records_import_idx on business_records (import_id);

-- Google Analytics: one row per month (channel null) and per month+channel.
create table if not exists traffic_snapshots (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references data_imports(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  month date not null,                 -- first day of the month
  channel text,                        -- null = whole-site total for the month
  sessions integer not null default 0,
  key_events integer not null default 0,
  revenue numeric not null default 0,
  currency text not null default 'USD'
);
create index if not exists traffic_snapshots_user_idx on traffic_snapshots (user_id, month);

alter table data_imports enable row level security;
alter table business_records enable row level security;
alter table traffic_snapshots enable row level security;
