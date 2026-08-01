CREATE OR REPLACE FUNCTION public.archive_expired_listings()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  n integer := 0;
BEGIN
  WITH archived AS (
    UPDATE public.properties
       SET status = 'archived', updated_at = now()
     WHERE expires_at IS NOT NULL
       AND expires_at < now()
       AND status IN ('published', 'approved', 'active')
     RETURNING id, owner_id, title
  ), notified AS (
    INSERT INTO public.notifications (user_id, type, title, body, link)
    SELECT owner_id, 'listing_archived', 'Listing archived',
           'Your listing "' || title || '" expired and has been archived. Re-list it to make it visible again.',
           '/dashboard'
      FROM archived
     WHERE owner_id IS NOT NULL
    RETURNING 1
  )
  SELECT count(*) INTO n FROM archived;

  INSERT INTO public.notifications (user_id, type, title, body, link)
  SELECT p.owner_id, 'listing_expiring', 'Listing expiring soon',
         'Your listing "' || p.title || '" expires in less than 3 days. Renew or refresh it to stay visible.',
         '/dashboard'
    FROM public.properties p
   WHERE p.owner_id IS NOT NULL
     AND p.expires_at IS NOT NULL
     AND p.expires_at BETWEEN now() AND now() + interval '3 days'
     AND p.status IN ('published', 'approved', 'active')
     AND NOT EXISTS (
       SELECT 1 FROM public.notifications nx
        WHERE nx.user_id = p.owner_id
          AND nx.type = 'listing_expiring'
          AND nx.created_at > now() - interval '24 hours'
          AND nx.body LIKE '%' || p.title || '%'
     );

  RETURN n;
END;
$$;
REVOKE ALL ON FUNCTION public.archive_expired_listings() FROM PUBLIC, anon, authenticated;