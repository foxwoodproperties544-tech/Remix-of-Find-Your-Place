-- Sale state on properties
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS sale_state text;

CREATE TABLE public.offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_ref text NOT NULL UNIQUE DEFAULT ('OFR-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL,
  owner_id uuid,
  agent_id uuid,
  asking_price numeric NOT NULL DEFAULT 0,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'KES',
  message text,
  timeline text NOT NULL DEFAULT 'within_30',
  needs_mortgage boolean NOT NULL DEFAULT false,
  has_viewed boolean NOT NULL DEFAULT false,
  cash_buyer boolean NOT NULL DEFAULT false,
  buyer_name text,
  buyer_email text,
  buyer_phone text,
  status text NOT NULL DEFAULT 'pending',
  current_amount numeric,
  last_actor text,
  expires_at timestamptz,
  first_response_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.offers TO authenticated;
GRANT ALL ON public.offers TO service_role;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Offer parties can view" ON public.offers FOR SELECT TO authenticated
USING (auth.uid() = buyer_id OR auth.uid() = owner_id OR auth.uid() = agent_id OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Buyers create own offers" ON public.offers FOR INSERT TO authenticated
WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Offer parties can update" ON public.offers FOR UPDATE TO authenticated
USING (auth.uid() = buyer_id OR auth.uid() = owner_id OR auth.uid() = agent_id OR public.has_role(auth.uid(),'admin'))
WITH CHECK (auth.uid() = buyer_id OR auth.uid() = owner_id OR auth.uid() = agent_id OR public.has_role(auth.uid(),'admin'));

CREATE TRIGGER offers_updated_at BEFORE UPDATE ON public.offers
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_offers_property ON public.offers(property_id);
CREATE INDEX idx_offers_buyer ON public.offers(buyer_id, created_at DESC);
CREATE INDEX idx_offers_owner ON public.offers(owner_id, created_at DESC);
CREATE INDEX idx_offers_status ON public.offers(status);

CREATE TABLE public.offer_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  actor_id uuid,
  actor_role text,
  type text NOT NULL,
  amount numeric,
  body text,
  expires_at timestamptz,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.offer_events TO authenticated;
GRANT ALL ON public.offer_events TO service_role;
ALTER TABLE public.offer_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Offer parties view events" ON public.offer_events FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.offers o WHERE o.id = offer_id
  AND (auth.uid() = o.buyer_id OR auth.uid() = o.owner_id OR auth.uid() = o.agent_id OR public.has_role(auth.uid(),'admin'))));

CREATE POLICY "Offer parties add events" ON public.offer_events FOR INSERT TO authenticated
WITH CHECK (auth.uid() = actor_id AND EXISTS (SELECT 1 FROM public.offers o WHERE o.id = offer_id
  AND (auth.uid() = o.buyer_id OR auth.uid() = o.owner_id OR auth.uid() = o.agent_id OR public.has_role(auth.uid(),'admin'))));

CREATE INDEX idx_offer_events_offer ON public.offer_events(offer_id, created_at);

CREATE TABLE public.offer_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  body text,
  attachments text[] NOT NULL DEFAULT '{}',
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.offer_messages TO authenticated;
GRANT ALL ON public.offer_messages TO service_role;
ALTER TABLE public.offer_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Offer parties view messages" ON public.offer_messages FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.offers o WHERE o.id = offer_id
  AND (auth.uid() = o.buyer_id OR auth.uid() = o.owner_id OR auth.uid() = o.agent_id OR public.has_role(auth.uid(),'admin'))));

CREATE POLICY "Offer parties send messages" ON public.offer_messages FOR INSERT TO authenticated
WITH CHECK (auth.uid() = sender_id AND EXISTS (SELECT 1 FROM public.offers o WHERE o.id = offer_id
  AND (auth.uid() = o.buyer_id OR auth.uid() = o.owner_id OR auth.uid() = o.agent_id OR public.has_role(auth.uid(),'admin'))));

CREATE POLICY "Offer parties mark read" ON public.offer_messages FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.offers o WHERE o.id = offer_id
  AND (auth.uid() = o.buyer_id OR auth.uid() = o.owner_id OR auth.uid() = o.agent_id OR public.has_role(auth.uid(),'admin'))))
WITH CHECK (EXISTS (SELECT 1 FROM public.offers o WHERE o.id = offer_id
  AND (auth.uid() = o.buyer_id OR auth.uid() = o.owner_id OR auth.uid() = o.agent_id OR public.has_role(auth.uid(),'admin'))));

CREATE INDEX idx_offer_messages_offer ON public.offer_messages(offer_id, created_at);

-- Expire stale counter offers
CREATE OR REPLACE FUNCTION public.expire_offers()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int;
BEGIN
  WITH x AS (
    UPDATE public.offers SET status = 'expired'
     WHERE status IN ('pending','under_review','counter_offered')
       AND expires_at IS NOT NULL AND expires_at < now()
     RETURNING id, buyer_id
  ), ev AS (
    INSERT INTO public.offer_events (offer_id, type, body)
    SELECT id, 'expired', 'Offer expired automatically' FROM x
  )
  INSERT INTO public.notifications (user_id, type, title, body, link)
  SELECT buyer_id, 'offer_expired', 'Your offer expired',
         'The negotiation window closed. You can submit a new offer.', '/dashboard/offers'
    FROM x WHERE buyer_id IS NOT NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END; $$;

REVOKE EXECUTE ON FUNCTION public.expire_offers() FROM anon, authenticated;

INSERT INTO public.platform_settings (key, value)
VALUES ('offers', jsonb_build_object(
  'enabled', true,
  'allow_rentals', false,
  'default_expiry_days', 7,
  'max_offers_per_day', 10,
  'featured_offers', false,
  'premium_buyers', false,
  'priority_for_premium', false,
  'agent_analytics', true,
  'concierge', false
))
ON CONFLICT (key) DO NOTHING;