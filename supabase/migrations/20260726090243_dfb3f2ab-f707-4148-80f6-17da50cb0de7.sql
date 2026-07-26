
-- ============ 1. VERIFICATION SCORING ============
CREATE TABLE public.verification_criteria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  explanation text,
  weight integer NOT NULL DEFAULT 10,
  land_only boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.verification_criteria TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.verification_criteria TO authenticated;
GRANT ALL ON public.verification_criteria TO service_role;
ALTER TABLE public.verification_criteria ENABLE ROW LEVEL SECURITY;
CREATE POLICY "criteria public read" ON public.verification_criteria FOR SELECT USING (true);
CREATE POLICY "criteria admin write" ON public.verification_criteria FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_vc_updated BEFORE UPDATE ON public.verification_criteria
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.property_verification_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  criterion_key text NOT NULL,
  passed boolean NOT NULL DEFAULT false,
  notes text,
  checked_by uuid,
  checked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (property_id, criterion_key)
);
GRANT SELECT ON public.property_verification_checks TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_verification_checks TO authenticated;
GRANT ALL ON public.property_verification_checks TO service_role;
ALTER TABLE public.property_verification_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "checks read published or own" ON public.property_verification_checks FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id
          AND (p.status = 'published' OR p.owner_id = auth.uid()))
  OR public.has_role(auth.uid(),'admin')
);
CREATE POLICY "checks admin write" ON public.property_verification_checks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_pvc_updated BEFORE UPDATE ON public.property_verification_checks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.verification_criteria (key,label,explanation,weight,land_only,sort_order) VALUES
 ('ownership','Property ownership verified','We reviewed proof that the seller or landlord is the rightful owner of this property.',18,false,1),
 ('agent_identity','Agent identity verified','The listing agent submitted government ID and was approved by our team.',14,false,2),
 ('phone','Phone number verified','The contact phone number was confirmed by SMS code.',10,false,3),
 ('email','Email verified','The account email address was confirmed.',6,false,4),
 ('gps','GPS location verified','The map pin was checked against the stated address.',10,false,5),
 ('images','Property images verified','Photos were checked to be genuine and of this property.',12,false,6),
 ('title_deed','Title deed verified','A copy of the title deed was supplied and cross-checked.',15,true,7),
 ('inspected','Property physically inspected','A Foxwood representative visited the property in person.',10,false,8),
 ('documents','Required documents uploaded','All supporting documents for this listing type were provided.',5,false,9);

CREATE OR REPLACE FUNCTION public.property_verification_score(_property_id uuid)
RETURNS TABLE (score integer, earned integer, total integer)
LANGUAGE sql STABLE SET search_path = public AS $$
  WITH p AS (SELECT property_type FROM public.properties WHERE id = _property_id),
  c AS (
    SELECT vc.key, vc.weight
    FROM public.verification_criteria vc, p
    WHERE vc.active
      AND (NOT vc.land_only OR lower(coalesce(p.property_type,'')) IN ('land','plot','land / plots','farm'))
  )
  SELECT
    CASE WHEN COALESCE(SUM(c.weight),0) = 0 THEN 0
      ELSE ROUND(100.0 * COALESCE(SUM(CASE WHEN pv.passed THEN c.weight ELSE 0 END),0) / SUM(c.weight))::int END,
    COALESCE(SUM(CASE WHEN pv.passed THEN c.weight ELSE 0 END),0)::int,
    COALESCE(SUM(c.weight),0)::int
  FROM c
  LEFT JOIN public.property_verification_checks pv
    ON pv.property_id = _property_id AND pv.criterion_key = c.key;
$$;

-- ============ 2. PROPERTY HISTORY TIMELINE ============
CREATE TABLE public.property_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  detail text,
  actor_id uuid,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_property_events_property ON public.property_events(property_id, created_at DESC);
