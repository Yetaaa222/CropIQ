-- =====================================================================
-- COMPLETE POLICY SETUP FOR CROPIQ ADMIN (CROPS, ARTICLES, & STORAGE)
-- Run this in the Supabase SQL Editor
-- =====================================================================

-- 1. ENABLE ROW LEVEL SECURITY (RLS) ON ALL TARGET TABLES
ALTER TABLE public.crops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.educational_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.educational_module_paragraphs ENABLE ROW LEVEL SECURITY;

-- 2. POLICIES FOR CROPS TABLE (public.crops)
DROP POLICY IF EXISTS "Anyone can view crops" ON public.crops;
CREATE POLICY "Anyone can view crops" ON public.crops 
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can insert crops" ON public.crops;
CREATE POLICY "Admins can insert crops" ON public.crops 
FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can update crops" ON public.crops;
CREATE POLICY "Admins can update crops" ON public.crops 
FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Admins can delete crops" ON public.crops;
CREATE POLICY "Admins can delete crops" ON public.crops 
FOR DELETE USING (true);


-- 3. POLICIES FOR EDUCATIONAL MODULES (public.educational_modules)
DROP POLICY IF EXISTS "Authenticated users can view modules" ON public.educational_modules;
DROP POLICY IF EXISTS "Admins can view modules" ON public.educational_modules;
CREATE POLICY "Anyone can view modules" ON public.educational_modules 
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can insert modules" ON public.educational_modules;
CREATE POLICY "Admins can insert modules" ON public.educational_modules 
FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can update modules" ON public.educational_modules;
CREATE POLICY "Admins can update modules" ON public.educational_modules 
FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Admins can delete modules" ON public.educational_modules;
CREATE POLICY "Admins can delete modules" ON public.educational_modules 
FOR DELETE USING (true);


-- 4. POLICIES FOR MODULE PARAGRAPHS (public.educational_module_paragraphs)
DROP POLICY IF EXISTS "Modules visible to all authenticated" ON public.educational_module_paragraphs;
DROP POLICY IF EXISTS "Admins can view paragraphs" ON public.educational_module_paragraphs;
CREATE POLICY "Anyone can view paragraphs" ON public.educational_module_paragraphs 
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can insert paragraphs" ON public.educational_module_paragraphs;
CREATE POLICY "Admins can insert paragraphs" ON public.educational_module_paragraphs 
FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can update paragraphs" ON public.educational_module_paragraphs;
CREATE POLICY "Admins can update paragraphs" ON public.educational_module_paragraphs 
FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Admins can delete paragraphs" ON public.educational_module_paragraphs;
CREATE POLICY "Admins can delete paragraphs" ON public.educational_module_paragraphs 
FOR DELETE USING (true);


-- 5. BUCKETS CREATION
INSERT INTO storage.buckets (id, name, public) 
VALUES ('crop-images', 'crop-images', true)
ON CONFLICT (id) DO NOTHING;


-- 6. POLICIES FOR STORAGE (storage.objects)
DROP POLICY IF EXISTS "Public can upload crop images" ON storage.objects;
CREATE POLICY "Public can upload crop images" ON storage.objects 
FOR INSERT WITH CHECK (bucket_id = 'crop-images');

DROP POLICY IF EXISTS "Public can update crop images" ON storage.objects;
CREATE POLICY "Public can update crop images" ON storage.objects 
FOR UPDATE USING (bucket_id = 'crop-images');

DROP POLICY IF EXISTS "Public can delete crop images" ON storage.objects;
CREATE POLICY "Public can delete crop images" ON storage.objects 
FOR DELETE USING (bucket_id = 'crop-images');

DROP POLICY IF EXISTS "Public can view crop images" ON storage.objects;
CREATE POLICY "Public can view crop images" ON storage.objects 
FOR SELECT USING (bucket_id = 'crop-images');
