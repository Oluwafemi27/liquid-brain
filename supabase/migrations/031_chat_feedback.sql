-- Thumbs up/down on an ADUF reply. Private to the owner like the rest of chat_messages (owner RLS already applies).
alter table public.chat_messages add column if not exists feedback text check (feedback in ('up','down'));
