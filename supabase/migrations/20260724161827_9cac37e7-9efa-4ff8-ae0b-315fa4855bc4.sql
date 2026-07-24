
CREATE TABLE public.pwa_install_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type text NOT NULL CHECK (event_type IN ('impression','install_click','dismiss','installed','ios_hint_shown')),
  platform text,
  user_agent text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX pwa_install_events_type_created_idx ON public.pwa_install_events (event_type, created_at DESC);
GRANT INSERT ON public.pwa_install_events TO anon, authenticated;
GRANT ALL ON public.pwa_install_events TO service_role;
ALTER TABLE public.pwa_install_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can log pwa install events" ON public.pwa_install_events FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins can read pwa install events" ON public.pwa_install_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
