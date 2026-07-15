
CREATE TABLE public.players_since_jun1 (
  phone_number text PRIMARY KEY,
  name text NOT NULL,
  kyn_username text,
  points_since_jun1 integer NOT NULL DEFAULT 0,
  quizzes_played integer NOT NULL DEFAULT 0,
  correct_count integer NOT NULL DEFAULT 0,
  first_played_at timestamptz,
  last_played_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.players_since_jun1 TO anon, authenticated;
GRANT ALL ON public.players_since_jun1 TO service_role;

ALTER TABLE public.players_since_jun1 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read players_since_jun1"
  ON public.players_since_jun1 FOR SELECT USING (true);
CREATE POLICY "Anyone can insert players_since_jun1"
  ON public.players_since_jun1 FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update players_since_jun1"
  ON public.players_since_jun1 FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete players_since_jun1"
  ON public.players_since_jun1 FOR DELETE USING (true);

CREATE OR REPLACE FUNCTION public.rebuild_players_since_jun1()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.players_since_jun1;
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
$$;

CREATE OR REPLACE FUNCTION public.trg_rebuild_players_since_jun1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.rebuild_players_since_jun1();
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_refresh_players_since_jun1
AFTER INSERT ON public.submissions
FOR EACH STATEMENT
EXECUTE FUNCTION public.trg_rebuild_players_since_jun1();

SELECT public.rebuild_players_since_jun1();
