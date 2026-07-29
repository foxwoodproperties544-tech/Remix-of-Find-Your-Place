ALTER VIEW public.property_requests_public SET (security_invoker = true);

DROP POLICY IF EXISTS "Recipients mark messages read" ON public.property_request_messages;
CREATE POLICY "Recipients mark messages read"
ON public.property_request_messages
FOR UPDATE
TO authenticated
USING (
  sender_id <> auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.property_request_responses resp
    JOIN public.property_requests r ON r.id = resp.request_id
    WHERE resp.id = property_request_messages.response_id
      AND (resp.responder_id = auth.uid() OR r.user_id = auth.uid())
  )
)
WITH CHECK (
  sender_id <> auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.property_request_responses resp
    JOIN public.property_requests r ON r.id = resp.request_id
    WHERE resp.id = property_request_messages.response_id
      AND (resp.responder_id = auth.uid() OR r.user_id = auth.uid())
  )
);