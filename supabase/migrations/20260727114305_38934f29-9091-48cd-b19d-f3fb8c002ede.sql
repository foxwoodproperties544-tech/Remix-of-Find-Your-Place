
-- ============ ENUMS ============
DO $$ BEGIN
  CREATE TYPE public.request_kind AS ENUM ('buy','rent','lease');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.request_status AS ENUM ('draft','active','paused','closed','fulfilled','expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.request_response_status AS ENUM ('pending','accepted','rejected','withdrawn');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ PROPERTY REQUESTS ============
CREATE TABLE public.property_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  slug text UNIQUE,
  title text NOT NULL,
  kind public.request_kind NOT NULL DEFAULT 'buy',
  property_type text NOT NULL,
  county text NOT NULL,
  town text,
  estate text,
  preferred_location text,
  budget_min numeric,
  budget_max numeric,
  currency text NOT NULL DEFAULT 'KES',
  bedrooms int,
  bathrooms int,
  parking int,
  land_size text,
  building_size text,
  furnished boolean NOT NULL DEFAULT false,
  amenities text[] NOT NULL DEFAULT '{}',
  description text NOT NULL DEFAULT '',
  move_date date,
  viewing_times text,
  images text[] NOT NULL DEFAULT '{}',
  hide_phone boolean NOT NULL DEFAULT false,
  hide_email boolean NOT NULL DEFAULT true,
  allow_whatsapp boolean NOT NULL DEFAULT true,
  allow_messages boolean NOT NULL DEFAULT true,
  email_notifications boolean NOT NULL DEFAULT true,
  contact_phone text,
  contact_email text,
  status public.request_status NOT NULL DEFAULT 'draft',
  is_featured boolean NOT NULL DEFAULT false,
  is_urgent boolean NOT NULL DEFAULT false,
  package_slug text,
  published_at timestamptz,
  expires_at timestamptz,
  closed_at timestamptz,
  fulfilled_property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  view_count int NOT NULL DEFAULT 0,
  response_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_prq_status ON public.property_requests(status, published_at DESC);
CREATE INDEX idx_prq_user ON public.property_requests(user_id);
CREATE INDEX idx_prq_geo ON public.property_requests(county, town);
CREATE INDEX idx_prq_kind ON public.property_requests(kind, property_type);

GRANT SELECT ON public.property_requests TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_requests TO authenticated;
GRANT ALL ON public.property_requests TO service_role;
ALTER TABLE public.property_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active requests" ON public.property_requests
  FOR SELECT USING (status IN ('active','fulfilled'));
CREATE POLICY "Owners read own requests" ON public.property_requests
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins read all requests" ON public.property_requests
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Users create own requests" ON public.property_requests
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners update own requests" ON public.property_requests
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins update any request" ON public.property_requests
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Owners or admins delete requests" ON public.property_requests
  FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- slug + publish timestamps + privileged column guard
CREATE OR REPLACE FUNCTION public.property_requests_before_write()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $fn$
DECLARE base text; candidate text; i int := 0;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    base := lower(regexp_replace(coalesce(NEW.title,'property-request'), '[^a-zA-Z0-9]+', '-', 'g'));
    base := trim(both '-' from base);
    IF base = '' THEN base := 'property-request'; END IF;
    candidate := base;
    WHILE EXISTS (SELECT 1 FROM public.property_requests WHERE slug = candidate AND id <> NEW.id) LOOP
      i := i + 1; candidate := base || '-' || i::text;
    END LOOP;
    NEW.slug := candidate;
  END IF;
  IF NEW.status = 'active' AND NEW.published_at IS NULL THEN
    NEW.published_at := now();
    IF NEW.expires_at IS NULL THEN NEW.expires_at := now() + interval '30 days'; END IF;
  END IF;
  IF NEW.status IN ('closed','fulfilled') AND NEW.closed_at IS NULL THEN
    NEW.closed_at := now();
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END; $fn$;

CREATE OR REPLACE FUNCTION public.guard_request_privileged_columns()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(),'admin') THEN RETURN NEW; END IF;
  NEW.is_featured := OLD.is_featured;
  NEW.is_urgent := OLD.is_urgent;
  NEW.view_count := OLD.view_count;
  NEW.response_count := OLD.response_count;
  RETURN NEW;
END; $fn$;

REVOKE ALL ON FUNCTION public.property_requests_before_write() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_request_privileged_columns() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_prq_before_write BEFORE INSERT OR UPDATE ON public.property_requests
  FOR EACH ROW EXECUTE FUNCTION public.property_requests_before_write();
CREATE TRIGGER trg_prq_guard BEFORE UPDATE ON public.property_requests
  FOR EACH ROW EXECUTE FUNCTION public.guard_request_privileged_columns();

