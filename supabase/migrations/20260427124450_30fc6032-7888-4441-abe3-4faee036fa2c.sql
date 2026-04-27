-- Add scheduled_for column for optional scheduling
ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS scheduled_for timestamptz;

-- Update rotate function to honour scheduled_for
CREATE OR REPLACE FUNCTION public.rotate_active_question()
 RETURNS TABLE(id uuid, question_text text, option_a text, option_b text, option_c text, option_d text, correct_answer text, question_type text, day_number integer, month text, activated_at timestamp with time zone, expires_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_now timestamptz := now();
  v_next_day integer;
  v_active_id uuid;
  v_picked_id uuid;
BEGIN
  -- 1. Expire active questions whose 24h is up
  UPDATE public.questions
     SET is_active = false
   WHERE is_active = true
     AND expires_at IS NOT NULL
     AND expires_at <= v_now;

  -- 2. Check if there's still a live question
  SELECT q.id INTO v_active_id
    FROM public.questions q
   WHERE q.is_active = true
   LIMIT 1;

  -- 3. If none live, pick next: prefer scheduled (due now), else random unused
  IF v_active_id IS NULL THEN
    SELECT COALESCE(MAX(q.day_number), 0) + 1 INTO v_next_day FROM public.questions q;

    SELECT q.id INTO v_picked_id
      FROM public.questions q
     WHERE q.has_been_live = false
       AND q.scheduled_for IS NOT NULL
       AND q.scheduled_for <= v_now
     ORDER BY q.scheduled_for ASC
     LIMIT 1;

    IF v_picked_id IS NULL THEN
      SELECT q.id INTO v_picked_id
        FROM public.questions q
       WHERE q.has_been_live = false
         AND q.scheduled_for IS NULL
       ORDER BY random()
       LIMIT 1;
    END IF;

    IF v_picked_id IS NOT NULL THEN
      UPDATE public.questions
         SET is_active = true,
             has_been_live = true,
             activated_at = v_now,
             expires_at = v_now + interval '24 hours',
             day_number = v_next_day,
             month = to_char(v_now, 'YYYY-MM')
       WHERE id = v_picked_id;
    END IF;
  END IF;

  RETURN QUERY
  SELECT q.id, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d,
         q.correct_answer, q.question_type, q.day_number, q.month,
         q.activated_at, q.expires_at
    FROM public.questions q
   WHERE q.is_active = true
   LIMIT 1;
END;
$function$;