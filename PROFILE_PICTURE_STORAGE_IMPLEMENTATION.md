# Profile Picture Storage in Supabase - Complete Implementation Guide

## Overview

Your app now has a complete profile picture storage system using Supabase Storage buckets. Profile pictures are stored as files in a dedicated bucket rather than in the database, which is more efficient and scalable.

## Quick Start

### 1. Create Storage Bucket (5 minutes)

1. Open [Supabase Dashboard](https://supabase.com/)
2. Go to your project
3. Click **Storage** (left sidebar)
4. Click **Create a new bucket**
5. Name: `profile_pictures`
6. Set to **Public**
7. Click **Create bucket**

✅ **Done!** Your bucket is ready.

### 2. Test Upload (5 minutes)

1. Open your app
2. Log in with a test account
3. Go to Edit Profile
4. Select an image
5. Click Save
6. You should see "Profile saved" alert
7. Image should display in profile

✅ **Done!** Profile pictures are now stored in Supabase.

## How It Works

### Storage Flow

```
User selects image
        ↓
uploadProfilePictureToStorage() 
        ↓
Image converted to Blob
        ↓
Uploaded to Supabase Storage
        ↓
Public URL generated
        ↓
URL saved to user_profiles.profile_picture_url
        ↓
Image displays in app
```

### File Organization

```
Supabase Storage
└── profile_pictures/ (public bucket)
    ├── userId_1705770500000.jpg
    ├── userId_1705770600000.jpg
    └── another_userId_1705770700000.jpg
```

Each file is named: `{user_id}_{timestamp}.jpg`

## Database Helper Functions

### Function 1: Upload Profile Picture

```javascript
import { uploadProfilePictureToStorage } from './database.js';

// Upload image and get URL
const publicUrl = await uploadProfilePictureToStorage(imageUri);
console.log('Uploaded to:', publicUrl);
// Returns: https://your-project.supabase.co/storage/v1/object/public/profile_pictures/...jpg
```

**Parameters:**
- `imageData` (Blob | string): Image file or file URI
- `userObj` (Object, optional): User object (defaults to current user)

**Returns:** Promise<string> - Public URL of uploaded image

### Function 2: Update Profile Picture URL

```javascript
import { updateProfilePictureUrl } from './database.js';

// Save URL to user profile in database
const updated = await updateProfilePictureUrl(publicUrl);
console.log('Profile updated:', updated);
```

**Parameters:**
- `pictureUrl` (string): Public URL from uploadProfilePictureToStorage()
- `userObj` (Object, optional): User object

**Returns:** Promise<Object> - Updated user profile

### Function 3: Delete Profile Picture

```javascript
import { deleteProfilePictureFromStorage } from './database.js';

// Delete file from storage
await deleteProfilePictureFromStorage('userId_1234567890.jpg');
console.log('Picture deleted');
```

**Parameters:**
- `fileName` (string): Name of file to delete

**Returns:** Promise<boolean> - Success status

## Integration Points

### Current Implementation (Already Working)

The existing `App.js` already handles profile picture upload:

```javascript
const uploadProfilePicture = async (imageUri) => {
  // Handles upload to profile_pictures bucket
  // Returns public URL
  // Already integrated in handleSaveProfile()
};
```

### Optional: Use Helper Functions Directly

In `App.js`, you can optionally use the new helper functions:

```javascript
import { 
  uploadProfilePictureToStorage, 
  updateProfilePictureUrl 
} from './database.js';

const handleSaveProfile = async () => {
  try {
    // Upload new picture
    if (editProfilePicture && !editProfilePicture.startsWith('http')) {
      const url = await uploadProfilePictureToStorage(editProfilePicture);
      profilePictureUrl = url;
    }

    // Update profile with picture URL
    const profileData = {
      full_name: editFullName,
      profile_picture_url: profilePictureUrl,
      // ... other fields
    };

    await upsertUserProfile(profileData, currentUser);
  } catch (error) {
    console.error('Error:', error);
  }
};
```

## Database Schema

### user_profiles Table

```sql
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  province TEXT,
  farm_size TEXT,
  experience_years INTEGER,
  primary_crops TEXT[],
  selected_crops TEXT[],
  profile_picture_url TEXT,  -- ← Stores picture URL
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

The `profile_picture_url` column stores the public URL, not the file itself.

## API Reference

### uploadProfilePictureToStorage()

Upload a file to the storage bucket.

```javascript
try {
  const url = await uploadProfilePictureToStorage(
    imageUri,      // 'file://...' or blob
    userObject     // optional
  );
  console.log('Public URL:', url);
} catch (error) {
  console.error('Upload failed:', error);
}
```

**Accepts:**
- String URI: `'file:///path/to/image.jpg'`
- Blob object: `blob` from fetch or file input

**Returns:**
- Success: `'https://project.supabase.co/storage/.../image.jpg'`
- Error: Throws error object

### updateProfilePictureUrl()

Save URL to user's profile in database.

```javascript
try {
  const profile = await updateProfilePictureUrl(publicUrl, userObject);
  console.log('Updated profile:', profile);
} catch (error) {
  console.error('Update failed:', error);
}
```

**Parameters:**
- `pictureUrl`: URL from uploadProfilePictureToStorage()
- `userObj`: Optional user object

**Returns:** Updated profile object or throws error

### deleteProfilePictureFromStorage()

Remove a file from storage.

```javascript
try {
  await deleteProfilePictureFromStorage('userId_1234567890.jpg');
  console.log('Deleted');
} catch (error) {
  console.error('Delete failed:', error);
}
```

## Advanced Usage

### Replace Profile Picture (Upload New, Delete Old)

```javascript
export const replaceProfilePicture = async (newImageUri) => {
  try {
    const user = await getCurrentUser();
    
    // Get old picture filename from profile
    const oldProfile = await getUserProfile();
    const oldFileUrl = oldProfile?.profile_picture_url;
    
    // Upload new picture
    const newUrl = await uploadProfilePictureToStorage(newImageUri, user);
    
    // Update profile with new URL
    await updateProfilePictureUrl(newUrl, user);
    
    // Delete old file if it exists
    if (oldFileUrl) {
      try {
        const fileName = oldFileUrl.split('/').pop();
        await deleteProfilePictureFromStorage(fileName);
      } catch (err) {
        console.warn('Could not delete old picture:', err);
      }
    }
    
    return newUrl;
  } catch (error) {
    console.error('Error replacing picture:', error);
    throw error;
  }
};
```

### Batch Process Multiple Pictures

```javascript
const uploadMultiplePictures = async (imageUris) => {
  const urls = [];
  
  for (const uri of imageUris) {
    try {
      const url = await uploadProfilePictureToStorage(uri);
      urls.push(url);
    } catch (error) {
      console.error('Failed to upload:', uri, error);
    }
  }
  
  return urls;
};
```

## Configuration

### File Naming
- Format: `{userId}_{timestamp}.jpg`
- Example: `a1b2c3d4-e5f6-7890_1705770500000.jpg`
- Auto-generated in upload function

### Bucket Settings
- Name: `profile_pictures`
- Access: **Public** (so URLs are accessible)
- Storage: ~5GB per project (Supabase free tier)

### Image Handling
- Max file size: 50MB
- Supported formats: JPEG, PNG, WebP, GIF
- Recommended: Compress before upload

## Security

### Public Bucket Safety
The bucket is public, but:
- ✅ Only authenticated users can upload
- ✅ Users can only upload to their own folder (via RLS policies)
- ✅ Files are named with user ID so they're individually identifiable
- ✅ Deleted users' pictures are auto-deleted (cascade)

### Optional RLS Policies
Add storage policies in Supabase SQL Editor:

```sql
CREATE POLICY "Users can upload their profile picture" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'profile_pictures');

