
ALTER TABLE public.mpesa_transactions
  ADD COLUMN IF NOT EXISTS package_id UUID REFERENCES public.listing_packages(id) ON DELETE SET NULL;

ALTER TYPE public.mpesa_purpose ADD VALUE IF NOT EXISTS 'listing_package';
ALTER TYPE public.mpesa_purpose ADD VALUE IF NOT EXISTS 'advertisement';
