DROP POLICY IF EXISTS "Anyone can log a request view" ON public.property_request_views;
CREATE POLICY "Visitors log valid request views"
ON public.property_request_views
FOR INSERT
TO anon, authenticated
WITH CHECK (
  (auth.uid() IS NULL AND viewer_user_id IS NULL)
  OR (auth.uid() IS NOT NULL AND viewer_user_id = auth.uid())
);

DROP POLICY IF EXISTS "Public can read active requests" ON public.property_requests;
CREATE POLICY "Guests read active requests"
ON public.property_requests
FOR SELECT
TO anon
USING (status IN ('active', 'fulfilled'));

REVOKE SELECT ON public.property_requests FROM anon;

DROP VIEW IF EXISTS public.property_requests_public;
CREATE VIEW public.property_requests_public
WITH (security_barrier = true)
AS
SELECT
  id, user_id, slug, title, kind, property_type, county, town, estate,
  preferred_location, budget_min, budget_max, currency, bedrooms, bathrooms,
  parking, land_size, building_size, furnished, amenities, description,
  move_date, viewing_times, images, hide_phone, hide_email, allow_whatsapp,
  allow_messages, status, is_featured, is_urgent, package_slug, published_at,
  expires_at, closed_at, fulfilled_property_id, view_count, response_count,
  created_at, updated_at
FROM public.property_requests
WHERE status IN ('active', 'fulfilled');

REVOKE ALL ON public.property_requests_public FROM PUBLIC;
GRANT SELECT ON public.property_requests_public TO anon, authenticated;

CREATE POLICY "Admins upload site assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'site-assets'
  AND public.has_role(auth.uid(), 'admin')
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Admins read site assets"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'site-assets'
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins update site assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'site-assets'
  AND public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  bucket_id = 'site-assets'
  AND public.has_role(auth.uid(), 'admin')
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Admins delete site assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'site-assets'
  AND public.has_role(auth.uid(), 'admin')
);