-- ============ RESPONSES ============
CREATE TABLE public.property_request_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.property_requests(id) ON DELETE CASCADE,
  responder_id uuid NOT NULL,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  message text NOT NULL,
  price numeric,
  property_link text,
  availability text,
  viewing_dates text,
  attachments text[] NOT NULL DEFAULT '{}',
  status public.request_response_status NOT NULL DEFAULT 'pending',
  match_score int,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (request_id, responder_id, property_id)
);
CREATE INDEX idx_prr_request ON public.property_request_responses(request_id, created_at DESC);
CREATE INDEX idx_prr_responder ON public.property_request_responses(responder_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_request_responses TO authenticated;
GRANT ALL ON public.property_request_responses TO service_role;
ALTER TABLE public.property_request_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Responder reads own responses" ON public.property_request_responses
  FOR SELECT TO authenticated USING (auth.uid() = responder_id);
CREATE POLICY "Request owner reads responses" ON public.property_request_responses
  FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.property_requests r WHERE r.id = request_id AND r.user_id = auth.uid()));
CREATE POLICY "Admins read responses" ON public.property_request_responses
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Users create own responses" ON public.property_request_responses
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = responder_id);
CREATE POLICY "Responder updates own response" ON public.property_request_responses
  FOR UPDATE TO authenticated USING (auth.uid() = responder_id) WITH CHECK (auth.uid() = responder_id);
CREATE POLICY "Request owner updates response status" ON public.property_request_responses
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.property_requests r WHERE r.id = request_id AND r.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.property_requests r WHERE r.id = request_id AND r.user_id = auth.uid()));
CREATE POLICY "Admins manage responses" ON public.property_request_responses
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Responder deletes own response" ON public.property_request_responses
  FOR DELETE TO authenticated USING (auth.uid() = responder_id);

-- counters + notifications
CREATE OR REPLACE FUNCTION public.handle_request_response()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE v_owner uuid; v_title text; v_slug text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.property_requests
       SET response_count = response_count + 1, updated_at = now()
     WHERE id = NEW.request_id
     RETURNING user_id, title, slug INTO v_owner, v_title, v_slug;
    IF v_owner IS NOT NULL AND v_owner <> NEW.responder_id THEN
      INSERT INTO public.notifications (user_id, type, title, body, link)
      VALUES (v_owner, 'request_response', 'New response to your property request',
              'Someone responded to "' || COALESCE(v_title,'your request') || '".',
              '/property-requests/' || COALESCE(v_slug, NEW.request_id::text));
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.property_requests SET response_count = GREATEST(0, response_count - 1) WHERE id = OLD.request_id;
    RETURN OLD;
  ELSE
    IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('accepted','rejected') THEN
      SELECT title, slug INTO v_title, v_slug FROM public.property_requests WHERE id = NEW.request_id;
      INSERT INTO public.notifications (user_id, type, title, body, link)
      VALUES (NEW.responder_id, 'request_response_' || NEW.status,
              'Your response was ' || NEW.status,
              'The buyer ' || NEW.status || ' your response to "' || COALESCE(v_title,'a request') || '".',
              '/dashboard/request-responses');
    END IF;
    NEW.updated_at := now();
    RETURN NEW;
  END IF;
END; $fn$;
REVOKE ALL ON FUNCTION public.handle_request_response() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_prr_ins AFTER INSERT ON public.property_request_responses
  FOR EACH ROW EXECUTE FUNCTION public.handle_request_response();
CREATE TRIGGER trg_prr_del AFTER DELETE ON public.property_request_responses
  FOR EACH ROW EXECUTE FUNCTION public.handle_request_response();
CREATE TRIGGER trg_prr_upd BEFORE UPDATE ON public.property_request_responses
  FOR EACH ROW EXECUTE FUNCTION public.handle_request_response();

-- ============ MESSAGES ============
CREATE TABLE public.property_request_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id uuid NOT NULL REFERENCES public.property_request_responses(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  body text NOT NULL,
  attachments text[] NOT NULL DEFAULT '{}',
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_prm_response ON public.property_request_messages(response_id, created_at);

GRANT SELECT, INSERT, UPDATE ON public.property_request_messages TO authenticated;
GRANT ALL ON public.property_request_messages TO service_role;
ALTER TABLE public.property_request_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Thread participants read messages" ON public.property_request_messages
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(),'admin')
    OR EXISTS (
      SELECT 1 FROM public.property_request_responses resp
      JOIN public.property_requests r ON r.id = resp.request_id
      WHERE resp.id = response_id AND (resp.responder_id = auth.uid() OR r.user_id = auth.uid())
    )
  );
CREATE POLICY "Thread participants send messages" ON public.property_request_messages
  FOR INSERT TO authenticated WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.property_request_responses resp
      JOIN public.property_requests r ON r.id = resp.request_id
      WHERE resp.id = response_id AND (resp.responder_id = auth.uid() OR r.user_id = auth.uid())
    )
  );
CREATE POLICY "Recipients mark messages read" ON public.property_request_messages
  FOR UPDATE TO authenticated USING (
    sender_id <> auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.property_request_responses resp
      JOIN public.property_requests r ON r.id = resp.request_id
      WHERE resp.id = response_id AND (resp.responder_id = auth.uid() OR r.user_id = auth.uid())
    )
  ) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.property_request_messages;

