
CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION public.expire_listing_packages()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Mark expired purchases
  UPDATE public.property_package_purchases
     SET status = 'expired'
   WHERE status = 'active'
     AND expires_at IS NOT NULL
     AND expires_at < now();

  -- For any property whose active purchases are all expired, unpublish
  UPDATE public.properties p
     SET status = 'expired',
         is_featured = false,
         featured = false,
         featured_until = NULL
   WHERE p.status = 'published'
     AND NOT EXISTS (
       SELECT 1 FROM public.property_package_purchases pp
        WHERE pp.property_id = p.id
          AND pp.status = 'active'
          AND (pp.expires_at IS NULL OR pp.expires_at > now())
     )
     AND EXISTS (
       SELECT 1 FROM public.property_package_purchases pp
        WHERE pp.property_id = p.id
     );
END; $$;

-- Schedule nightly at 02:00
SELECT cron.schedule(
  'expire-listing-packages',
  '0 2 * * *',
  $$ SELECT public.expire_listing_packages(); $$
);
