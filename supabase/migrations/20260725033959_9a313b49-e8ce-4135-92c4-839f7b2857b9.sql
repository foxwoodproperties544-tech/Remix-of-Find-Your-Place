
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tos_version_accepted text,
  ADD COLUMN IF NOT EXISTS tos_accepted_at timestamptz;

INSERT INTO public.platform_settings(key, value)
VALUES ('current_tos_version', to_jsonb('2026-07-25'::text))
ON CONFLICT (key) DO NOTHING;
