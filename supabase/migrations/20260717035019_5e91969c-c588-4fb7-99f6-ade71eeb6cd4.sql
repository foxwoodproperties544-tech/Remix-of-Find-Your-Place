
DO $$ BEGIN CREATE TYPE public.lead_status AS ENUM ('new','contacted','qualified','viewing_scheduled','negotiation','won','lost'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.lead_source AS ENUM ('inquiry','viewing_request','whatsapp','phone','manual','other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.lead_activity_type AS ENUM ('note','call','whatsapp','email','status_change','assignment','viewing','follow_up','created'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.lead_priority AS ENUM ('low','medium','high'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  contact_name text NOT NULL,
  contact_email text,
  contact_phone text,
  contact_whatsapp text,
  source public.lead_source NOT NULL DEFAULT 'manual',
  status public.lead_status NOT NULL DEFAULT 'new',
  priority public.lead_priority NOT NULL DEFAULT 'medium',
  budget_min numeric,
  budget_max numeric,
  message text,
  inquiry_id uuid UNIQUE REFERENCES public.inquiries(id) ON DELETE SET NULL,
  viewing_id uuid UNIQUE REFERENCES public.viewings(id) ON DELETE SET NULL,
  deal_value numeric,
  won_at timestamptz,
  lost_reason text,
  last_contacted_at timestamptz,
  next_follow_up_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS leads_owner_idx ON public.leads(owner_id);
CREATE INDEX IF NOT EXISTS leads_assigned_idx ON public.leads(assigned_to);
CREATE INDEX IF NOT EXISTS leads_property_idx ON public.leads(property_id);
CREATE INDEX IF NOT EXISTS leads_status_idx ON public.leads(status);
CREATE INDEX IF NOT EXISTS leads_created_idx ON public.leads(created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leads_select_stakeholders" ON public.leads FOR SELECT TO authenticated
  USING (auth.uid() = owner_id OR auth.uid() = assigned_to OR auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "leads_insert_agents_admins" ON public.leads FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'agent') OR auth.uid() = owner_id);
CREATE POLICY "leads_update_stakeholders" ON public.leads FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id OR auth.uid() = assigned_to OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = owner_id OR auth.uid() = assigned_to OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "leads_delete_admin" ON public.leads FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER leads_set_updated_at BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.lead_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  type public.lead_activity_type NOT NULL,
  body text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lead_activities_lead_idx ON public.lead_activities(lead_id, created_at DESC);
GRANT SELECT, INSERT, DELETE ON public.lead_activities TO authenticated;
GRANT ALL ON public.lead_activities TO service_role;
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activities_select_via_lead" ON public.lead_activities FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id
    AND (l.owner_id = auth.uid() OR l.assigned_to = auth.uid() OR l.created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))));
CREATE POLICY "activities_insert_via_lead" ON public.lead_activities FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id
    AND (l.owner_id = auth.uid() OR l.assigned_to = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'agent'))));
CREATE POLICY "activities_delete_admin" ON public.lead_activities FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.lead_follow_ups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  due_at timestamptz NOT NULL,
  title text NOT NULL,
  notes text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS follow_ups_lead_idx ON public.lead_follow_ups(lead_id);
CREATE INDEX IF NOT EXISTS follow_ups_due_idx ON public.lead_follow_ups(due_at) WHERE completed_at IS NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_follow_ups TO authenticated;
GRANT ALL ON public.lead_follow_ups TO service_role;
ALTER TABLE public.lead_follow_ups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "followups_select_via_lead" ON public.lead_follow_ups FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id
    AND (l.owner_id = auth.uid() OR l.assigned_to = auth.uid() OR l.created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))));
CREATE POLICY "followups_insert_via_lead" ON public.lead_follow_ups FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id
    AND (l.owner_id = auth.uid() OR l.assigned_to = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'agent'))));
CREATE POLICY "followups_update_via_lead" ON public.lead_follow_ups FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id
    AND (l.owner_id = auth.uid() OR l.assigned_to = auth.uid() OR public.has_role(auth.uid(), 'admin'))));
CREATE POLICY "followups_delete_via_lead" ON public.lead_follow_ups FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id
    AND (l.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))));

