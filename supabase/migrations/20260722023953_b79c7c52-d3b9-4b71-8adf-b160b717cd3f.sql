
-- 1) Extend mpesa purpose enum + add blog_post reference
ALTER TYPE public.mpesa_purpose ADD VALUE IF NOT EXISTS 'blog_submission';

ALTER TABLE public.mpesa_transactions
  ADD COLUMN IF NOT EXISTS blog_post_id uuid;

-- 2) blog_packages
CREATE TABLE IF NOT EXISTS public.blog_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  price numeric NOT NULL DEFAULT 0 CHECK (price >= 0),
  duration_days integer NOT NULL DEFAULT 30 CHECK (duration_days > 0),
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_featured boolean NOT NULL DEFAULT false,
  is_sponsored boolean NOT NULL DEFAULT false,
  homepage_placement boolean NOT NULL DEFAULT false,
  priority_placement boolean NOT NULL DEFAULT false,
  badge_color text,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.blog_packages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blog_packages TO authenticated;
GRANT ALL ON public.blog_packages TO service_role;
ALTER TABLE public.blog_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads active blog packages" ON public.blog_packages
  FOR SELECT USING (active = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage blog packages" ON public.blog_packages
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER blog_packages_updated_at BEFORE UPDATE ON public.blog_packages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3) blog_posts extensions
ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS package_id uuid REFERENCES public.blog_packages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS admin_notes text,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_sponsored boolean NOT NULL DEFAULT false;

ALTER TABLE public.blog_posts DROP CONSTRAINT IF EXISTS blog_posts_status_check;
ALTER TABLE public.blog_posts ADD CONSTRAINT blog_posts_status_check
  CHECK (status = ANY (ARRAY[
    'draft','pending_payment','paid','pending_review','changes_requested',
    'approved','published','rejected','archived','expired'
  ]));

-- 4) blog_post_purchases
CREATE TABLE IF NOT EXISTS public.blog_post_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  package_id uuid REFERENCES public.blog_packages(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mpesa_transaction_id uuid REFERENCES public.mpesa_transactions(id) ON DELETE SET NULL,
  amount_paid numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','expired','refunded','cancelled')),
  activated_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blog_post_purchases TO authenticated;
GRANT ALL ON public.blog_post_purchases TO service_role;
ALTER TABLE public.blog_post_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read their blog purchases" ON public.blog_post_purchases
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owners create their blog purchases" ON public.blog_post_purchases
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins update blog purchases" ON public.blog_post_purchases
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER blog_post_purchases_updated_at BEFORE UPDATE ON public.blog_post_purchases
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5) Public visibility respects expires_at
DROP POLICY IF EXISTS "Public can view published posts" ON public.blog_posts;
CREATE POLICY "Public can view live posts" ON public.blog_posts
  FOR SELECT USING (
    status = 'published' AND (expires_at IS NULL OR expires_at > now())
  );

-- 6) Auto-expire published blog posts past their expiry
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

  UPDATE public.blog_post_purchases
     SET status = 'expired'
   WHERE status = 'active'
     AND expires_at IS NOT NULL
     AND expires_at < now();

  UPDATE public.blog_posts
     SET status = 'expired'
   WHERE status = 'published'
     AND expires_at IS NOT NULL
     AND expires_at < now();
END; $function$;

-- 7) Storage policies for blog-images
CREATE POLICY "Signed-in read blog-images" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'blog-images');

CREATE POLICY "Users upload own blog-images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'blog-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users update own blog-images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'blog-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users delete own blog-images" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'blog-images'
    AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(),'admin'))
  );

-- 8) Seed default packages
INSERT INTO public.blog_packages (name, slug, description, price, duration_days, features, is_featured, is_sponsored, homepage_placement, priority_placement, badge_color, sort_order, active)
VALUES
  ('Basic', 'basic', 'Standard blog publication for 30 days.', 500, 30,
    '["30-day publication","One featured image","Standard placement","Author byline"]'::jsonb,
    false, false, false, false, 'slate', 10, true),
  ('Featured', 'featured', 'Highlighted on the blog homepage with a Featured badge.', 1500, 30,
    '["30-day publication","Featured on blog homepage","Highlight badge","Higher in blog listings","Author byline"]'::jsonb,
    true, false, true, true, 'teal', 20, true),
  ('Sponsored', 'sponsored', 'Maximum visibility, marked as Sponsored across the site.', 3000, 30,
    '["30-day publication","Featured placement","Marked as Sponsored","Homepage exposure","Priority visibility across the site"]'::jsonb,
    true, true, true, true, 'orange', 30, true)
ON CONFLICT (slug) DO NOTHING;
