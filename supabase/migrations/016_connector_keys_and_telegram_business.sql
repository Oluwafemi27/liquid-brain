-- === Migration 016: pasted-credential connectors + Telegram Business ===
-- Run AFTER 015.
--
-- Part 1 — connector_secrets: credentials the owner pastes in (Semrush API key,
-- Jumia application token, Paystack secret key). Stored encrypted in Supabase
-- Vault, same pattern as the Telegram bot token (014). The `connectors` row
-- only ever holds the non-secret "connected" flag and a last-4 hint.
--
-- Part 2 — Telegram Business: lets the workspace's bot handle the owner's own
-- private customer DMs (Telegram → Settings → Business → Chatbots). Telegram
-- delivers those as `business_message` updates over the SAME webhook — no
-- session strings, no user-account login.
--
-- RLS on, no policies: server (service role) only, like 014/015.

-- ---------------------------------------------------------------- Part 1 ---
create table if not exists connector_secrets (
  workspace_id text not null default 'default',
  provider text not null,
  vault_secret_id uuid not null,
  hint text,                                -- e.g. "…a1b2", safe to show
  updated_at timestamptz not null default now(),
  primary key (workspace_id, provider)
);
alter table connector_secrets enable row level security;

-- p_secret is a JSON document ({"apiKey": "..."}) so multi-field providers
-- (Jumia: clientId + token) use one Vault entry.
create or replace function store_connector_secret(
  p_workspace_id text,
  p_provider text,
  p_secret text,
  p_hint text
) returns void
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_secret_id uuid;
begin
  select vault_secret_id into v_secret_id
    from connector_secrets
    where workspace_id = p_workspace_id and provider = p_provider;

  if v_secret_id is not null then
    perform vault.update_secret(v_secret_id, p_secret);
  else
    v_secret_id := vault.create_secret(
      p_secret,
      'connector_' || p_provider || '_' || p_workspace_id,
      p_provider || ' credentials for workspace ' || p_workspace_id
    );
  end if;

  insert into connector_secrets (workspace_id, provider, vault_secret_id, hint, updated_at)
  values (p_workspace_id, p_provider, v_secret_id, p_hint, now())
  on conflict (workspace_id, provider) do update
    set vault_secret_id = excluded.vault_secret_id,
        hint = excluded.hint,
        updated_at = now();
end;
$$;

create or replace function get_decrypted_connector_secret(p_workspace_id text, p_provider text)
returns text
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_secret text;
begin
  select s.decrypted_secret into v_secret
    from connector_secrets c
    join vault.decrypted_secrets s on s.id = c.vault_secret_id
    where c.workspace_id = p_workspace_id and c.provider = p_provider;
  return v_secret;
end;
$$;

create or replace function delete_connector_secret(p_workspace_id text, p_provider text)
returns void
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_secret_id uuid;
begin
  select vault_secret_id into v_secret_id
    from connector_secrets
    where workspace_id = p_workspace_id and provider = p_provider;
  if v_secret_id is not null then
    delete from vault.secrets where id = v_secret_id;
  end if;
  delete from connector_secrets where workspace_id = p_workspace_id and provider = p_provider;
end;
$$;

revoke execute on function store_connector_secret(text, text, text, text) from public, anon, authenticated;
revoke execute on function get_decrypted_connector_secret(text, text) from public, anon, authenticated;
revoke execute on function delete_connector_secret(text, text) from public, anon, authenticated;
grant execute on function store_connector_secret(text, text, text, text) to service_role;
grant execute on function get_decrypted_connector_secret(text, text) to service_role;
grant execute on function delete_connector_secret(text, text) to service_role;

-- ---------------------------------------------------------------- Part 2 ---
-- One row per Telegram account that connected the bot under Business settings.
create table if not exists telegram_business_connections (
  workspace_id text not null default 'default',
  connection_id text not null,              -- Telegram's business_connection_id
  user_id bigint not null,                  -- the owner's Telegram user id
  user_chat_id bigint not null,             -- private chat with the owner (for alerts)
  user_name text,
  is_enabled boolean not null default true,
  can_reply boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (workspace_id, connection_id)
);
alter table telegram_business_connections enable row level security;

-- Auto-reply is OFF until the owner turns it on — otherwise connecting the bot
-- would immediately start answering friends and family.
create table if not exists telegram_business_settings (
  workspace_id text primary key default 'default',
  auto_reply_enabled boolean not null default false,
  disclose_ai boolean not null default true,   -- first reply in a chat says it's automated
  pause_hours int not null default 12 check (pause_hours between 1 and 168),
  max_replies_per_hour int not null default 8 check (max_replies_per_hour between 1 and 60),
  business_info text,                          -- facts the assistant may use (prices, hours, policies…)
  updated_at timestamptz not null default now()
);
alter table telegram_business_settings enable row level security;

-- Human takeover: while a chat is paused the assistant stays silent. Set when
-- the owner types in that chat themselves, or when the assistant hands off.
create table if not exists telegram_business_pauses (
  workspace_id text not null default 'default',
  chat_id bigint not null,
  paused_until timestamptz not null,
  reason text,
  primary key (workspace_id, chat_id)
);
alter table telegram_business_pauses enable row level security;

alter table telegram_messages
  add column if not exists business_connection_id text,
  add column if not exists tg_message_id bigint;   -- lets us tell our own replies from the owner's typing

-- Owner-typed messages inside a business chat are recorded too (direction 'owner').
alter table telegram_messages drop constraint if exists telegram_messages_direction_check;
alter table telegram_messages
  add constraint telegram_messages_direction_check check (direction in ('in', 'out', 'owner'));

create index if not exists telegram_messages_chat_idx
  on telegram_messages (workspace_id, chat_id, received_at desc);
