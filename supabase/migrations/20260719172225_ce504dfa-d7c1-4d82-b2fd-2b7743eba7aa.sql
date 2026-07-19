
DROP POLICY IF EXISTS "Anyone can subscribe" ON public.blog_newsletter_subscribers;
CREATE POLICY "Anyone can subscribe with a valid email"
ON public.blog_newsletter_subscribers
FOR INSERT TO anon, authenticated
WITH CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' AND length(email) <= 320);
