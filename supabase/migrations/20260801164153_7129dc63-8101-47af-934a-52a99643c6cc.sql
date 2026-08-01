REVOKE SELECT ON public.ad_campaigns FROM anon;
GRANT SELECT (id, title, image_url, target_url, placement, status, starts_at, expires_at)
  ON public.ad_campaigns TO anon;
REVOKE SELECT (contact_phone, contact_email) ON public.property_requests FROM anon;