# Profile Picture Storage Setup

## Supabase Storage Configuration

To enable profile picture uploads, follow these steps in your Supabase project:

### 1. Create the Storage Bucket

1. Go to your Supabase Dashboard
2. Navigate to **Storage** (left sidebar)
3. Click **"Create a new bucket"**
4. Name it: `profile_pictures`
5. Make sure **"Public bucket"** is CHECKED
6. Click **Create**

### 2. Set RLS Policies (Optional but Recommended)

After creating the bucket, set up Row Level Security policies:

1. In the Storage section, click on the `profile_pictures` bucket
2. Go to the **"Policies"** tab
3. Click **"New Policy"** and choose **"Enable the one below"**

#### For SELECT (Public Read):
```
CREATE POLICY "Public Access" ON storage.objects
  FOR SELECT USING (bucket_id = 'profile_pictures');
```

#### For INSERT (Authenticated Users Only):
```
CREATE POLICY "Authenticated users can upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'profile_pictures' AND auth.uid() = owner);
```

#### For UPDATE (Own Files Only):
```
CREATE POLICY "Users can update their own files" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'profile_pictures' AND auth.uid() = owner)
  WITH CHECK (bucket_id = 'profile_pictures' AND auth.uid() = owner);
```

#### For DELETE (Own Files Only):
```
CREATE POLICY "Users can delete their own files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'profile_pictures' AND auth.uid() = owner);
```

### 3. Verify Column Exists

Run this SQL in your Supabase SQL Editor to add the column if it doesn't exist:

```sql
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;
```

## Testing

1. Open the app and go to Profile page
2. Click "Edit Profile"
3. Click "Change Photo" button
4. Select an image from your device
5. The image should upload and display

If you still get an error, check:
- ✅ Bucket exists and is named exactly `profile_pictures`
- ✅ Bucket is marked as **Public**
- ✅ You have proper RLS policies configured
- ✅ Your Supabase project has storage enabled
