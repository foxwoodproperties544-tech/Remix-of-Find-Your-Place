CREATE OR REPLACE FUNCTION public.phone_in_use(_phone text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
     WHERE phone IS NOT NULL
       AND regexp_replace(phone, '[^0-9]', '', 'g') = regexp_replace(coalesce(_phone,''), '[^0-9]', '', 'g')
       AND regexp_replace(coalesce(_phone,''), '[^0-9]', '', 'g') <> ''
       AND id IS DISTINCT FROM auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.phone_in_use(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.phone_in_use(text) TO authenticated, service_role;