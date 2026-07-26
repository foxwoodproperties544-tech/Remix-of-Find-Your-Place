-- 1) blog_comments: hide author_email from public readers via column-level grants
REVOKE SELECT ON public.blog_comments FROM anon, authenticated;
GRANT SELECT (id, post_id, parent_id, author_id, author_name, body, status, like_count, report_count, created_at, updated_at)
  ON public.blog_comments TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.blog_comments TO authenticated;
GRANT ALL ON public.blog_comments TO service_role;

-- 2) property_image_hashes: remove blanket authenticated read
DROP POLICY IF EXISTS "Authenticated can read hashes for duplicate checks" ON public.property_image_hashes;

CREATE POLICY "Owners can read their own image hashes"
  ON public.property_image_hashes FOR SELECT TO authenticated
  USING (owner_id = auth.uid());

CREATE OR REPLACE FUNCTION public.image_hash_used_elsewhere(_hash text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.property_image_hashes
     WHERE image_hash = _hash
       AND owner_id IS DISTINCT FROM auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.image_hash_used_elsewhere(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.image_hash_used_elsewhere(text) TO authenticated;