
-- Phone verification (OTP) table
CREATE TABLE public.phone_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX phone_verifications_user_idx ON public.phone_verifications(user_id, created_at DESC);

GRANT SELECT ON public.phone_verifications TO authenticated;
GRANT ALL ON public.phone_verifications TO service_role;
ALTER TABLE public.phone_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own phone verifications"
  ON public.phone_verifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Add phone_verified flag to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMPTZ;

-- Saved-search matching function: scan new published properties since last_notified_at,
-- create in-app notifications for owners of saved searches whose filters match.
CREATE OR REPLACE FUNCTION public.run_saved_search_alerts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s RECORD;
  p RECORD;
  f JSONB;
  match_count INT := 0;
  new_matches INT;
  sample_title TEXT;
  q_url TEXT;
BEGIN
  FOR s IN
    SELECT id, user_id, name, filters, last_notified_at
    FROM public.saved_searches
    WHERE notify_email = true
  LOOP
    f := COALESCE(s.filters, '{}'::jsonb);
    new_matches := 0;
    sample_title := NULL;

    FOR p IN
      SELECT id, title, category, type, county, town, price, bedrooms, bathrooms, area_size
      FROM public.properties
      WHERE status = 'published'
        AND published_at > COALESCE(s.last_notified_at, now() - interval '7 days')
        AND (f->>'category' IS NULL OR f->>'category' = '' OR lower(category) = lower(f->>'category'))
        AND (f->>'type' IS NULL OR f->>'type' = '' OR lower(type) = lower(f->>'type'))
        AND (f->>'county' IS NULL OR f->>'county' = '' OR lower(county) = lower(f->>'county'))
        AND (f->>'town' IS NULL OR f->>'town' = '' OR lower(town) = lower(f->>'town'))
        AND (f->>'minPrice' IS NULL OR price >= (f->>'minPrice')::numeric)
        AND (f->>'maxPrice' IS NULL OR price <= (f->>'maxPrice')::numeric)
        AND (f->>'minBeds' IS NULL OR bedrooms >= (f->>'minBeds')::int)
      LIMIT 20
    LOOP
      new_matches := new_matches + 1;
      IF sample_title IS NULL THEN sample_title := p.title; END IF;
    END LOOP;

    IF new_matches > 0 THEN
      q_url := '/properties';
      INSERT INTO public.notifications (user_id, type, title, body, link)
      VALUES (
        s.user_id,
        'saved_search_match',
        new_matches || ' new match' || CASE WHEN new_matches > 1 THEN 'es' ELSE '' END || ' for "' || s.name || '"',
        COALESCE('Latest: ' || sample_title, 'New listings match your saved search.'),
        '/saved-searches'
      );
      match_count := match_count + new_matches;
    END IF;

    UPDATE public.saved_searches SET last_notified_at = now() WHERE id = s.id;
  END LOOP;

  RETURN match_count;
END;
$$;

-- Schedule the alert job hourly
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'saved-search-alerts-hourly') THEN
    PERFORM cron.unschedule('saved-search-alerts-hourly');
  END IF;
  PERFORM cron.schedule(
    'saved-search-alerts-hourly',
    '15 * * * *',
    $cron$SELECT public.run_saved_search_alerts();$cron$
  );
END $$;
