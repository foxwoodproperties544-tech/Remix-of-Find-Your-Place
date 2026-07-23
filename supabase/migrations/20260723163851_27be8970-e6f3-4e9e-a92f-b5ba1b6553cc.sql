
ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS plagiarism_score integer,
  ADD COLUMN IF NOT EXISTS plagiarism_report jsonb,
  ADD COLUMN IF NOT EXISTS plagiarism_checked_at timestamptz;

CREATE OR REPLACE FUNCTION public.notify_blog_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title text;
  v_body text;
  v_type text;
BEGIN
  IF TG_OP <> 'UPDATE' OR NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;
  IF NEW.author_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_type := 'blog_' || NEW.status;
  CASE NEW.status
    WHEN 'pending_payment' THEN
      v_title := 'Payment required for your blog post';
      v_body := 'Complete payment to submit "' || NEW.title || '" for review.';
    WHEN 'paid' THEN
      v_title := 'Payment received';
      v_body := 'We received your payment for "' || NEW.title || '".';
    WHEN 'pending_review' THEN
      v_title := 'Your blog post is under review';
      v_body := '"' || NEW.title || '" has been submitted to our editors.';
    WHEN 'changes_requested' THEN
      v_title := 'Revisions requested';
      v_body := 'Please review editor notes on "' || NEW.title || '".';
    WHEN 'approved' THEN
      v_title := 'Your blog post was approved';
      v_body := '"' || NEW.title || '" was approved and will publish shortly.';
    WHEN 'published' THEN
      v_title := 'Your blog post is live';
      v_body := '"' || NEW.title || '" is now published on Foxwood.';
    WHEN 'rejected' THEN
      v_title := 'Your blog post was rejected';
      v_body := '"' || NEW.title || '" was not approved. See editor notes.';
    WHEN 'expired' THEN
      v_title := 'Your blog package expired';
      v_body := '"' || NEW.title || '" is no longer live. Renew to publish again.';
    ELSE
      RETURN NEW;
  END CASE;

  INSERT INTO public.notifications (user_id, type, title, body, link)
  VALUES (NEW.author_id, v_type, v_title, v_body, '/dashboard/blog');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_blog_status_notify ON public.blog_posts;
CREATE TRIGGER trg_blog_status_notify
AFTER UPDATE ON public.blog_posts
FOR EACH ROW EXECUTE FUNCTION public.notify_blog_status_change();
