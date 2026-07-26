-- 1) Profiles: remove blanket public row read, add owner/admin read + safe public view
DROP POLICY IF EXISTS "Public can view profile rows (safe columns only)" ON public.profiles;

CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = false) AS
SELECT
  id, full_name, avatar_url, company_name, bio, verified, role_primary,
  county, town, address_line, phone, phone_verified, whatsapp, email_public,
  website, facebook_url, instagram_url, linkedin_url, twitter_url, tiktok_url,
  services, service_areas, specialties, languages, years_experience,
  license_number, office_hours, profile_completed_at,
  agent_verification_status,
  (kyc_status = 'approved') AS kyc_verified,
  created_at
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- 2) faq_analytics_events: no forged user attribution
DROP POLICY IF EXISTS "faq analytics insert anon" ON public.faq_analytics_events;
DROP POLICY IF EXISTS "faq analytics insert auth" ON public.faq_analytics_events;

CREATE POLICY "faq analytics insert anon"
ON public.faq_analytics_events FOR INSERT TO anon
WITH CHECK (user_id IS NULL);

CREATE POLICY "faq analytics insert auth"
ON public.faq_analytics_events FOR INSERT TO authenticated
WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- 3) SECURITY DEFINER functions: revoke direct execute where not needed
REVOKE EXECUTE ON FUNCTION public.enforce_listing_quota() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bump_chat_session() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.record_property_events() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_referral(text) FROM anon;
