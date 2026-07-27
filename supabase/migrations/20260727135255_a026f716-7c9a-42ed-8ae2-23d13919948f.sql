-- 1. Extend viewings for typed bookings, refs, locations and lifecycle timestamps
ALTER TABLE public.viewings
  ADD COLUMN IF NOT EXISTS booking_ref text,
  ADD COLUMN IF NOT EXISTS viewing_type text NOT NULL DEFAULT 'in_person',
  ADD COLUMN IF NOT EXISTS visitor_count integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS meeting_location text,
  ADD COLUMN IF NOT EXISTS virtual_link text,
  ADD COLUMN IF NOT EXISTS duration_minutes integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS internal_notes text,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_by uuid,
  ADD COLUMN IF NOT EXISTS agent_id uuid,
  ADD COLUMN IF NOT EXISTS first_response_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS viewings_booking_ref_key ON public.viewings (booking_ref);
CREATE INDEX IF NOT EXISTS viewings_agent_idx ON public.viewings (agent_id);
CREATE INDEX IF NOT EXISTS viewings_requested_at_idx ON public.viewings (requested_at);

-- Prevent double booking of the same slot on the same property (active bookings only)
CREATE UNIQUE INDEX IF NOT EXISTS viewings_no_double_booking
  ON public.viewings (property_id, requested_at)
  WHERE status IN ('pending','approved','confirmed','rescheduled');

-- 2. Open house availability on a listing
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS open_house_at timestamptz;

-- 3. Booking reference generator
CREATE OR REPLACE FUNCTION public.viewings_before_write()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_owner uuid;
BEGIN
  IF NEW.booking_ref IS NULL OR NEW.booking_ref = '' THEN
    NEW.booking_ref := 'VW-' || to_char(now(), 'YYMM') || '-' ||
      upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  END IF;
  IF NEW.agent_id IS NULL THEN
    SELECT owner_id INTO v_owner FROM public.properties WHERE id = NEW.property_id;
    NEW.agent_id := v_owner;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'completed' AND NEW.completed_at IS NULL THEN NEW.completed_at := now(); END IF;
    IF NEW.status = 'cancelled' AND NEW.cancelled_at IS NULL THEN NEW.cancelled_at := now(); END IF;
    IF NEW.status IS DISTINCT FROM OLD.status AND NEW.first_response_at IS NULL
       AND NEW.status <> 'pending' THEN NEW.first_response_at := now(); END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS viewings_before_write_trg ON public.viewings;
CREATE TRIGGER viewings_before_write_trg
  BEFORE INSERT OR UPDATE ON public.viewings
  FOR EACH ROW EXECUTE FUNCTION public.viewings_before_write();

-- 4. Booking timeline / history
CREATE TABLE IF NOT EXISTS public.viewing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  viewing_id uuid NOT NULL REFERENCES public.viewings(id) ON DELETE CASCADE,
  actor_id uuid,
  type text NOT NULL,
  body text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS viewing_events_viewing_idx ON public.viewing_events (viewing_id, created_at DESC);

GRANT SELECT ON public.viewing_events TO authenticated;
GRANT ALL ON public.viewing_events TO service_role;
ALTER TABLE public.viewing_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants read viewing events" ON public.viewing_events
FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.viewings v
    WHERE v.id = viewing_events.viewing_id
      AND (v.requester_id = auth.uid() OR v.agent_id = auth.uid()
           OR EXISTS (SELECT 1 FROM public.properties p WHERE p.id = v.property_id AND p.owner_id = auth.uid()))
  )
);

-- 5. Automatic timeline entries
CREATE OR REPLACE FUNCTION public.record_viewing_events()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.viewing_events (viewing_id, actor_id, type, body, metadata)
    VALUES (NEW.id, NEW.requester_id, 'created', 'Viewing requested',
      jsonb_build_object('viewing_type', NEW.viewing_type, 'requested_at', NEW.requested_at));
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.viewing_events (viewing_id, actor_id, type, body, metadata)
    VALUES (NEW.id, auth.uid(), 'status_change',
      format('Status: %s → %s', OLD.status, NEW.status),
      jsonb_build_object('from', OLD.status, 'to', NEW.status));
  END IF;
  IF NEW.requested_at IS DISTINCT FROM OLD.requested_at OR NEW.proposed_at IS DISTINCT FROM OLD.proposed_at THEN
    INSERT INTO public.viewing_events (viewing_id, actor_id, type, body, metadata)
    VALUES (NEW.id, auth.uid(), 'reschedule', 'Schedule updated',
      jsonb_build_object('requested_at', NEW.requested_at, 'proposed_at', NEW.proposed_at));
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS record_viewing_events_trg ON public.viewings;
CREATE TRIGGER record_viewing_events_trg
  AFTER INSERT OR UPDATE ON public.viewings
  FOR EACH ROW EXECUTE FUNCTION public.record_viewing_events();