GRANT SELECT ON public.property_events TO anon;
GRANT SELECT, INSERT ON public.property_events TO authenticated;
GRANT ALL ON public.property_events TO service_role;
ALTER TABLE public.property_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "events read published or own" ON public.property_events FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id
          AND (p.status = 'published' OR p.owner_id = auth.uid()))
  OR public.has_role(auth.uid(),'admin')
);
CREATE POLICY "events owner insert" ON public.property_events FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.owner_id = auth.uid())
  OR public.has_role(auth.uid(),'admin')
);

CREATE OR REPLACE FUNCTION public.record_property_events()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.property_events (property_id, type, title, actor_id)
    VALUES (NEW.id, 'created', 'Listing created', NEW.owner_id);
    IF NEW.status = 'published' THEN
      INSERT INTO public.property_events (property_id, type, title, actor_id)
      VALUES (NEW.id, 'published', 'Listing published', NEW.owner_id);
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.property_events (property_id, type, title, detail, actor_id, metadata)
    VALUES (NEW.id,
      CASE WHEN NEW.status = 'published' THEN 'published' ELSE 'status_change' END,
      CASE WHEN NEW.status = 'published' THEN 'Listing published' ELSE 'Status changed' END,
      format('%s → %s', OLD.status, NEW.status), auth.uid(),
      jsonb_build_object('from', OLD.status, 'to', NEW.status));
  END IF;

  IF NEW.price IS DISTINCT FROM OLD.price THEN
    INSERT INTO public.property_events (property_id, type, title, detail, actor_id, metadata)
    VALUES (NEW.id, 'price_change',
      CASE WHEN NEW.price < OLD.price THEN 'Price reduced' ELSE 'Price changed' END,
      format('KSh %s → KSh %s', OLD.price, NEW.price), auth.uid(),
      jsonb_build_object('from', OLD.price, 'to', NEW.price));
  END IF;

  IF NEW.images IS DISTINCT FROM OLD.images THEN
    INSERT INTO public.property_events (property_id, type, title, detail, actor_id)
    VALUES (NEW.id, 'photos_updated', 'Photos updated',
      format('%s photo(s)', coalesce(array_length(NEW.images,1),0)), auth.uid());
  END IF;

  IF COALESCE(NEW.is_featured,false) IS DISTINCT FROM COALESCE(OLD.is_featured,false) AND COALESCE(NEW.is_featured,false) THEN
    INSERT INTO public.property_events (property_id, type, title, actor_id)
    VALUES (NEW.id, 'featured', 'Featured promotion activated', auth.uid());
  END IF;

  IF NEW.expires_at IS DISTINCT FROM OLD.expires_at AND NEW.expires_at IS NOT NULL
     AND (OLD.expires_at IS NULL OR NEW.expires_at > OLD.expires_at) THEN
    INSERT INTO public.property_events (property_id, type, title, detail, actor_id)
    VALUES (NEW.id, 'renewed', 'Listing renewed', to_char(NEW.expires_at,'DD Mon YYYY'), auth.uid());
  END IF;

  RETURN NEW;
END; $$;
CREATE TRIGGER trg_property_events_ins AFTER INSERT ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.record_property_events();
CREATE TRIGGER trg_property_events_upd AFTER UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.record_property_events();

-- ============ 3. INVESTMENT SCORING ============
CREATE TABLE public.investment_factors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  explanation text,
  weight integer NOT NULL DEFAULT 10,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.investment_factors TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.investment_factors TO authenticated;
