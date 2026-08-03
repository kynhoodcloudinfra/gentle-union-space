-- Lock down direct client access to sensitive columns/tables that were previously
-- wide open (USING (true) / WITH CHECK (true)) to the anon/authenticated roles.
--
-- Root causes being fixed:
--   1. public.questions.correct_answer was readable by anyone with the anon key,
--      via direct REST access — bypassing the app UI entirely and exposing the
--      answer key before players answer.
--   2. public.questions allowed anyone to INSERT/UPDATE/DELETE rows directly —
--      any client could corrupt or wipe the quiz.
--   3. public.submissions allowed anyone to INSERT rows for any phone_number,
--      and grading (is_correct) was computed client-side and trusted as-is.
--   4. public.players_since_jun1 allowed direct writes from anon/authenticated
--      even though it is fully derived from submissions via trigger — no
--      legitimate client ever needs to write to it directly.
--   5. public.visits was broadly SELECT-able even though nothing in the app
--      reads it client-side.
--
-- Grading and submission-insert are moved server-side into SECURITY DEFINER
-- RPCs so the correct answer never has to leave the database before/while a
-- player is answering, and a client can no longer forge is_correct or insert
-- submissions under an arbitrary phone_number without going through grading.
--
-- NOTE: This does not fix the admin panel (Questions/BulkUpload/Responses/
-- Analytics tabs). Those currently share the same public anon key as regular
-- players, gated only by a client-side password check — there is no way to
-- give "admin" broader table access than "player" until that panel is backed
-- by real authentication (Supabase Auth or a service-role-backed function).
-- Until that exists, those admin tabs will stop working after this migration.

CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;

-- ============================================================================
-- 1. questions: hide correct_answer from anon/authenticated; block direct
--    writes (only service_role, i.e. an eventual admin backend, may write).
-- ============================================================================

REVOKE SELECT (correct_answer) ON public.questions FROM anon, authenticated;

DROP POLICY IF EXISTS "Anyone can insert questions" ON public.questions;
DROP POLICY IF EXISTS "Anyone can update questions" ON public.questions;
DROP POLICY IF EXISTS "Anyone can delete questions" ON public.questions;

REVOKE INSERT, UPDATE, DELETE ON public.questions FROM anon, authenticated;
GRANT ALL ON public.questions TO service_role;

-- rotate_active_question() must no longer hand back the answer key. Its return
-- columns are changing, so OR REPLACE isn't enough — drop it first.
DROP FUNCTION IF EXISTS public.rotate_active_question();

