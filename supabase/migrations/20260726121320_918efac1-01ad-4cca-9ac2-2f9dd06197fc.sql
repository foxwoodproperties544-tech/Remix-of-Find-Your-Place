-- 1) Remove broad referrer access to referred users' full profiles
DROP POLICY IF EXISTS "Users can view profiles they referred" ON public.profiles;

-- 2) Make public_profiles run with the caller's own permissions (no elevated view)
--    and back it with column-level grants + a row policy limited to safe columns.
GRANT SELECT (
  id, full_name, avatar_url, company_name, bio, verified, role_primary,
  county, town, address_line, phone, phone_verified, whatsapp, email_public,
  website, facebook_url, instagram_url, linkedin_url, twitter_url, tiktok_url,
  services, service_areas, specialties, languages, years_experience,
  license_number, office_hours, profile_completed_at, agent_verification_status,
  kyc_status, created_at
) ON public.profiles TO anon, authenticated;

DROP POLICY IF EXISTS "Public can view limited profile columns" ON public.profiles;
CREATE POLICY "Public can view limited profile columns"
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (true);

ALTER VIEW public.public_profiles SET (security_invoker = on);
GRANT SELECT ON public.public_profiles TO anon, authenticated;
GRANT ALL ON public.public_profiles TO service_role;