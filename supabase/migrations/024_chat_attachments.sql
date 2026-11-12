-- === Migration 024: chat attachments (any document, image, audio, video) ===
-- One row per file (or derived video/audio analysis) a person attaches in chat. The server keeps the
-- text it extracted (document text, OCR/description of images, transcript of audio/video) so the AI can
-- read it on every turn without the browser resending anything. Service-role only (RLS on, no policies).
create table if not exists chat_attachments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id text not null default 'default',
  filename text not null,
  kind text not null check (kind in ('document', 'image', 'audio', 'video')),
  mime_type text not null,
  size_bytes bigint not null default 0,
  storage_path text,
  status text not null default 'pending' check (status in ('pending', 'ready', 'failed')),
  extracted_text text,
  summary text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists chat_attachments_user_idx on chat_attachments (user_id, created_at desc);
alter table chat_attachments enable row level security;

-- Private bucket the files live in (a no-op if you already have it from the document feature).
insert into storage.buckets (id, name, public) values ('agent-files', 'agent-files', false)
  on conflict (id) do nothing;
