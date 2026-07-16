
-- Void today's question e3bbecf3 (correct answer not in options).
-- 1) Remove any submissions for this question so no one is scored.
DELETE FROM public.submissions WHERE question_id = 'e3bbecf3-927a-43c6-82f0-e91cb8fb713a';

-- 2) Deactivate + expire the question and mark unplayed so it can be re-scheduled after fix.
UPDATE public.questions
   SET is_active = false,
       expires_at = now(),
       activated_at = NULL,
       has_been_live = false,
       day_number = NULL
 WHERE id = 'e3bbecf3-927a-43c6-82f0-e91cb8fb713a';

-- 3) Recompute leaderboard for everyone in case any rows were created before delete.
SELECT public.recompute_leaderboard_all();

-- 4) Rotate to the next available question immediately.
SELECT public.rotate_active_question();
