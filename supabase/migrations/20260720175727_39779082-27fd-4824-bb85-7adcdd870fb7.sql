
-- ============ ad_packages ============
CREATE TABLE public.ad_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  placement text NOT NULL, -- homepage_hero | homepage_banner | properties_top | sidebar | blog_inline
  price numeric(10,2) NOT NULL DEFAULT 0,
  duration_days int NOT NULL DEFAULT 7,
  width_px int NOT NULL DEFAULT 1200,
  height_px int NOT NULL DEFAULT 300,
  max_active int NOT NULL DEFAULT 3, -- concurrent rotation cap for this placement
  sort_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  badge_color text DEFAULT '#FE4C25',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ad_packages TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.ad_packages TO authenticated;
GRANT ALL ON public.ad_packages TO service_role;

ALTER TABLE public.ad_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ad_packages public read active"
  ON public.ad_packages FOR SELECT
  USING (active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "ad_packages admin write"
  ON public.ad_packages FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER ad_packages_set_updated_at
  BEFORE UPDATE ON public.ad_packages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ ad_campaigns ============
CREATE TABLE public.ad_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  package_id uuid NOT NULL REFERENCES public.ad_packages(id) ON DELETE RESTRICT,
  placement text NOT NULL,
  title text NOT NULL,
  image_url text NOT NULL,
  target_url text NOT NULL,
  status text NOT NULL DEFAULT 'pending_payment', -- pending_payment | pending_review | active | rejected | expired
  admin_notes text,
  starts_at timestamptz,
  expires_at timestamptz,
  impressions int NOT NULL DEFAULT 0,
  clicks int NOT NULL DEFAULT 0,
  amount_paid numeric(10,2) NOT NULL DEFAULT 0,
  mpesa_transaction_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ad_campaigns_placement_status_idx ON public.ad_campaigns (placement, status);
CREATE INDEX ad_campaigns_owner_idx ON public.ad_campaigns (owner_id);

GRANT SELECT ON public.ad_campaigns TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ad_campaigns TO authenticated;
GRANT ALL ON public.ad_campaigns TO service_role;

ALTER TABLE public.ad_campaigns ENABLE ROW LEVEL SECURITY;

-- Public can read only currently active campaigns (for rendering)
CREATE POLICY "ad_campaigns public read active"
  ON public.ad_campaigns FOR SELECT
  USING (
    status = 'active'
    AND (starts_at IS NULL OR starts_at <= now())
    AND (expires_at IS NULL OR expires_at > now())
  );

CREATE POLICY "ad_campaigns owner read own"
  ON public.ad_campaigns FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "ad_campaigns owner insert"
  ON public.ad_campaigns FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "ad_campaigns owner update own"
  ON public.ad_campaigns FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "ad_campaigns admin delete"
  ON public.ad_campaigns FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER ad_campaigns_set_updated_at
  BEFORE UPDATE ON public.ad_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ mpesa_transactions: link to ad campaign ============
ALTER TABLE public.mpesa_transactions
  ADD COLUMN IF NOT EXISTS ad_campaign_id uuid REFERENCES public.ad_campaigns(id) ON DELETE SET NULL;

-- ============ expire_listing_packages: also expire ads ============
CREATE OR REPLACE FUNCTION public.expire_listing_packages()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.property_package_purchases
     SET status = 'expired'
   WHERE status = 'active'
     AND expires_at IS NOT NULL
     AND expires_at < now();

  UPDATE public.properties p
     SET status = 'expired',
         is_featured = false,
         featured = false,
         featured_until = NULL
   WHERE p.status = 'published'
     AND NOT EXISTS (
       SELECT 1 FROM public.property_package_purchases pp
        WHERE pp.property_id = p.id
          AND pp.status = 'active'
          AND (pp.expires_at IS NULL OR pp.expires_at > now())
     )
     AND EXISTS (
       SELECT 1 FROM public.property_package_purchases pp
        WHERE pp.property_id = p.id
     );

  UPDATE public.ad_campaigns
     SET status = 'expired'
   WHERE status = 'active'
     AND expires_at IS NOT NULL
     AND expires_at < now();
END; $function$;

-- ============ Seed default ad packages ============
INSERT INTO public.ad_packages (name, slug, description, placement, price, duration_days, width_px, height_px, max_active, sort_order, badge_color)
VALUES
  ('Homepage Hero', 'homepage-hero', 'Premium banner on the homepage hero — highest visibility.', 'homepage_hero', 15000, 7, 1600, 500, 1, 10, '#FE4C25'),
  ('Homepage Banner', 'homepage-banner', 'Rotating banner below featured listings.', 'homepage_banner', 8000, 14, 1200, 300, 3, 20, '#0F766E'),
  ('Properties Top Banner', 'properties-top', 'Banner at the top of the properties listing page.', 'properties_top', 6000, 14, 1200, 250, 2, 30, '#0F766E'),
  ('Sidebar Ad', 'sidebar', 'Sticky sidebar ad shown across property and blog pages.', 'sidebar', 3000, 30, 400, 500, 4, 40, '#0F766E'),
  ('Blog Inline Ad', 'blog-inline', 'Inline placement inside blog articles.', 'blog_inline', 2500, 30, 900, 250, 3, 50, '#0F766E')
ON CONFLICT (slug) DO NOTHING;
