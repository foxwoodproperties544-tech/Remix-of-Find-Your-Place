
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS agent_verification_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS agent_verification_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS agent_verification_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS agent_verification_reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS agent_verification_reviewer_notes text,
  ADD COLUMN IF NOT EXISTS agent_verification_id_url text,
  ADD COLUMN IF NOT EXISTS agent_verification_license_url text;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_agent_verification_status_chk') THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_agent_verification_status_chk
      CHECK (agent_verification_status IN ('none','pending','approved','rejected'));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.is_profile_complete(_p public.profiles)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $function$
  SELECT
    COALESCE(length(trim(_p.full_name)), 0) > 1
    AND COALESCE(length(trim(_p.bio)), 0) >= 60
    AND COALESCE(length(trim(_p.phone)), 0) > 6
    AND COALESCE(_p.phone_verified, false) = true
    AND COALESCE(length(trim(_p.county)), 0) > 1
    AND COALESCE(length(trim(_p.town)), 0) > 1
    AND array_length(_p.services, 1) >= 1
    AND array_length(_p.service_areas, 1) >= 1;
$function$;
