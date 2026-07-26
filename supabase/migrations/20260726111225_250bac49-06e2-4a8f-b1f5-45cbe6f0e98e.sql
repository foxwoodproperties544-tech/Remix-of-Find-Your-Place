
SELECT cron.unschedule('foxwood-listing-freshness')
 WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'foxwood-listing-freshness');

SELECT cron.schedule(
  'foxwood-listing-freshness',
  '30 7 * * *',
  $$SELECT public.send_listing_freshness_reminders();$$
);
