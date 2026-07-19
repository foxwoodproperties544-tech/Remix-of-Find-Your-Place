
-- Comments
CREATE TABLE public.blog_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.blog_comments(id) ON DELETE CASCADE,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name text NOT NULL,
  author_email text,
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 4000),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  like_count int NOT NULL DEFAULT 0,
  report_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX blog_comments_post_idx ON public.blog_comments(post_id, status, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.blog_comments TO authenticated;
GRANT SELECT ON public.blog_comments TO anon;
GRANT ALL ON public.blog_comments TO service_role;

ALTER TABLE public.blog_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved comments readable by anyone"
ON public.blog_comments FOR SELECT
USING (status = 'approved' OR author_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Authenticated users can post comments"
ON public.blog_comments FOR INSERT TO authenticated
WITH CHECK (author_id = auth.uid() AND status = 'pending');

CREATE POLICY "Admins moderate comments"
ON public.blog_comments FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(),'admin'))
WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Admins delete comments"
ON public.blog_comments FOR DELETE TO authenticated
USING (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER blog_comments_updated_at BEFORE UPDATE ON public.blog_comments
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Likes
CREATE TABLE public.blog_comment_likes (
  comment_id uuid NOT NULL REFERENCES public.blog_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (comment_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.blog_comment_likes TO authenticated;
GRANT ALL ON public.blog_comment_likes TO service_role;
ALTER TABLE public.blog_comment_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own likes" ON public.blog_comment_likes
FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.bump_comment_like() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.blog_comments SET like_count = like_count + 1 WHERE id = NEW.comment_id;
    RETURN NEW;
  ELSE
    UPDATE public.blog_comments SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.comment_id;
    RETURN OLD;
  END IF;
END; $$;
CREATE TRIGGER blog_comment_likes_ai AFTER INSERT ON public.blog_comment_likes
FOR EACH ROW EXECUTE FUNCTION public.bump_comment_like();
CREATE TRIGGER blog_comment_likes_ad AFTER DELETE ON public.blog_comment_likes
FOR EACH ROW EXECUTE FUNCTION public.bump_comment_like();

-- Reports
CREATE TABLE public.blog_comment_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.blog_comments(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (comment_id, reporter_id)
);
GRANT SELECT, INSERT ON public.blog_comment_reports TO authenticated;
GRANT ALL ON public.blog_comment_reports TO service_role;
ALTER TABLE public.blog_comment_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users create own reports" ON public.blog_comment_reports
FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid());
CREATE POLICY "Admins read reports" ON public.blog_comment_reports
FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR reporter_id = auth.uid());

CREATE OR REPLACE FUNCTION public.bump_comment_report() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  UPDATE public.blog_comments SET report_count = report_count + 1 WHERE id = NEW.comment_id;
  RETURN NEW;
END; $$;
CREATE TRIGGER blog_comment_reports_ai AFTER INSERT ON public.blog_comment_reports
FOR EACH ROW EXECUTE FUNCTION public.bump_comment_report();

-- Newsletter
CREATE TABLE public.blog_newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  subscribed_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.blog_newsletter_subscribers TO anon, authenticated;
GRANT SELECT, DELETE ON public.blog_newsletter_subscribers TO authenticated;
GRANT ALL ON public.blog_newsletter_subscribers TO service_role;
ALTER TABLE public.blog_newsletter_subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can subscribe" ON public.blog_newsletter_subscribers
FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins read subscribers" ON public.blog_newsletter_subscribers
FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete subscribers" ON public.blog_newsletter_subscribers
FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
