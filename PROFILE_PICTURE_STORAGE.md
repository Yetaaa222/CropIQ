## Profile Picture Storage Setup Guide

This guide explains how to set up profile picture storage in Supabase and use the database helper functions.

### Overview
Profile pictures are stored in Supabase Storage (a dedicated file storage bucket) instead of directly in the database. This is more efficient and scalable.

### Step 1: Create the Storage Bucket

1. **Go to Supabase Dashboard**
   - Navigate to https://supabase.com/
   - Select your project

2. **Create Storage Bucket**
   - Go to **Storage** section (left sidebar)
   - Click **Create a new bucket**
   - Name it: `profile_pictures`
   - Keep it **Public** so files can be accessed via URLs
   - Click **Create bucket**

3. **Verify Bucket Name**
   - The bucket MUST be named exactly `profile_pictures`
   - It should be in the **Public** state

### Step 2: Set Up Storage Policies (Optional but Recommended)

For security, you can add Row-Level Security (RLS) policies to the storage bucket.

Run this SQL in your Supabase SQL Editor:

```sql
-- Allow authenticated users to upload their own profile pictures
create policy "Users can upload their profile picture" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'profile_pictures' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow authenticated users to view all profile pictures
create policy "Users can view profile pictures" on storage.objects
  for select to authenticated
  using (bucket_id = 'profile_pictures');

-- Allow authenticated users to delete their own profile pictures
create policy "Users can delete their profile picture" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'profile_pictures'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
```

### Step 3: Use the Database Helper Functions

The `database.js` file now includes three helper functions for profile pictures:

#### 1. Upload Profile Picture to Storage
```javascript
import { uploadProfilePictureToStorage, updateProfilePictureUrl } from './database.js';

// Upload image and get URL
const imageUri = 'file:///path/to/image.jpg'; // or result from image picker
const publicUrl = await uploadProfilePictureToStorage(imageUri);

// Update the user profile with the new URL
await updateProfilePictureUrl(publicUrl);
```

#### 2. Update Profile Picture URL
```javascript
import { updateProfilePictureUrl } from './database.js';

// Save the picture URL to the user's profile
await updateProfilePictureUrl(publicUrl, currentUser);
```

#### 3. Delete Profile Picture
```javascript
import { deleteProfilePictureFromStorage } from './database.js';

// Delete old picture from storage
const fileName = 'userId_timestamp.jpg';
await deleteProfilePictureFromStorage(fileName);
```

### Step 4: Update Your App Code

The existing code in `App.js` should work, but you can optionally use the helper functions:

**Current Implementation:**
```javascript
const uploadProfilePicture = async (imageUri) => {
  try {
    if (!imageUri || !user) return null;

    if (imageUri.startsWith('http')) {
      return imageUri;
    }

    setIsUploadingProfilePicture(true);

    try {
      const response = await fetch(imageUri);
      const blob = await response.blob();
      const fileName = `${user.id}_${Date.now()}.jpg`;

      const { data, error } = await supabase.storage
        .from('profile_pictures')
        .upload(fileName, blob, {
          cacheControl: '3600',
          upsert: true,
        });

      if (error) {
        throw error;
      }

      const { data: publicData } = supabase.storage
        .from('profile_pictures')
        .getPublicUrl(fileName);

      return publicData.publicUrl;
    } catch (storageError) {
      console.log('Storage error:', storageError);
      return null;
    }
  } catch (error) {
    console.error('Error processing profile picture:', error);
    return null;
  } finally {
    setIsUploadingProfilePicture(false);
  }
};
```

**Optional Simplified Implementation (using helper functions):**
```javascript
import { uploadProfilePictureToStorage } from './database.js';

const uploadProfilePicture = async (imageUri) => {
  try {
    if (!imageUri || !user) return null;

    if (imageUri.startsWith('http')) {
      return imageUri;
    }

    setIsUploadingProfilePicture(true);
    const publicUrl = await uploadProfilePictureToStorage(imageUri, user);
    return publicUrl;
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    return null;
  } finally {
    setIsUploadingProfilePicture(false);
  }
};
```

