
-- 1) scan_runs log
CREATE TABLE IF NOT EXISTS public.scan_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ran_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ok BOOLEAN NOT NULL,
  reminders_sent INT NOT NULL DEFAULT 0,
  error_step TEXT,
  error_message TEXT,
  duration_ms INT NOT NULL DEFAULT 0,
  triggered_by TEXT NOT NULL DEFAULT 'cron'
);
GRANT SELECT ON public.scan_runs TO authenticated;
GRANT ALL ON public.scan_runs TO service_role;
ALTER TABLE public.scan_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view scan runs" ON public.scan_runs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS scan_runs_ran_at_idx ON public.scan_runs (ran_at DESC);

-- 2) Pending package switch columns
ALTER TABLE public.property_package_purchases
  ADD COLUMN IF NOT EXISTS pending_package_id UUID REFERENCES public.listing_packages(id);
ALTER TABLE public.blog_post_purchases
  ADD COLUMN IF NOT EXISTS pending_package_id UUID REFERENCES public.blog_packages(id);
ALTER TABLE public.ad_campaigns
  ADD COLUMN IF NOT EXISTS pending_package_id UUID REFERENCES public.ad_packages(id);

-- 3) Extend the sweep to apply pending package switches at expiry
CREATE OR REPLACE FUNCTION public.expire_listing_packages()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  g jsonb;
  grace_tier int; grace_list int; grace_blog int; grace_ad int;
BEGIN
  SELECT value INTO g FROM public.platform_settings WHERE key = 'grace_days';
  grace_tier := COALESCE((g->>'tier')::int, 3);
  grace_list := COALESCE((g->>'listing')::int, 3);
  grace_blog := COALESCE((g->>'blog')::int, 3);
  grace_ad   := COALESCE((g->>'ad')::int, 3);

  -- Apply pending property package switches at expiry (before expiring)
  WITH switched AS (
    UPDATE public.property_package_purchases pp
       SET package_id = pp.pending_package_id,
           pending_package_id = NULL,
           activated_at = now(),
           expires_at = now() + ((SELECT duration_days FROM public.listing_packages WHERE id = pp.pending_package_id) || ' days')::interval,
           status = 'active'
     WHERE pp.pending_package_id IS NOT NULL
       AND pp.expires_at IS NOT NULL
       AND pp.expires_at < now()
       AND pp.status = 'active'
     RETURNING id, property_id, package_id
  )
  UPDATE public.properties p
     SET is_featured = COALESCE((SELECT is_featured FROM public.listing_packages WHERE id = s.package_id), false),
         featured = COALESCE((SELECT is_featured FROM public.listing_packages WHERE id = s.package_id), false)
    FROM switched s
   WHERE p.id = s.property_id;

  -- Listing package purchases past grace
  UPDATE public.property_package_purchases
     SET status = 'expired'
   WHERE status = 'active'
     AND expires_at IS NOT NULL
     AND expires_at < now() - make_interval(days => grace_list);

  UPDATE public.properties p
     SET status = 'expired', is_featured = false, featured = false, featured_until = NULL
   WHERE p.status = 'published'
     AND NOT EXISTS (
       SELECT 1 FROM public.property_package_purchases pp
        WHERE pp.property_id = p.id
          AND pp.status = 'active'
          AND (pp.expires_at IS NULL OR pp.expires_at > now() - make_interval(days => grace_list))
     )
     AND EXISTS (SELECT 1 FROM public.property_package_purchases pp WHERE pp.property_id = p.id);

  -- Apply pending ad package switches at expiry
  UPDATE public.ad_campaigns c
     SET package_id = c.pending_package_id,
         pending_package_id = NULL,
         starts_at = now(),
         expires_at = now() + ((SELECT duration_days FROM public.ad_packages WHERE id = c.pending_package_id) || ' days')::interval,
         status = 'active'
   WHERE c.pending_package_id IS NOT NULL
     AND c.expires_at IS NOT NULL
     AND c.expires_at < now()
     AND c.status IN ('active','paused');

  UPDATE public.ad_campaigns SET status = 'expired'
   WHERE status IN ('active','paused') AND expires_at IS NOT NULL
     AND expires_at < now() - make_interval(days => grace_ad);

  -- Apply pending blog package switches at expiry
  UPDATE public.blog_post_purchases bp
     SET package_id = bp.pending_package_id,
         pending_package_id = NULL,
         activated_at = now(),
         expires_at = now() + ((SELECT duration_days FROM public.blog_packages WHERE id = bp.pending_package_id) || ' days')::interval,
         status = 'active'
   WHERE bp.pending_package_id IS NOT NULL
     AND bp.expires_at IS NOT NULL
     AND bp.expires_at < now()
     AND bp.status = 'active';

  UPDATE public.blog_post_purchases SET status = 'expired'
   WHERE status = 'active' AND expires_at IS NOT NULL
     AND expires_at < now() - make_interval(days => grace_blog);

  UPDATE public.blog_posts SET status = 'expired'
   WHERE status = 'published' AND expires_at IS NOT NULL
     AND expires_at < now() - make_interval(days => grace_blog);

  -- Agent tier expiry: apply pending downgrade OR revert to free, past grace
  WITH expiring AS (
    SELECT p.id, p.pending_tier
      FROM public.profiles p
     WHERE p.tier_expires_at IS NOT NULL
       AND p.tier_expires_at < now() - make_interval(days => grace_tier)
       AND p.tier <> 'free'
       AND p.subscription_suspended = false
  )
  UPDATE public.profiles p
     SET tier = COALESCE(e.pending_tier, 'free'),
         pending_tier = NULL,
         tier_expires_at = CASE
           WHEN e.pending_tier IS NOT NULL
             THEN now() + ((SELECT duration_days FROM public.tier_plans WHERE slug = e.pending_tier LIMIT 1) || ' days')::interval
           ELSE NULL END,
         listing_quota = COALESCE(
           (SELECT listing_quota FROM public.tier_plans WHERE slug = COALESCE(e.pending_tier, 'free') LIMIT 1),
           3
         ),
         subscription_started_at = CASE WHEN e.pending_tier IS NOT NULL THEN now() ELSE subscription_started_at END,
         last_expiry_reminder_days = NULL
    FROM expiring e
   WHERE p.id = e.id;
END;
$function$;
