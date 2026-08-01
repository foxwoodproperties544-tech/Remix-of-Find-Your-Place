-- 1. SECURITY: viewings no longer readable by anonymous callers
REVOKE SELECT ON public.viewings FROM anon;

-- 2. SECURITY: hide internal actor ids on public price history
REVOKE SELECT (changed_by, reverted_by) ON public.property_price_history FROM anon;

-- 3. FRAUD WORKFLOW: escalation on reports
ALTER TABLE public.property_reports
  ADD COLUMN IF NOT EXISTS severity text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS escalated_at timestamptz,
  ADD COLUMN IF NOT EXISTS escalated_by uuid,
  ADD COLUMN IF NOT EXISTS internal_notes text;

-- 4. AGENT SUSPENSION
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS suspended boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
  ADD COLUMN IF NOT EXISTS suspended_by uuid,
  ADD COLUMN IF NOT EXISTS suspension_reason text;

-- suspension flags are admin-only: never accepted from the client
CREATE OR REPLACE FUNCTION public.guard_profile_suspension()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.suspended := false;
    NEW.suspended_at := NULL;
    NEW.suspended_by := NULL;
    NEW.suspension_reason := NULL;
  ELSIF NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.suspended := OLD.suspended;
    NEW.suspended_at := OLD.suspended_at;
    NEW.suspended_by := OLD.suspended_by;
    NEW.suspension_reason := OLD.suspension_reason;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_profile_suspension() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_profiles_guard_suspension ON public.profiles;
CREATE TRIGGER trg_profiles_guard_suspension
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_suspension();

-- 5. APPEALS
CREATE TABLE IF NOT EXISTS public.agent_appeals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  decision_note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.agent_appeals TO authenticated;
GRANT ALL ON public.agent_appeals TO service_role;
ALTER TABLE public.agent_appeals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own appeals" ON public.agent_appeals;
CREATE POLICY "Users read own appeals" ON public.agent_appeals
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users create own appeals" ON public.agent_appeals;
CREATE POLICY "Users create own appeals" ON public.agent_appeals
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'pending');

DROP POLICY IF EXISTS "Admins manage appeals" ON public.agent_appeals;
CREATE POLICY "Admins manage appeals" ON public.agent_appeals
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS trg_agent_appeals_updated ON public.agent_appeals;
CREATE TRIGGER trg_agent_appeals_updated BEFORE UPDATE ON public.agent_appeals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6. SUPPORT SESSIONS (read-only impersonation audit)
CREATE TABLE IF NOT EXISTS public.support_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  target_user_id uuid NOT NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.support_sessions TO authenticated;
GRANT ALL ON public.support_sessions TO service_role;
ALTER TABLE public.support_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read support sessions" ON public.support_sessions;
CREATE POLICY "Admins read support sessions" ON public.support_sessions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 7. LISTING LIFECYCLE: archive expired listings + re-list nudges
CREATE OR REPLACE FUNCTION public.archive_expired_listings()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  n integer := 0;
BEGIN
  WITH archived AS (
    UPDATE public.properties
       SET status = 'archived', updated_at = now()
     WHERE expires_at IS NOT NULL
       AND expires_at < now()
       AND status IN ('published', 'approved', 'active')
     RETURNING id, user_id, title
  ), notified AS (
    INSERT INTO public.notifications (user_id, type, title, body, link)
    SELECT user_id, 'listing_archived', 'Listing archived',
           'Your listing "' || title || '" expired and has been archived. Re-list it to make it visible again.',
           '/dashboard/listings'
      FROM archived
     WHERE user_id IS NOT NULL
    RETURNING 1
  )
  SELECT count(*) INTO n FROM archived;

  -- nudge owners 3 days before expiry (once per day window)
  INSERT INTO public.notifications (user_id, type, title, body, link)
  SELECT p.user_id, 'listing_expiring', 'Listing expiring soon',
         'Your listing "' || p.title || '" expires in less than 3 days. Renew or refresh it to stay visible.',
         '/dashboard/listings'
    FROM public.properties p
   WHERE p.user_id IS NOT NULL
     AND p.expires_at IS NOT NULL
     AND p.expires_at BETWEEN now() AND now() + interval '3 days'
     AND p.status IN ('published', 'approved', 'active')
     AND NOT EXISTS (
       SELECT 1 FROM public.notifications nx
        WHERE nx.user_id = p.user_id
          AND nx.type = 'listing_expiring'
          AND nx.created_at > now() - interval '24 hours'
          AND nx.body LIKE '%' || p.title || '%'
     );

  RETURN n;
END;
$$;
REVOKE ALL ON FUNCTION public.archive_expired_listings() FROM PUBLIC, anon, authenticated;