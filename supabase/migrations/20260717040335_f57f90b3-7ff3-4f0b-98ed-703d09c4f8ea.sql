
-- Appointment booking enhancements to viewings table
ALTER TABLE public.viewings
  ADD COLUMN IF NOT EXISTS proposed_at timestamptz,
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS agent_notes text,
  ADD COLUMN IF NOT EXISTS cancel_reason text,
  ADD COLUMN IF NOT EXISTS rescheduled_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Allow requester (creator) to update their own viewing (to accept reschedule / cancel)
DROP POLICY IF EXISTS "Viewings requester update" ON public.viewings;
CREATE POLICY "Viewings requester update" ON public.viewings
  FOR UPDATE TO authenticated
  USING (requester_id IS NOT NULL AND requester_id = auth.uid())
  WITH CHECK (requester_id IS NOT NULL AND requester_id = auth.uid());

-- Requester can read their own viewings
DROP POLICY IF EXISTS "Viewings requester read" ON public.viewings;
CREATE POLICY "Viewings requester read" ON public.viewings
  FOR SELECT TO authenticated
  USING (requester_id IS NOT NULL AND requester_id = auth.uid());

-- Notification trigger on viewing status/create
CREATE OR REPLACE FUNCTION public.notify_viewing_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
  v_title text;
  v_prop_id uuid;
BEGIN
  SELECT owner_id, title, id INTO v_owner, v_title, v_prop_id FROM public.properties WHERE id = NEW.property_id;

  IF TG_OP = 'INSERT' THEN
    -- notify owner/agent
    IF v_owner IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, body, link)
      VALUES (v_owner, 'appointment_new',
              'New viewing request',
              COALESCE(NEW.requester_name,'Someone') || ' requested a viewing for ' || COALESCE(v_title,'your listing'),
              '/dashboard/appointments');
    END IF;
    -- notify requester
    IF NEW.requester_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, body, link)
      VALUES (NEW.requester_id, 'appointment_submitted',
              'Viewing request submitted',
              'We sent your request to the agent. You will be notified when they respond.',
              '/dashboard/my-appointments');
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.requester_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, body, link)
      VALUES (NEW.requester_id, 'appointment_' || NEW.status,
              'Viewing ' || NEW.status,
              'Your viewing for ' || COALESCE(v_title,'a listing') || ' is now ' || NEW.status ||
              CASE WHEN NEW.status = 'rescheduled' AND NEW.proposed_at IS NOT NULL
                   THEN '. Proposed time: ' || to_char(NEW.proposed_at,'DD Mon YYYY HH24:MI') ELSE '' END,
              '/dashboard/my-appointments');
    END IF;
    IF v_owner IS NOT NULL AND NEW.status IN ('confirmed','cancelled') THEN
      INSERT INTO public.notifications (user_id, type, title, body, link)
      VALUES (v_owner, 'appointment_' || NEW.status,
              'Viewing ' || NEW.status,
              COALESCE(NEW.requester_name,'Requester') || ' ' ||
                CASE WHEN NEW.status='confirmed' THEN 'confirmed the new time' ELSE 'cancelled the viewing' END ||
                ' for ' || COALESCE(v_title,'your listing'),
              '/dashboard/appointments');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_viewing_notify ON public.viewings;
CREATE TRIGGER trg_viewing_notify
AFTER INSERT OR UPDATE ON public.viewings
FOR EACH ROW EXECUTE FUNCTION public.notify_viewing_change();

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_viewings_updated_at ON public.viewings;
CREATE TRIGGER trg_viewings_updated_at
BEFORE UPDATE ON public.viewings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
