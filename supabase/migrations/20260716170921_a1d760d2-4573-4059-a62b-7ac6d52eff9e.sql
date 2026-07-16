
-- Extend role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'agent';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'owner';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'buyer';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'tenant';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'developer';
