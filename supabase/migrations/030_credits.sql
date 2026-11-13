-- The plan allowance and top-ups are counted in CREDITS: one normal AI reply costs 1 credit and a heavy
-- one (tools, helpers, long files) costs more. Raw model tokens are converted at billing_settings.tokens_per_credit.
alter table public.billing_settings add column if not exists tokens_per_credit integer not null default 12000 check (tokens_per_credit between 500 and 1000000);
alter table public.token_packs add column if not exists bonus_tokens integer not null default 0 check (bonus_tokens >= 0);

-- Existing balances were in raw tokens: convert them (rounding up, so nobody loses credit).
update public.token_wallets set
  plan_tokens_used = ceil(plan_tokens_used / 12000.0),
  bonus_tokens = ceil(bonus_tokens / 12000.0);

update public.plans set
  monthly_tokens = case id when 'free' then 20 when 'starter' then 40 when 'growth' then 80 when 'scale' then 160 else monthly_tokens end,
  features = case id
    when 'free' then '["20 AI credits a month","3 automations","1 data source","Daily verdict and approvals"]'::jsonb
    when 'starter' then '["40 AI credits a month","10 automations","3 data sources","Daily summary by email or Telegram"]'::jsonb
    when 'growth' then '["80 AI credits a month","50 automations","10 data sources","n8n workflows and code execution"]'::jsonb
    when 'scale' then '["160 AI credits a month","500 automations","50 data sources","Everything in Growth"]'::jsonb
    else features end,
  updated_at = now()
where id in ('free','starter','growth','scale');

-- Top-up packs: small purchases of extra credits, some with bonus credits on top. Editable by admins.
update public.token_packs set active = false where id not like 'credits\_%';
insert into public.token_packs (id, name, tokens, bonus_tokens, price_ngn, price_usd, active, sort_order) values
  ('credits_10', '10 credits', 10, 0, 1500, 1, true, 10),
  ('credits_25', '25 credits', 25, 3, 3500, 2.5, true, 11),
  ('credits_60', '60 credits', 60, 10, 8000, 5.5, true, 12)
on conflict (id) do nothing;
