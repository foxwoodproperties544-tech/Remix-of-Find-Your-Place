REVOKE EXECUTE ON FUNCTION public.send_verification_sub_reminders() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.expire_verification_subscriptions() FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.send_verification_sub_reminders() TO service_role;
GRANT EXECUTE ON FUNCTION public.expire_verification_subscriptions() TO service_role;