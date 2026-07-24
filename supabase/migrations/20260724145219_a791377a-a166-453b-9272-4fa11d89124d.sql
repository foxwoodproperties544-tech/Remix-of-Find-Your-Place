
REVOKE EXECUTE ON FUNCTION public.run_saved_search_alerts() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.run_saved_search_alerts() TO service_role, postgres;