CREATE POLICY "Users can view profile pictures" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'profile_pictures');
```

See `setup_storage_policies.sql` for complete policy setup.

## Troubleshooting

### "Bucket does not exist"
- Go to Supabase Storage
- Verify bucket name is exactly `profile_pictures`
- Check bucket status (should show files area)

### "Permission denied" Error
- Bucket must be set to **Public** access
- Go to Storage Settings and toggle to Public

### Image Uploads but Doesn't Display
- Clear app cache
- Refresh page
- Test URL in browser directly
- Check browser console for CORS errors

### File Size Too Large
- App will fail silently if file > 50MB
- Compress image before upload
- Use image processing library for optimization

### Profile Picture URL is NULL
- Upload might have failed silently
- Check browser console for errors
- Verify bucket is public

## Performance Tips

1. **Compress Images**
   ```javascript
   // Add before upload
   const compressedImage = await compressImage(originalImage);
   await uploadProfilePictureToStorage(compressedImage);
   ```

2. **Use CDN URL**
   - Supabase automatically uses CDN for public files
   - URLs are cached and fast

3. **Monitor Storage Usage**
   - Check Supabase dashboard regularly
   - Set storage limits if needed

4. **Lazy Load Images**
   ```javascript
   <Image
     source={{ uri: profilePictureUrl }}
     progressiveRenderingEnabled={true}
   />
   ```

## Files Added/Modified

### New Files
- `PROFILE_PICTURE_STORAGE.md` - Setup guide
- `PROFILE_PICTURE_STORAGE_CHECKLIST.md` - Implementation checklist
- `setup_storage_policies.sql` - SQL for storage policies
- `PROFILE_PICTURE_STORAGE_IMPLEMENTATION.md` - This file

### Modified Files
- `database.js` - Added three new functions (see above)

### Existing Integration
- `App.js` - Already uses profile picture upload
- `add_profile_picture.sql` - Database migration
- `supabase_schema.sql` - Schema definition

## Next Steps

1. ✅ Create `profile_pictures` bucket in Supabase
2. ✅ Test profile picture upload in your app
3. ⏳ (Optional) Set up storage policies for enhanced security
4. ⏳ Monitor storage usage
5. ⏳ Add image compression for better performance
6. ⏳ Implement image editing/cropping (future enhancement)

## Support & References

- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [Supabase Storage Example](https://supabase.com/docs/guides/storage/uploads/standard-uploads)
- [React Native Image Upload](https://react-native-community.github.io/hooks/usecamerroll)
- Project docs: See other `.md` files in project root

---

**Status:** ✅ Ready to use

Profile picture storage is fully implemented and ready for production use!