CREATE OR REPLACE FUNCTION public.rotate_active_question()
RETURNS TABLE (
  id uuid,
  question_text text,
  option_a text,
  option_b text,
  option_c text,
  option_d text,
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
  UPDATE public.questions
     SET is_active = false
   WHERE is_active = true
     AND expires_at IS NOT NULL
     AND expires_at <= v_now;

  SELECT q.id INTO v_active_id
    FROM public.questions q
   WHERE q.is_active = true
   LIMIT 1;

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

  RETURN QUERY
  SELECT q.id, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d,
         q.question_type, q.day_number, q.month,
         q.activated_at, q.expires_at
    FROM public.questions q
   WHERE q.is_active = true
   LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rotate_active_question() TO anon, authenticated;

-- ============================================================================
-- 2. submissions: block direct INSERT/SELECT from anon/authenticated; grading
--    and inserts happen only through submit_answer(); past results are read
--    only through get_submission_result().
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can insert submissions" ON public.submissions;
DROP POLICY IF EXISTS "Anyone can read submissions" ON public.submissions;

REVOKE INSERT, SELECT ON public.submissions FROM anon, authenticated;
GRANT ALL ON public.submissions TO service_role;

CREATE OR REPLACE FUNCTION public.submit_answer(
  p_phone text,
  p_display_name text,
  p_kyn_username text,
  p_question_id uuid,
  p_answer_given text,
  p_time_taken_seconds numeric
)
RETURNS TABLE (is_correct boolean, score int, correct_answer text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q record;
  v_correct boolean;
  v_score int;
  v_is_mcq boolean;
  v_correct_norm text;
  v_answer_norm text;
  v_mcq_letter text;
  v_opt_for_answer text;
  v_dist int;
  v_tolerance int;
BEGIN
  SELECT * INTO q FROM public.questions WHERE id = p_question_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'question not found';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.submissions
     WHERE phone_number = p_phone AND question_id = p_question_id
  ) THEN
    RAISE EXCEPTION 'already answered';
  END IF;

  v_is_mcq := q.question_type = 'mcq';

  IF v_is_mcq THEN
    v_correct_norm := lower(trim(q.correct_answer));

    v_mcq_letter := COALESCE(
      (SELECT l FROM (VALUES ('a'),('b'),('c'),('d')) AS opts(l)
        WHERE lower(trim(
                CASE l
                  WHEN 'a' THEN q.option_a
                  WHEN 'b' THEN q.option_b
                  WHEN 'c' THEN q.option_c
                  WHEN 'd' THEN q.option_d
                END
              )) = v_correct_norm
        LIMIT 1),
      v_correct_norm
    );

    v_opt_for_answer := lower(trim(
      CASE lower(trim(p_answer_given))
        WHEN 'a' THEN q.option_a
        WHEN 'b' THEN q.option_b
        WHEN 'c' THEN q.option_c
        WHEN 'd' THEN q.option_d
        ELSE NULL
      END
    ));

    v_correct := (lower(trim(p_answer_given)) = v_mcq_letter) OR (v_opt_for_answer = v_correct_norm);
  ELSIF p_answer_given = '(timed out)' THEN
    v_correct := false;
  ELSE
    -- Mirrors the client's previous fuzzy-match: normalize (lowercase, trim,
    -- collapse whitespace, strip punctuation), exact match or Levenshtein
    -- distance within ~20% of the answer length (min 1, max 3).
    v_answer_norm := regexp_replace(regexp_replace(lower(trim(p_answer_given)), '\s+', ' ', 'g'), '[^a-z0-9 ]', '', 'g');
    v_correct_norm := regexp_replace(regexp_replace(lower(trim(q.correct_answer)), '\s+', ' ', 'g'), '[^a-z0-9 ]', '', 'g');

    IF v_answer_norm = '' OR v_correct_norm = '' THEN
      v_correct := false;
    ELSIF v_answer_norm = v_correct_norm THEN
      v_correct := true;
    ELSE
      v_dist := levenshtein(v_answer_norm, v_correct_norm);
      v_tolerance := LEAST(3, GREATEST(1, floor(length(v_correct_norm) * 0.2)::int));
      v_correct := v_dist <= v_tolerance;
    END IF;
  END IF;

  v_score := CASE
    WHEN NOT v_correct THEN 0
    WHEN v_is_mcq THEN
      CASE WHEN p_time_taken_seconds <= 15 THEN 150
           WHEN p_time_taken_seconds <= 30 THEN 100
           ELSE 50 END
    ELSE
      CASE WHEN p_time_taken_seconds <= 15 THEN 150
           WHEN p_time_taken_seconds <= 30 THEN 125
           ELSE 100 END
  END;

  INSERT INTO public.submissions (
    phone_number, name, display_name, kyn_username, question_id, day_number,
    answer_given, is_correct, time_taken_seconds, month
  ) VALUES (
    p_phone, p_display_name, p_display_name, p_kyn_username, p_question_id, q.day_number,
    p_answer_given, v_correct, p_time_taken_seconds,
    COALESCE(q.month, to_char(now() AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM'))
  );

  RETURN QUERY SELECT v_correct, v_score, q.correct_answer;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_answer(text, text, text, uuid, text, numeric) TO anon, authenticated;

-- Lets a client check "have I already answered this question, and what
-- happened" without a broad SELECT on submissions/questions.
CREATE OR REPLACE FUNCTION public.get_submission_result(
  p_phone text,
  p_question_id uuid
)
RETURNS TABLE (
  is_correct boolean,
  answer_given text,
  time_taken_seconds numeric,
  correct_answer text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.is_correct, s.answer_given, s.time_taken_seconds, q.correct_answer
    FROM public.submissions s
    JOIN public.questions q ON q.id = s.question_id
   WHERE s.phone_number = p_phone
     AND s.question_id = p_question_id
   LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_submission_result(text, uuid) TO anon, authenticated;

-- ============================================================================
-- 3. players_since_jun1: fully derived from submissions via trigger — no
--    legitimate client writes directly to it.
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can insert players_since_jun1" ON public.players_since_jun1;
DROP POLICY IF EXISTS "Anyone can update players_since_jun1" ON public.players_since_jun1;
DROP POLICY IF EXISTS "Anyone can delete players_since_jun1" ON public.players_since_jun1;

REVOKE INSERT, UPDATE, DELETE ON public.players_since_jun1 FROM anon, authenticated;
GRANT ALL ON public.players_since_jun1 TO service_role;

-- ============================================================================
-- 4. visits: nothing in the client reads this table back — no reason for it
--    to be broadly selectable. Insert/update stay open (anonymous session
--    tracking, no admin-vs-player distinction to protect).
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can read visits" ON public.visits;

REVOKE SELECT ON public.visits FROM anon, authenticated;
GRANT ALL ON public.visits TO service_role;
