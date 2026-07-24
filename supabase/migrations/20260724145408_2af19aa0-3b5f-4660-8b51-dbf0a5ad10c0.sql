
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
      SELECT id, title, category, property_type, county, town, price, bedrooms
      FROM public.properties
      WHERE status = 'published'
        AND published_at > COALESCE(s.last_notified_at, now() - interval '7 days')
        AND (f->>'category' IS NULL OR f->>'category' = '' OR lower(category) = lower(f->>'category'))
        AND (f->>'type' IS NULL OR f->>'type' = '' OR lower(property_type) = lower(f->>'type'))
        AND (f->>'county' IS NULL OR f->>'county' = '' OR lower(coalesce(county,'')) = lower(f->>'county'))
        AND (f->>'town' IS NULL OR f->>'town' = '' OR lower(coalesce(town,'')) = lower(f->>'town'))
        AND (f->>'minPrice' IS NULL OR price >= (f->>'minPrice')::numeric)
        AND (f->>'maxPrice' IS NULL OR price <= (f->>'maxPrice')::numeric)
        AND (f->>'minBeds' IS NULL OR bedrooms >= (f->>'minBeds')::int)
      LIMIT 20
    LOOP
      new_matches := new_matches + 1;
      IF sample_title IS NULL THEN sample_title := p.title; END IF;
    END LOOP;

    IF new_matches > 0 THEN
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

REVOKE EXECUTE ON FUNCTION public.run_saved_search_alerts() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.run_saved_search_alerts() TO service_role, postgres;
