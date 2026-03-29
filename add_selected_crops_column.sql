-- Migration: Add selected_crops column to user_profiles table
-- Run this in Supabase SQL Editor if the column doesn't exist

-- Add the selected_crops column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles' 
        AND column_name = 'selected_crops'
    ) THEN
        ALTER TABLE public.user_profiles 
        ADD COLUMN selected_crops TEXT[];
        
        RAISE NOTICE 'Column selected_crops added successfully';
    ELSE
        RAISE NOTICE 'Column selected_crops already exists';
    END IF;
END $$;

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'user_profiles' 
AND column_name = 'selected_crops';
