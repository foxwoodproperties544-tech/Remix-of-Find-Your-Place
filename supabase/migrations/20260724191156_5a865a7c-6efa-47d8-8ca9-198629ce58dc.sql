
DROP POLICY "Anyone can record support click" ON public.support_click_events;
CREATE POLICY "Anyone can record support click"
  ON public.support_click_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    action IN ('call','whatsapp')
    AND coalesce(length(context), 0) BETWEEN 1 AND 60
    AND coalesce(length(page_path), 0) <= 512
  );
