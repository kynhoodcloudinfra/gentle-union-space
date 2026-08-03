-- 1) players_since_jun1: remove public read (phone numbers + activity). Admin reads via service role.
DROP POLICY IF EXISTS "Anyone can read players_since_jun1" ON public.players_since_jun1;
REVOKE ALL ON public.players_since_jun1 FROM anon, authenticated;
GRANT ALL ON public.players_since_jun1 TO service_role;

-- 2) visits: remove permissive public write policies, funnel through definer RPCs.
DROP POLICY IF EXISTS "Anyone can insert visits" ON public.visits;
DROP POLICY IF EXISTS "Anyone can update visits" ON public.visits;
REVOKE ALL ON public.visits FROM anon, authenticated;
GRANT ALL ON public.visits TO service_role;

CREATE OR REPLACE FUNCTION public.start_visit(p_phone text, p_session_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF p_phone IS NULL OR length(trim(p_phone)) = 0 OR length(p_phone) > 32 THEN
    RAISE EXCEPTION 'invalid phone';
  END IF;
  IF p_session_id IS NULL OR length(p_session_id) < 8 OR length(p_session_id) > 128 THEN
    RAISE EXCEPTION 'invalid session';
  END IF;
  IF EXISTS (SELECT 1 FROM public.visits WHERE session_id = p_session_id) THEN
    RETURN;
  END IF;
  INSERT INTO public.visits (phone_number, session_id) VALUES (p_phone, p_session_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.touch_visit(p_session_id text, p_played boolean DEFAULT false)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF p_session_id IS NULL OR length(p_session_id) < 8 OR length(p_session_id) > 128 THEN
    RAISE EXCEPTION 'invalid session';
  END IF;
  UPDATE public.visits
     SET last_seen_at = now(),
         played = played OR COALESCE(p_played, false)
   WHERE session_id = p_session_id;
END;
$$;

REVOKE ALL ON FUNCTION public.start_visit(text, text) FROM public;
REVOKE ALL ON FUNCTION public.touch_visit(text, boolean) FROM public;
GRANT EXECUTE ON FUNCTION public.start_visit(text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.touch_visit(text, boolean) TO anon, authenticated, service_role;