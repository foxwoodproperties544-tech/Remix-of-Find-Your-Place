
-- 1. Table
CREATE TABLE public.property_price_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  previous_price NUMERIC,
  new_price NUMERIC NOT NULL,
  amount_changed NUMERIC,
  percent_changed NUMERIC,
  reason TEXT,
  changed_by UUID,
  is_initial BOOLEAN NOT NULL DEFAULT false,
  reverted BOOLEAN NOT NULL DEFAULT false,
  reverted_by UUID,
  reverted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pph_property_created ON public.property_price_history (property_id, created_at DESC);
CREATE INDEX idx_pph_created ON public.property_price_history (created_at DESC);
CREATE INDEX idx_pph_amount ON public.property_price_history (amount_changed);

-- 2. Grants
GRANT SELECT ON public.property_price_history TO anon;
GRANT SELECT, INSERT ON public.property_price_history TO authenticated;
GRANT ALL ON public.property_price_history TO service_role;

-- 3. RLS
ALTER TABLE public.property_price_history ENABLE ROW LEVEL SECURITY;

-- 4. Policies
CREATE POLICY "Public can read price history of published listings"
ON public.property_price_history FOR SELECT TO anon, authenticated
USING (EXISTS (
  SELECT 1 FROM public.properties p
  WHERE p.id = property_price_history.property_id AND p.status = 'published'
));

CREATE POLICY "Owners can read their listing price history"
ON public.property_price_history FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.properties p
  WHERE p.id = property_price_history.property_id AND p.owner_id = auth.uid()
));

CREATE POLICY "Admins can read all price history"
ON public.property_price_history FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage price history"
ON public.property_price_history FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_pph_updated_at
BEFORE UPDATE ON public.property_price_history
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. Automatic recording + saved-property notifications
CREATE OR REPLACE FUNCTION public.record_price_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_amount numeric;
  v_pct numeric;
  v_dropped boolean;
  f RECORD;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.property_price_history
      (property_id, previous_price, new_price, amount_changed, percent_changed, changed_by, is_initial, reason)
    VALUES (NEW.id, NULL, NEW.price, NULL, NULL, COALESCE(auth.uid(), NEW.owner_id), true, 'Initial listing');
    RETURN NEW;
  END IF;

  IF NEW.price IS NOT DISTINCT FROM OLD.price THEN
    RETURN NEW;
  END IF;

  v_amount := NEW.price - OLD.price;
  v_pct := CASE WHEN COALESCE(OLD.price,0) = 0 THEN NULL
                ELSE ROUND((v_amount / OLD.price) * 100.0, 2) END;
  v_dropped := v_amount < 0;

  INSERT INTO public.property_price_history
    (property_id, previous_price, new_price, amount_changed, percent_changed, changed_by, reason)
  VALUES (NEW.id, OLD.price, NEW.price, v_amount, v_pct, auth.uid(), NULLIF(NEW.price_change_reason, ''));

  -- clear one-shot reason so it does not stick to the next change
  IF NEW.price_change_reason IS NOT NULL THEN
    UPDATE public.properties SET price_change_reason = NULL WHERE id = NEW.id;
  END IF;

  -- Notify users who saved / favourited this property
  IF NEW.status = 'published' THEN
    FOR f IN
      SELECT DISTINCT fav.user_id
        FROM public.favorites fav
       WHERE fav.property_key IN (NEW.id::text, COALESCE(NEW.slug, ''))
         AND fav.user_id IS NOT NULL
         AND fav.user_id <> COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
    LOOP
      INSERT INTO public.notifications (user_id, type, title, body, link)
      VALUES (
        f.user_id,
        CASE WHEN v_dropped THEN 'price_drop' ELSE 'price_update' END,
        CASE WHEN v_dropped THEN 'Price drop alert' ELSE 'Price updated' END,
        NEW.title || ' — was KSh ' || to_char(OLD.price, 'FM999,999,999,999')
          || ', now KSh ' || to_char(NEW.price, 'FM999,999,999,999')
          || COALESCE(' (' || to_char(v_pct, 'FM990.0') || '%)', ''),
        '/properties/' || COALESCE(NEW.slug, NEW.id::text)
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- optional per-update reason carried on the property row
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS price_change_reason TEXT;

CREATE TRIGGER trg_properties_price_history_ins
AFTER INSERT ON public.properties
FOR EACH ROW EXECUTE FUNCTION public.record_price_history();

CREATE TRIGGER trg_properties_price_history_upd
AFTER UPDATE OF price ON public.properties
FOR EACH ROW EXECUTE FUNCTION public.record_price_history();

-- 6. Summary helper
CREATE OR REPLACE FUNCTION public.property_price_summary(_property_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  WITH h AS (
    SELECT * FROM public.property_price_history WHERE property_id = _property_id AND reverted = false
  ), p AS (
    SELECT price, created_at, published_at FROM public.properties WHERE id = _property_id
  )
  SELECT jsonb_build_object(
    'current_price', (SELECT price FROM p),
    'original_price', (SELECT new_price FROM h ORDER BY created_at ASC LIMIT 1),
    'changes', (SELECT count(*) FROM h WHERE is_initial = false),
    'last_change_at', (SELECT max(created_at) FROM h WHERE is_initial = false),
    'first_listed_at', COALESCE((SELECT published_at FROM p), (SELECT created_at FROM p)),
    'days_on_market', GREATEST(0, EXTRACT(day FROM now() - COALESCE((SELECT published_at FROM p), (SELECT created_at FROM p)))::int)
  );
$$;

REVOKE EXECUTE ON FUNCTION public.record_price_history() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.property_price_summary(uuid) TO anon, authenticated, service_role;

-- 7. Backfill an initial record for existing listings that have none
INSERT INTO public.property_price_history (property_id, new_price, changed_by, is_initial, reason, created_at)
SELECT p.id, p.price, p.owner_id, true, 'Initial listing', COALESCE(p.published_at, p.created_at)
  FROM public.properties p
 WHERE NOT EXISTS (SELECT 1 FROM public.property_price_history h WHERE h.property_id = p.id);
