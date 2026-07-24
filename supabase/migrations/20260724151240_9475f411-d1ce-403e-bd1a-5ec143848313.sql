
-- Phase 3: Agent productivity
-- 1. Add 360° virtual tour URL to properties
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS tour_url TEXT;

-- 2. Duplicate-photo detection: track image hashes
CREATE TABLE IF NOT EXISTS public.property_image_hashes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  image_hash TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_property_image_hashes_hash
  ON public.property_image_hashes(image_hash);
CREATE INDEX IF NOT EXISTS idx_property_image_hashes_owner
  ON public.property_image_hashes(owner_id);

GRANT SELECT, INSERT, DELETE ON public.property_image_hashes TO authenticated;
GRANT ALL ON public.property_image_hashes TO service_role;

ALTER TABLE public.property_image_hashes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their image hashes"
  ON public.property_image_hashes
  FOR ALL
  TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can read hashes for duplicate checks"
  ON public.property_image_hashes
  FOR SELECT
  TO authenticated
  USING (true);
