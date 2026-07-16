
-- 1. Server-side score computation (mirrors client scoring rules per question_type)
--    MCQ:  <=15s -> 150, <=30s -> 100, else 50
--    Text: <=15s -> 150, <=30s -> 125, else 100

CREATE OR REPLACE FUNCTION public.recompute_leaderboard_for(p_phone text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_latest_date date;
  v_streak int;
  v_prev date;
  v_cur date;
  v_avatar int;
  v_display text;
  v_kyn text;
  v_profile text;
  v_name text;
BEGIN
  -- Preserve identity fields from the newest existing leaderboard row (if any)
  SELECT avatar_id, display_name, kyn_username, profile_image_url, name
    INTO v_avatar, v_display, v_kyn, v_profile, v_name
    FROM public.leaderboard
   WHERE phone_number = p_phone
   ORDER BY updated_at DESC
   LIMIT 1;

  -- If no leaderboard row, fall back to most recent submission
  IF v_name IS NULL THEN
    SELECT display_name, name, kyn_username
      INTO v_display, v_name, v_kyn
      FROM public.submissions
     WHERE phone_number = p_phone
     ORDER BY submitted_at DESC
     LIMIT 1;
  END IF;

  -- Latest IST play date across all submissions for this phone
  SELECT MAX((submitted_at AT TIME ZONE 'Asia/Kolkata')::date)
    INTO v_latest_date
    FROM public.submissions
   WHERE phone_number = p_phone;

  -- Compute streak: consecutive IST days ending at v_latest_date
  v_streak := 0;
  IF v_latest_date IS NOT NULL THEN
    v_prev := v_latest_date + 1;
    FOR v_cur IN
      SELECT DISTINCT (submitted_at AT TIME ZONE 'Asia/Kolkata')::date AS d
        FROM public.submissions
       WHERE phone_number = p_phone
       ORDER BY d DESC
    LOOP
      IF v_cur = v_prev - 1 THEN
        v_streak := v_streak + 1;
        v_prev := v_cur;
      ELSE
        EXIT;
      END IF;
    END LOOP;
  END IF;

  -- Delete existing rows for this phone, then re-insert one per month with derived score
  DELETE FROM public.leaderboard WHERE phone_number = p_phone;

  FOR r IN
    SELECT
      s.month,
      COALESCE(SUM(
        CASE WHEN s.is_correct THEN
          CASE
            WHEN COALESCE(q.question_type, 'mcq') = 'mcq' THEN
              CASE
                WHEN s.time_taken_seconds IS NULL THEN 50
                WHEN s.time_taken_seconds <= 15 THEN 150
                WHEN s.time_taken_seconds <= 30 THEN 100
                ELSE 50
              END
            ELSE
              CASE
                WHEN s.time_taken_seconds IS NULL THEN 100
                WHEN s.time_taken_seconds <= 15 THEN 150
                WHEN s.time_taken_seconds <= 30 THEN 125
                ELSE 100
              END
          END
        ELSE 0 END
      ), 0)::int AS total_score
    FROM public.submissions s
    LEFT JOIN public.questions q ON q.id = s.question_id
    WHERE s.phone_number = p_phone
    GROUP BY s.month
  LOOP
    INSERT INTO public.leaderboard (
      phone_number, name, display_name, kyn_username,
      total_score, streak, last_played_date, month,
      avatar_id, profile_image_url, updated_at
    ) VALUES (
      p_phone,
      COALESCE(v_display, v_name, p_phone),
      v_display,
      v_kyn,
      r.total_score,
      CASE WHEN r.month = to_char(v_latest_date, 'YYYY-MM') THEN v_streak ELSE 0 END,
      CASE WHEN r.month = to_char(v_latest_date, 'YYYY-MM') THEN v_latest_date ELSE NULL END,
      r.month,
      v_avatar,
      v_profile,
      now()
    );
  END LOOP;

  -- If user has no submissions but had an identity row, keep an empty current-month row so profile persists
  IF NOT FOUND AND v_name IS NOT NULL THEN
    INSERT INTO public.leaderboard (
      phone_number, name, display_name, kyn_username,
      total_score, streak, month, avatar_id, profile_image_url, updated_at
    ) VALUES (
      p_phone, COALESCE(v_display, v_name, p_phone), v_display, v_kyn,
      0, 0, to_char(now() AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM'),
      v_avatar, v_profile, now()
    );
  END IF;
END;
$$;

-- 2. Trigger on submissions
CREATE OR REPLACE FUNCTION public.trg_recompute_leaderboard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.recompute_leaderboard_for(NEW.phone_number);
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_recompute_leaderboard_after_submission ON public.submissions;
CREATE TRIGGER trg_recompute_leaderboard_after_submission
AFTER INSERT ON public.submissions
FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_leaderboard();

-- 3. Recompute-all helper + one-shot cleanup of all existing leaderboard rows
CREATE OR REPLACE FUNCTION public.recompute_leaderboard_all()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p text;
  phones text[];
BEGIN
  SELECT array_agg(DISTINCT phone_number) INTO phones FROM (
    SELECT phone_number FROM public.submissions
    UNION
    SELECT phone_number FROM public.leaderboard
  ) x;
  IF phones IS NULL THEN RETURN; END IF;
  FOREACH p IN ARRAY phones LOOP
    PERFORM public.recompute_leaderboard_for(p);
  END LOOP;
END;
$$;

SELECT public.recompute_leaderboard_all();

-- 4. Safe identity-only RPC for the client (display name, username, avatar, image)
CREATE OR REPLACE FUNCTION public.update_leaderboard_identity(
  p_phone text,
  p_display_name text DEFAULT NULL,
  p_kyn_username text DEFAULT NULL,
  p_avatar_id int DEFAULT NULL,
  p_profile_image_url text DEFAULT NULL,
  p_clear_profile_image boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exists boolean;
BEGIN
  IF p_phone IS NULL OR length(p_phone) = 0 THEN
    RAISE EXCEPTION 'phone required';
  END IF;

  SELECT EXISTS(SELECT 1 FROM public.leaderboard WHERE phone_number = p_phone) INTO v_exists;

  IF NOT v_exists THEN
    INSERT INTO public.leaderboard (
      phone_number, name, display_name, kyn_username,
      total_score, streak, month, avatar_id, profile_image_url, updated_at
    ) VALUES (
      p_phone,
      COALESCE(p_display_name, p_phone),
      p_display_name,
      p_kyn_username,
      0, 0,
      to_char(now() AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM'),
      p_avatar_id,
      CASE WHEN p_clear_profile_image THEN NULL ELSE p_profile_image_url END,
      now()
    );
  ELSE
    UPDATE public.leaderboard
       SET display_name       = COALESCE(p_display_name, display_name),
           name               = COALESCE(p_display_name, name),
           kyn_username       = COALESCE(p_kyn_username, kyn_username),
           avatar_id          = COALESCE(p_avatar_id, avatar_id),
           profile_image_url  = CASE
             WHEN p_clear_profile_image THEN NULL
             ELSE COALESCE(p_profile_image_url, profile_image_url)
           END,
           updated_at         = now()
     WHERE phone_number = p_phone;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_leaderboard_identity(text, text, text, int, text, boolean) TO anon, authenticated;

-- 5. Lock down direct writes to leaderboard
DROP POLICY IF EXISTS "Anyone can insert leaderboard" ON public.leaderboard;
DROP POLICY IF EXISTS "Anyone can update leaderboard" ON public.leaderboard;
-- Keep the read policy in place

REVOKE INSERT, UPDATE, DELETE ON public.leaderboard FROM anon, authenticated;
GRANT SELECT ON public.leaderboard TO anon, authenticated;
GRANT ALL ON public.leaderboard TO service_role;
