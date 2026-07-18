CREATE OR REPLACE FUNCTION public.rebuild_players_since_jun1()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  TRUNCATE TABLE public.players_since_jun1;
  INSERT INTO public.players_since_jun1
    (phone_number, name, kyn_username, points_since_jun1, quizzes_played, correct_count, first_played_at, last_played_at, updated_at)
  SELECT
    s.phone_number,
    COALESCE(MAX(s.display_name), MAX(s.name)) AS name,
    MAX(s.kyn_username) AS kyn_username,
    COALESCE(SUM(
      CASE WHEN s.is_correct THEN
        CASE
          WHEN s.time_taken_seconds IS NULL THEN 100
          WHEN s.time_taken_seconds <= 10 THEN 150
          WHEN s.time_taken_seconds <= 20 THEN 125
          ELSE 100
        END
      ELSE 0 END
    ), 0)::int,
    COUNT(*)::int,
    (COUNT(*) FILTER (WHERE s.is_correct))::int,
    MIN(s.submitted_at),
    MAX(s.submitted_at),
    now()
  FROM public.submissions s
  WHERE s.submitted_at >= (timestamp '2026-06-01 00:00' AT TIME ZONE 'Asia/Kolkata')
  GROUP BY s.phone_number;
END;
$function$;