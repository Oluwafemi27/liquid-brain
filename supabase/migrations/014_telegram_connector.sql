-- === Migration 014: Telegram connector ===
-- Telegram connects with a bot token (from @BotFather), not OAuth. The token
-- is stored encrypted in Supabase Vault, same pattern as n8n / BYOK model
-- keys. The webhook secret is only stored as a SHA-256 hash, so a leaked
-- table row can't be used to forge webhook calls.
--
-- RLS is enabled with NO policies on purpose: only the server (service-role
-- key) touches these tables. The anon/authenticated roles get nothing.

create table if not exists telegram_connections (
  workspace_id text primary key default 'default',
  vault_secret_id uuid not null,          -- bot token, stored in Supabase Vault
  bot_id bigint not null,
  bot_username text,
  bot_name text,
  webhook_secret_hash text not null,      -- sha256 hex of the secret_token given to Telegram
  connected boolean not null default true,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists telegram_messages (
  id bigint generated always as identity primary key,
  workspace_id text not null default 'default',
  update_id bigint not null,              -- Telegram's own id; makes webhook retries idempotent
  chat_id bigint not null,
  chat_type text,
  from_id bigint,
  from_name text,
  text text,
  received_at timestamptz not null default now(),
  unique (workspace_id, update_id)
);
create index if not exists telegram_messages_recent_idx
  on telegram_messages (workspace_id, received_at desc);

alter table telegram_connections enable row level security;
alter table telegram_messages enable row level security;

create or replace function store_telegram_connection(
  p_workspace_id text,
  p_bot_token text,
  p_bot_id bigint,
  p_bot_username text,
  p_bot_name text,
  p_webhook_secret_hash text
) returns void
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_secret_id uuid;
begin
  select vault_secret_id into v_secret_id
    from telegram_connections where workspace_id = p_workspace_id;

  if v_secret_id is not null then
    perform vault.update_secret(v_secret_id, p_bot_token);
  else
    v_secret_id := vault.create_secret(p_bot_token, 'telegram_bot_token_' || p_workspace_id,
      'Telegram bot token for workspace ' || p_workspace_id);
  end if;

  insert into telegram_connections
    (workspace_id, vault_secret_id, bot_id, bot_username, bot_name, webhook_secret_hash, connected, last_error, updated_at)
  values
    (p_workspace_id, v_secret_id, p_bot_id, p_bot_username, p_bot_name, p_webhook_secret_hash, true, null, now())
  on conflict (workspace_id) do update
    set vault_secret_id = excluded.vault_secret_id,
        bot_id = excluded.bot_id,
        bot_username = excluded.bot_username,
        bot_name = excluded.bot_name,
        webhook_secret_hash = excluded.webhook_secret_hash,
        connected = true,
        last_error = null,
        updated_at = now();
end;
$$;

create or replace function get_decrypted_telegram_token(p_workspace_id text)
returns text
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_token text;
begin
  select s.decrypted_secret into v_token
    from telegram_connections c
    join vault.decrypted_secrets s on s.id = c.vault_secret_id
    where c.workspace_id = p_workspace_id and c.connected;
  return v_token;
end;
$$;

create or replace function delete_telegram_connection(p_workspace_id text)
returns void
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_secret_id uuid;
begin
  select vault_secret_id into v_secret_id
    from telegram_connections where workspace_id = p_workspace_id;
  if v_secret_id is not null then
    delete from vault.secrets where id = v_secret_id;
  end if;
  delete from telegram_connections where workspace_id = p_workspace_id;
end;
$$;

-- Server-only: nobody but the service role may call these through /rest/v1/rpc.
revoke execute on function store_telegram_connection(text, text, bigint, text, text, text) from public, anon, authenticated;
revoke execute on function get_decrypted_telegram_token(text) from public, anon, authenticated;
revoke execute on function delete_telegram_connection(text) from public, anon, authenticated;
grant execute on function store_telegram_connection(text, text, bigint, text, text, text) to service_role;
grant execute on function get_decrypted_telegram_token(text) to service_role;
grant execute on function delete_telegram_connection(text) to service_role;