### Database Schema

The profile picture URL is stored in the `user_profiles` table:

```sql
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;
```

This column stores the public URL of the profile picture in Supabase Storage.

### File Structure

- **Storage Bucket**: `profile_pictures/`
  - Files are named: `{user_id}_{timestamp}.jpg`
  - Example: `a1b2c3d4-e5f6-7890-abcd-ef1234567890_1705770500000.jpg`

- **Database**: `user_profiles.profile_picture_url`
  - Stores the public URL
  - Example: `https://your-project.supabase.co/storage/v1/object/public/profile_pictures/a1b2c3d4...jpg`

### Function Reference

#### `uploadProfilePictureToStorage(imageData, userObj)`
Upload an image file to the storage bucket and get back the public URL.

**Parameters:**
- `imageData` (Blob|string): Image file or URI path
- `userObj` (Object, optional): User object (defaults to current user)

**Returns:** Promise<string> - Public URL of the uploaded image

**Example:**
```javascript
const url = await uploadProfilePictureToStorage('file:///path/to/image.jpg');
console.log('Image uploaded:', url);
```

#### `updateProfilePictureUrl(pictureUrl, userObj)`
Save the profile picture URL to the user's profile in the database.

**Parameters:**
- `pictureUrl` (string): Public URL of the picture
- `userObj` (Object, optional): User object (defaults to current user)

**Returns:** Promise<Object> - Updated user profile

**Example:**
```javascript
const updated = await updateProfilePictureUrl('https://...jpg');
```

#### `deleteProfilePictureFromStorage(fileName)`
Remove a profile picture file from storage.

**Parameters:**
- `fileName` (string): Name of the file to delete

**Returns:** Promise<boolean> - True if successful

**Example:**
```javascript
await deleteProfilePictureFromStorage('userId_1234567890.jpg');
```

### Troubleshooting

**Issue: "Bucket does not exist" error**
- Make sure bucket is named exactly `profile_pictures` (lowercase, no underscores in different places)
- Verify bucket is in **Public** state

**Issue: "Permission denied" error**
- Check that the bucket is set to **Public** access
- If using RLS policies, verify they match the file names

**Issue: "Uploaded successfully but image doesn't display"**
- Clear app cache and reload
- Verify the public URL is accessible in browser
- Check that the bucket is public

**Issue: "File size too large"**
- Compress the image before uploading
- Maximum file size: 50MB

### Clean Up Old Pictures (Optional)

You can create a function to delete old profile pictures when a user uploads a new one:

```javascript
export const replaceProfilePicture = async (newImageUri, oldFileName, userObj = null) => {
  try {
    const user = userObj || await getAuthenticatedUser();
    
    // Upload new picture
    const publicUrl = await uploadProfilePictureToStorage(newImageUri, user);
    
    // Delete old picture if it exists
    if (oldFileName) {
      try {
        await deleteProfilePictureFromStorage(oldFileName);
      } catch (err) {
        console.warn('Could not delete old picture:', err);
        // Don't fail if delete fails
      }
    }
    
    // Update profile
    await updateProfilePictureUrl(publicUrl, user);
    
    return publicUrl;
  } catch (error) {
    console.error('Error replacing profile picture:', error);
    throw error;
  }
};
```

### Security Best Practices

1. ✅ Use authenticated-only access for sensitive operations
2. ✅ Validate file types and sizes on the client before upload
3. ✅ Use RLS policies to restrict access
4. ✅ Delete old pictures when users upload new ones
5. ✅ Monitor storage usage and set appropriate limits
6. ✅ Use cache control headers for optimization

### Related Files

- `App.js` - Uses `uploadProfilePicture()` and `handleSaveProfile()`
- `database.js` - Contains helper functions
- `add_profile_picture.sql` - Database migration
- `PROFILE_PICTURE_SETUP.md` - Original setup guide
