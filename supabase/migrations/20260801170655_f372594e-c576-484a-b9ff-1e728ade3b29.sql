-- ============ 1. platform_settings: restrict public reads to an allow-list ============
DROP POLICY IF EXISTS "public read platform_settings" ON public.platform_settings;

CREATE POLICY "anon read public platform settings"
ON public.platform_settings FOR SELECT TO anon
USING (
  key IN ('support_hours','support_online_override','request_match_weights','offers','tos_version')
  OR key LIKE 'about\_%'
);

CREATE POLICY "authenticated read public platform settings"
ON public.platform_settings FOR SELECT TO authenticated
USING (
  key IN ('support_hours','support_online_override','request_match_weights','offers','tos_version')
  OR key LIKE 'about\_%'
  OR public.has_role(auth.uid(), 'admin')
);

-- ============ 2. property-images storage: verify property ownership in the path ============
CREATE OR REPLACE FUNCTION public.owns_property_image_path(_name text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (storage.foldername(_name))[1] = auth.uid()::text
    AND (
      -- either a flat user folder (legacy uploads), or a user/property folder we must own
      array_length(storage.foldername(_name), 1) < 2
      OR (storage.foldername(_name))[2] !~ '^[0-9a-fA-F-]{36}$'
      OR EXISTS (
        SELECT 1 FROM public.properties p
         WHERE p.id = ((storage.foldername(_name))[2])::uuid
           AND p.owner_id = auth.uid()
      )
    );
$$;

REVOKE ALL ON FUNCTION public.owns_property_image_path(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.owns_property_image_path(text) TO authenticated;

DROP POLICY IF EXISTS "property images insert own folder" ON storage.objects;
DROP POLICY IF EXISTS "property images update own folder" ON storage.objects;
DROP POLICY IF EXISTS "property images delete own folder" ON storage.objects;
DROP POLICY IF EXISTS "property-images insert own folder" ON storage.objects;
DROP POLICY IF EXISTS "property-images update own folder" ON storage.objects;
DROP POLICY IF EXISTS "property-images delete own folder" ON storage.objects;

CREATE POLICY "property images owner insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'property-images' AND public.owns_property_image_path(name));

CREATE POLICY "property images owner update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'property-images' AND public.owns_property_image_path(name))
WITH CHECK (bucket_id = 'property-images' AND public.owns_property_image_path(name));

CREATE POLICY "property images owner delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'property-images' AND public.owns_property_image_path(name));

-- ============ 3. Phase 4: market snapshots ============
CREATE TABLE public.market_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period date NOT NULL,
  county text,
  town text,
  category text,
  property_type text,
  listing_count integer NOT NULL DEFAULT 0,
  new_listings integer NOT NULL DEFAULT 0,
  median_price numeric,
  avg_price numeric,
  min_price numeric,
  max_price numeric,
  avg_price_per_bedroom numeric,
  avg_days_on_market numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX market_snapshots_key_idx ON public.market_snapshots (
  period,
  coalesce(lower(county), ''),
  coalesce(lower(town), ''),
  coalesce(lower(category), ''),
  coalesce(lower(property_type), '')
);
CREATE INDEX market_snapshots_lookup_idx ON public.market_snapshots (lower(county), lower(town), period DESC);

GRANT SELECT ON public.market_snapshots TO anon;
GRANT SELECT ON public.market_snapshots TO authenticated;
GRANT ALL ON public.market_snapshots TO service_role;

ALTER TABLE public.market_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone reads market snapshots"
ON public.market_snapshots FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "admins manage market snapshots"
ON public.market_snapshots FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER market_snapshots_updated_at
BEFORE UPDATE ON public.market_snapshots
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Recompute the last 12 months of market stats from published listings.
CREATE OR REPLACE FUNCTION public.refresh_market_snapshots()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE n integer := 0;
BEGIN
  WITH base AS (
    SELECT
      date_trunc('month', gs)::date AS period,
      p.county, p.town, p.category, p.property_type, p.price, p.bedrooms,
      COALESCE(p.published_at, p.created_at) AS listed_at
    FROM generate_series(
           date_trunc('month', now()) - interval '11 months',
           date_trunc('month', now()),
           interval '1 month') gs
    JOIN public.properties p
      ON p.status = 'published'
     AND p.price > 0
     AND COALESCE(p.published_at, p.created_at) <= (gs + interval '1 month')
  ), grouped AS (
    SELECT
      period,
      grouping_sets.county, grouping_sets.town, grouping_sets.category, grouping_sets.property_type,
      count(*)::int AS listing_count,
      count(*) FILTER (WHERE date_trunc('month', listed_at)::date = period)::int AS new_listings,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY price) AS median_price,
      round(avg(price)::numeric, 0) AS avg_price,
      min(price) AS min_price,
      max(price) AS max_price,
      round(avg(price / NULLIF(bedrooms, 0))::numeric, 0) AS avg_price_per_bedroom,
      round(avg(EXTRACT(day FROM (period + interval '1 month') - listed_at))::numeric, 1) AS avg_days_on_market
    FROM base AS grouping_sets
    GROUP BY GROUPING SETS (
      (period),
      (period, county),
      (period, county, town),
      (period, county, category),
      (period, county, town, category),
      (period, county, town, category, property_type)
    )
  )
  INSERT INTO public.market_snapshots AS m
    (period, county, town, category, property_type, listing_count, new_listings,
     median_price, avg_price, min_price, max_price, avg_price_per_bedroom, avg_days_on_market)
  SELECT period, county, town, category, property_type, listing_count, new_listings,
         median_price, avg_price, min_price, max_price, avg_price_per_bedroom, avg_days_on_market
    FROM grouped
  ON CONFLICT (period, coalesce(lower(county), ''), coalesce(lower(town), ''),
               coalesce(lower(category), ''), coalesce(lower(property_type), ''))
  DO UPDATE SET
    listing_count = EXCLUDED.listing_count,
    new_listings = EXCLUDED.new_listings,
    median_price = EXCLUDED.median_price,
    avg_price = EXCLUDED.avg_price,
    min_price = EXCLUDED.min_price,
    max_price = EXCLUDED.max_price,
    avg_price_per_bedroom = EXCLUDED.avg_price_per_bedroom,
    avg_days_on_market = EXCLUDED.avg_days_on_market,
    updated_at = now();

  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_market_snapshots() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_market_snapshots() TO service_role;

-- Comparable-based valuation estimate for any published listing.
CREATE OR REPLACE FUNCTION public.estimate_property_value(_property_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p RECORD;
  comps RECORD;
BEGIN
  SELECT id, price, bedrooms, county, town, category, property_type, status
    INTO p FROM public.properties WHERE id = _property_id;
  IF p.id IS NULL OR p.status <> 'published' THEN
    RETURN jsonb_build_object('available', false, 'reason', 'not_available');
  END IF;

  SELECT
    count(*)::int AS n,
    percentile_cont(0.5) WITHIN GROUP (ORDER BY c.price) AS median_price,
    percentile_cont(0.25) WITHIN GROUP (ORDER BY c.price) AS p25,
    percentile_cont(0.75) WITHIN GROUP (ORDER BY c.price) AS p75
    INTO comps
  FROM public.properties c
  WHERE c.status = 'published'
    AND c.id <> p.id
    AND c.price > 0
    AND lower(coalesce(c.category,'')) = lower(coalesce(p.category,''))
    AND lower(coalesce(c.property_type,'')) = lower(coalesce(p.property_type,''))
    AND (
      lower(coalesce(c.town,'')) = lower(coalesce(p.town,''))
      OR lower(coalesce(c.county,'')) = lower(coalesce(p.county,''))
    )
    AND (p.bedrooms IS NULL OR c.bedrooms IS NULL OR abs(coalesce(c.bedrooms,0) - coalesce(p.bedrooms,0)) <= 1);

  IF comps.n < 3 THEN
    RETURN jsonb_build_object('available', false, 'reason', 'not_enough_comparables', 'sample_size', comps.n);
  END IF;

  RETURN jsonb_build_object(
    'available', true,
    'sample_size', comps.n,
    'low', round(comps.p25::numeric, 0),
    'mid', round(comps.median_price::numeric, 0),
    'high', round(comps.p75::numeric, 0),
    'listed_price', p.price,
    'delta_pct', CASE WHEN comps.median_price > 0
      THEN round(((p.price - comps.median_price) / comps.median_price * 100)::numeric, 1) END,
    'confidence', CASE WHEN comps.n >= 15 THEN 'high' WHEN comps.n >= 7 THEN 'medium' ELSE 'low' END,
    'generated_at', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.estimate_property_value(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.estimate_property_value(uuid) TO anon, authenticated, service_role;