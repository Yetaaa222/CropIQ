-- Migration: Add soil_type to user_profiles
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS soil_type TEXT;

COMMENT ON COLUMN public.user_profiles.soil_type IS 'The type of soil on the user''s primary farm (e.g., Sandy, Clay, Loam)';
