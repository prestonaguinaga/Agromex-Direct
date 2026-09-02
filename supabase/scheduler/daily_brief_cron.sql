-- ============================================================================
-- Monarch Admin · scheduler for Bob's Daily Brief (Supabase pg_cron + pg_net)
--
-- NOT a migration: it carries your deployment URL and a secret, so run it once
-- by hand in the Supabase SQL editor after the app is deployed. It makes the
-- database call POST https://<your app>/api/brief/run every 15 minutes with
-- the server's secret. The route generates a brief only for companies whose
-- delivery time has passed and that have no brief for the day yet, so calling
-- it often is harmless and retries never duplicate anything.
--
-- 1. In the deployment set BRIEF_CRON_SECRET (a long random string) and, for
--    email, RESEND_API_KEY + BRIEF_FROM_EMAIL. SUPABASE_SERVICE_ROLE_KEY and
--    NEXT_PUBLIC_SITE_URL must also be set.
-- 2. Store the same secret in Supabase Vault so it is not visible in the job:
--      select vault.create_secret('<the same long random string>', 'brief_cron_secret');
-- 3. Replace <your app> below and run this file.
-- ============================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Remove an earlier version of the job, if any.
select cron.unschedule(jobid) from cron.job where jobname = 'monarch-daily-brief';

select cron.schedule(
  'monarch-daily-brief',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://<your app>/api/brief/run',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'brief_cron_secret' limit 1)
    ),
    body := '{"source":"pg_cron"}'::jsonb,
    timeout_milliseconds := 55000
  );
  $$
);

-- Check it is scheduled, and later see the calls it made:
--   select jobid, jobname, schedule, active from cron.job;
--   select status, return_message, start_time from cron.job_run_details order by start_time desc limit 10;
--   select id, status_code, created from net._http_response order by created desc limit 10;
-- The Settings sheet in the app shows the scheduler's last check-in as well.