-- INQUIRY → LEAD (inquiries.property_key is text uuid; owner_id already set on row)
CREATE OR REPLACE FUNCTION public.handle_inquiry_to_lead()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE v_prop uuid; v_lead uuid;
BEGIN
  BEGIN v_prop := NEW.property_key::uuid; EXCEPTION WHEN others THEN v_prop := NULL; END;
  INSERT INTO public.leads (property_id, owner_id, contact_name, contact_email, contact_phone,
    source, status, message, inquiry_id, created_by)
  VALUES (v_prop, NEW.owner_id, COALESCE(NEW.name,'Unknown'), NEW.email, NEW.phone,
    'inquiry','new', NEW.message, NEW.id, NEW.sender_user_id)
  RETURNING id INTO v_lead;
  INSERT INTO public.lead_activities (lead_id, actor_id, type, body, metadata)
  VALUES (v_lead, NEW.sender_user_id, 'created', 'Lead created from inquiry',
    jsonb_build_object('inquiry_id', NEW.id));
  RETURN NEW;
END; $fn$;
DROP TRIGGER IF EXISTS trg_inquiry_to_lead ON public.inquiries;
CREATE TRIGGER trg_inquiry_to_lead AFTER INSERT ON public.inquiries
  FOR EACH ROW EXECUTE FUNCTION public.handle_inquiry_to_lead();

-- VIEWING → LEAD
CREATE OR REPLACE FUNCTION public.handle_viewing_to_lead()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE v_owner uuid; v_lead uuid;
BEGIN
  SELECT owner_id INTO v_owner FROM public.properties WHERE id = NEW.property_id;
  INSERT INTO public.leads (property_id, owner_id, contact_name, contact_email, contact_phone,
    source, status, message, viewing_id, created_by, next_follow_up_at)
  VALUES (NEW.property_id, v_owner, COALESCE(NEW.requester_name,'Unknown'),
    NEW.requester_email, NEW.requester_phone,
    'viewing_request','viewing_scheduled', NEW.notes, NEW.id, NEW.requester_id, NEW.requested_at)
  RETURNING id INTO v_lead;
  INSERT INTO public.lead_activities (lead_id, actor_id, type, body, metadata)
  VALUES (v_lead, NEW.requester_id, 'viewing', 'Viewing requested',
    jsonb_build_object('viewing_id', NEW.id, 'requested_at', NEW.requested_at));
  RETURN NEW;
END; $fn$;
DROP TRIGGER IF EXISTS trg_viewing_to_lead ON public.viewings;
CREATE TRIGGER trg_viewing_to_lead AFTER INSERT ON public.viewings
  FOR EACH ROW EXECUTE FUNCTION public.handle_viewing_to_lead();

-- LEAD CHANGE LOGGING
CREATE OR REPLACE FUNCTION public.handle_lead_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.lead_activities (lead_id, actor_id, type, body, metadata)
    VALUES (NEW.id, auth.uid(), 'status_change',
      format('Status: %s → %s', OLD.status, NEW.status),
      jsonb_build_object('from', OLD.status, 'to', NEW.status));
    IF NEW.status = 'won' AND NEW.won_at IS NULL THEN NEW.won_at := now(); END IF;
  END IF;
  IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
    INSERT INTO public.lead_activities (lead_id, actor_id, type, body, metadata)
    VALUES (NEW.id, auth.uid(), 'assignment', 'Lead reassigned',
      jsonb_build_object('from', OLD.assigned_to, 'to', NEW.assigned_to));
  END IF;
  RETURN NEW;
END; $fn$;
DROP TRIGGER IF EXISTS trg_lead_change ON public.leads;
CREATE TRIGGER trg_lead_change BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.handle_lead_change();

-- BACKFILL
INSERT INTO public.leads (property_id, owner_id, contact_name, contact_email, contact_phone,
  source, status, message, inquiry_id, created_by, created_at)
SELECT
  CASE WHEN i.property_key ~ '^[0-9a-fA-F-]{36}$' THEN i.property_key::uuid ELSE NULL END,
  i.owner_id, COALESCE(i.name,'Unknown'), i.email, i.phone,
  'inquiry','new', i.message, i.id, i.sender_user_id, i.created_at
FROM public.inquiries i
WHERE NOT EXISTS (SELECT 1 FROM public.leads l WHERE l.inquiry_id = i.id)
ON CONFLICT (inquiry_id) DO NOTHING;

INSERT INTO public.leads (property_id, owner_id, contact_name, contact_email, contact_phone,
  source, status, message, viewing_id, created_by, next_follow_up_at, created_at)
SELECT v.property_id, p.owner_id, COALESCE(v.requester_name,'Unknown'),
  v.requester_email, v.requester_phone, 'viewing_request','viewing_scheduled',
  v.notes, v.id, v.requester_id, v.requested_at, v.created_at
FROM public.viewings v
LEFT JOIN public.properties p ON p.id = v.property_id
WHERE NOT EXISTS (SELECT 1 FROM public.leads l WHERE l.viewing_id = v.id)
ON CONFLICT (viewing_id) DO NOTHING;
