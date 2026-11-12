-- Uploaded originals are deleted automatically: expires_at says when. Safe to run more than once.
-- Add the column bare, backfill from each file's real age, and only then set the default: adding it
-- with a default would give files that are already old a fresh 23 hours.
alter table chat_attachments add column if not exists expires_at timestamptz;
update chat_attachments set expires_at = created_at + interval '23 hours' where expires_at is null;
alter table chat_attachments alter column expires_at set default (now() + interval '23 hours');
create index if not exists chat_attachments_expiry_idx on chat_attachments (expires_at) where storage_path is not null;

do $$
begin
  if to_regclass('public.agent_documents') is not null then
    -- Only uploaded files expire; documents the AI wrote for you are kept.
    alter table public.agent_documents add column if not exists expires_at timestamptz;
    create index if not exists agent_documents_expiry_idx on public.agent_documents (expires_at) where expires_at is not null;
    update public.agent_documents set expires_at = created_at + interval '23 hours' where source = 'upload' and expires_at is null;
  end if;
end $$;
