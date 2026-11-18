-- Remembers which Composio app connections ADUF has already announced, so each new connection
-- (or removal) produces exactly one notification. Server-side only: RLS on, no policies.
create table if not exists public.composio_seen (
  user_id uuid not null,
  connection_id text not null,
  toolkit text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, connection_id)
);
alter table public.composio_seen enable row level security;
