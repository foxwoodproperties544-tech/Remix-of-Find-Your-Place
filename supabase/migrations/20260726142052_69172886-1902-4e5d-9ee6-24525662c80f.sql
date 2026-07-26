
DROP POLICY IF EXISTS "benq_insert_any" ON public.business_enquiries;
DROP POLICY IF EXISTS "bviews_insert" ON public.business_views;
REVOKE INSERT ON public.business_enquiries FROM anon;
REVOKE INSERT ON public.business_views FROM anon;

CREATE POLICY "benq_insert_auth" ON public.business_enquiries FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "bviews_insert_auth" ON public.business_views FOR INSERT TO authenticated
  WITH CHECK (viewer_id = auth.uid());