GRANT ALL ON public.investment_factors TO service_role;
ALTER TABLE public.investment_factors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "factors public read" ON public.investment_factors FOR SELECT USING (true);
CREATE POLICY "factors admin write" ON public.investment_factors FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_if_updated BEFORE UPDATE ON public.investment_factors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.investment_factors (key,label,explanation,weight,sort_order) VALUES
 ('rental_demand','Rental demand','How quickly comparable units are rented in this area.',18,1),
 ('infrastructure','Infrastructure','Roads, water, power and sewer quality around the property.',14,2),
 ('population_growth','Population growth','How fast the surrounding area is growing.',10,3),
 ('schools','Nearby schools','Availability and quality of schools within reach.',10,4),
 ('hospitals','Nearby hospitals','Access to hospitals and clinics.',10,5),
 ('shopping','Nearby shopping centres','Malls, markets and convenience retail nearby.',8,6),
 ('transport','Public transport','Matatu, bus and rail access.',10,7),
 ('security','Security','Neighbourhood safety and security presence.',12,8),
 ('future_development','Future development potential','Planned projects likely to lift values.',8,9);

CREATE TABLE public.property_investment_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  factor_key text NOT NULL,
  value numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (property_id, factor_key)
);
GRANT SELECT ON public.property_investment_ratings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_investment_ratings TO authenticated;
GRANT ALL ON public.property_investment_ratings TO service_role;
ALTER TABLE public.property_investment_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ratings read published or own" ON public.property_investment_ratings FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id
          AND (p.status = 'published' OR p.owner_id = auth.uid()))
  OR public.has_role(auth.uid(),'admin')
);
CREATE POLICY "ratings admin write" ON public.property_investment_ratings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_pir_updated BEFORE UPDATE ON public.property_investment_ratings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS investment_note text;

CREATE OR REPLACE FUNCTION public.property_investment_score(_property_id uuid)
RETURNS numeric LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT CASE WHEN COALESCE(SUM(f.weight),0) = 0 THEN 0
    ELSE ROUND(SUM(f.weight * COALESCE(r.value,0)) / SUM(f.weight), 1) END
  FROM public.investment_factors f
  LEFT JOIN public.property_investment_ratings r
    ON r.property_id = _property_id AND r.factor_key = f.key
  WHERE f.active AND r.id IS NOT NULL;
$$;

-- ============ 4. AREA GUIDES ============
CREATE TABLE public.area_guides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  level text NOT NULL DEFAULT 'town',
  name text NOT NULL,
  county text,
  town text,
  hero_image text,
  overview text,
  market_overview text,
  average_prices text,
  schools text,
  hospitals text,
  shopping text,
  transport text,
  security text,
  utilities text,
  internet text,
  lifestyle text,
  attractions text,
  faqs jsonb NOT NULL DEFAULT '[]'::jsonb,
  published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.area_guides TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.area_guides TO authenticated;
