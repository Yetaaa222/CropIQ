## Fix for RLS Policy Violation Error

### Error Message
```
ERROR  Error saving profile: {"code": "42501", "details": null, "hint": null, "message": "new row violates row-level security policy for table \"user_profiles\""}
```

### What's Happening
Error code **42501** is a PostgreSQL/Supabase Row-Level Security (RLS) permission violation. This occurs when:
1. A user tries to INSERT or UPDATE a row in the `user_profiles` table
2. The RLS policy checks if `auth.uid() = id` (current user's ID matches the row's ID)
3. The check fails, likely due to:
   - Session not being properly passed to Supabase
   - UPSERT operation not working well with the current policy
   - User ID mismatch

### Root Cause
The `upsertUserProfile` function in `database.js` was using Supabase's `.upsert()` method, which is a convenience method that combines INSERT and UPDATE. However, with RLS policies, this can sometimes fail because:
- The Supabase client might not properly handle the session context during UPSERT
- The combined INSERT/UPDATE operation can bypass some security checks

### Solution Applied

#### 1. **Code Fix (database.js)**
Modified the `upsertUserProfile` function to:
- First check if the user's profile already exists
- If it exists: perform an UPDATE operation
- If it doesn't exist: perform an INSERT operation

This separation ensures that:
- Each operation is explicit and RLS-compliant
- The session context is properly maintained
- The `id` field is always set to the authenticated user's ID

#### 2. **Database Fix (fix_rls_upsert.sql)**
Updated RLS policies to be more explicit:
- Simplified the INSERT policy to only check `(auth.uid() = id)`
- Simplified the UPDATE policy to check both USING and WITH CHECK conditions
- These explicit policies work better with separated INSERT/UPDATE operations

### Steps to Complete the Fix

#### Step 1: Update the Code (Already Done)
The `database.js` file has been updated with the new `upsertUserProfile` function.

#### Step 2: Update the Database RLS Policy
1. Go to [Supabase Dashboard](https://supabase.com/)
2. Select your project
3. Go to **SQL Editor**
4. Create a new query
5. Copy and paste the contents of `fix_rls_upsert.sql`
6. Click **Run**

Or, run these SQL commands directly:
```sql
-- Drop old policies
drop policy IF exists "Users can insert own profile" on public.user_profiles;
drop policy IF exists "Users can update own profile" on public.user_profiles;

-- Create new policies
create policy "Users can insert own profile" on public.user_profiles 
  for INSERT to authenticated
  with check ((select auth.uid()) = id);

create policy "Users can update own profile" on public.user_profiles
  for UPDATE to authenticated 
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);
```

#### Step 3: Test the Fix
1. Restart your app or refresh the session
2. Try to save/update your profile again
3. You should see "Profile saved" alert without the RLS error

### Alternative: Add Full Control Policy (If Above Doesn't Work)
If you still encounter issues, you can temporarily add a more permissive policy for debugging:

```sql
-- Temporary debugging policy (less secure - use only for testing)
create policy "Users can modify own profile (debug)" on public.user_profiles
  for all to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);
```

Then revert to the original policies once you've confirmed the issue.

### What Changed
- **database.js**: `upsertUserProfile()` function now uses separate INSERT/UPDATE logic
- **SQL Schema**: RLS policies are now more explicit and UPSERT-friendly
- **New File**: `fix_rls_upsert.sql` contains the SQL commands to update your database

### Prevention for Future Issues
When working with Supabase RLS:
1. ✅ Always ensure authenticated user is loaded before database operations
2. ✅ Test RLS policies with both INSERT and UPDATE operations separately
3. ✅ Use `.select()` after INSERT/UPDATE to verify data
4. ✅ Add `.single()` for operations that should return exactly one row
5. ✅ Log errors with full error object: `console.error('Error:', error)`

### Reference
- Supabase RLS Docs: https://supabase.com/docs/guides/auth/row-level-security
- PostgreSQL Error Codes: https://www.postgresql.org/docs/current/errcodes-appendix.html
