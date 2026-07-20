
-- 1. Listing packages catalog (admin-managed)
CREATE TABLE public.listing_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  duration_days INTEGER NOT NULL DEFAULT 30,
  max_listings INTEGER NOT NULL DEFAULT 1,
  max_photos INTEGER NOT NULL DEFAULT 5,
  max_videos INTEGER NOT NULL DEFAULT 0,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  homepage_placement BOOLEAN NOT NULL DEFAULT false,
  priority_search BOOLEAN NOT NULL DEFAULT false,
  category_highlight BOOLEAN NOT NULL DEFAULT false,
  analytics_enabled BOOLEAN NOT NULL DEFAULT false,
  whatsapp_button BOOLEAN NOT NULL DEFAULT true,
  lead_management BOOLEAN NOT NULL DEFAULT false,
  renewal_enabled BOOLEAN NOT NULL DEFAULT true,
  auto_expiry BOOLEAN NOT NULL DEFAULT true,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  badge_color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.listing_packages TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.listing_packages TO authenticated;
GRANT ALL ON public.listing_packages TO service_role;

ALTER TABLE public.listing_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "packages_public_read_active" ON public.listing_packages
  FOR SELECT USING (active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "packages_admin_insert" ON public.listing_packages
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "packages_admin_update" ON public.listing_packages
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "packages_admin_delete" ON public.listing_packages
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_listing_packages_updated
  BEFORE UPDATE ON public.listing_packages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. Property package purchases (which package a property used, when it expires)
CREATE TABLE public.property_package_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES public.listing_packages(id) ON DELETE RESTRICT,
  owner_id UUID NOT NULL,
  mpesa_transaction_id UUID REFERENCES public.mpesa_transactions(id) ON DELETE SET NULL,
  amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | active | expired | refunded
  activated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ppp_property ON public.property_package_purchases(property_id);
CREATE INDEX idx_ppp_owner ON public.property_package_purchases(owner_id);
CREATE INDEX idx_ppp_expires ON public.property_package_purchases(expires_at);

GRANT SELECT, INSERT, UPDATE ON public.property_package_purchases TO authenticated;
GRANT ALL ON public.property_package_purchases TO service_role;

ALTER TABLE public.property_package_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ppp_owner_or_admin_read" ON public.property_package_purchases
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "ppp_owner_insert" ON public.property_package_purchases
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "ppp_admin_update" ON public.property_package_purchases
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR owner_id = auth.uid())
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR owner_id = auth.uid());

CREATE TRIGGER trg_ppp_updated
  BEFORE UPDATE ON public.property_package_purchases
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Seed default packages
INSERT INTO public.listing_packages
  (name, slug, description, price, duration_days, max_listings, max_photos, max_videos,
   is_featured, homepage_placement, priority_search, category_highlight, analytics_enabled,
   whatsapp_button, lead_management, sort_order, badge_color)
VALUES
  ('Basic', 'basic', 'Great for a single property. Standard visibility.', 500, 10, 1, 5, 0,
   false, false, false, false, false, true, false, 10, '#64748b'),
  ('Standard', 'standard', 'Two listings with more photos and lead tools.', 1000, 15, 2, 10, 1,
   false, false, false, true, true, true, true, 20, '#0F766E'),
  ('Premium', 'premium', 'Featured category placement, five listings, full analytics.', 2500, 20, 5, 20, 3,
   true, false, true, true, true, true, true, 30, '#FE4C25'),
  ('Featured', 'featured', 'Maximum visibility — homepage + top of search + featured badge.', 5000, 30, 10, 40, 5,
   true, true, true, true, true, true, true, 40, '#f59e0b');
