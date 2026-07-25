
CREATE OR REPLACE FUNCTION public.enforce_listing_quota()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier text;
  v_quota int;
  v_expires timestamptz;
  v_active_count int;
BEGIN
  IF NEW.status IS DISTINCT FROM 'published' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'published' THEN
    RETURN NEW;
  END IF;
  SELECT tier, listing_quota, tier_expires_at
    INTO v_tier, v_quota, v_expires
    FROM public.profiles WHERE id = NEW.owner_id;
  IF v_quota IS NULL OR v_quota <= 0 THEN
    RETURN NEW;
  END IF;
  SELECT count(*) INTO v_active_count
    FROM public.properties
   WHERE owner_id = NEW.owner_id
     AND status = 'published'
     AND id <> NEW.id;
  IF v_active_count >= v_quota THEN
    RAISE EXCEPTION 'Listing quota reached: % of % published listings for tier "%".  Upgrade or unpublish an existing listing before approving another.',
      v_active_count, v_quota, COALESCE(v_tier,'free');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_listing_quota ON public.properties;
CREATE TRIGGER trg_enforce_listing_quota
BEFORE INSERT OR UPDATE OF status ON public.properties
FOR EACH ROW EXECUTE FUNCTION public.enforce_listing_quota();
