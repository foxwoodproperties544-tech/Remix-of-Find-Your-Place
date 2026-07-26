ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS verification_sub_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS verification_sub_expires_at timestamptz;