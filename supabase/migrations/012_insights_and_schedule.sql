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
