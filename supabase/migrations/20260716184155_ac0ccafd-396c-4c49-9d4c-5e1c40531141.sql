
-- Agent tiers enum
CREATE TYPE public.agent_tier AS ENUM ('free', 'basic', 'pro', 'elite');

-- Verification & payment status enums
CREATE TYPE public.verification_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.mpesa_status AS ENUM ('pending', 'success', 'failed', 'cancelled');
CREATE TYPE public.mpesa_purpose AS ENUM ('feature_listing', 'upgrade_tier', 'verification_fee', 'other');

-- Properties: featured & verification & price-reduced
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS featured_until timestamptz,
  ADD COLUMN IF NOT EXISTS verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS price_reduced_from numeric;

CREATE INDEX IF NOT EXISTS idx_properties_featured ON public.properties (is_featured, featured_until) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_properties_verified ON public.properties (verified) WHERE verified = true;

-- Profiles: agent tier + quota
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tier public.agent_tier NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS tier_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS listing_quota integer NOT NULL DEFAULT 3;

-- Verification requests
CREATE TABLE public.verification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  id_document_url text,
  title_deed_url text,
  additional_docs jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  status public.verification_status NOT NULL DEFAULT 'pending',
  reviewer_notes text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.verification_requests TO authenticated;
GRANT ALL ON public.verification_requests TO service_role;
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view own verification requests"
  ON public.verification_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners submit verification requests"
  ON public.verification_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners update own pending verification"
  ON public.verification_requests FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins manage verification"
  ON public.verification_requests FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_verification_requests_updated
  BEFORE UPDATE ON public.verification_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_verification_requests_property ON public.verification_requests(property_id);
CREATE INDEX idx_verification_requests_status ON public.verification_requests(status);

-- M-Pesa transactions
CREATE TABLE public.mpesa_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number text NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  purpose public.mpesa_purpose NOT NULL,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  tier public.agent_tier,
  duration_days integer,
  merchant_request_id text,
  checkout_request_id text UNIQUE,
  mpesa_receipt text,
  status public.mpesa_status NOT NULL DEFAULT 'pending',
  result_code integer,
  result_desc text,
  raw_callback jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.mpesa_transactions TO authenticated;
GRANT ALL ON public.mpesa_transactions TO service_role;
ALTER TABLE public.mpesa_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own mpesa txns"
  ON public.mpesa_transactions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users insert own mpesa txns"
  ON public.mpesa_transactions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_mpesa_transactions_updated
  BEFORE UPDATE ON public.mpesa_transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_mpesa_txns_user ON public.mpesa_transactions(user_id);
CREATE INDEX idx_mpesa_txns_checkout ON public.mpesa_transactions(checkout_request_id);
