-- === Migration 020: plans, AI tokens, subscriptions, Paystack payments, promo codes, connector requests ===
-- Everything is service-role only (RLS on, no policies). Prices are NGN (what Paystack charges);
-- USD values are display-only references. Admins edit plans/packs from the admin panel.

create table if not exists plans (
  id text primary key,
  name text not null,
  tagline text not null default '',
  sort_order int not null default 0,
  active boolean not null default true,
  highlighted boolean not null default false,
  price_ngn_month numeric not null default 0 check (price_ngn_month >= 0),
  price_ngn_year numeric not null default 0 check (price_ngn_year >= 0),
  price_usd_month numeric not null default 0 check (price_usd_month >= 0),
  price_usd_year numeric not null default 0 check (price_usd_year >= 0),
  monthly_tokens bigint not null default 0 check (monthly_tokens >= 0),
  limits jsonb not null default '{}',     -- {automations, dataSources, n8n, sandbox, digest}
  features jsonb not null default '[]',   -- marketing bullets shown on pricing cards
  paystack_plan_month text,               -- Paystack plan codes (PLN_…) enabling auto-renewal
  paystack_plan_year text,
  updated_at timestamptz not null default now()
);

create table if not exists token_packs (
  id text primary key,
  name text not null,
  tokens bigint not null check (tokens > 0),
  price_ngn numeric not null check (price_ngn >= 0),
  price_usd numeric not null default 0,
  active boolean not null default true,
  sort_order int not null default 0
);

create table if not exists billing_settings (
  id int primary key default 1 check (id = 1),
  trial_enabled boolean not null default true,
  trial_days int not null default 14 check (trial_days between 1 and 90),
  trial_plan text not null default 'growth' references plans(id)
);

create table if not exists subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan_id text not null references plans(id),
  status text not null default 'active' check (status in ('active', 'trialing', 'past_due')),
  source text not null default 'free' check (source in ('free', 'trial', 'paystack', 'promo', 'admin')),
  billing_interval text check (billing_interval in ('month', 'year')),
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  grace_until timestamptz,
  paystack_customer_code text,
  paystack_subscription_code text,
  paystack_email_token text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists subscriptions_customer_idx on subscriptions (paystack_customer_code);

-- plan_tokens_used resets every 30 days (lazily); bonus_tokens (top-ups, promos) never expire.
create table if not exists token_wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  period_start timestamptz not null default now(),
  period_end timestamptz not null,
  plan_tokens_used bigint not null default 0,
  bonus_tokens bigint not null default 0 check (bonus_tokens >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists token_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  delta bigint not null,
  kind text not null check (kind in ('usage', 'renewal', 'topup', 'promo', 'admin', 'trial', 'purchase')),
  feature text,
  ref text,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists token_ledger_user_idx on token_ledger (user_id, created_at desc);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('subscription', 'topup')),
  plan_id text,
  billing_interval text check (billing_interval in ('month', 'year')),
  pack_id text,
  amount_minor bigint not null check (amount_minor >= 0),   -- kobo
  currency text not null default 'NGN',
  discount_minor bigint not null default 0,
  promo_code_id uuid,
  status text not null default 'pending' check (status in ('pending', 'success', 'failed', 'abandoned')),
  paystack_reference text not null unique,
  recurring boolean not null default false,
  tokens bigint,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists payments_user_idx on payments (user_id, created_at desc);

create table if not exists promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  kind text not null check (kind in ('percent_off', 'free_plan', 'bonus_tokens')),
  percent int check (percent between 1 and 100),
  plan_id text references plans(id),
  duration_days int check (duration_days between 1 and 3650),
  tokens bigint check (tokens > 0),
  applies_to text not null default 'any' check (applies_to in ('any', 'subscription', 'topup')),
  max_redemptions int check (max_redemptions > 0),
  redeemed_count int not null default 0,
  expires_at timestamptz,
  active boolean not null default true,
  note text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (
    (kind = 'percent_off' and percent is not null) or
    (kind = 'free_plan' and plan_id is not null and duration_days is not null) or
    (kind = 'bonus_tokens' and tokens is not null)
  )
);

create table if not exists promo_redemptions (
  id uuid primary key default gen_random_uuid(),
  code_id uuid not null references promo_codes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  effect jsonb not null default '{}',
  redeemed_at timestamptz not null default now(),
  unique (code_id, user_id)
);

create table if not exists connector_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  note text not null default '',
  created_at timestamptz not null default now()
);

-- More data sources can now feed Analytics (payments, commerce, CRM).
alter table data_imports drop constraint if exists data_imports_source_check;
alter table data_imports add constraint data_imports_source_check
  check (source in ('csv','sheets','drive','ga','gmail','paystack','stripe','flutterwave','woocommerce','hubspot','pipedrive'));

-- ---- atomic helpers (service role only) ----

