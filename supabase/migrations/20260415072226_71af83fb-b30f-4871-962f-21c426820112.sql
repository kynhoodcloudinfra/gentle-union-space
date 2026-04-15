
-- Questions table
CREATE TABLE public.questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  day_number INT NOT NULL,
  question_text TEXT NOT NULL,
  option_a TEXT,
  option_b TEXT,
  option_c TEXT,
  option_d TEXT,
  correct_answer TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'mcq',
  month TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read questions" ON public.questions FOR SELECT USING (true);
CREATE POLICY "Anyone can insert questions" ON public.questions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete questions" ON public.questions FOR DELETE USING (true);

-- Submissions table
CREATE TABLE public.submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number TEXT NOT NULL,
  name TEXT NOT NULL,
  question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE NOT NULL,
  day_number INT NOT NULL,
  answer_given TEXT,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  time_taken_seconds NUMERIC,
  month TEXT NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read submissions" ON public.submissions FOR SELECT USING (true);
CREATE POLICY "Anyone can insert submissions" ON public.submissions FOR INSERT WITH CHECK (true);

-- Leaderboard table with composite PK
CREATE TABLE public.leaderboard (
  phone_number TEXT NOT NULL,
  name TEXT NOT NULL,
  total_score INT NOT NULL DEFAULT 0,
  streak INT NOT NULL DEFAULT 0,
  last_played_date DATE,
  month TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  avatar_id INT,
  PRIMARY KEY (phone_number, month)
);

ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read leaderboard" ON public.leaderboard FOR SELECT USING (true);
CREATE POLICY "Anyone can insert leaderboard" ON public.leaderboard FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update leaderboard" ON public.leaderboard FOR UPDATE USING (true);
