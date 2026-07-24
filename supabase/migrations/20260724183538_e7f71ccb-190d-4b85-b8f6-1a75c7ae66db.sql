
-- 1) Convert profiles.tier from enum to text so any admin-created plan slug works
ALTER TABLE public.profiles ALTER COLUMN tier DROP DEFAULT;
ALTER TABLE public.profiles ALTER COLUMN tier TYPE text USING tier::text;
ALTER TABLE public.profiles ALTER COLUMN tier SET DEFAULT 'free';

-- 2) Subscription tracking fields on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS pending_tier text,
  ADD COLUMN IF NOT EXISTS subscription_suspended boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_expiry_reminder_days int;

-- 3) Same conversion + reminder marker on mpesa_transactions tier column
ALTER TABLE public.mpesa_transactions ALTER COLUMN tier TYPE text USING tier::text;

-- 4) Platform settings (grace period configurable per package family)
CREATE TABLE IF NOT EXISTS public.platform_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.platform_settings TO authenticated, anon;
GRANT ALL ON public.platform_settings TO service_role;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read platform_settings" ON public.platform_settings;
CREATE POLICY "public read platform_settings" ON public.platform_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "admin write platform_settings" ON public.platform_settings;
CREATE POLICY "admin write platform_settings" ON public.platform_settings FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.platform_settings(key, value) VALUES
  ('grace_days', '{"tier":3,"listing":3,"blog":3,"ad":3}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 5) Rewritten expiry sweep — honours grace_days per family and applies scheduled downgrades
CREATE OR REPLACE FUNCTION public.expire_listing_packages()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

  -- Ad campaigns
  UPDATE public.ad_campaigns SET status = 'expired'
   WHERE status = 'active' AND expires_at IS NOT NULL
     AND expires_at < now() - make_interval(days => grace_ad);

  -- Blog packages / posts
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

-- 6) Reminder scan — emits in-app notifications 14/7/3/1/0 days before tier expiry
CREATE OR REPLACE FUNCTION public.send_subscription_reminders()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  r RECORD;
  d int;
  bucket int;
  sent int := 0;
  plan_name text;
BEGIN
  FOR r IN
    SELECT p.id, p.full_name, p.tier, p.tier_expires_at, p.last_expiry_reminder_days, tp.name AS plan_name
      FROM public.profiles p
      LEFT JOIN public.tier_plans tp ON tp.slug = p.tier
     WHERE p.tier <> 'free'
       AND p.tier_expires_at IS NOT NULL
       AND p.subscription_suspended = false
       AND p.tier_expires_at BETWEEN now() - interval '1 day' AND now() + interval '15 days'
  LOOP
    d := GREATEST(0, EXTRACT(day FROM (r.tier_expires_at - now()))::int);
    bucket := CASE
      WHEN d >= 14 THEN 14
      WHEN d >= 7  THEN 7
      WHEN d >= 3  THEN 3
      WHEN d >= 1  THEN 1
      ELSE 0
    END;
    IF r.last_expiry_reminder_days IS NOT NULL AND r.last_expiry_reminder_days <= bucket THEN
      CONTINUE;
    END IF;

    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (
      r.id,
      'subscription_reminder',
      CASE WHEN bucket = 0 THEN 'Your subscription has expired'
           WHEN bucket = 1 THEN 'Your subscription expires tomorrow'
           ELSE 'Your subscription expires in ' || bucket || ' days' END,
      COALESCE(r.plan_name, r.tier) || ' plan — renew to keep your premium features and listing capacity.',
      '/dashboard/subscription'
    );

    UPDATE public.profiles SET last_expiry_reminder_days = bucket WHERE id = r.id;
    sent := sent + 1;
  END LOOP;
  RETURN sent;
END;
$function$;