GRANT ALL ON public.area_guides TO service_role;
ALTER TABLE public.area_guides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "guides public read" ON public.area_guides FOR SELECT USING (published = true OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "guides admin write" ON public.area_guides FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_ag_updated BEFORE UPDATE ON public.area_guides
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ 5. BUYER CHECKLIST ============
CREATE TABLE public.buyer_checklist_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.buyer_checklist_templates TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.buyer_checklist_templates TO authenticated;
GRANT ALL ON public.buyer_checklist_templates TO service_role;
ALTER TABLE public.buyer_checklist_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "checklist templates read" ON public.buyer_checklist_templates FOR SELECT USING (true);
CREATE POLICY "checklist templates admin write" ON public.buyer_checklist_templates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_bct_updated BEFORE UPDATE ON public.buyer_checklist_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.buyer_checklist_templates (label, description, sort_order) VALUES
 ('Find a property','Shortlist listings that match your budget and location.',1),
 ('Book a viewing','Arrange a site visit with the agent through Foxwood.',2),
 ('Verify documents','Confirm the title deed, rates and any approvals.',3),
 ('Hire a lawyer','Engage an advocate for the sale agreement.',4),
 ('Complete due diligence','Do a land search, survey and physical inspection.',5),
 ('Make payment','Pay the deposit and balance per the agreement.',6),
 ('Transfer ownership','Lodge transfer documents and receive your title.',7);

CREATE TABLE public.buyer_checklist_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  template_id uuid NOT NULL REFERENCES public.buyer_checklist_templates(id) ON DELETE CASCADE,
  done boolean NOT NULL DEFAULT false,
  done_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, template_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.buyer_checklist_progress TO authenticated;
GRANT ALL ON public.buyer_checklist_progress TO service_role;
ALTER TABLE public.buyer_checklist_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own checklist progress" ON public.buyer_checklist_progress FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_bcp_updated BEFORE UPDATE ON public.buyer_checklist_progress
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ 6. SMART ALERTS ============
CREATE TABLE public.property_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT 'My alert',
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  notify_email boolean NOT NULL DEFAULT true,
  notify_in_app boolean NOT NULL DEFAULT true,
  on_new_match boolean NOT NULL DEFAULT true,
  on_price_drop boolean NOT NULL DEFAULT true,
  on_status_change boolean NOT NULL DEFAULT true,
  on_agent_new_listing boolean NOT NULL DEFAULT false,
  on_relisted boolean NOT NULL DEFAULT true,
  active boolean NOT NULL DEFAULT true,
  last_notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_alerts TO authenticated;
GRANT ALL ON public.property_alerts TO service_role;
ALTER TABLE public.property_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own alerts" ON public.property_alerts FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_pa_updated BEFORE UPDATE ON public.property_alerts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ 7. MATCH PREFERENCES ============
CREATE TABLE public.match_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  prefs jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.match_preferences TO authenticated;
GRANT ALL ON public.match_preferences TO service_role;
ALTER TABLE public.match_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own match prefs" ON public.match_preferences FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_mp_updated BEFORE UPDATE ON public.match_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ 8. DUE DILIGENCE REQUESTS ============
CREATE TABLE public.due_diligence_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  service text NOT NULL,
  name text NOT NULL,
  email text,
  phone text,
  county text,
  property_ref text,
  message text,
  status text NOT NULL DEFAULT 'new',
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.due_diligence_requests TO authenticated;
GRANT ALL ON public.due_diligence_requests TO service_role;
ALTER TABLE public.due_diligence_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dd own read" ON public.due_diligence_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "dd own insert" ON public.due_diligence_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "dd admin update" ON public.due_diligence_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "dd admin delete" ON public.due_diligence_requests FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_ddr_updated BEFORE UPDATE ON public.due_diligence_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ 9. AGENT PERFORMANCE ============
CREATE OR REPLACE FUNCTION public.agent_performance(_agent_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'active_listings', (SELECT count(*) FROM public.properties WHERE owner_id = _agent_id AND status = 'published'),
    'total_listings', (SELECT count(*) FROM public.properties WHERE owner_id = _agent_id),
    'completed_transactions', (SELECT count(*) FROM public.leads WHERE owner_id = _agent_id AND status = 'won'),
    'total_leads', (SELECT count(*) FROM public.leads WHERE owner_id = _agent_id),
    'responded_leads', (SELECT count(*) FROM public.leads WHERE owner_id = _agent_id AND status <> 'new'),
    'avg_response_hours', (
      SELECT ROUND(AVG(EXTRACT(epoch FROM (a.first_at - l.created_at)) / 3600.0)::numeric, 1)
      FROM public.leads l
      JOIN (SELECT lead_id, min(created_at) AS first_at FROM public.lead_activities
            WHERE type IN ('note','call','email','whatsapp','status_change') GROUP BY lead_id) a
        ON a.lead_id = l.id
      WHERE l.owner_id = _agent_id AND a.first_at > l.created_at
    ),
    'rating', (SELECT ROUND(AVG(rating)::numeric,1) FROM public.reviews WHERE target_id = _agent_id),
    'reviews_count', (SELECT count(*) FROM public.reviews WHERE target_id = _agent_id),
    'verified', (SELECT COALESCE(verified,false) FROM public.profiles WHERE id = _agent_id),
    'member_since', (SELECT created_at FROM public.profiles WHERE id = _agent_id)
  );
$$;
GRANT EXECUTE ON FUNCTION public.agent_performance(uuid) TO anon, authenticated, service_role;
