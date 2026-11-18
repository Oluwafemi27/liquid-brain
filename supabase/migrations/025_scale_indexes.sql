-- Indexes for the queries every signed-in person triggers on each page load and refresh.
-- Safe to run more than once, and safe on any database: an index is only created when its table
-- and columns exist, so nothing here can fail a deploy.
--
-- Without these, each lookup by user scans the whole table; with hundreds of people that is the
-- first thing to slow down.

do $$
declare
  spec record;
  cols_ok boolean;
begin
  for spec in
    select * from (values
      ('automation_runs', 'automation_runs_user_started_idx', array['user_id', 'started_at'],  'user_id, started_at desc'),
      ('automations',     'automations_user_idx',             array['user_id'],                'user_id'),
      ('goals',           'goals_user_idx',                   array['user_id', 'created_at'],  'user_id, created_at'),
      ('chat_messages',   'chat_messages_user_session_idx',   array['user_id', 'session_id', 'created_at'], 'user_id, session_id, created_at'),
      ('connectors',      'connectors_user_idx',              array['user_id'],                'user_id'),
      ('insights',        'insights_user_created_idx',        array['user_id', 'created_at'],  'user_id, created_at desc'),
      ('schedule_events', 'schedule_events_user_day_idx',     array['user_id', 'day'],         'user_id, day'),
      ('agent_documents', 'agent_documents_user_idx',         array['user_id', 'created_at'],  'user_id, created_at desc'),
      ('telegram_messages','telegram_messages_user_recent_idx', array['user_id', 'received_at'], 'user_id, received_at desc')
    ) as t(tbl, idx, required, definition)
  loop
    select count(*) = cardinality(spec.required)
      into cols_ok
      from information_schema.columns
     where table_schema = 'public'
       and table_name = spec.tbl
       and column_name::text = any (spec.required);
    if cols_ok then
      execute format('create index if not exists %I on public.%I (%s)', spec.idx, spec.tbl, spec.definition);
    end if;
  end loop;
end $$;
