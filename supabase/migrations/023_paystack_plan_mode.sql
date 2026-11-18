-- Paystack plan codes only exist in the mode (test or live) they were created in. Remember which,
-- so switching PAYSTACK_SECRET_KEY from a test key to a live key never uses codes Paystack would reject.
alter table plans add column if not exists paystack_plan_mode text check (paystack_plan_mode in ('test', 'live'));

-- Codes saved before this migration were made while the app was in testing, so they are test-mode codes.
-- (If you already ran live payments before this migration, set the right value by hand instead.)
update plans set paystack_plan_mode = 'test'
 where paystack_plan_mode is null and (paystack_plan_month is not null or paystack_plan_year is not null);
