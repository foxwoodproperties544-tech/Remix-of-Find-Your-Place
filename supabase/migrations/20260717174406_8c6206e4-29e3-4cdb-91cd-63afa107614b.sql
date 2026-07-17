
-- Restrict profiles PII exposure via column-level GRANTs
DROP POLICY IF EXISTS "Anon can view safe profile columns" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated can view profiles" ON public.profiles;

-- Base table: revoke broad SELECT, grant only safe columns to anon/authenticated
REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (id, full_name, avatar_url, bio, company_name, verified, role_primary, created_at, updated_at) ON public.profiles TO anon, authenticated;

-- Row-level access: everyone can see profile rows, but column grants above hide phone/whatsapp/email
CREATE POLICY "Public can view profile rows (safe columns only)"
  ON public.profiles FOR SELECT
  TO anon, authenticated
  USING (true);

-- Owner and admin can read their full row via a security-definer accessor
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS SETOF public.profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.profiles WHERE id = auth.uid();
$$;
REVOKE ALL ON FUNCTION public.get_my_profile() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;

-- Tighten property_views insert (drop USING(true) style WITH CHECK true)
DROP POLICY IF EXISTS "Anyone can insert a view" ON public.property_views;
CREATE POLICY "Anyone can insert a view"
  ON public.property_views FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    viewer_user_id IS NULL
    OR viewer_user_id = auth.uid()
  );