-- Keep existing lead + notification automation wired to the table
DROP TRIGGER IF EXISTS handle_viewing_to_lead_trg ON public.viewings;
CREATE TRIGGER handle_viewing_to_lead_trg
  AFTER INSERT ON public.viewings
  FOR EACH ROW EXECUTE FUNCTION public.handle_viewing_to_lead();

DROP TRIGGER IF EXISTS notify_viewing_change_trg ON public.viewings;
CREATE TRIGGER notify_viewing_change_trg
  AFTER INSERT OR UPDATE ON public.viewings
  FOR EACH ROW EXECUTE FUNCTION public.notify_viewing_change();

-- 6. Agent availability calendar
CREATE TABLE IF NOT EXISTS public.agent_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL UNIQUE,
  working_days integer[] NOT NULL DEFAULT '{1,2,3,4,5,6}',
  start_time time NOT NULL DEFAULT '09:00',
  end_time time NOT NULL DEFAULT '17:00',
  slot_minutes integer NOT NULL DEFAULT 30,
  buffer_minutes integer NOT NULL DEFAULT 15,
  max_per_day integer NOT NULL DEFAULT 8,
  lead_time_hours integer NOT NULL DEFAULT 12,
  horizon_days integer NOT NULL DEFAULT 30,
  blocked_dates date[] NOT NULL DEFAULT '{}',
  block_public_holidays boolean NOT NULL DEFAULT true,
  allow_virtual boolean NOT NULL DEFAULT true,
  allow_in_person boolean NOT NULL DEFAULT true,
  default_location text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.agent_availability TO authenticated;
GRANT SELECT ON public.agent_availability TO anon;
GRANT ALL ON public.agent_availability TO service_role;
ALTER TABLE public.agent_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Availability is publicly readable" ON public.agent_availability
FOR SELECT USING (true);
CREATE POLICY "Agents manage own availability" ON public.agent_availability
FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Agents update own availability" ON public.agent_availability
FOR UPDATE TO authenticated USING (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

DROP TRIGGER IF EXISTS agent_availability_updated_at ON public.agent_availability;
CREATE TRIGGER agent_availability_updated_at BEFORE UPDATE ON public.agent_availability
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 7. Post-viewing feedback
CREATE TABLE IF NOT EXISTS public.viewing_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  viewing_id uuid NOT NULL UNIQUE REFERENCES public.viewings(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comments text,
  as_described boolean,
  interested_in_offer boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.viewing_feedback TO authenticated;
GRANT ALL ON public.viewing_feedback TO service_role;
ALTER TABLE public.viewing_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyer submits own feedback" ON public.viewing_feedback
FOR INSERT TO authenticated WITH CHECK (
  buyer_id = auth.uid()
  AND EXISTS (SELECT 1 FROM public.viewings v WHERE v.id = viewing_id AND v.requester_id = auth.uid())
);
CREATE POLICY "Participants read feedback" ON public.viewing_feedback
FOR SELECT TO authenticated USING (
  buyer_id = auth.uid()
  OR public.has_role(auth.uid(),'admin')
  OR EXISTS (SELECT 1 FROM public.viewings v WHERE v.id = viewing_id
             AND (v.agent_id = auth.uid()
                  OR EXISTS (SELECT 1 FROM public.properties p WHERE p.id = v.property_id AND p.owner_id = auth.uid())))
);

-- 8. Backfill refs and agent ids on existing rows
UPDATE public.viewings v
   SET booking_ref = 'VW-' || to_char(v.created_at, 'YYMM') || '-' || upper(substr(replace(v.id::text,'-',''),1,6)),
       agent_id = COALESCE(v.agent_id, (SELECT p.owner_id FROM public.properties p WHERE p.id = v.property_id))
 WHERE v.booking_ref IS NULL;