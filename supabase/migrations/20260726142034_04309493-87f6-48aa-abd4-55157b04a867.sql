
-- Categories
CREATE TABLE public.business_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  icon text,
  sort_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.business_categories TO anon;
GRANT SELECT ON public.business_categories TO authenticated;
GRANT ALL ON public.business_categories TO service_role;
ALTER TABLE public.business_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bc_public_read" ON public.business_categories FOR SELECT TO anon, authenticated USING (active OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "bc_admin_all" ON public.business_categories FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Plans
CREATE TABLE public.business_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  duration_days int NOT NULL DEFAULT 30,
  listing_limit int NOT NULL DEFAULT 10,
  featured_placement boolean NOT NULL DEFAULT false,
  analytics_access boolean NOT NULL DEFAULT false,
  perks text[] NOT NULL DEFAULT '{}',
  sort_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.business_plans TO anon;
GRANT SELECT ON public.business_plans TO authenticated;
GRANT ALL ON public.business_plans TO service_role;
ALTER TABLE public.business_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bp_public_read" ON public.business_plans FOR SELECT TO anon, authenticated USING (active OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "bp_admin_all" ON public.business_plans FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Businesses
CREATE TABLE public.businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  category_id uuid REFERENCES public.business_categories(id) ON DELETE SET NULL,
  description text,
  short_description text,
  logo_url text,
  cover_url text,
  website text,
  email text,
  phone text,
  whatsapp text,
  address text,
  county text,
  town text,
  counties text[] NOT NULL DEFAULT '{}',
  towns text[] NOT NULL DEFAULT '{}',
  services text[] NOT NULL DEFAULT '{}',
  property_types text[] NOT NULL DEFAULT '{}',
  socials jsonb NOT NULL DEFAULT '{}'::jsonb,
  business_hours jsonb NOT NULL DEFAULT '{}'::jsonb,
  years_in_business int,
  lat double precision,
  lng double precision,
  verified boolean NOT NULL DEFAULT false,
  featured boolean NOT NULL DEFAULT false,
  featured_until timestamptz,
  status text NOT NULL DEFAULT 'published',
  owner_id uuid,
  claimed_at timestamptz,
  plan_slug text,
  plan_expires_at timestamptz,
  view_count int NOT NULL DEFAULT 0,
  enquiry_count int NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_businesses_status ON public.businesses(status);
CREATE INDEX idx_businesses_category ON public.businesses(category_id);
CREATE INDEX idx_businesses_county ON public.businesses(county);
CREATE INDEX idx_businesses_featured ON public.businesses(featured);
CREATE INDEX idx_businesses_owner ON public.businesses(owner_id);
GRANT SELECT ON public.businesses TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.businesses TO authenticated;
GRANT ALL ON public.businesses TO service_role;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.business_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'staff',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_staff TO authenticated;
GRANT ALL ON public.business_staff TO service_role;
ALTER TABLE public.business_staff ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_manage_business(_business_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _user_id IS NOT NULL AND (
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = _business_id AND b.owner_id = _user_id)
    OR EXISTS (SELECT 1 FROM public.business_staff s WHERE s.business_id = _business_id AND s.user_id = _user_id)
    OR public.has_role(_user_id, 'admin')
  );
$$;
REVOKE EXECUTE ON FUNCTION public.can_manage_business(uuid, uuid) FROM anon;

CREATE POLICY "biz_public_read" ON public.businesses FOR SELECT TO anon, authenticated
  USING (status = 'published' OR owner_id = auth.uid() OR public.has_role(auth.uid(),'admin')
         OR EXISTS (SELECT 1 FROM public.business_staff s WHERE s.business_id = id AND s.user_id = auth.uid()));
CREATE POLICY "biz_owner_update" ON public.businesses FOR UPDATE TO authenticated
  USING (public.can_manage_business(id, auth.uid())) WITH CHECK (public.can_manage_business(id, auth.uid()));
CREATE POLICY "biz_admin_insert" ON public.businesses FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "biz_admin_delete" ON public.businesses FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY "bstaff_read" ON public.business_staff FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.can_manage_business(business_id, auth.uid()));
CREATE POLICY "bstaff_manage" ON public.business_staff FOR ALL TO authenticated
  USING (public.can_manage_business(business_id, auth.uid()))
  WITH CHECK (public.can_manage_business(business_id, auth.uid()));

-- Claims
CREATE TABLE public.business_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  full_name text,
  email text,
  phone text,
  role_at_company text,
  note text,
  proof_urls text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.business_claims TO authenticated;
