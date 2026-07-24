
REVOKE EXECUTE ON FUNCTION public.expire_listing_packages() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.send_subscription_reminders() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_listing_packages() TO service_role;
GRANT EXECUTE ON FUNCTION public.send_subscription_reminders() TO service_role;
