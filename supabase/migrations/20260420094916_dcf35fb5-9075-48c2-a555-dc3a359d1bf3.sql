-- Add new columns for question rotation system
ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS activated_at timestamptz,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS has_been_live boolean NOT NULL DEFAULT false;

-- Make day_number and month nullable (now auto-assigned on activation)
ALTER TABLE public.questions ALTER COLUMN day_number DROP NOT NULL;
ALTER TABLE public.questions ALTER COLUMN month DROP NOT NULL;

-- Add UPDATE policy on questions (was missing — that's why edits failed)
DROP POLICY IF EXISTS "Anyone can update questions" ON public.questions;
CREATE POLICY "Anyone can update questions"
ON public.questions FOR UPDATE
USING (true)
WITH CHECK (true);

-- Helpful index for the rotation lookup
CREATE INDEX IF NOT EXISTS idx_questions_active ON public.questions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_questions_pool ON public.questions(has_been_live) WHERE has_been_live = false;

-- Atomic rotation function: expires stale active questions and activates a new random unused one if none is live
CREATE OR REPLACE FUNCTION public.rotate_active_question()
RETURNS TABLE (
  id uuid,
  question_text text,
  option_a text,
  option_b text,
  option_c text,
  option_d text,
  correct_answer text,
  question_type text,
  day_number integer,
  month text,
  activated_at timestamptz,
  expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_next_day integer;
  v_active_id uuid;
BEGIN
  -- 1. Expire any active questions whose 24h is up
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

  -- 3. If none live, pick a random unused question and activate it
  IF v_active_id IS NULL THEN
    SELECT COALESCE(MAX(q.day_number), 0) + 1 INTO v_next_day FROM public.questions q;

    UPDATE public.questions
       SET is_active = true,
           has_been_live = true,
           activated_at = v_now,
           expires_at = v_now + interval '24 hours',
           day_number = v_next_day,
           month = to_char(v_now, 'YYYY-MM')
     WHERE id = (
       SELECT q.id FROM public.questions q
        WHERE q.has_been_live = false
        ORDER BY random()
        LIMIT 1
     );
  END IF;

  -- 4. Return the currently live question (if any)
  RETURN QUERY
  SELECT q.id, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d,
         q.correct_answer, q.question_type, q.day_number, q.month,
         q.activated_at, q.expires_at
    FROM public.questions q
   WHERE q.is_active = true
   LIMIT 1;
END;
$$;

-- Backfill: mark any existing questions that already have a day_number as already-been-live
UPDATE public.questions
   SET has_been_live = true
 WHERE day_number IS NOT NULL
   AND day_number > 0
   AND has_been_live = false;