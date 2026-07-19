
-- ================================================================
-- BLOG_POSTS
-- ================================================================
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  excerpt text,
  content text NOT NULL DEFAULT '',
  cover_image text,
  category text NOT NULL DEFAULT 'guides',
  tags text[] NOT NULL DEFAULT '{}',
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  published_at timestamptz,
  reading_minutes int NOT NULL DEFAULT 5,
  seo_title text,
  seo_description text,
  view_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.blog_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blog_posts TO authenticated;
GRANT ALL ON public.blog_posts TO service_role;

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view published posts"
  ON public.blog_posts FOR SELECT
  USING (status = 'published');

CREATE POLICY "Authors view own posts"
  ON public.blog_posts FOR SELECT
  TO authenticated
  USING (author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authors insert own posts"
  ON public.blog_posts FOR INSERT
  TO authenticated
  WITH CHECK (author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authors update own posts"
  ON public.blog_posts FOR UPDATE
  TO authenticated
  USING (author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete posts"
  ON public.blog_posts FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS blog_posts_status_pubat_idx
  ON public.blog_posts (status, published_at DESC);

-- ================================================================
-- FAQ_ITEMS
-- ================================================================
CREATE TABLE IF NOT EXISTS public.faq_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  answer text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  sort_order int NOT NULL DEFAULT 0,
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.faq_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.faq_items TO authenticated;
GRANT ALL ON public.faq_items TO service_role;

ALTER TABLE public.faq_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view published FAQs"
  ON public.faq_items FOR SELECT
  USING (published = true);

CREATE POLICY "Admins manage FAQs"
  ON public.faq_items FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER faq_items_updated_at
  BEFORE UPDATE ON public.faq_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ================================================================
-- SEED BLOG POSTS
-- ================================================================
INSERT INTO public.blog_posts (slug, title, excerpt, content, category, tags, status, published_at, reading_minutes, seo_title, seo_description) VALUES
('buying-land-in-kenya-checklist','5 things to check before buying land in Kenya',
 'A practical checklist for first-time land buyers — from title search to zoning.',
 E'# 5 things to check before buying land in Kenya\n\nBuying land in Kenya is one of the most rewarding investments you can make — but only if you do your due diligence. Here are five must-check items before you sign anything.\n\n## 1. Verify the title deed\nAlways conduct an official search at the Ministry of Lands (or via ArdhiSasa). Confirm the seller''s name matches the title and that the parcel has no caveats or encumbrances.\n\n## 2. Confirm zoning and land-use\nThe county''s zoning determines whether you can build residential, commercial, or agricultural structures. Ask for the Physical Planning report.\n\n## 3. Visit the land physically\nWalk the boundaries with a licensed surveyor. Confirm beacons are in place and match the deed plan.\n\n## 4. Check for existing disputes\nSpeak to neighbours and the local chief. Family or succession disputes are a common cause of buyer regret.\n\n## 5. Use an advocate for the transfer\nNever transact directly. An advocate prepares the sale agreement, handles the transfer, and ensures stamp duty is paid correctly.\n\n---\n\n**Ready to buy?** Browse verified land listings on Foxwood Properties.',
 'guides', ARRAY['land','buying','due-diligence'], 'published', now() - interval '2 days', 6,
 'Buying Land in Kenya — 5-Step Checklist | Foxwood',
 'A practical 5-step checklist before buying land in Kenya: title search, zoning, boundaries, disputes, and conveyancing.'),

('renting-in-nairobi-2026-budget','Renting in Nairobi: what to budget in 2026',
 'A neighbourhood-by-neighbourhood look at rental prices across the city.',
 E'# Renting in Nairobi: what to budget in 2026\n\nNairobi''s rental market has stabilised after the 2024 corrections. Here is what you should budget across popular neighbourhoods in 2026.\n\n## Bedsitters & 1-bed apartments\n- **Kilimani / Kileleshwa:** KSh 25,000 – 45,000\n- **Westlands:** KSh 30,000 – 55,000\n- **South B / South C:** KSh 15,000 – 28,000\n- **Roysambu / Kasarani:** KSh 8,000 – 18,000\n\n## 2-bed apartments\n- **Lavington:** KSh 60,000 – 120,000\n- **Syokimau:** KSh 25,000 – 45,000\n- **Ruaka:** KSh 30,000 – 55,000\n\n## What to factor beyond rent\n1. **Deposit** — usually 1–2 months\n2. **Service charge** — KSh 3,000 – 15,000 depending on amenities\n3. **Water & garbage** — sometimes billed separately\n4. **Parking** — extra in apartments\n\n## Tips to save\nSign a 12-month lease for a discount, negotiate service charge inclusion, and always inspect at night to check security and noise.',
 'market-reports', ARRAY['rent','nairobi','budget'], 'published', now() - interval '5 days', 5,
 'Nairobi Rental Prices 2026 — Neighbourhood Guide | Foxwood',
 'Budget guide for renting in Nairobi in 2026: bedsitter to 3-bed apartment prices across Kilimani, Westlands, Syokimau and more.'),

('commercial-vs-residential-investment','Investing in commercial property: is it worth it?',
 'How commercial yields compare with residential in today''s market.',
 E'# Commercial vs residential — where should you invest?\n\nBoth asset classes have their place. Here is how they stack up in Kenya today.\n\n## Yields\n- **Commercial (offices/retail):** 8–11% gross\n- **Residential apartments:** 5–8% gross\n- **Airbnb / short-lets:** 10–18% (higher risk)\n\n## Vacancy risk\nCommercial vacancies last longer (3–9 months) but tenants sign 5-year leases. Residential turns over faster but re-lets within weeks.\n\n## Management overhead\nCommercial tenants handle most repairs themselves. Residential landlords face constant calls.\n\n## Verdict\nIf you have KSh 25M+, mix both. If you have less, start with a residential apartment in a proven location, then graduate to commercial.',
 'investment', ARRAY['commercial','investment','yields'], 'published', now() - interval '8 days', 4,
 'Commercial vs Residential Property Investment Kenya | Foxwood',
 'Compare yields, vacancy risk and management overhead of commercial versus residential property investment in Kenya.'),

('mortgage-guide-kenya','How mortgages work in Kenya — a beginner''s guide',
 'Interest rates, deposit requirements, and what lenders check.',
 E'# How mortgages work in Kenya\n\nA mortgage lets you own property while paying over time. Here is what to know.\n\n## Deposit\nMost Kenyan banks ask for **10–20% deposit**. KMRC-backed loans can go as low as 10%.\n\n## Interest rates (2026)\n- **KMRC:** 9.5% fixed\n- **Commercial banks:** 13–16% variable\n- **SACCOs:** 12–14%\n\n## What lenders check\n1. Payslips (3–6 months) or business bank statements\n2. CRB status\n3. Debt-to-income ratio (below 40%)\n4. Property valuation\n\n## Use our calculator\n[Try the Foxwood mortgage calculator](/mortgage) to estimate your monthly repayment.',
 'guides', ARRAY['mortgage','financing'], 'published', now() - interval '12 days', 5,
 'Mortgages in Kenya — Beginner''s Guide | Foxwood Properties',
 'Everything you need to know about mortgages in Kenya: deposit, interest rates, lender requirements and monthly repayments.'),

('best-neighbourhoods-nairobi-families','5 best Nairobi neighbourhoods for families in 2026',
 'Schools, security, and space — the top picks for family living.',
 E'# Best Nairobi neighbourhoods for families\n\n## 1. Runda\nGated, spacious, near international schools. Expensive but unmatched security.\n\n## 2. Karen\nGreen, quiet, close to Karen Country Club and top schools. Great for horse-loving families.\n\n## 3. Lavington\nCentral, walkable to shops and schools, mix of houses and townhouses.\n\n## 4. Kileleshwa\nApartments and townhouses, good schools, cafes and parks nearby.\n\n## 5. Syokimau\nAffordable, growing rapidly, easy access to JKIA and the SGR.',
 'guides', ARRAY['nairobi','family','neighbourhoods'], 'published', now() - interval '15 days', 4,
 'Best Nairobi Neighbourhoods for Families 2026 | Foxwood',
 'The 5 best Nairobi neighbourhoods for families in 2026 — schools, security, and space compared.'),

('airbnb-hosting-kenya-guide','Starting an Airbnb in Kenya: what you need to know',
 'Licensing, taxes, and what makes a short-let profitable.',
 E'# Starting an Airbnb in Kenya\n\nShort-lets can earn 2–3x long-term rent — but they need work.\n\n## Legal requirements\n- **County single business permit**\n- **Tourism Regulatory Authority (TRA) licence**\n- **KRA PIN + monthly VAT** (if turnover exceeds threshold)\n\n## Setup costs\n- Furnishing 1-bed: KSh 350,000 – 700,000\n- Photography: KSh 15,000 – 30,000\n- Cleaner + linen service: KSh 800 – 1,500 per turnover\n\n## Where it works best\nKilimani, Westlands, Karen (business travellers), Diani, Nanyuki, Naivasha (leisure).\n\n## Occupancy targets\nBreak even at 40% occupancy. Aim for 65%+ with good reviews.',
 'investment', ARRAY['airbnb','short-let','hosting'], 'published', now() - interval '20 days', 6,
 'Starting an Airbnb in Kenya — Full Guide | Foxwood',
 'How to start a profitable Airbnb in Kenya: licensing, taxes, setup costs and the best locations.'),

('diaspora-buying-property-kenya','Buying property from the diaspora — a step-by-step guide',
 'How Kenyans abroad can safely invest back home.',
 E'# Buying property from the diaspora\n\nBuying from abroad is easier than ever — but scams are real. Follow this playbook.\n\n## 1. Appoint a trusted representative\nA family member, advocate, or licensed agent with **power of attorney** to sign on your behalf.\n\n## 2. Use verified listings only\nStick to platforms like Foxwood where agents and properties are verified.\n\n## 3. Virtual viewings\nRequest a live video walkthrough. Do not rely on photos alone.\n\n## 4. Independent valuation\nCommission a registered valuer separately from the seller.\n\n## 5. Pay through the bank\nNever send cash. Use SWIFT or Wise into an escrow / advocate account.\n\n## 6. Register the title in your name\nEnsure the transfer is filed at the Ministry of Lands and you receive the original title.',
 'guides', ARRAY['diaspora','buying','investment'], 'published', now() - interval '25 days', 6,
 'Buying Property from the Diaspora — Kenya Guide | Foxwood',
 'Step-by-step guide for diaspora Kenyans buying property back home safely — POA, verification, valuation, and title transfer.'),

('off-plan-vs-ready-property','Off-plan vs ready property — pros and cons',
 'Should you buy at construction stage or move-in ready?',
 E'# Off-plan vs ready property\n\n## Off-plan pros\n- 15–30% cheaper than ready\n- Flexible payment plans\n- Choice of unit and finishes\n\n## Off-plan cons\n- Delivery delays are common\n- Developer risk (do they finish?)\n- No rental income during construction\n\n## Ready property pros\n- Move in immediately\n- Rental income from day one\n- What you see is what you get\n\n## Ready property cons\n- Higher price\n- Full payment or mortgage upfront\n- Limited customisation\n\n## Rule of thumb\nBuy off-plan only from **established developers with completed projects** you can visit.',
 'guides', ARRAY['off-plan','buying'], 'published', now() - interval '30 days', 4,
 'Off-Plan vs Ready Property in Kenya | Foxwood Properties',
 'Compare off-plan and ready-to-move property in Kenya — pricing, risk, and which suits your goals.');

-- ================================================================
-- SEED FAQ
-- ================================================================
INSERT INTO public.faq_items (question, answer, category, sort_order) VALUES
('How do I list a property on Foxwood?','Sign up, verify your email, then click "List your property" in your dashboard. Add photos, details, and location — your listing goes live after admin review (usually within 24 hours).','listing',1),
('Is listing free?','Yes — basic listings are free. Featured listings and agent subscriptions unlock priority placement and advanced tools. See our Pricing page for details.','listing',2),
('How do I get my listing verified?','Open your listing in the dashboard, click "Request verification", and upload the required documents. Our team reviews and approves verified listings within 2 business days.','listing',3),
('What payment methods do you support?','We support M-Pesa STK Push for featured listings and subscriptions. Card payments are coming soon.','payments',1),
('How does the mortgage calculator work?','Enter the property price, deposit, interest rate, and loan term. The calculator shows your monthly repayment based on standard amortisation. Rates and terms vary by lender.','tools',1),
('Can I compare properties side by side?','Yes — click the compare icon on any listing card. Once you have 2–4 properties, open the Compare page to see them side by side and export as PDF.','tools',2),
('How do saved searches work?','On the Properties page, apply your filters, then click "Save this search". You will be notified when new matching listings are published.','tools',3),
('Are the agents on Foxwood verified?','Verified agents display a green badge. Verification includes ID checks, license validation, and reference reviews.','trust',1),
('How do you protect against scams?','We manually review every listing, verify agents on request, and never handle payments directly between buyer and seller. Always transact through a registered advocate.','trust',2),
('Can I buy property if I live abroad?','Yes — see our diaspora buying guide. You will need a trusted local representative with power of attorney. Foxwood connects you to verified agents who handle diaspora clients.','buying',1),
('What is off-plan property?','Off-plan means buying a unit while it is still under construction — usually at a 15–30% discount with a flexible payment plan. Only buy from developers with completed projects.','buying',2),
('How much deposit do I need for a mortgage?','Most Kenyan banks require 10–20%. KMRC-backed loans can go as low as 10%. Higher deposits reduce your monthly repayment.','buying',3),
('How do I contact an agent?','Every listing has Call, WhatsApp, and Enquiry buttons. You can also visit an agent''s profile to see all their listings and reviews.','contact',1),
('How do I book a viewing?','On any property page, click "Book a viewing", pick a date and time, and submit. The agent will confirm or propose a new time.','contact',2),
('How do I delete my account?','Email hello@foxwoodproperties.co.ke from your registered address. We remove your account and personal data within 30 days per Kenya''s Data Protection Act.','account',1);
