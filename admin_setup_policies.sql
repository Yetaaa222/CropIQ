-- Run this in your Supabase SQL Editor to allow the Admin Dashboard 
-- to view analytics without needing to log in as every user.
-- NOTE: This makes user profiles and farm locations visible to anyone with the ANON KEY.
-- For a production app, you should instead use a Service Role Key or check for an "is_admin" role.

-- 1. Allow viewing all user profiles
CREATE POLICY "Admins can view all profiles" 
ON public.user_profiles 
FOR SELECT 
USING (true);

-- Allow deleting user profiles
CREATE POLICY "Admins can delete profiles" 
ON public.user_profiles 
FOR DELETE 
USING (true);

-- 2. Allow viewing all farms (locations)
CREATE POLICY "Admins can view all farms" 
ON public.farms 
FOR SELECT 
USING (true);

-- 3. Allow viewing all learning progress
CREATE POLICY "Admins can view all progress" 
ON public.learning_progress 
FOR SELECT 
USING (true);

-- 4. Allow viewing all recommendations
CREATE POLICY "Admins can view all recommendations" 
ON public.crop_recommendations 
FOR SELECT 
USING (true);

-- 5. CRUD for Educational Modules (Articles)
CREATE POLICY "Admins can view modules" ON public.educational_modules FOR SELECT USING (true);
CREATE POLICY "Admins can insert modules" ON public.educational_modules FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can update modules" ON public.educational_modules FOR UPDATE USING (true);
CREATE POLICY "Admins can delete modules" ON public.educational_modules FOR DELETE USING (true);

-- 6. CRUD for Educational Module Paragraphs (Article Content)
CREATE POLICY "Admins can view paragraphs" ON public.educational_module_paragraphs FOR SELECT USING (true);
CREATE POLICY "Admins can insert paragraphs" ON public.educational_module_paragraphs FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can update paragraphs" ON public.educational_module_paragraphs FOR UPDATE USING (true);
CREATE POLICY "Admins can delete paragraphs" ON public.educational_module_paragraphs FOR DELETE USING (true);
