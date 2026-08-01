CREATE OR REPLACE FUNCTION public.guard_request_privileged_columns()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(),'admin') THEN RETURN NEW; END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.is_featured := false;
    NEW.is_urgent := false;
    NEW.view_count := 0;
    NEW.response_count := 0;
    RETURN NEW;
  END IF;

  NEW.is_featured := OLD.is_featured;
  NEW.is_urgent := OLD.is_urgent;
  NEW.view_count := OLD.view_count;
  NEW.response_count := OLD.response_count;
  RETURN NEW;
END; $fn$;

REVOKE ALL ON FUNCTION public.guard_request_privileged_columns() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_prq_guard ON public.property_requests;
CREATE TRIGGER trg_prq_guard BEFORE INSERT OR UPDATE ON public.property_requests
  FOR EACH ROW EXECUTE FUNCTION public.guard_request_privileged_columns();