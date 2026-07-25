
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON public.profiles(referred_by);

CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
  i int;
  tries int := 0;
BEGIN
  LOOP
    code := '';
    FOR i IN 1..8 LOOP
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = code) THEN
      RETURN code;
    END IF;
    tries := tries + 1;
    IF tries > 20 THEN RAISE EXCEPTION 'could not generate unique referral code'; END IF;
  END LOOP;
END;
$$;

UPDATE public.profiles SET referral_code = public.generate_referral_code() WHERE referral_code IS NULL;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref_code text := NEW.raw_user_meta_data->>'referred_by_code';
  v_ref_id uuid;
BEGIN
  IF v_ref_code IS NOT NULL AND v_ref_code <> '' THEN
    SELECT id INTO v_ref_id FROM public.profiles WHERE referral_code = upper(v_ref_code) LIMIT 1;
  END IF;
  INSERT INTO public.profiles (id, full_name, avatar_url, referral_code, referred_by)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    public.generate_referral_code(),
    v_ref_id
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_referral(_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_ref uuid;
BEGIN
  IF v_uid IS NULL OR _code IS NULL OR _code = '' THEN RETURN false; END IF;
  SELECT id INTO v_ref FROM public.profiles WHERE referral_code = upper(_code) LIMIT 1;
  IF v_ref IS NULL OR v_ref = v_uid THEN RETURN false; END IF;
  UPDATE public.profiles
     SET referred_by = v_ref
   WHERE id = v_uid AND referred_by IS NULL;
  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_referral(text) TO authenticated;
