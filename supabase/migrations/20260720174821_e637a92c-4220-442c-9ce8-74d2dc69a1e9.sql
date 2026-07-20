
REVOKE ALL ON FUNCTION public.expire_listing_packages() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_listing_packages() TO service_role, postgres;
