-- Add kyn_username, display_name, profile_image_url to leaderboard
ALTER TABLE public.leaderboard
  ADD COLUMN IF NOT EXISTS kyn_username text,
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS profile_image_url text;

-- Add kyn_username to submissions so admin per-question view can show it
ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS kyn_username text,
  ADD COLUMN IF NOT EXISTS display_name text;

-- Storage bucket for user-uploaded profile images
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Public read on avatars bucket
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Anyone can upload to avatars (no auth in this app)
DROP POLICY IF EXISTS "Anyone can upload avatars" ON storage.objects;
CREATE POLICY "Anyone can upload avatars"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars');

-- Anyone can update/replace avatar files
DROP POLICY IF EXISTS "Anyone can update avatars" ON storage.objects;
CREATE POLICY "Anyone can update avatars"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars');