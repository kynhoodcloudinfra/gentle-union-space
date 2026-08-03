-- Defense in depth: Supabase grants anon/authenticated a broad default set of
-- table privileges (INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER) at
-- project creation, independent of RLS policies. RLS policies already block
-- INSERT/UPDATE/DELETE in practice (no matching policy = denied), but
-- TRUNCATE is NOT governed by row-level security at all in Postgres — a role
-- with TRUNCATE privilege can wipe the whole table regardless of any RLS
-- policy. Strip every grant down to exactly what each role needs.

REVOKE ALL ON public.questions FROM anon, authenticated;
GRANT SELECT ON public.questions TO anon, authenticated;
REVOKE SELECT (correct_answer) ON public.questions FROM anon, authenticated;

REVOKE ALL ON public.submissions FROM anon, authenticated;
-- No direct grants — access is only via the submit_answer/get_submission_result
-- SECURITY DEFINER functions, which run as the function owner regardless of
-- the caller's table grants.

REVOKE ALL ON public.players_since_jun1 FROM anon, authenticated;
GRANT SELECT ON public.players_since_jun1 TO anon, authenticated;

REVOKE ALL ON public.visits FROM anon, authenticated;
GRANT INSERT, UPDATE ON public.visits TO anon, authenticated;
