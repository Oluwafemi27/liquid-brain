-- === Migration 021: facts imported from other memory tools (mem0, claude-mem) ===
-- Service-role only (RLS on, no policies), like the other tables that hold personal content.
create table if not exists imported_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_kind text not null check (source_kind in ('mem0', 'claude-mem')),
  external_id text not null,
  text text not null,
  tags text[] not null default '{}',
  created_at_source timestamptz,
  imported_at timestamptz not null default now(),
  -- Re-importing the same export updates rows instead of duplicating them.
  unique (user_id, source_kind, external_id)
);
create index if not exists imported_memories_user_idx on imported_memories (user_id, imported_at desc);
alter table imported_memories enable row level security;
