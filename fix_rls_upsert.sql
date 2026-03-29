-- ============================================
-- FIX: RLS Policy for UPSERT Operations
-- ============================================
-- This script fixes the Row-Level Security (RLS) policies to properly handle UPSERT operations
-- The issue was that UPSERT (combined INSERT/UPDATE) can fail with RLS if policies aren't set up correctly
-- 
-- Error fixed: "new row violates row-level security policy for table "user_profiles""
-- Error code: 42501

-- Drop old policies
drop policy IF exists "Users can insert own profile" on public.user_profiles;
drop policy IF exists "Users can update own profile" on public.user_profiles;

-- Create combined UPSERT-friendly policies
-- For INSERT operations
create policy "Users can insert own profile" on public.user_profiles 
  for INSERT to authenticated
  with check (
    (select auth.uid()) = id
  );

-- For UPDATE operations
create policy "Users can update own profile" on public.user_profiles
  for UPDATE to authenticated 
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- SELECT policy remains the same
-- If needed, verify it exists:
-- create policy "Users can view own profile" on public.user_profiles for SELECT
--   to authenticated using (
--     (select auth.uid()) = id
--   );

-- ============================================
-- IMPORTANT: After running this script:
-- ============================================
-- 1. Go to Supabase Dashboard -> SQL Editor
-- 2. Copy and paste this entire file
-- 3. Click "Run"
-- 4. Refresh your app and try saving profile again
