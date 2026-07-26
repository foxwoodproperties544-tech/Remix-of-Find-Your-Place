
DROP POLICY IF EXISTS "Public can view agent profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated can view agent profiles" ON public.profiles;

CREATE POLICY "Public can view agent profiles"
ON public.profiles FOR SELECT TO anon
USING (
  COALESCE(verified, false) = true
  OR role_primary IN ('agent','agency','developer')
  OR EXISTS (SELECT 1 FROM public.properties p WHERE p.owner_id = profiles.id AND p.status = 'published')
);

CREATE POLICY "Authenticated can view agent profiles"
ON public.profiles FOR SELECT TO authenticated
USING (
  COALESCE(verified, false) = true
  OR role_primary IN ('agent','agency','developer')
  OR EXISTS (SELECT 1 FROM public.properties p WHERE p.owner_id = profiles.id AND p.status = 'published')
);
