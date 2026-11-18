-- Security hardening. Safe to run more than once, and safe on any database: every step checks
-- that what it touches exists. The server uses the service-role key, which ignores row security,
-- so none of this affects the app's own reads and writes. It only closes what the public
-- (anon) key and signed-in browsers can reach directly.
--
-- RUN THIS BEFORE (or together with) deploying the matching code: the new code stores a
-- user_id on documents.

-- 1. Documents belong to a person. -------------------------------------------------------------
-- Before this, every document sat in one shared pool. Existing rows get no owner and become
-- unreachable until you assign them, e.g. for a single-owner install:
--   update public.agent_documents set user_id = '<your user id from Authentication > Users>'
--   where user_id is null;
do $$
begin
  if to_regclass('public.agent_documents') is not null then
    alter table public.agent_documents add column if not exists user_id uuid;
    create index if not exists agent_documents_owner_idx on public.agent_documents (user_id);
  end if;
end $$;

-- 2. Every table in public denies direct access unless a policy allows it. ---------------------
do $$
declare r record;
begin
  for r in select tablename from pg_tables where schemaname = 'public' and not rowsecurity loop
    execute format('alter table public.%I enable row level security', r.tablename);
  end loop;
end $$;

-- 3. Remove the "anyone can read" policies the single-tenant version created. -------------------
do $$
declare r record;
begin
  for r in select schemaname, tablename, policyname from pg_policies
            where schemaname = 'public' and policyname = 'Public read (single-tenant)' loop
    execute format('drop policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- 4. Signed-in people may read only their own rows (the browser's live updates need this). -------
do $$
declare t text;
begin
  foreach t in array array['goals','automations','automation_runs','chat_messages','insights',
                           'schedule_events','n8n_deployments','agent_documents']
  loop
    if to_regclass('public.' || t) is not null
       and exists (select 1 from information_schema.columns
                    where table_schema = 'public' and table_name = t and column_name = 'user_id') then
      execute format('drop policy if exists "Owner read" on public.%I', t);
      execute format('create policy "Owner read" on public.%I for select to authenticated using (user_id::text = auth.uid()::text)', t);
    end if;
  end loop;
end $$;

-- 5. Functions that handle secrets can only be called by the server. ---------------------------
-- The n8n ones (get_decrypted_n8n_connection and friends) were callable with the public key.
do $$
declare r record;
begin
  for r in select p.oid::regprocedure as sig
             from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.prokind = 'f' and p.prosecdef
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', r.sig);
    execute format('grant execute on function %s to service_role', r.sig);
  end loop;
end $$;
-- Future functions start locked too.
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

-- 6. The file bucket stays private. -------------------------------------------------------------
do $$
begin
  if to_regclass('storage.buckets') is not null then
    update storage.buckets set public = false where id = 'agent-files';
  end if;
end $$;
