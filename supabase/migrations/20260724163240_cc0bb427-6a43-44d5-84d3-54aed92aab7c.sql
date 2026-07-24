
CREATE TABLE IF NOT EXISTS public.tier_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  listing_quota INT NOT NULL DEFAULT 3,
  duration_days INT NOT NULL DEFAULT 30,
  perks JSONB NOT NULL DEFAULT '[]'::jsonb,
  badge_color TEXT,
  highlight BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.tier_plans TO anon, authenticated;
GRANT ALL ON public.tier_plans TO service_role;

ALTER TABLE public.tier_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active tier plans"
  ON public.tier_plans FOR SELECT
  USING (active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage tier plans"
  ON public.tier_plans FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_tier_plans_updated_at
  BEFORE UPDATE ON public.tier_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.tier_plans (slug, name, price, listing_quota, duration_days, perks, highlight, sort_order) VALUES
  ('free',  'Free',  0,     3,   30, '["Up to 3 active listings","Standard visibility","WhatsApp & call leads"]'::jsonb, false, 0),
  ('basic', 'Basic', 1500,  15,  30, '["Up to 15 active listings","Priority support","1 featured listing / month"]'::jsonb, false, 1),
  ('pro',   'Pro',   4500,  60,  30, '["Up to 60 listings","Verified agent badge","3 featured listings / month","Agent profile boost"]'::jsonb, true, 2),
  ('elite', 'Elite', 12000, 999, 30, '["Unlimited listings","Top of search results","10 featured / month","Dedicated account manager"]'::jsonb, false, 3)
ON CONFLICT (slug) DO NOTHING;
