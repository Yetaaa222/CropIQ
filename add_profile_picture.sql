-- ============================================
-- ADD PROFILE PICTURE URL TO USER PROFILES
-- ============================================

-- Add profile_picture_url column if it doesn't exist
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;

-- Create storage bucket for profile pictures if needed
-- (This is a comment - execute the actual bucket creation in Supabase UI)
-- In Supabase Storage, create a new bucket named 'profile_pictures'
-- Set it to public so images can be accessed via public URL
