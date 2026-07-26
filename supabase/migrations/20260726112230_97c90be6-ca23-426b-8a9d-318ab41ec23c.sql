REVOKE SELECT ON public.blog_comments FROM anon, authenticated;

GRANT SELECT (id, post_id, parent_id, author_id, author_name, body, status, like_count, report_count, created_at, updated_at)
  ON public.blog_comments TO anon, authenticated;

GRANT ALL ON public.blog_comments TO service_role;