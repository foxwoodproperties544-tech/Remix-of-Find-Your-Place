
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS comp_reason text,
  ADD COLUMN IF NOT EXISTS comp_granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS comp_granted_at timestamptz;

INSERT INTO public.tier_plans (slug, name, price, duration_days, listing_quota, perks, active, sort_order, highlight)
VALUES (
  'founding',
  'Founding Agent',
  0,
  90,
  20,
  '["Complimentary — no payment required","Full agent profile","Up to 20 active listings","Founding Member badge","Priority admin support"]'::jsonb,
  true,
  0,
  true
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  duration_days = EXCLUDED.duration_days,
  listing_quota = EXCLUDED.listing_quota,
  perks = EXCLUDED.perks,
  active = true,
  highlight = true;
