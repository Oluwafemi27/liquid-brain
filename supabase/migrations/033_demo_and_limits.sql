-- 1) Hit limits: how many AI actions ("hits") a plan may run per hour and per day (0 = no cap).
--    Stored in plans.limits so admins edit them with the rest of the plan.
update public.plans set limits = limits || case id
  when 'free'    then '{"hitsPerHour":5,"hitsPerDay":10}'::jsonb
  when 'starter' then '{"hitsPerHour":15,"hitsPerDay":30}'::jsonb
  when 'growth'  then '{"hitsPerHour":40,"hitsPerDay":100}'::jsonb
  when 'scale'   then '{"hitsPerHour":100,"hitsPerDay":300}'::jsonb
  else '{}'::jsonb end
where id in ('free','starter','growth','scale') and not (limits ? 'hitsPerHour');

-- 2) The demo tier: not for sale (active = false), one 24-hour "term" per visitor.
insert into public.plans (id, name, tagline, sort_order, active, highlighted, price_ngn_month, price_ngn_year, price_usd_month, price_usd_year, monthly_tokens, limits, features)
values ('demo', 'Demo', 'A 24-hour look around ADUF', 99, false, false, 0, 0, 0, 0, 8,
  '{"automations":0,"dataSources":0,"n8n":false,"sandbox":false,"digest":false,"hitsPerHour":6,"hitsPerDay":8}'::jsonb,
  '["8 AI credits for the session","Uses the ADUF demo model","Deleted after 24 hours"]'::jsonb)
on conflict (id) do nothing;

-- 3) Demo settings (admin-editable).
alter table public.billing_settings
  add column if not exists demo_enabled boolean not null default true,
  add column if not exists demo_key_owner_email text not null default 'oluseyioke39@gmail.com',
  add column if not exists demo_session_hours integer not null default 24 check (demo_session_hours between 1 and 168),
  add column if not exists demo_daily_credit_cap integer not null default 200 check (demo_daily_credit_cap >= 0),
  add column if not exists demo_per_ip_hour integer not null default 3 check (demo_per_ip_hour between 1 and 100);

-- 4) One row per live demo visitor. Each gets their own throwaway account, so visitors can never see
--    each other's chats; the account and everything it made is deleted when expires_at passes.
create table if not exists public.demo_sessions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  ip_hash text
);
create index if not exists demo_sessions_expires_idx on public.demo_sessions (expires_at);
alter table public.demo_sessions enable row level security;  -- no policies: server (service role) only

-- Daily totals for the demo, kept after sessions are deleted so the spend cap and admin stats stay true.
create table if not exists public.demo_stats (
  day date primary key,
  sessions integer not null default 0,
  credits integer not null default 0
);
alter table public.demo_stats enable row level security;

create or replace function public.demo_bump(p_sessions integer, p_credits integer)
returns table (sessions integer, credits integer)
language sql security definer set search_path = '' as $$
  insert into public.demo_stats as d (day, sessions, credits)
  values (current_date, greatest(p_sessions,0), greatest(p_credits,0))
  on conflict (day) do update set sessions = d.sessions + greatest(p_sessions,0), credits = d.credits + greatest(p_credits,0)
  returning d.sessions, d.credits;
$$;

-- 5) Per-term usage the app can show: AI actions and distinct chat sessions since a date.
create or replace function public.term_usage(p_user uuid, p_since timestamptz)
returns table (hits integer, sessions integer)
language sql stable security definer set search_path = '' as $$
  select
    (select count(*)::int from public.token_ledger where user_id = p_user and kind = 'usage' and created_at >= p_since),
    (select count(distinct session_id)::int from public.chat_messages where user_id = p_user and role = 'user' and created_at >= p_since);
$$;

-- 6) Deletes expired demo accounts and EVERYTHING they own, including tables that aren't tied to the
--    account by a foreign key (workspace_id text columns). Finds those tables itself, so tables added
--    later are covered too.
create or replace function public.purge_expired_demo_users(p_limit integer default 200)
returns integer
language plpgsql security definer set search_path = '' as $$
declare
  u uuid; r record; n integer := 0;
begin
  for u in select user_id from public.demo_sessions where expires_at <= now() order by expires_at limit p_limit loop
    delete from auth.users where id = u;  -- cascades to every table with a foreign key to the account
    for r in
      select c.table_name, c.column_name
      from information_schema.columns c
      join information_schema.tables t on t.table_schema = c.table_schema and t.table_name = c.table_name and t.table_type = 'BASE TABLE'
      where c.table_schema = 'public' and c.column_name in ('workspace_id','user_id') and c.table_name not in ('demo_sessions','demo_stats')
    loop
      execute format('delete from public.%I where %I::text = $1', r.table_name, r.column_name) using u::text;
    end loop;
    delete from public.demo_sessions where user_id = u;
    n := n + 1;
  end loop;
  return n;
end $$;

revoke all on function public.demo_bump(integer, integer) from public, anon, authenticated;
revoke all on function public.term_usage(uuid, timestamptz) from public, anon, authenticated;
revoke all on function public.purge_expired_demo_users(integer) from public, anon, authenticated;
grant execute on function public.demo_bump(integer, integer) to service_role;
grant execute on function public.term_usage(uuid, timestamptz) to service_role;
grant execute on function public.purge_expired_demo_users(integer) to service_role;
