
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS county text,
  ADD COLUMN IF NOT EXISTS town text,
  ADD COLUMN IF NOT EXISTS address_line text,
  ADD COLUMN IF NOT EXISTS email_public text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS facebook_url text,
  ADD COLUMN IF NOT EXISTS instagram_url text,
  ADD COLUMN IF NOT EXISTS linkedin_url text,
  ADD COLUMN IF NOT EXISTS twitter_url text,
  ADD COLUMN IF NOT EXISTS tiktok_url text,
  ADD COLUMN IF NOT EXISTS services text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS service_areas text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS specialties text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS languages text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS years_experience int,
  ADD COLUMN IF NOT EXISTS license_number text,
  ADD COLUMN IF NOT EXISTS office_hours text,
  ADD COLUMN IF NOT EXISTS profile_completed_at timestamptz;

CREATE OR REPLACE FUNCTION public.is_profile_complete(_p public.profiles)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT
    COALESCE(length(trim(_p.full_name)), 0) > 1
    AND COALESCE(length(trim(_p.bio)), 0) >= 60
    AND COALESCE(length(trim(_p.phone)), 0) > 6
    AND COALESCE(length(trim(_p.county)), 0) > 1
    AND COALESCE(length(trim(_p.town)), 0) > 1
    AND array_length(_p.services, 1) >= 1
    AND array_length(_p.service_areas, 1) >= 1;
$$;

CREATE OR REPLACE FUNCTION public.profiles_mark_complete()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF public.is_profile_complete(NEW) THEN
    IF NEW.profile_completed_at IS NULL THEN
      NEW.profile_completed_at := now();
    END IF;
  ELSE
    NEW.profile_completed_at := NULL;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_profiles_mark_complete ON public.profiles;
CREATE TRIGGER trg_profiles_mark_complete
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.profiles_mark_complete();
