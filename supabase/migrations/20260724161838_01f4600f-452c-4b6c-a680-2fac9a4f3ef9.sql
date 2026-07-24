
DROP POLICY "Anyone can log pwa install events" ON public.pwa_install_events;
CREATE POLICY "Anyone can log pwa install events" ON public.pwa_install_events
  FOR INSERT TO anon, authenticated
  WITH CHECK (event_type IN ('impression','install_click','dismiss','installed','ios_hint_shown'));
