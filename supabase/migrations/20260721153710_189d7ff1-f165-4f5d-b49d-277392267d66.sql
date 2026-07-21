
-- Agent/Owner KYC (verifies the person, not a specific listing)
CREATE TYPE public.kyc_status AS ENUM ('none','pending','approved','rejected');

ALTER TABLE public.profiles
  ADD COLUMN kyc_status public.kyc_status NOT NULL DEFAULT 'none',
  ADD COLUMN kyc_verified_at timestamptz;

CREATE TABLE public.kyc_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_legal_name text NOT NULL,
  id_type text NOT NULL DEFAULT 'national_id',
  id_number text NOT NULL,
  id_document_url text NOT NULL,
  selfie_url text NOT NULL,
  kra_pin text,
  kra_pin_certificate_url text,
  business_permit_url text,
  earb_license_number text,
  earb_license_url text,
  company_name text,
  notes text,
  status public.kyc_status NOT NULL DEFAULT 'pending',
  reviewer_notes text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_kyc_submissions_user ON public.kyc_submissions(user_id);
CREATE INDEX idx_kyc_submissions_status ON public.kyc_submissions(status);

GRANT SELECT, INSERT, UPDATE ON public.kyc_submissions TO authenticated;
GRANT ALL ON public.kyc_submissions TO service_role;

ALTER TABLE public.kyc_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own KYC" ON public.kyc_submissions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view own KYC" ON public.kyc_submissions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Users update own pending KYC" ON public.kyc_submissions
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins manage KYC" ON public.kyc_submissions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_kyc_submissions_updated
  BEFORE UPDATE ON public.kyc_submissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Sync profile.kyc_status on review
CREATE OR REPLACE FUNCTION public.sync_profile_kyc()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    UPDATE public.profiles
       SET kyc_status = NEW.status,
           kyc_verified_at = CASE WHEN NEW.status = 'approved' THEN now() ELSE NULL END,
           verified = CASE WHEN NEW.status = 'approved' THEN true ELSE verified END
     WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_kyc_sync_profile
  AFTER UPDATE ON public.kyc_submissions
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_kyc();

-- Set to pending on insert
CREATE OR REPLACE FUNCTION public.mark_profile_kyc_pending()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.profiles SET kyc_status = 'pending' WHERE id = NEW.user_id;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_kyc_pending
  AFTER INSERT ON public.kyc_submissions
  FOR EACH ROW EXECUTE FUNCTION public.mark_profile_kyc_pending();
