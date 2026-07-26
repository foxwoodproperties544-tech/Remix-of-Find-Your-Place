ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_verif_reminder_days integer;

-- Idempotency guard: an M-Pesa receipt may only ever be recorded once.
CREATE UNIQUE INDEX IF NOT EXISTS mpesa_transactions_receipt_uniq
  ON public.mpesa_transactions (mpesa_receipt)
  WHERE mpesa_receipt IS NOT NULL;

CREATE OR REPLACE FUNCTION public.send_verification_sub_reminders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  r RECORD;
  d int;
  bucket int;
  sent int := 0;
BEGIN
  FOR r IN
    SELECT p.id, p.verification_sub_expires_at, p.last_verif_reminder_days
      FROM public.profiles p
     WHERE p.verification_sub_expires_at IS NOT NULL
       AND p.verification_sub_expires_at BETWEEN now() - interval '1 day' AND now() + interval '15 days'
  LOOP
    d := GREATEST(0, EXTRACT(day FROM (r.verification_sub_expires_at - now()))::int);
    bucket := CASE
      WHEN d >= 14 THEN 14
      WHEN d >= 7  THEN 7
      WHEN d >= 3  THEN 3
      WHEN d >= 1  THEN 1
      ELSE 0
    END;
    IF r.last_verif_reminder_days IS NOT NULL AND r.last_verif_reminder_days <= bucket THEN
      CONTINUE;
    END IF;

    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (
      r.id,
      'verification_sub_reminder',
      CASE WHEN bucket = 0 THEN 'Your Verified badge has expired'
           WHEN bucket = 1 THEN 'Your Verified badge expires tomorrow'
           ELSE 'Your Verified badge expires in ' || bucket || ' days' END,
      'Renew your KSh 1,000/month verification plan to keep your Verified badge and directory placement.',
      '/dashboard/kyc'
    );

    UPDATE public.profiles SET last_verif_reminder_days = bucket WHERE id = r.id;
    sent := sent + 1;
  END LOOP;
  RETURN sent;
END;
$function$;

-- Drop the verified badge once the monthly plan lapses past grace.
CREATE OR REPLACE FUNCTION public.expire_verification_subscriptions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE n int;
BEGIN
  WITH lapsed AS (
    UPDATE public.profiles
       SET verified = false,
           agent_verification_status = 'expired',
           last_verif_reminder_days = NULL
     WHERE verification_sub_expires_at IS NOT NULL
       AND verification_sub_expires_at < now() - interval '3 days'
       AND verified = true
     RETURNING id
  )
  SELECT count(*) INTO n FROM lapsed;
  RETURN n;
END;
$function$;