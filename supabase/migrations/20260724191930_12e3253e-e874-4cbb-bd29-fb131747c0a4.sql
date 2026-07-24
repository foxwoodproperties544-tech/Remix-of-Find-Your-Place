
-- ============ SUPPORT TICKETS ============
CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'general',
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  subject text NOT NULL,
  body text NOT NULL,
  screenshot_path text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','waiting_user','resolved','closed')),
  admin_response text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tickets read" ON public.support_tickets FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "own tickets insert" ON public.support_tickets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own tickets update" ON public.support_tickets FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin')) WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin tickets delete" ON public.support_tickets FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_support_tickets_updated BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ LIVE CHAT ============
CREATE TABLE public.chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  assigned_admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_sessions TO authenticated;
GRANT ALL ON public.chat_sessions TO service_role;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chat sessions read" ON public.chat_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "chat sessions insert" ON public.chat_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "chat sessions update" ON public.chat_sessions FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin')) WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_chat_sessions_updated BEFORE UPDATE ON public.chat_sessions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_role text NOT NULL DEFAULT 'user' CHECK (sender_role IN ('user','admin','system')),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_chat_messages_session ON public.chat_messages(session_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chat msgs read" ON public.chat_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.chat_sessions s WHERE s.id = session_id AND (s.user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));
CREATE POLICY "chat msgs insert" ON public.chat_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (SELECT 1 FROM public.chat_sessions s WHERE s.id = session_id AND (s.user_id = auth.uid() OR public.has_role(auth.uid(),'admin')))
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_sessions;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.chat_sessions REPLICA IDENTITY FULL;

-- Bump session on new message
CREATE OR REPLACE FUNCTION public.bump_chat_session()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.chat_sessions SET last_message_at = now(), updated_at = now() WHERE id = NEW.session_id;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_chat_msg_bump AFTER INSERT ON public.chat_messages FOR EACH ROW EXECUTE FUNCTION public.bump_chat_session();

-- ============ FAQ ANALYTICS ============
CREATE TABLE public.faq_analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL CHECK (event_type IN ('chip_select','answer_link_click','search')),
  category text,
  question_id text,
  link_href text,
  search_term text,
  path text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.faq_analytics_events TO anon, authenticated;
GRANT SELECT ON public.faq_analytics_events TO authenticated;
GRANT ALL ON public.faq_analytics_events TO service_role;
ALTER TABLE public.faq_analytics_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "faq analytics insert anon" ON public.faq_analytics_events FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "faq analytics insert auth" ON public.faq_analytics_events FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "faq analytics admin read" ON public.faq_analytics_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- ============ SUPPORT HOURS SETTINGS ============
INSERT INTO public.platform_settings (key, value)
VALUES
  ('support_hours', '{"timezone":"Africa/Nairobi","days":[1,2,3,4,5,6],"start":"08:00","end":"18:00"}'::jsonb),
  ('support_online_override', '{"mode":"auto"}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ============ STORAGE POLICIES for support-uploads ============
CREATE POLICY "support uploads own read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'support-uploads' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(),'admin')));
CREATE POLICY "support uploads own write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'support-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "support uploads own update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'support-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "support uploads own delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'support-uploads' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(),'admin')));
