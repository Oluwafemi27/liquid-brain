-- Sources shown under each ADUF answer (which data it used and how fresh it was).
alter table chat_messages add column if not exists sources jsonb;
