
-- ============ Phase 3: in-app messaging ============
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL,
  agent_id uuid NOT NULL,
  subject text,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (property_id, buyer_id, agent_id)
);
GRANT SELECT, INSERT, UPDATE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants read conversations" ON public.conversations
  FOR SELECT TO authenticated
  USING (buyer_id = auth.uid() OR agent_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Buyer starts conversation" ON public.conversations
  FOR INSERT TO authenticated
  WITH CHECK (buyer_id = auth.uid() AND agent_id <> auth.uid());
CREATE POLICY "Participants update conversation" ON public.conversations
  FOR UPDATE TO authenticated
  USING (buyer_id = auth.uid() OR agent_id = auth.uid())
  WITH CHECK (buyer_id = auth.uid() OR agent_id = auth.uid());

CREATE TABLE public.conversation_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  body text,
  attachments text[] NOT NULL DEFAULT '{}',
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX conversation_messages_conv_idx ON public.conversation_messages(conversation_id, created_at);
GRANT SELECT, INSERT, UPDATE ON public.conversation_messages TO authenticated;
GRANT ALL ON public.conversation_messages TO service_role;
ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants read messages" ON public.conversation_messages
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id
    AND (c.buyer_id = auth.uid() OR c.agent_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));
CREATE POLICY "Participants send messages" ON public.conversation_messages
  FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND EXISTS (SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_id AND (c.buyer_id = auth.uid() OR c.agent_id = auth.uid())));
CREATE POLICY "Recipient marks read" ON public.conversation_messages
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id
    AND (c.buyer_id = auth.uid() OR c.agent_id = auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id
    AND (c.buyer_id = auth.uid() OR c.agent_id = auth.uid())));

CREATE OR REPLACE FUNCTION public.bump_conversation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_buyer uuid; v_agent uuid; v_recipient uuid; v_prop uuid;
BEGIN
  SELECT buyer_id, agent_id, property_id INTO v_buyer, v_agent, v_prop
    FROM public.conversations WHERE id = NEW.conversation_id;
  UPDATE public.conversations
     SET last_message_at = now(), updated_at = now()
   WHERE id = NEW.conversation_id;
  v_recipient := CASE WHEN NEW.sender_id = v_buyer THEN v_agent ELSE v_buyer END;
  IF v_recipient IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (v_recipient, 'message_new', 'New message',
            COALESCE(left(NEW.body, 120), 'You received an attachment'),
            '/dashboard/messages/' || NEW.conversation_id::text);
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER conversation_messages_bump
AFTER INSERT ON public.conversation_messages
FOR EACH ROW EXECUTE FUNCTION public.bump_conversation();

