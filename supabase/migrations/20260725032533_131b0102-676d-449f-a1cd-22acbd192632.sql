
-- Rate limiting primitives for public-facing forms
CREATE TABLE public.rate_limit_hits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket text NOT NULL,
  key text NOT NULL,
  hit_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX rate_limit_hits_lookup_idx ON public.rate_limit_hits (bucket, key, hit_at DESC);

GRANT SELECT, INSERT, DELETE ON public.rate_limit_hits TO authenticated, anon;
GRANT ALL ON public.rate_limit_hits TO service_role;

ALTER TABLE public.rate_limit_hits ENABLE ROW LEVEL SECURITY;

-- No direct policies: only accessible via SECURITY DEFINER rpc below.
CREATE POLICY "deny direct read" ON public.rate_limit_hits FOR SELECT USING (false);
CREATE POLICY "deny direct insert" ON public.rate_limit_hits FOR INSERT WITH CHECK (false);
CREATE POLICY "deny direct delete" ON public.rate_limit_hits FOR DELETE USING (false);

-- Returns true when the caller is allowed (under the limit) and records a hit.
-- Returns false when the caller has exceeded the limit in the window.
CREATE OR REPLACE FUNCTION public.check_and_hit_rate_limit(
  _bucket text,
  _key text,
  _limit int,
  _window_seconds int
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  hits int;
BEGIN
  -- Housekeeping: prune old rows for this bucket/key
  DELETE FROM public.rate_limit_hits
   WHERE bucket = _bucket AND key = _key
     AND hit_at < now() - make_interval(secs => _window_seconds);

  SELECT count(*) INTO hits
    FROM public.rate_limit_hits
   WHERE bucket = _bucket AND key = _key
     AND hit_at > now() - make_interval(secs => _window_seconds);

  IF hits >= _limit THEN
    RETURN false;
  END IF;

  INSERT INTO public.rate_limit_hits (bucket, key) VALUES (_bucket, _key);
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_and_hit_rate_limit(text, text, int, int) TO authenticated, anon;