GRANT ALL ON public.business_claims TO service_role;
ALTER TABLE public.business_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "claims_own_read" ON public.business_claims FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "claims_insert" ON public.business_claims FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "claims_admin_update" ON public.business_claims FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Enquiries
CREATE TABLE public.business_enquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  user_id uuid,
  name text NOT NULL,
  email text,
  phone text,
  message text,
  source text NOT NULL DEFAULT 'form',
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_benq_business ON public.business_enquiries(business_id);
CREATE INDEX idx_benq_created ON public.business_enquiries(created_at DESC);
GRANT INSERT ON public.business_enquiries TO anon;
GRANT SELECT, INSERT, UPDATE ON public.business_enquiries TO authenticated;
GRANT ALL ON public.business_enquiries TO service_role;
ALTER TABLE public.business_enquiries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "benq_insert_any" ON public.business_enquiries FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "benq_read" ON public.business_enquiries FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.can_manage_business(business_id, auth.uid()));
CREATE POLICY "benq_update" ON public.business_enquiries FOR UPDATE TO authenticated
  USING (public.can_manage_business(business_id, auth.uid()))
  WITH CHECK (public.can_manage_business(business_id, auth.uid()));

-- Reviews
CREATE TABLE public.business_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  author_id uuid,
  author_name text,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title text,
  body text,
  reply text,
  replied_at timestamptz,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_brev_business ON public.business_reviews(business_id);
GRANT SELECT ON public.business_reviews TO anon;
GRANT SELECT, INSERT, UPDATE ON public.business_reviews TO authenticated;
GRANT ALL ON public.business_reviews TO service_role;
ALTER TABLE public.business_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "brev_public_read" ON public.business_reviews FOR SELECT TO anon, authenticated
  USING (status = 'approved' OR author_id = auth.uid() OR public.can_manage_business(business_id, auth.uid()));
CREATE POLICY "brev_insert" ON public.business_reviews FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid());
CREATE POLICY "brev_update" ON public.business_reviews FOR UPDATE TO authenticated
  USING (author_id = auth.uid() OR public.can_manage_business(business_id, auth.uid()))
  WITH CHECK (author_id = auth.uid() OR public.can_manage_business(business_id, auth.uid()));

-- Views
CREATE TABLE public.business_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  viewer_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_bviews_business ON public.business_views(business_id);
GRANT INSERT ON public.business_views TO anon;
GRANT SELECT, INSERT ON public.business_views TO authenticated;
GRANT ALL ON public.business_views TO service_role;
ALTER TABLE public.business_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bviews_insert" ON public.business_views FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "bviews_read" ON public.business_views FOR SELECT TO authenticated
  USING (public.can_manage_business(business_id, auth.uid()));

-- Link properties to businesses
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_properties_business ON public.properties(business_id);

-- updated_at triggers
CREATE TRIGGER trg_bc_updated BEFORE UPDATE ON public.business_categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_bp_updated BEFORE UPDATE ON public.business_plans FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_biz_updated BEFORE UPDATE ON public.businesses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_claims_updated BEFORE UPDATE ON public.business_claims FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_benq_updated BEFORE UPDATE ON public.business_enquiries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_brev_updated BEFORE UPDATE ON public.business_reviews FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed categories
INSERT INTO public.business_categories (slug, name, sort_order) VALUES
  ('real-estate-agencies','Real Estate Agencies',1),
  ('property-developers','Property Developers',2),
  ('land-selling-companies','Land Selling Companies',3),
  ('plot-selling-companies','Plot Selling Companies',4),
  ('apartment-companies','Apartment Companies',5),
  ('house-sellers','House Sellers',6),
  ('house-rental-companies','House Rental Companies',7),
  ('airbnb-companies','Airbnb Companies',8),
  ('commercial-property-companies','Commercial Property Companies',9),
  ('office-space-providers','Office Space Providers',10),
  ('warehouse-providers','Warehouse Providers',11),
  ('property-management-companies','Property Management Companies',12),
  ('holiday-homes','Holiday Homes',13),
  ('student-accommodation','Student Accommodation',14);

INSERT INTO public.business_plans (slug, name, price, duration_days, listing_limit, featured_placement, analytics_access, perks, sort_order)
VALUES ('basic','Basic',3500,30,20,false,true,
  ARRAY['Claimed company profile','Up to 20 active listings','Enquiry inbox & lead tracking','Profile analytics'],1);
