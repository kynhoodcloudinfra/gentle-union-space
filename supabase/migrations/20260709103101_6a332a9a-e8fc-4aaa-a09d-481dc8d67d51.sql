
-- 1. Snapshot latest profile info per phone (to preserve names/avatars/images)
CREATE TEMP TABLE _profile AS
SELECT DISTINCT ON (phone_number)
  phone_number, name, display_name, kyn_username, avatar_id, profile_image_url
FROM public.leaderboard
ORDER BY phone_number, updated_at DESC NULLS LAST;

-- 2. Recompute score per (phone, month) from correct submissions
CREATE TEMP TABLE _scored AS
SELECT
  s.phone_number,
  s.month,
  MAX(s.name) AS sub_name,
  SUM(
    CASE WHEN q.question_type = 'mcq' THEN
      CASE WHEN s.time_taken_seconds <= 10 THEN 150
           WHEN s.time_taken_seconds <= 20 THEN 100
           ELSE 50 END
    ELSE
      CASE WHEN s.time_taken_seconds <= 20 THEN 150
           WHEN s.time_taken_seconds <= 40 THEN 125
           ELSE 100 END
    END
  ) AS total_score,
  MAX((s.submitted_at AT TIME ZONE 'Asia/Kolkata')::date) AS last_played_date
FROM public.submissions s
JOIN public.questions q ON q.id = s.question_id
WHERE s.is_correct = true
GROUP BY s.phone_number, s.month;

-- 3. Compute current streak per phone from distinct IST play-dates
CREATE TEMP TABLE _dates AS
SELECT DISTINCT
  phone_number,
  (submitted_at AT TIME ZONE 'Asia/Kolkata')::date AS d
FROM public.submissions;

CREATE TEMP TABLE _streak AS
WITH ordered AS (
  SELECT phone_number, d,
         d - (ROW_NUMBER() OVER (PARTITION BY phone_number ORDER BY d))::int AS grp
  FROM _dates
),
runs AS (
  SELECT phone_number, grp, MIN(d) AS run_start, MAX(d) AS run_end, COUNT(*) AS len
  FROM ordered
  GROUP BY phone_number, grp
),
latest AS (
  SELECT DISTINCT ON (phone_number) phone_number, len, run_end
  FROM runs
  ORDER BY phone_number, run_end DESC
)
SELECT phone_number, len AS streak, run_end AS last_date FROM latest;

-- 4. Wipe existing leaderboard, rebuild clean
DELETE FROM public.leaderboard;

-- 4a. One row per (phone, month) for everyone who has scored submissions
INSERT INTO public.leaderboard
  (phone_number, name, display_name, kyn_username, avatar_id, profile_image_url,
   total_score, streak, last_played_date, month, updated_at)
SELECT
  sc.phone_number,
  COALESCE(p.display_name, p.name, sc.sub_name, sc.phone_number) AS name,
  COALESCE(p.display_name, p.name, sc.sub_name) AS display_name,
  p.kyn_username,
  p.avatar_id,
  p.profile_image_url,
  sc.total_score,
  COALESCE(st.streak, 0) AS streak,
  sc.last_played_date,
  sc.month,
  now()
FROM _scored sc
LEFT JOIN _profile p ON p.phone_number = sc.phone_number
LEFT JOIN _streak st ON st.phone_number = sc.phone_number;

-- 4b. Preserve profiles for signed-up users who never submitted (zero-score current-month row)
INSERT INTO public.leaderboard
  (phone_number, name, display_name, kyn_username, avatar_id, profile_image_url,
   total_score, streak, last_played_date, month, updated_at)
SELECT
  p.phone_number,
  COALESCE(p.display_name, p.name, p.phone_number),
  p.display_name,
  p.kyn_username,
  p.avatar_id,
  p.profile_image_url,
  0, 0, NULL,
  to_char(now() AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM'),
  now()
FROM _profile p
WHERE NOT EXISTS (SELECT 1 FROM _scored sc WHERE sc.phone_number = p.phone_number);

-- 5. Prevent duplicate (phone, month) rows going forward
ALTER TABLE public.leaderboard
  ADD CONSTRAINT leaderboard_phone_month_key UNIQUE (phone_number, month);
