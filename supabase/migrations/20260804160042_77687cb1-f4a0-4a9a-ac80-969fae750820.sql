-- Create system_logs for monitoring
CREATE TABLE public.system_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    level text NOT NULL, -- info, warn, error, critical
    source text NOT NULL, -- function name or component
    message text NOT NULL,
    metadata jsonb DEFAULT '{}',
    user_id uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT ON public.system_logs TO authenticated;
GRANT ALL ON public.system_logs TO service_role;

ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can see all logs" ON public.system_logs
    FOR SELECT TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can insert logs" ON public.system_logs
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Add a health_checks table for heartbeat tracking
CREATE TABLE public.health_checks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    service text NOT NULL UNIQUE,
    status text NOT NULL, -- up, degraded, down
    last_check timestamptz DEFAULT now(),
    metrics jsonb DEFAULT '{}'
);

GRANT SELECT ON public.health_checks TO authenticated;
GRANT SELECT ON public.health_checks TO anon;
GRANT ALL ON public.health_checks TO service_role;

ALTER TABLE public.health_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read health status" ON public.health_checks
    FOR SELECT TO anon, authenticated
    USING (true);

INSERT INTO public.health_checks (service, status)
VALUES 
    ('database', 'up'),
    ('storage', 'up'),
    ('api', 'up')
ON CONFLICT (service) DO NOTHING;
