
CREATE TABLE IF NOT EXISTS public.ad_daily_stats (
  campaign_id uuid NOT NULL REFERENCES public.ad_campaigns(id) ON DELETE CASCADE,
  day date NOT NULL,
  impressions integer NOT NULL DEFAULT 0,
  clicks integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (campaign_id, day)
);

GRANT SELECT ON public.ad_daily_stats TO authenticated;
GRANT ALL ON public.ad_daily_stats TO service_role;

ALTER TABLE public.ad_daily_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ad_daily_stats owner or admin read"
  ON public.ad_daily_stats FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ad_campaigns c
      WHERE c.id = ad_daily_stats.campaign_id
        AND (c.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE INDEX IF NOT EXISTS ad_daily_stats_day_idx ON public.ad_daily_stats(day);

-- Bump helper used by tracker server functions (service_role bypasses RLS).
CREATE OR REPLACE FUNCTION public.bump_ad_daily_stat(_campaign uuid, _kind text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.ad_daily_stats(campaign_id, day, impressions, clicks)
  VALUES (
    _campaign,
    (now() AT TIME ZONE 'UTC')::date,
    CASE WHEN _kind = 'impression' THEN 1 ELSE 0 END,
    CASE WHEN _kind = 'click' THEN 1 ELSE 0 END
  )
  ON CONFLICT (campaign_id, day) DO UPDATE
    SET impressions = ad_daily_stats.impressions + EXCLUDED.impressions,
        clicks = ad_daily_stats.clicks + EXCLUDED.clicks,
        updated_at = now();
END; $$;

REVOKE ALL ON FUNCTION public.bump_ad_daily_stat(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.bump_ad_daily_stat(uuid, text) TO service_role;
