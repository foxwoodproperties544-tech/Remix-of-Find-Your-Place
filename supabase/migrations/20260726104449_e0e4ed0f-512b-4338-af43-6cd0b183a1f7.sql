ALTER TABLE public.pwa_install_events
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS campaign text,
  ADD COLUMN IF NOT EXISTS referrer text;

ALTER TABLE public.pwa_install_events DROP CONSTRAINT IF EXISTS pwa_install_events_event_type_check;
ALTER TABLE public.pwa_install_events ADD CONSTRAINT pwa_install_events_event_type_check
  CHECK (event_type IN ('impression','install_click','dismiss','installed','ios_hint_shown','page_view','share_click','share_whatsapp','copy_link','qr_shown'));

CREATE INDEX IF NOT EXISTS pwa_install_events_source_created_idx ON public.pwa_install_events (source, created_at DESC);