-- ============ SAVED REQUESTS ============
CREATE TABLE public.property_request_saves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  request_id uuid NOT NULL REFERENCES public.property_requests(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, request_id)
);
GRANT SELECT, INSERT, DELETE ON public.property_request_saves TO authenticated;
GRANT ALL ON public.property_request_saves TO service_role;
ALTER TABLE public.property_request_saves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own saved requests" ON public.property_request_saves
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ VIEWS ============
CREATE TABLE public.property_request_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.property_requests(id) ON DELETE CASCADE,
  viewer_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_prv_request ON public.property_request_views(request_id, created_at DESC);
GRANT INSERT ON public.property_request_views TO anon, authenticated;
GRANT SELECT ON public.property_request_views TO authenticated;
GRANT ALL ON public.property_request_views TO service_role;
ALTER TABLE public.property_request_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can log a request view" ON public.property_request_views
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins read request views" ON public.property_request_views
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.bump_request_view()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  UPDATE public.property_requests SET view_count = view_count + 1 WHERE id = NEW.request_id;
  RETURN NEW;
END; $fn$;
REVOKE ALL ON FUNCTION public.bump_request_view() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_prv_bump AFTER INSERT ON public.property_request_views
  FOR EACH ROW EXECUTE FUNCTION public.bump_request_view();

-- ============ ABUSE REPORTS ============
CREATE TABLE public.property_request_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.property_requests(id) ON DELETE CASCADE,
  reporter_id uuid,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'open',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.property_request_reports TO authenticated;
GRANT UPDATE ON public.property_request_reports TO authenticated;
GRANT ALL ON public.property_request_reports TO service_role;
ALTER TABLE public.property_request_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users file reports" ON public.property_request_reports
  FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid());
CREATE POLICY "Reporters read own reports" ON public.property_request_reports
  FOR SELECT TO authenticated USING (reporter_id = auth.uid());
CREATE POLICY "Admins read reports" ON public.property_request_reports
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins resolve reports" ON public.property_request_reports
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ PACKAGES ============
CREATE TABLE public.request_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audience text NOT NULL DEFAULT 'buyer',
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  price numeric NOT NULL DEFAULT 0,
  duration_days int NOT NULL DEFAULT 30,
  response_limit int,
  is_featured boolean NOT NULL DEFAULT false,
  is_urgent boolean NOT NULL DEFAULT false,
  priority_matching boolean NOT NULL DEFAULT false,
  instant_notifications boolean NOT NULL DEFAULT false,
  premium_leads boolean NOT NULL DEFAULT false,
  renewal_enabled boolean NOT NULL DEFAULT true,
  badge_color text,
  active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.request_packages TO anon, authenticated;
GRANT ALL ON public.request_packages TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.request_packages TO authenticated;
ALTER TABLE public.request_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads active packages" ON public.request_packages
  FOR SELECT USING (active OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage request packages" ON public.request_packages
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_request_packages_updated BEFORE UPDATE ON public.request_packages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.request_packages (audience, slug, name, description, price, duration_days, response_limit, is_featured, is_urgent, priority_matching, instant_notifications, premium_leads, sort_order) VALUES
  ('buyer','free-request','Free Request','Publish a property request and receive responses from verified agents.',0,30,NULL,false,false,false,false,false,1),
  ('buyer','featured-request','Featured Request','Highlighted placement on the requests board and homepage.',0,30,NULL,true,false,true,false,false,2),
  ('buyer','urgent-request','Urgent Request','Marked urgent and pushed to matching agents immediately.',0,14,NULL,false,true,true,true,false,3),
  ('buyer','request-renewal','Request Renewal','Extend an expiring request for another cycle.',0,30,NULL,false,false,false,false,false,4),
  ('buyer','priority-matching','Priority Matching','Your request is matched first against new listings.',0,30,NULL,false,false,true,true,false,5),
  ('agent','free-responses','Free Responses','Respond to a limited number of buyer requests each month.',0,30,10,false,false,false,false,false,1),
  ('agent','unlimited-responses','Unlimited Responses','No cap on responses to buyer requests.',0,30,NULL,false,false,false,false,false,2),
  ('agent','featured-responses','Featured Responses','Your responses appear at the top of the thread.',0,30,NULL,true,false,false,false,false,3),
  ('agent','instant-notifications','Instant Notifications','Be alerted the moment a matching request is posted.',0,30,NULL,false,false,false,true,false,4),
  ('agent','premium-lead-access','Premium Lead Access','Early access to high-value buyer requests.',0,30,NULL,false,false,true,true,true,5);

-- default matching weights, admin configurable
INSERT INTO public.platform_settings (key, value)
VALUES ('request_match_weights', '{"budget":30,"property_type":20,"location":20,"bedrooms":10,"bathrooms":5,"amenities":10,"land_size":5}'::jsonb)
ON CONFLICT (key) DO NOTHING;
