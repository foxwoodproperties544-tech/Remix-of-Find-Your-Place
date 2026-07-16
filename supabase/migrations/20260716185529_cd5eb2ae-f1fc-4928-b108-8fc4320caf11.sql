
-- 1) profiles: hide phone/whatsapp from anon via column grants
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Anon can view safe profile columns"
  ON public.profiles FOR SELECT TO anon USING (true);

CREATE POLICY "Authenticated can view profiles"
  ON public.profiles FOR SELECT TO authenticated USING (true);

REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT (id, full_name, avatar_url, bio, company_name, verified, tier, role_primary, created_at, updated_at, listing_quota, tier_expires_at)
  ON public.profiles TO anon;

-- 2) verification docs bucket: remove overly-permissive anon read
DROP POLICY IF EXISTS "docs_public_signed_via_owner" ON storage.objects;

-- 3) inquiries: validate sender + owner
DROP POLICY IF EXISTS "Anyone can submit inquiry" ON public.inquiries;
CREATE POLICY "Public submit inquiry"
  ON public.inquiries FOR INSERT TO anon, authenticated
  WITH CHECK (
    (sender_user_id IS NULL OR sender_user_id = auth.uid())
    AND owner_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id::text = inquiries.property_key
        AND p.owner_id = inquiries.owner_id
        AND p.status = 'published'
    )
  );

-- 4) viewings insert: validate requester + real published property
DROP POLICY IF EXISTS "Viewings insert anyone" ON public.viewings;
CREATE POLICY "Public submit viewing"
  ON public.viewings FOR INSERT TO anon, authenticated
  WITH CHECK (
    (requester_id IS NULL OR requester_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = viewings.property_id AND p.status = 'published'
    )
  );

-- 4b) viewings owner update: tighten WITH CHECK
DROP POLICY IF EXISTS "Viewings owner update" ON public.viewings;
CREATE POLICY "Viewings owner update"
  ON public.viewings FOR UPDATE TO authenticated
  USING (
    (EXISTS (SELECT 1 FROM public.properties p WHERE p.id = viewings.property_id AND p.owner_id = auth.uid()))
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    (EXISTS (SELECT 1 FROM public.properties p WHERE p.id = viewings.property_id AND p.owner_id = auth.uid()))
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

-- 5) has_role: switch to SECURITY INVOKER (safe since user_roles RLS lets caller read own rows,
--    and policies always call has_role(auth.uid(), ...))
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- 6) claim_first_admin: drop; replaced by a secured server function
DROP FUNCTION IF EXISTS public.claim_first_admin();
