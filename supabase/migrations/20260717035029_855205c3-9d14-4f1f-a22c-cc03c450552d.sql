
REVOKE EXECUTE ON FUNCTION public.handle_inquiry_to_lead() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_viewing_to_lead() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_lead_change() FROM PUBLIC, anon, authenticated;
