
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS image_url text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('question-images', 'question-images', true)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Question images public read') THEN
    CREATE POLICY "Question images public read" ON storage.objects FOR SELECT USING (bucket_id = 'question-images');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Question images anyone insert') THEN
    CREATE POLICY "Question images anyone insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'question-images');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Question images anyone update') THEN
    CREATE POLICY "Question images anyone update" ON storage.objects FOR UPDATE USING (bucket_id = 'question-images');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Question images anyone delete') THEN
    CREATE POLICY "Question images anyone delete" ON storage.objects FOR DELETE USING (bucket_id = 'question-images');
  END IF;
END $$;
