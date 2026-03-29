## Profile Picture Storage - Implementation Checklist

Complete these steps to enable profile picture storage in your Supabase bucket.

### Prerequisites
- [ ] Supabase project created
- [ ] Authentication working (sign up/login)
- [ ] `user_profiles` table exists with `profile_picture_url` column

### Setup Steps

#### 1. Create Storage Bucket in Supabase
- [ ] Go to https://supabase.com/ and log in
- [ ] Select your project
- [ ] Go to **Storage** section (left sidebar)
- [ ] Click **Create a new bucket**
- [ ] Name it exactly: `profile_pictures` (lowercase)
- [ ] Set to **Public** access
- [ ] Click **Create bucket**

#### 2. (Optional) Set Up Storage Policies
For enhanced security, add RLS policies:

- [ ] Go to **SQL Editor** in Supabase
- [ ] Create a new query
- [ ] Copy the contents of `setup_storage_policies.sql`
- [ ] Click **Run**

OR run these commands manually in SQL Editor:
```sql
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can upload their profile picture" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'profile_pictures');

CREATE POLICY "Users can view profile pictures" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'profile_pictures');

CREATE POLICY "Public can view profile pictures" ON storage.objects
  FOR SELECT TO anon
  USING (bucket_id = 'profile_pictures');
```

#### 3. Verify Database Column
- [ ] Go to **SQL Editor**
- [ ] Run:
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'user_profiles' AND column_name = 'profile_picture_url';
```
- [ ] Should return one row with `profile_picture_url`

If not, run:
```sql
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;
```

#### 4. Test Profile Picture Upload
- [ ] Update your app code:
  - [ ] Import the new helper functions in `App.js` (optional)
  - [ ] Or use existing `uploadProfilePicture()` function

- [ ] Run your app
- [ ] Log in as a test user
- [ ] Go to Edit Profile
- [ ] Pick an image
- [ ] Click Save Profile
- [ ] Verify:
  - [ ] No error message appears
  - [ ] Profile picture displays
  - [ ] Refresh page - picture still displays
  - [ ] Go to Supabase Storage -> profile_pictures bucket
  - [ ] Verify your image file is there

### Usage Examples

#### Basic Usage (Existing Implementation)
```javascript
// This already works in App.js
const uploadProfilePicture = async (imageUri) => {
  // Handles upload to Supabase storage automatically
};
```

#### Using Helper Functions (New)
```javascript
import { 
  uploadProfilePictureToStorage, 
  updateProfilePictureUrl,
  deleteProfilePictureFromStorage 
} from './database.js';

// Upload image
const url = await uploadProfilePictureToStorage(imageUri);

// Save URL to profile
await updateProfilePictureUrl(url);

// Delete old image
await deleteProfilePictureFromStorage(oldFileName);
```

### Verification Checklist
- [ ] Storage bucket `profile_pictures` exists and is public
- [ ] Profile pictures are uploading successfully
- [ ] File appears in Supabase Storage dashboard
- [ ] Public URL works in browser
- [ ] Profile picture displays in app after save
- [ ] Profile picture persists after app restart

### File Reference

**New Files:**
- `PROFILE_PICTURE_STORAGE.md` - Complete setup guide
- `setup_storage_policies.sql` - SQL to set up storage policies
- `PROFILE_PICTURE_STORAGE_CHECKLIST.md` - This file

**Modified Files:**
- `database.js` - Added three new functions:
  - `uploadProfilePictureToStorage(imageData, userObj)`
  - `updateProfilePictureUrl(pictureUrl, userObj)`
  - `deleteProfilePictureFromStorage(fileName)`

**Existing Files:**
- `App.js` - Uses `uploadProfilePicture()` (already implemented)
- `add_profile_picture.sql` - Database migration
- `PROFILE_PICTURE_SETUP.md` - Original setup guide

### Troubleshooting

| Issue | Solution |
|-------|----------|
| Bucket not found | Verify bucket name is exactly `profile_pictures` and is Public |
| Permission denied | Ensure bucket is set to Public access in Supabase |
| Image doesn't display | Clear app cache, refresh browser, verify URL is accessible |
| File too large | Compress image or check max file size limit (50MB) |
| Metadata error | Ensure column `profile_picture_url` exists on `user_profiles` table |

### Related Documentation
- [Supabase Storage Docs](https://supabase.com/docs/guides/storage)
- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- `PROFILE_PICTURE_STORAGE.md` - Detailed guide
- `RLS_FIX_GUIDE.md` - RLS policy setup guide

### Next Steps After Setup
1. Test with actual user accounts
2. Monitor storage usage in Supabase dashboard
3. Implement image compression if needed
4. Add image cropping/editing features (optional)
5. Set up automated cleanup for orphaned files (optional)
