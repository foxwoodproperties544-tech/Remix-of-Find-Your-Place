
CREATE TABLE public.property_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_key text NOT NULL,
  viewer_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX property_views_property_key_created_idx ON public.property_views(property_key, created_at DESC);
GRANT SELECT, INSERT ON public.property_views TO anon, authenticated;
GRANT ALL ON public.property_views TO service_role;
ALTER TABLE public.property_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert a view" ON public.property_views FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Owners can read views for their properties"
  ON public.property_views FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.properties p WHERE p.id::text = property_views.property_key AND p.owner_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );
