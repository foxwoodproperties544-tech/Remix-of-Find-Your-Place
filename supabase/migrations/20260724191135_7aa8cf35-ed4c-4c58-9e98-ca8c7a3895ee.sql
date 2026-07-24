
CREATE TABLE public.support_click_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL CHECK (action IN ('call','whatsapp')),
  context TEXT NOT NULL DEFAULT 'generic',
  page_path TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT INSERT ON public.support_click_events TO anon, authenticated;
GRANT SELECT ON public.support_click_events TO authenticated;
GRANT ALL ON public.support_click_events TO service_role;

ALTER TABLE public.support_click_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can record support click"
  ON public.support_click_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can read support clicks"
  ON public.support_click_events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_support_click_events_created_at ON public.support_click_events (created_at DESC);
CREATE INDEX idx_support_click_events_context ON public.support_click_events (context);
