CREATE TABLE public.property_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  reporter_id uuid,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'open',
  resolution text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_reports TO authenticated;
GRANT INSERT ON public.property_reports TO anon;
GRANT ALL ON public.property_reports TO service_role;

ALTER TABLE public.property_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can report a listing"
ON public.property_reports FOR INSERT TO anon, authenticated
WITH CHECK (reporter_id IS NULL OR reporter_id = auth.uid());

CREATE POLICY "Reporters can view their own reports"
ON public.property_reports FOR SELECT TO authenticated
USING (reporter_id = auth.uid());

CREATE POLICY "Admins can view all reports"
ON public.property_reports FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update reports"
ON public.property_reports FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete reports"
ON public.property_reports FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_property_reports_status ON public.property_reports (status, created_at DESC);
CREATE INDEX idx_property_reports_property ON public.property_reports (property_id);

CREATE TRIGGER property_reports_set_updated_at
BEFORE UPDATE ON public.property_reports
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();