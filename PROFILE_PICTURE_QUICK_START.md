# Profile Picture Storage - Quick Start (2 Minutes)

## What's New

Your app now stores profile pictures in Supabase Storage buckets instead of as files in the database. This is more efficient and scalable.

## 3-Step Setup

### Step 1: Create Storage Bucket (1 min)
1. Open [Supabase Dashboard](https://supabase.com/) → Your Project
2. Click **Storage** (left sidebar)
3. Click **Create a new bucket**
4. Enter name: `profile_pictures`
5. Toggle to **Public**
6. Click **Create bucket**

✅ Done!

### Step 2: Test It (1 min)
1. Run your app
2. Log in → Edit Profile
3. Pick an image
4. Click Save
5. Image should appear

✅ Done!

### Step 3 (Optional): Add Security (1 min)
For enhanced security, run SQL file in Supabase:
1. Go to **SQL Editor** in Supabase
2. Copy `setup_storage_policies.sql` contents
3. Paste and click **Run**

✅ Done!

## How to Use

### In Your Code
It's automatic! The existing profile upload code already handles it:

```javascript
// In App.js - already working
const uploadProfilePicture = async (imageUri) => {
  // Automatically uploads to 'profile_pictures' bucket
  // Returns public URL
  // Saves to database
};
```

### Optional: Use Helper Functions
For more control, import and use:

```javascript
import { 
  uploadProfilePictureToStorage,
  updateProfilePictureUrl,
  deleteProfilePictureFromStorage 
} from './database.js';

// Upload
const url = await uploadProfilePictureToStorage(imageUri);

// Save to profile
await updateProfilePictureUrl(url);

// Delete old picture
await deleteProfilePictureFromStorage('userId_timestamp.jpg');
```

## What Changed

**Code:** `database.js` - Added 3 new functions

**Files:** Created documentation files:
- `PROFILE_PICTURE_STORAGE.md` - Full guide
- `PROFILE_PICTURE_STORAGE_IMPLEMENTATION.md` - Complete reference
- `PROFILE_PICTURE_STORAGE_CHECKLIST.md` - Step-by-step checklist
- `setup_storage_policies.sql` - Optional security policies

## File Structure

```
Supabase Storage
└── profile_pictures/ (public bucket)
    ├── userId_1705770500000.jpg
    ├── userId_1705770600000.jpg
    └── ...
```

Database stores the URL:
```sql
user_profiles.profile_picture_url = 
  'https://your-project.supabase.co/storage/v1/object/public/profile_pictures/userId_1705770500000.jpg'
```

## Functions Added

1. **uploadProfilePictureToStorage(imageData, userObj)**
   - Upload image to bucket
   - Get public URL

2. **updateProfilePictureUrl(pictureUrl, userObj)**
   - Save URL to user profile

3. **deleteProfilePictureFromStorage(fileName)**
   - Delete picture from storage

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Upload fails | Ensure bucket is **Public** in Supabase |
| Image doesn't display | Clear cache, verify URL works in browser |
| Bucket not found | Create `profile_pictures` bucket in Supabase |

## Next Steps

1. ✅ Create bucket in Supabase
2. ✅ Test in your app
3. ⏳ (Optional) Add security policies

## Links

- **Full Guide:** `PROFILE_PICTURE_STORAGE.md`
- **Complete Reference:** `PROFILE_PICTURE_STORAGE_IMPLEMENTATION.md`
- **Checklist:** `PROFILE_PICTURE_STORAGE_CHECKLIST.md`
- **SQL Policies:** `setup_storage_policies.sql`

---

**Status:** ✅ Ready to use

Your profile picture storage is live!