CREATE TRIGGER conversations_updated_at
BEFORE UPDATE ON public.conversations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ Phase 3: rental applications ============
CREATE TABLE public.rental_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  applicant_id uuid NOT NULL,
  agent_id uuid,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  occupation text,
  employer text,
  monthly_income numeric,
  move_in_date date,
  occupants int NOT NULL DEFAULT 1,
  pets boolean NOT NULL DEFAULT false,
  notes text,
  documents jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'submitted',
  reviewer_notes text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rental_applications_status_chk CHECK (status IN
    ('submitted','under_review','shortlisted','approved','rejected','withdrawn'))
);
CREATE INDEX rental_applications_agent_idx ON public.rental_applications(agent_id, created_at DESC);
CREATE INDEX rental_applications_applicant_idx ON public.rental_applications(applicant_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE ON public.rental_applications TO authenticated;
GRANT ALL ON public.rental_applications TO service_role;
ALTER TABLE public.rental_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Applicant and agent read applications" ON public.rental_applications
  FOR SELECT TO authenticated
  USING (applicant_id = auth.uid() OR agent_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Applicant submits application" ON public.rental_applications
  FOR INSERT TO authenticated
  WITH CHECK (applicant_id = auth.uid());
CREATE POLICY "Applicant or agent updates application" ON public.rental_applications
  FOR UPDATE TO authenticated
  USING (applicant_id = auth.uid() OR agent_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (applicant_id = auth.uid() OR agent_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.rental_applications_before_write()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_owner uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT owner_id INTO v_owner FROM public.properties WHERE id = NEW.property_id;
    NEW.agent_id := v_owner;
    NEW.status := 'submitted';
    NEW.reviewed_at := NULL;
  ELSE
    NEW.agent_id := OLD.agent_id;
    NEW.applicant_id := OLD.applicant_id;
    NEW.property_id := OLD.property_id;
    -- applicants may only withdraw; agents/admins drive the review states
    IF auth.uid() = OLD.applicant_id AND NOT public.has_role(auth.uid(),'admin')
       AND auth.uid() IS DISTINCT FROM OLD.agent_id THEN
      IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'withdrawn' THEN
        NEW.status := OLD.status;
      END IF;
      NEW.reviewer_notes := OLD.reviewer_notes;
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      NEW.reviewed_at := now();
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END; $$;

CREATE TRIGGER rental_applications_before_write
BEFORE INSERT OR UPDATE ON public.rental_applications
FOR EACH ROW EXECUTE FUNCTION public.rental_applications_before_write();

CREATE OR REPLACE FUNCTION public.notify_rental_application()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_title text;
BEGIN
  SELECT title INTO v_title FROM public.properties WHERE id = NEW.property_id;
  IF TG_OP = 'INSERT' THEN
    IF NEW.agent_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, body, link)
      VALUES (NEW.agent_id, 'rental_application_new', 'New rental application',
              NEW.full_name || ' applied for ' || COALESCE(v_title,'your listing'),
              '/dashboard/applications');
    END IF;
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (NEW.applicant_id, 'rental_application_' || NEW.status,
            'Application ' || replace(NEW.status,'_',' '),
            'Your application for ' || COALESCE(v_title,'a rental') || ' is now ' || replace(NEW.status,'_',' ') || '.',
            '/dashboard/my-applications');
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER rental_applications_notify
AFTER INSERT OR UPDATE ON public.rental_applications
FOR EACH ROW EXECUTE FUNCTION public.notify_rental_application();

-- ============ Security fix: property-docs ownership ============
DROP POLICY IF EXISTS docs_owner_read ON storage.objects;
DROP POLICY IF EXISTS docs_owner_insert ON storage.objects;
DROP POLICY IF EXISTS docs_owner_update ON storage.objects;
DROP POLICY IF EXISTS docs_owner_delete ON storage.objects;

CREATE OR REPLACE FUNCTION public.can_access_property_doc(_name text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE parts text[]; v_prop uuid;
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  IF public.has_role(auth.uid(),'admin') THEN RETURN true; END IF;
  parts := storage.foldername(_name);
  IF COALESCE(parts[1],'') <> auth.uid()::text THEN RETURN false; END IF;
  BEGIN
    v_prop := parts[2]::uuid;
  EXCEPTION WHEN others THEN
    v_prop := NULL;
  END;
  IF v_prop IS NULL THEN
    RETURN true; -- listing drafts filed directly under the user's own folder
  END IF;
  RETURN EXISTS (SELECT 1 FROM public.properties p WHERE p.id = v_prop AND p.owner_id = auth.uid());
END; $$;

REVOKE EXECUTE ON FUNCTION public.can_access_property_doc(text) FROM anon;

CREATE POLICY docs_owner_read ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'property-docs' AND public.can_access_property_doc(name));
CREATE POLICY docs_owner_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'property-docs' AND public.can_access_property_doc(name));
CREATE POLICY docs_owner_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'property-docs' AND public.can_access_property_doc(name))
  WITH CHECK (bucket_id = 'property-docs' AND public.can_access_property_doc(name));
CREATE POLICY docs_owner_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'property-docs' AND public.can_access_property_doc(name));
