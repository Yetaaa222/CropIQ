# CropIQ Database Schema Documentation

## Overview
This document describes the database schema for the CropIQ application, designed for Supabase (PostgreSQL).

## Tables

### 1. `user_profiles`
Stores farmer profile information linked to Supabase Auth users.

**Columns:**
- `id` (UUID, PK) - References `auth.users(id)`
- `full_name` (TEXT) - Farmer's full name
- `province` (TEXT) - Province location
- `farm_size` (TEXT) - Farm size description (e.g., "2-5 hectares")
- `experience_years` (INTEGER) - Years of farming experience
- `primary_crops` (TEXT[]) - Array of primary crop names
- `created_at` (TIMESTAMPTZ) - Record creation timestamp
- `updated_at` (TIMESTAMPTZ) - Last update timestamp
ii
**RLS Policies:**
- Users can only view, insert, and update their own profile

---

### 2. `farms`
Stores multiple farm locations for each user.

**Columns:**
- `id` (UUID, PK) - Auto-generated UUID
- `user_id` (UUID, FK) - References `auth.users(id)`
- `name` (TEXT) - Farm name
- `latitude` (DECIMAL) - Farm latitude (-90 to 90)
- `longitude` (DECIMAL) - Farm longitude (-180 to 180)
- `province` (TEXT) - Province location
- `soil_type` (TEXT) - Soil type description
- `created_at` (TIMESTAMPTZ) - Record creation timestamp
- `updated_at` (TIMESTAMPTZ) - Last update timestamp

**Constraints:**
- Valid latitude range: -90 to 90
- Valid longitude range: -180 to 180

**RLS Policies:**
- Users can only view, insert, update, and delete their own farms

---

### 3. `crop_recommendations`
Stores saved crop recommendations linked to users and farms.

**Columns:**
- `id` (UUID, PK) - Auto-generated UUID
- `user_id` (UUID, FK) - References `auth.users(id)`
- `farm_id` (UUID, FK) - References `farms(id)`
- `crop_name` (TEXT) - Name of the crop
- `crop_category` (TEXT) - Crop category (e.g., "Cereals", "Legumes")
- `suitability_score` (INTEGER) - Score from 0-100
- `suitability_label` (TEXT) - Label (e.g., "Excellent", "Very Good")
- `weather_summary` (TEXT) - Short weather summary
- `temperature_avg` (DECIMAL) - Average temperature
- `temperature_min` (DECIMAL) - Minimum temperature
- `temperature_max` (DECIMAL) - Maximum temperature
- `rainfall_total` (INTEGER) - Total rainfall in mm
- `humidity` (INTEGER) - Humidity percentage
- `recommendation_date` (DATE) - Date of recommendation
- `created_at` (TIMESTAMPTZ) - Record creation timestamp

**Constraints:**
- Suitability score must be between 0 and 100

**RLS Policies:**
- Users can only view, insert, update, and delete their own recommendations

---

### 4. `educational_modules`
Reference table for educational content (read-only for users).

**Columns:**
- `id` (INTEGER, PK) - Module ID
- `title` (TEXT) - Module title
- `description` (TEXT) - Module description
- `duration` (TEXT) - Estimated duration (e.g., "15 min read")
- `created_at` (TIMESTAMPTZ) - Record creation timestamp

**RLS Policies:**
- All authenticated users can view modules

---

### 5. `learning_progress`
Tracks user progress through educational modules.

**Columns:**
- `id` (UUID, PK) - Auto-generated UUID
- `user_id` (UUID, FK) - References `auth.users(id)`
- `module_id` (INTEGER, FK) - References `educational_modules(id)`
- `completed` (BOOLEAN) - Whether module is completed
- `completed_at` (TIMESTAMPTZ) - Completion timestamp
- `progress_percentage` (INTEGER) - Progress from 0-100
- `created_at` (TIMESTAMPTZ) - Record creation timestamp
- `updated_at` (TIMESTAMPTZ) - Last update timestamp

**Constraints:**
- Unique constraint on (user_id, module_id) - one record per user-module
- Progress percentage must be between 0 and 100

**RLS Policies:**
- Users can only view, insert, update, and delete their own progress

---

## Functions & Triggers

### `handle_updated_at()`
Automatically updates the `updated_at` timestamp on record updates.

**Applied to:**
- `user_profiles`
- `farms`
- `learning_progress`

### `handle_new_user()`
Automatically creates a user profile when a new user signs up via Supabase Auth.

**Trigger:** `on_auth_user_created` on `auth.users`

---

## Views

### `user_dashboard`
Aggregated view showing:
- User information
- Total farms count
- Total recommendations count
- Completed modules count

---

## Row Level Security (RLS)

All tables have RLS enabled with policies that ensure:
- Users can only access their own data
- Foreign key relationships are respected
- Data isolation between users

---

## Setup Instructions

1. **Open Supabase Dashboard**
   - Go to your Supabase project
   - Navigate to SQL Editor

2. **Run the Schema**
   - Copy the contents of `supabase_schema.sql`
   - Paste into SQL Editor
   - Click "Run" to execute

3. **Verify Tables**
   - Go to Table Editor
   - Verify all tables are created
   - Check that RLS is enabled on all tables

4. **Test RLS Policies**
   - Create a test user
   - Verify they can only access their own data

---

## Example Queries

### Get user profile with farms
```sql
SELECT 
    up.*,
    json_agg(f.*) as farms
FROM user_profiles up
LEFT JOIN farms f ON f.user_id = up.id
WHERE up.id = auth.uid()
GROUP BY up.id;
```

### Get recent crop recommendations
```sql
SELECT 
    cr.*,
    f.name as farm_name
FROM crop_recommendations cr
JOIN farms f ON f.id = cr.farm_id
WHERE cr.user_id = auth.uid()
ORDER BY cr.recommendation_date DESC
LIMIT 10;
```

### Get learning progress
```sql
SELECT 
    em.title,
    lp.completed,
    lp.progress_percentage
FROM learning_progress lp
JOIN educational_modules em ON em.id = lp.module_id
WHERE lp.user_id = auth.uid()
ORDER BY em.id;
```

---

## Notes

- All timestamps use `TIMESTAMPTZ` for timezone-aware storage
- UUIDs are used for primary keys for better security and distribution
- Foreign keys use `ON DELETE CASCADE` to maintain referential integrity
- Indexes are created on foreign keys for better query performance
- Weather data is NOT stored; it's fetched from external APIs as needed
