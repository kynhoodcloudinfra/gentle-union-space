
CREATE TABLE public.visits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number text NOT NULL,
  session_id text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  played boolean NOT NULL DEFAULT false,
  UNIQUE (session_id)
);

CREATE INDEX visits_phone_idx ON public.visits(phone_number);
CREATE INDEX visits_started_idx ON public.visits(started_at);

GRANT SELECT, INSERT, UPDATE ON public.visits TO anon, authenticated;
GRANT ALL ON public.visits TO service_role;

ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read visits" ON public.visits FOR SELECT USING (true);
CREATE POLICY "Anyone can insert visits" ON public.visits FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update visits" ON public.visits FOR UPDATE USING (true) WITH CHECK (true);
