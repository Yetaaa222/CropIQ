-- ============================================
-- SUPABASE STORAGE POLICIES FOR PROFILE PICTURES
-- ============================================
-- This script sets up Row-Level Security (RLS) policies for the profile_pictures storage bucket
-- This is optional but recommended for security

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload their profile picture" ON storage.objects;
DROP POLICY IF EXISTS "Users can view profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their profile picture" ON storage.objects;

-- Allow authenticated users to upload their own profile pictures
CREATE POLICY "Users can upload their profile picture" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'profile_pictures' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow authenticated users to view all profile pictures (public)
CREATE POLICY "Users can view profile pictures" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'profile_pictures');

-- Allow authenticated users to delete their own profile pictures
CREATE POLICY "Users can delete their profile picture" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'profile_pictures'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Optional: Allow anon (public) users to view profile pictures
CREATE POLICY "Public can view profile pictures" ON storage.objects
  FOR SELECT TO anon
  USING (bucket_id = 'profile_pictures');
