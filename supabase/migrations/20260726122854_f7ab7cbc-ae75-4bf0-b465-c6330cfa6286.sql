
-- 1) Anonymous visitors should only see professional (agent/agency/developer) profiles, not every user
DROP POLICY IF EXISTS "Public can view limited profile columns" ON public.profiles;

CREATE POLICY "Public can view agent profiles"
ON public.profiles FOR SELECT TO anon
USING (
  COALESCE(verified, false) = true
  OR role_primary IN ('agent','agency','developer')
);

CREATE POLICY "Authenticated can view agent profiles"
ON public.profiles FOR SELECT TO authenticated
USING (
  COALESCE(verified, false) = true
  OR role_primary IN ('agent','agency','developer')
);

-- 2) Physical address is not public information
REVOKE SELECT (address_line) ON public.profiles FROM anon;

-- 3) Account deletion / data-erasure requests (compliance)
CREATE TABLE public.account_deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  handled_by uuid,
  handled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.account_deletion_requests TO authenticated;
GRANT ALL ON public.account_deletion_requests TO service_role;

ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own deletion request"
ON public.account_deletion_requests FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view own deletion requests"
ON public.account_deletion_requests FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update deletion requests"
ON public.account_deletion_requests FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER account_deletion_requests_updated_at
BEFORE UPDATE ON public.account_deletion_requests
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_adr_status ON public.account_deletion_requests(status, created_at DESC);
