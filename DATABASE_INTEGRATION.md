# Database Integration Summary

## Overview
The CropIQ app has been updated to integrate with the Supabase database schema. All user data, farms, crop recommendations, and learning progress are now stored in the database.

## Files Created/Updated

### 1. `database.js` (NEW)
Contains all database helper functions:
- **User Profiles**: `getUserProfile()`, `updateUserProfile()`, `upsertUserProfile()`
- **Farms**: `getUserFarms()`, `createFarm()`, `updateFarm()`, `deleteFarm()`
- **Crop Recommendations**: `getCropRecommendations()`, `saveCropRecommendation()`, `deleteCropRecommendation()`
- **Learning Progress**: `getLearningProgress()`, `updateLearningProgress()`, `completeModule()`
- **Educational Modules**: `getEducationalModules()`
- **Dashboard**: `getDashboardData()`

### 2. `App.js` (UPDATED)
Major updates:
- Added database imports and state management
- Added `loadUserData()` function to fetch user data on login
- Updated `fetchWeatherData()` to:
  - Save farms when location is selected
  - Save crop recommendations to database
- Updated `ProfilePage` to display database data:
  - User profile information
  - Total farms count
  - Saved recommendations count
  - Completed modules count
- Updated `EducationPage` to:
  - Track learning progress
  - Mark modules as completed
  - Show progress percentage

### 3. `signup.js` (ALREADY COMPATIBLE)
- Already passes `full_name` in user metadata
- Database trigger automatically creates profile on signup

## Database Schema Integration

### User Profiles
- Automatically created on signup via database trigger
- Linked to `auth.users.id`
- Stores: name, province, farm_size, experience_years, primary_crops

### Farms
- Created automatically when user selects a location
- Stores: name, latitude, longitude, province, soil_type
- Multiple farms per user supported

### Crop Recommendations
- Saved automatically when weather data is fetched
- Only saves recommendations with suitability >= 80%
- Linked to both user and farm
- Stores weather summary and crop details

### Learning Progress
- Tracks module completion
- Stores progress percentage
- Automatically updates when modules are started/completed

## How It Works

### On Login/Signup:
1. User authenticates via Supabase Auth
2. `loadUserData()` is called automatically
3. Fetches: profile, farms, recommendations, learning progress
4. Sets default farm if available

### When Selecting Location:
1. User selects a location
2. System checks if farm exists (by coordinates)
3. Creates new farm if doesn't exist
4. Fetches weather data
5. Generates crop recommendations
6. Saves top recommendations (suitability >= 80%) to database

### Profile Page:
- Displays all user data from database
- Shows statistics: farms, recommendations, completed modules
- Updates automatically when data changes

### Education Page:
- Tracks which modules user has started
- Shows progress percentage
- Allows marking modules as completed
- Progress is saved to database

## Testing Checklist

- [ ] Run the SQL schema in Supabase
- [ ] Sign up a new user
- [ ] Verify profile is created automatically
- [ ] Select a location and verify farm is created
- [ ] Check that recommendations are saved
- [ ] Start a learning module and verify progress is tracked
- [ ] Complete a module and verify it's marked as complete
- [ ] Check profile page shows correct data
- [ ] Verify RLS policies work (users can only see their own data)

## Next Steps

1. **Run the Database Schema**:
   - Open Supabase Dashboard → SQL Editor
   - Copy and paste `supabase_schema.sql`
   - Execute the script

2. **Test the Integration**:
   - Sign up a new user
   - Select a location
   - Check that data is saved correctly

3. **Optional Enhancements**:
   - Add farm management UI (edit/delete farms)
   - Add recommendation history view
   - Add profile editing functionality
   - Add ability to view saved recommendations by farm

## Notes

- All database operations use Row Level Security (RLS)
- Users can only access their own data
- Foreign key relationships ensure data integrity
- Timestamps are automatically managed
- Profile is created automatically on signup via database trigger