-- Spends tokens from the monthly allowance first, then bonus tokens; never loses a usage record.
create or replace function consume_tokens(p_user uuid, p_amount bigint, p_plan_limit bigint, p_feature text)
returns void language plpgsql security definer set search_path = public as $$
declare w token_wallets; remaining bigint; from_plan bigint; from_bonus bigint;
begin
  if p_amount <= 0 then return; end if;
  select * into w from token_wallets where user_id = p_user for update;
  if not found then return; end if;
  remaining := greatest(p_plan_limit - w.plan_tokens_used, 0);
  from_plan := least(p_amount, remaining);
  from_bonus := least(p_amount - from_plan, w.bonus_tokens);
  update token_wallets
     set plan_tokens_used = plan_tokens_used + from_plan + (p_amount - from_plan - from_bonus),
         bonus_tokens = bonus_tokens - from_bonus,
         updated_at = now()
   where user_id = p_user;
  insert into token_ledger (user_id, delta, kind, feature) values (p_user, -p_amount, 'usage', p_feature);
end $$;

create or replace function grant_bonus_tokens(p_user uuid, p_amount bigint, p_kind text, p_note text, p_ref text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_amount <= 0 then return; end if;
  update token_wallets set bonus_tokens = bonus_tokens + p_amount, updated_at = now() where user_id = p_user;
  insert into token_ledger (user_id, delta, kind, note, ref) values (p_user, p_amount, p_kind, p_note, p_ref);
end $$;

-- One redemption per person per code, never past max_redemptions, never when expired/inactive.
create or replace function redeem_promo(p_code_id uuid, p_user uuid, p_effect jsonb, p_enforce_limit boolean)
returns text language plpgsql security definer set search_path = public as $$
declare c promo_codes;
begin
  select * into c from promo_codes where id = p_code_id for update;
  if not found or not c.active then return 'inactive'; end if;
  if c.expires_at is not null and c.expires_at < now() then return 'expired'; end if;
  if p_enforce_limit and c.max_redemptions is not null and c.redeemed_count >= c.max_redemptions then return 'exhausted'; end if;
  begin
    insert into promo_redemptions (code_id, user_id, effect) values (p_code_id, p_user, coalesce(p_effect, '{}'));
  exception when unique_violation then
    return 'already';
  end;
  update promo_codes set redeemed_count = redeemed_count + 1 where id = p_code_id;
  return 'ok';
end $$;

revoke execute on function consume_tokens(uuid, bigint, bigint, text) from public, anon, authenticated;
revoke execute on function grant_bonus_tokens(uuid, bigint, text, text, text) from public, anon, authenticated;
revoke execute on function redeem_promo(uuid, uuid, jsonb, boolean) from public, anon, authenticated;
grant execute on function consume_tokens(uuid, bigint, bigint, text) to service_role;
grant execute on function grant_bonus_tokens(uuid, bigint, text, text, text) to service_role;
grant execute on function redeem_promo(uuid, uuid, jsonb, boolean) to service_role;

alter table plans enable row level security;
alter table token_packs enable row level security;
alter table billing_settings enable row level security;
alter table subscriptions enable row level security;
alter table token_wallets enable row level security;
alter table token_ledger enable row level security;
alter table payments enable row level security;
alter table promo_codes enable row level security;
alter table promo_redemptions enable row level security;
alter table connector_requests enable row level security;

-- ---- seed (admins can change all of this in the admin panel) ----
insert into plans (id, name, tagline, sort_order, highlighted, price_ngn_month, price_ngn_year, price_usd_month, price_usd_year, monthly_tokens, limits, features) values
 ('free', 'Free', 'Try ADUF on one small business', 0, false, 0, 0, 0, 0, 30000,
  '{"automations":3,"dataSources":1,"n8n":false,"sandbox":false,"digest":false}',
  '["30,000 AI tokens a month","3 automations","1 data source","Daily verdict and approvals"]'),
 ('starter', 'Starter', 'For a solo owner getting organised', 1, false, 5000, 50000, 3.33, 33.33, 300000,
  '{"automations":10,"dataSources":3,"n8n":false,"sandbox":false,"digest":true}',
  '["300,000 AI tokens a month","10 automations","3 data sources","Daily summary by email or Telegram"]'),
 ('growth', 'Growth', 'For a business that runs on ADUF every day', 2, true, 10000, 100000, 6.67, 66.67, 1500000,
  '{"automations":50,"dataSources":10,"n8n":true,"sandbox":true,"digest":true}',
  '["1.5M AI tokens a month","50 automations","10 data sources","n8n workflows and code execution"]'),
 ('scale', 'Scale', 'For teams and heavy automation', 3, false, 25000, 250000, 16.67, 166.67, 6000000,
  '{"automations":500,"dataSources":50,"n8n":true,"sandbox":true,"digest":true}',
  '["6M AI tokens a month","500 automations","50 data sources","Everything in Growth"]')
on conflict (id) do nothing;

insert into token_packs (id, name, tokens, price_ngn, price_usd, sort_order) values
 ('pack_100k', '100K tokens', 100000, 6000, 4, 0),
 ('pack_500k', '500K tokens', 500000, 25000, 17, 1),
 ('pack_2m', '2M tokens', 2000000, 90000, 60, 2)
on conflict (id) do nothing;

insert into billing_settings (id) values (1) on conflict (id) do nothing;
