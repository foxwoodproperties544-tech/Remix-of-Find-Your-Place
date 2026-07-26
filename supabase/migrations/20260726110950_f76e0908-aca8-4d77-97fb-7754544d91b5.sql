
-- 1. Listing freshness
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS last_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS freshness_reminder_at timestamptz;

UPDATE public.properties
   SET last_confirmed_at = COALESCE(published_at, created_at)
 WHERE last_confirmed_at IS NULL;

CREATE OR REPLACE FUNCTION public.send_listing_freshness_reminders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r RECORD; sent int := 0;
BEGIN
  FOR r IN
    SELECT p.id, p.title, p.owner_id
      FROM public.properties p
     WHERE p.status = 'published'
       AND p.owner_id IS NOT NULL
       AND COALESCE(p.last_confirmed_at, p.published_at, p.created_at) < now() - interval '30 days'
       AND (p.freshness_reminder_at IS NULL OR p.freshness_reminder_at < now() - interval '7 days')
     LIMIT 500
  LOOP
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (r.owner_id, 'listing_freshness',
            'Is "' || r.title || '" still available?',
            'Confirm this listing is still on the market so buyers keep seeing it at the top of search.',
            '/dashboard');
    UPDATE public.properties SET freshness_reminder_at = now() WHERE id = r.id;
    sent := sent + 1;
  END LOOP;
  RETURN sent;
END; $$;

REVOKE EXECUTE ON FUNCTION public.send_listing_freshness_reminders() FROM anon, authenticated;

-- 2. Review moderation
ALTER TABLE public.reviews ALTER COLUMN status SET DEFAULT 'pending';
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS moderated_by uuid;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS moderated_at timestamptz;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS moderation_note text;

DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='reviews' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.reviews', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Approved reviews are public"
  ON public.reviews FOR SELECT TO anon, authenticated
  USING (status = 'approved');

CREATE POLICY "Users can read their own reviews"
  ON public.reviews FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all reviews"
  ON public.reviews FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create their own reviews"
  ON public.reviews FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Users can update their own pending reviews"
  ON public.reviews FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Users can delete their own reviews"
  ON public.reviews FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can moderate reviews"
  ON public.reviews FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete reviews"
  ON public.reviews FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

GRANT SELECT ON public.reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
