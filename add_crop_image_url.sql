-- ============================================
-- ADD IMAGE URL COLUMN TO CROPS TABLE
-- ============================================

-- Add image_url column if it doesn't exist
ALTER TABLE public.crops
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Update existing crops with placeholder image URLs (you can replace these with actual URLs)
-- These are public image URLs that can be used as placeholders
UPDATE public.crops 
SET image_url = 'https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=400&h=300&fit=crop' 
WHERE name = 'Maize';

UPDATE public.crops 
SET image_url = 'https://images.unsplash.com/photo-1599599810694-b6d7e3d6b1bf?w=400&h=300&fit=crop' 
WHERE name = 'Groundnuts';

UPDATE public.crops 
SET image_url = 'https://images.unsplash.com/photo-1416528885235-c17d1d7ce6f0?w=400&h=300&fit=crop' 
WHERE name = 'Soybeans';

UPDATE public.crops 
SET image_url = 'https://images.unsplash.com/photo-1595949014002-e6128c6c5c23?w=400&h=300&fit=crop' 
WHERE name = 'Sunflower';

-- Add index for image_url column for future queries
CREATE INDEX IF NOT EXISTS idx_crops_image_url ON public.crops(image_url);
