-- === Migration 015: Telegram two-way replies ===
-- Run AFTER 014. Adds what the bot needs to actually converse:
--   * telegram_paired_chats — only chats that paired with the owner's one-time
--     code may talk to the agent. Without this, anyone who finds the bot's
--     @username could spend the owner's AI credits and read their business
--     context. Unpaired chats get a fixed reply and never reach the model.
--   * pairing_code / owner_user_id on the connection — the code the owner
--     sends as "/start CODE", and whose onboarding survey gives the agent its
--     business context.
--   * direction on telegram_messages — so the bot's own replies are stored
--     too and can be fed back to the agent as conversation history.
-- RLS on, no policies: server (service role) only, like 014.

alter table telegram_connections
  add column if not exists pairing_code text,
  add column if not exists owner_user_id uuid;

alter table telegram_messages
  add column if not exists direction text not null default 'in'
    check (direction in ('in', 'out'));
-- Outbound rows have no Telegram update_id.
alter table telegram_messages alter column update_id drop not null;

create table if not exists telegram_paired_chats (
  workspace_id text not null default 'default',
  chat_id bigint not null,
  display_name text,
  paired_at timestamptz not null default now(),
  primary key (workspace_id, chat_id)
);
alter table telegram_paired_chats enable row level security;
