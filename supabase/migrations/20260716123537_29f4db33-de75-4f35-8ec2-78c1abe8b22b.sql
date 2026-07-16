
UPDATE public.questions
   SET is_active = false,
       expires_at = now(),
       activated_at = NULL,
       has_been_live = true
 WHERE id = 'e3bbecf3-927a-43c6-82f0-e91cb8fb713a';

SELECT public.rotate_active_question();
