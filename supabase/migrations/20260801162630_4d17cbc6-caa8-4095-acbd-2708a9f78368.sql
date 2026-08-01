alter view public.property_requests_public set (security_invoker = true, security_barrier = true);

create policy "Guests read active requests"
on public.property_requests for select to anon
using (status = any (array['active'::request_status, 'fulfilled'::request_status]));

-- Column-level grant: anon can never read contact_email / contact_phone.
revoke select on public.property_requests from anon;
grant select (
  id, user_id, slug, title, kind, property_type, county, town, estate,
  preferred_location, budget_min, budget_max, currency, bedrooms, bathrooms,
  parking, land_size, building_size, furnished, amenities, description,
  move_date, viewing_times, images, hide_phone, hide_email, allow_whatsapp,
  allow_messages, status, is_featured, is_urgent, package_slug, published_at,
  expires_at, closed_at, fulfilled_property_id, view_count, response_count,
  created_at, updated_at
) on public.property_requests to anon;