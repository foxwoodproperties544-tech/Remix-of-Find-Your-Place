CREATE TABLE public.crm_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  channel text NOT NULL DEFAULT 'whatsapp',
  subject text,
  body text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_templates TO authenticated;
GRANT ALL ON public.crm_templates TO service_role;
ALTER TABLE public.crm_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their templates" ON public.crm_templates
  FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Admins read all templates" ON public.crm_templates
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER crm_templates_set_updated_at BEFORE UPDATE ON public.crm_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.lead_routing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  match_county text,
  match_town text,
  match_category text,
  match_source lead_source,
  min_budget numeric,
  assign_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  priority int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_routing_rules TO authenticated;
GRANT ALL ON public.lead_routing_rules TO service_role;
ALTER TABLE public.lead_routing_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their routing rules" ON public.lead_routing_rules
  FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Admins read all routing rules" ON public.lead_routing_rules
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER lead_routing_rules_set_updated_at BEFORE UPDATE ON public.lead_routing_rules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_lead_routing_rules_owner ON public.lead_routing_rules(owner_id, active, priority DESC);
CREATE INDEX idx_crm_templates_owner ON public.crm_templates(owner_id, sort_order);

CREATE OR REPLACE FUNCTION public.apply_lead_routing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_county text;
  v_town text;
  v_category text;
BEGIN
  IF NEW.assigned_to IS NOT NULL OR NEW.owner_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.property_id IS NOT NULL THEN
    SELECT county, town, category INTO v_county, v_town, v_category
      FROM public.properties WHERE id = NEW.property_id;
  END IF;

  SELECT * INTO r FROM public.lead_routing_rules
   WHERE owner_id = NEW.owner_id
     AND active
     AND assign_to IS NOT NULL
     AND (match_county IS NULL OR lower(match_county) = lower(coalesce(v_county,'')))
     AND (match_town IS NULL OR lower(match_town) = lower(coalesce(v_town,'')))
     AND (match_category IS NULL OR lower(match_category) = lower(coalesce(v_category,'')))
     AND (match_source IS NULL OR match_source = NEW.source)
     AND (min_budget IS NULL OR coalesce(NEW.budget_max, 0) >= min_budget)
   ORDER BY priority DESC, created_at ASC
   LIMIT 1;

  IF r.id IS NOT NULL THEN
    NEW.assigned_to := r.assign_to;
    INSERT INTO public.lead_activities (lead_id, actor_id, type, body, metadata)
    VALUES (NEW.id, NULL, 'assignment', 'Auto-assigned by rule: ' || r.name,
            jsonb_build_object('rule_id', r.id, 'assigned_to', r.assign_to));
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.apply_lead_routing() FROM anon, authenticated;

CREATE TRIGGER leads_apply_routing BEFORE INSERT ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.apply_lead_routing();