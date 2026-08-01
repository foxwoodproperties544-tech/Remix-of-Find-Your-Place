drop policy if exists "Guests read active requests" on public.property_requests;
revoke select on public.property_requests from anon;

alter view public.property_requests_public set (security_invoker = false, security_barrier = true);
grant select on public.property_requests_public to anon, authenticated;

drop policy if exists "Availability is publicly readable" on public.agent_availability;
revoke select on public.agent_availability from anon;