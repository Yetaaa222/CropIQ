// database.js - Database helper functions for CropIQ
import { supabase } from './supabase.js';

// ============================================
// CONSTANTS & HELPERS
// ============================================

const TABLE_ERRORS = {
  NOT_FOUND: 'PGRST205',
  NOT_FOUND_MSG: 'Could not find the table'
};

/**
 * Check if error is a missing table error
 * @private
 */
const isMissingTableError = (error) => {
  return error?.code === TABLE_ERRORS.NOT_FOUND || 
         error?.message?.includes(TABLE_ERRORS.NOT_FOUND_MSG);
};

/**
 * Get authenticated user with caching
 * @private
 * @param {boolean} throwOnMissing - Whether to throw error if user not found (default: true)
 */
const getAuthenticatedUser = async (throwOnMissing = true) => {
  const { data: { user }, error } = await supabase.auth.getUser();
  
  // Don't throw on session missing - this is expected for logged out users
  if (error && error.name !== 'AuthSessionMissingError') {
    throw error;
  }
  
  if (!user && throwOnMissing) {
    throw new Error('User not authenticated');
  }
  
  return user;
};

/**
 * Check if user is authenticated
 * @returns {Promise<boolean>} True if user is authenticated
 */
export const isAuthenticated = async () => {
  try {
    const user = await getAuthenticatedUser(false);
    return !!user;
  } catch (error) {
    return false;
  }
};

/**
 * Get current authenticated user
 * @returns {Promise<Object|null>} User object or null
 */
export const getCurrentUser = async () => {
  try {
    return await getAuthenticatedUser(false);
  } catch (error) {
    return null;
  }
};

/**
 * Validate required fields
 * @private
 */
const validateRequired = (data, fields) => {
  for (const field of fields) {
    if (!data || data[field] === undefined || data[field] === null || data[field] === '') {
      throw new Error(`${field} is required`);
    }
  }
};

// ============================================
// USER PROFILES
// ============================================

/**
 * Get user profile
 * @returns {Promise<Object|null>} User profile or null if not found/not authenticated
 */
export const getUserProfile = async () => {
  try {
    const user = await getAuthenticatedUser(false); // Don't throw if not authenticated
    if (!user) return null;

    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    // Only log if it's not a session missing error
    if (error.name !== 'AuthSessionMissingError') {
      console.error('Error getting user profile:', error);
    }
    return null;
  }
};

/**
 * Update user profile
 * @param {Object} updates - Updates to apply
 * @param {string} [updates.full_name] - Full name
 * @param {string} [updates.phone_number] - Phone number
 * @param {string} [updates.location] - Location
 * @param {string[]} [updates.selected_crops] - Selected crops
 * @param {Object} [userObj] - Optional user object to avoid redundant auth calls
 * @returns {Promise<Object>} Updated profile
 */
export const updateUserProfile = async (updates, userObj = null) => {
  try {
    if (!updates || Object.keys(updates).length === 0) {
      throw new Error('No updates provided');
    }

    const user = userObj || await getAuthenticatedUser();

    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

/**
 * Create or update user profile
 * @param {Object} profileData - Profile data to upsert
 * @param {Object} [userObj] - Optional user object
 * @returns {Promise<Object>} Upserted profile
 */
export const upsertUserProfile = async (profileData, userObj = null) => {
  try {
    const user = userObj || await getAuthenticatedUser();

    // First try to update existing profile
    const { data: existingData, error: selectError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    // If profile exists, update it
    if (existingData) {
      const { data, error } = await supabase
        .from('user_profiles')
        .update({
          ...profileData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    }

    // If profile doesn't exist, create it
    const { data, error } = await supabase
      .from('user_profiles')
      .insert({
        id: user.id,
        full_name: profileData.full_name || '',
        ...profileData,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error upserting user profile:', error);
    throw error;
  }
};

/**
 * Update selected crops for user
 * @param {string[]} cropNames - Array of crop names to select
 * @param {Object} [userObj] - Optional user object
 * @returns {Promise<Object|null>} Updated profile
 */
export const updateSelectedCrops = async (cropNames, userObj = null) => {
  try {
    if (!Array.isArray(cropNames)) {
      throw new Error('cropNames must be an array');
    }

    const user = userObj || await getAuthenticatedUser();

    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        selected_crops: cropNames,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select()
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating selected crops:', error);
    throw error;
  }
};

/**
 * Upload profile picture to Supabase storage
 * @param {Blob|string} imageData - Image blob or URI to upload
 * @param {string} [userObj] - Optional user object
 * @returns {Promise<string>} Public URL of uploaded image
 */
export const uploadProfilePictureToStorage = async (imageData, userObj = null) => {
  try {
    const user = userObj || await getAuthenticatedUser();
    
    if (!imageData) {
      throw new Error('Image data is required');
    }

    let fileData;
    let fileName;
    let contentType = 'image/jpeg';

    // Handle different input types
    if (typeof imageData === 'string') {
      console.log('Reading local file for upload:', imageData);
      try {
        const response = await fetch(imageData);
        if (!response.ok) {
          throw new Error(`Failed to read image file: ${response.status}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        fileData = arrayBuffer;
      } catch (readError) {
        // Android/Expo can fail to fetch content:// or file:// URIs.
        // Fallback to XHR blob reader for local device URIs.
        console.warn('Primary file read failed, trying XHR fallback:', readError?.message || readError);
        const blob = await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.onload = function onLoad() { resolve(xhr.response); };
          xhr.onerror = function onError() { reject(new Error('XHR fallback failed to read local image URI')); };
          xhr.responseType = 'blob';
          xhr.open('GET', imageData, true);
          xhr.send(null);
        });
        fileData = blob;
      }

      const lowerUri = imageData.toLowerCase();
      if (lowerUri.endsWith('.png')) contentType = 'image/png';
      else if (lowerUri.endsWith('.webp')) contentType = 'image/webp';
      else if (lowerUri.endsWith('.heic')) contentType = 'image/heic';
      else if (lowerUri.endsWith('.jpg') || lowerUri.endsWith('.jpeg')) contentType = 'image/jpeg';
    } else if (imageData instanceof Blob || imageData instanceof ArrayBuffer) {
      fileData = imageData;
    } else {
      throw new Error('Invalid image data type');
    }

    // Generate unique filename
    const extensionMap = {
      'image/png': 'png',
      'image/webp': 'webp',
      'image/heic': 'heic',
      'image/jpeg': 'jpg',
    };
    const fileExtension = extensionMap[contentType] || 'jpg';
    fileName = `${user.id}/${Date.now()}.${fileExtension}`;

    // Upload to Supabase storage bucket (with fallbacks for older setups)
    console.log('--- CROP-IQ-DEBUG: ATTEMPTING STORAGE UPLOAD ---');
    const candidateBuckets = ['profile_pictures', 'crop-images', 'profile-pictures'];
    let uploadedBucket = null;
    let lastError = null;

    for (const bucket of candidateBuckets) {
      console.log(`Uploading to Supabase storage bucket: ${bucket}`);
      const { error } = await supabase.storage
        .from(bucket)
        .upload(fileName, fileData, {
          cacheControl: '3600',
          upsert: true,
          contentType
        });

      if (!error) {
        uploadedBucket = bucket;
        break;
      }

      lastError = error;
      console.error(`Supabase storage upload error (${bucket}):`, error);

      // Try the next bucket only when this bucket does not exist
      if (!(error?.message || '').toLowerCase().includes('bucket not found')) {
        throw error;
      }
    }

    if (!uploadedBucket) {
      throw new Error(
        `Storage bucket not found. Create one of these buckets in Supabase Storage: ${candidateBuckets.join(', ')}. Last error: ${lastError?.message || 'unknown'}`
      );
    }

    // Get public URL
    const { data: publicData } = supabase.storage
      .from(uploadedBucket)
      .getPublicUrl(fileName);

    console.log('Upload successful, public URL:', publicData.publicUrl);
    return publicData.publicUrl;
  } catch (error) {
    console.error('Detailed error in uploadProfilePictureToStorage:', error);
    throw error;
  }
};

/**
 * Delete profile picture from storage
 * @param {string} fileName - File name to delete (e.g., 'userId_timestamp.jpg')
 * @returns {Promise<boolean>} True if deleted successfully
 */
export const deleteProfilePictureFromStorage = async (fileName) => {
  try {
    if (!fileName) {
      throw new Error('File name is required');
    }

    const { error } = await supabase.storage
      .from('profile_pictures')
      .remove([fileName]);

    if (error) {
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error deleting profile picture:', error);
    throw error;
  }
};

/**
 * Update user profile with new profile picture
 * @param {string} pictureUrl - Public URL of the picture
 * @param {Object} [userObj] - Optional user object
 * @returns {Promise<Object>} Updated profile
 */
export const updateProfilePictureUrl = async (pictureUrl, userObj = null) => {
  try {
    const user = userObj || await getAuthenticatedUser();

    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        profile_picture_url: pictureUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating profile picture URL:', error);
    throw error;
  }
};

// ============================================
// FARMS
// ============================================

/**
 * Get all farms for current user
 * @returns {Promise<Object[]>} Array of farms (empty if not authenticated)
 */
export const getUserFarms = async () => {
  try {
    const user = await getAuthenticatedUser(false); // Don't throw if not authenticated
    if (!user) return [];

    const { data, error } = await supabase
      .from('farms')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    if (error.name !== 'AuthSessionMissingError') {
      console.error('Error getting farms:', error);
    }
    return [];
  }
};

/**
 * Get a single farm by ID
 * @param {string} farmId - Farm ID
 * @returns {Promise<Object|null>} Farm object or null
 */
export const getFarmById = async (farmId) => {
  try {
    validateRequired({ farmId }, ['farmId']);
    const user = await getAuthenticatedUser();

    const { data, error } = await supabase
      .from('farms')
      .select('*')
      .eq('id', farmId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting farm:', error);
    return null;
  }
};

/**
 * Create a new farm
 * @param {Object} farmData - Farm data
 * @param {string} farmData.name - Farm name (required)
 * @param {number} farmData.latitude - Latitude (required)
 * @param {number} farmData.longitude - Longitude (required)
 * @param {string} farmData.province - Province location (required)
 * @param {string} [farmData.soil_type] - Soil type
 * @returns {Promise<Object>} Created farm
 */
export const createFarm = async (farmData) => {
  try {
    validateRequired(farmData, ['name', 'latitude', 'longitude', 'province']);
    
    // Validate coordinates
    if (farmData.latitude < -90 || farmData.latitude > 90) {
      throw new Error('Latitude must be between -90 and 90');
    }
    if (farmData.longitude < -180 || farmData.longitude > 180) {
      throw new Error('Longitude must be between -180 and 180');
    }
    
    const user = await getAuthenticatedUser();

    const { data, error } = await supabase
      .from('farms')
      .insert({
        user_id: user.id,
        ...farmData,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating farm:', error);
    throw error;
  }
};

/**
 * Update a farm
 * @param {string} farmId - Farm ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated farm
 */
export const updateFarm = async (farmId, updates) => {
  try {
    validateRequired({ farmId }, ['farmId']);
    
    if (!updates || Object.keys(updates).length === 0) {
      throw new Error('No updates provided');
    }

    const user = await getAuthenticatedUser();

    const { data, error } = await supabase
      .from('farms')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', farmId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating farm:', error);
    throw error;
  }
};

/**
 * Delete a farm
 * @param {string} farmId - Farm ID
 * @returns {Promise<boolean>} Success status
 */
export const deleteFarm = async (farmId) => {
  try {
    validateRequired({ farmId }, ['farmId']);
    
    const user = await getAuthenticatedUser();

    const { error } = await supabase
      .from('farms')
      .delete()
      .eq('id', farmId)
      .eq('user_id', user.id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting farm:', error);
    throw error;
  }
};

// ============================================
// CROP RECOMMENDATIONS
// ============================================

/**
 * Get crop recommendations for a user
 * @param {string} [farmId] - Optional farm ID to filter by
 * @returns {Promise<Object[]>} Array of recommendations (empty if not authenticated)
 */
export const getCropRecommendations = async (farmId = null) => {
  try {
    const user = await getAuthenticatedUser(false); // Don't throw if not authenticated
    if (!user) return [];

    let query = supabase
      .from('crop_recommendations')
      .select(`
        *,
        farms (
          id,
          name,
          province
        )
      `)
      .eq('user_id', user.id)
      .order('recommendation_date', { ascending: false });

    if (farmId) {
      query = query.eq('farm_id', farmId);
    }

    const { data, error } = await query;

    if (error) {
      if (isMissingTableError(error)) {
        console.warn('Crop recommendations table not found');
        return [];
      }
      throw error;
    }
    
    return data || [];
  } catch (error) {
    if (error.name !== 'AuthSessionMissingError') {
      console.error('Error getting crop recommendations:', error);
    }
    return [];
  }
};

/**
 * Save a crop recommendation
 * @param {Object} recommendationData - Recommendation data
 * @param {string} recommendationData.farm_id - Farm ID (required)
 * @param {string} recommendationData.crop_name - Crop name (required)
 * @param {number} recommendationData.suitability_score - Suitability score 0-100 (required)
 * @param {string} [recommendationData.crop_category] - Crop category
 * @param {string} [recommendationData.suitability_label] - Suitability label (e.g., "Excellent")
 * @param {string} [recommendationData.weather_summary] - Weather summary
 * @param {number} [recommendationData.temperature_avg] - Average temperature
 * @param {number} [recommendationData.temperature_min] - Minimum temperature
 * @param {number} [recommendationData.temperature_max] - Maximum temperature
 * @param {number} [recommendationData.rainfall_total] - Total rainfall in mm
 * @param {number} [recommendationData.humidity] - Humidity percentage
 * @returns {Promise<Object|null>} Created recommendation or null
 */
export const saveCropRecommendation = async (recommendationData) => {
  try {
    validateRequired(recommendationData, ['farm_id', 'crop_name', 'suitability_score']);
    
    // Validate suitability score
    const score = recommendationData.suitability_score;
    if (typeof score !== 'number' || score < 0 || score > 100) {
      throw new Error('suitability_score must be a number between 0 and 100');
    }
    
    const user = await getAuthenticatedUser();

    const { data, error } = await supabase
      .from('crop_recommendations')
      .insert({
        user_id: user.id,
        ...recommendationData,
        recommendation_date: recommendationData.recommendation_date || 
                           new Date().toISOString().split('T')[0],
      })
      .select()
      .single();

    if (error) {
      if (isMissingTableError(error)) {
        console.warn('Crop recommendations table not found');
        return null;
      }
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error saving crop recommendation:', error);
    return null;
  }
};

/**
 * Delete a crop recommendation
 * @param {string} recommendationId - Recommendation ID
 * @returns {Promise<boolean>} Success status
 */
export const deleteCropRecommendation = async (recommendationId) => {
  try {
    validateRequired({ recommendationId }, ['recommendationId']);
    
    const user = await getAuthenticatedUser();

    const { error } = await supabase
      .from('crop_recommendations')
      .delete()
      .eq('id', recommendationId)
      .eq('user_id', user.id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting crop recommendation:', error);
    throw error;
  }
};

// ============================================
// LEARNING PROGRESS
// ============================================

/**
 * Get learning progress for current user
 * @returns {Promise<Object[]>} Array of progress records (empty if not authenticated)
 */
export const getLearningProgress = async () => {
  try {
    const user = await getAuthenticatedUser(false); // Don't throw if not authenticated
    if (!user) return [];

    const { data, error } = await supabase
      .from('learning_progress')
      .select(`
        *,
        educational_modules (
          id,
          title,
          description,
          duration
        )
      `)
      .eq('user_id', user.id)
      .order('module_id', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    if (error.name !== 'AuthSessionMissingError') {
      console.error('Error getting learning progress:', error);
    }
    return [];
  }
};

/**
 * Update learning progress
 * @param {string|number} moduleId - Module ID
 * @param {Object} progressData - Progress data
 * @param {boolean} [progressData.completed] - Completion status
 * @param {number} [progressData.progress_percentage] - Progress percentage (0-100)
 * @returns {Promise<Object>} Updated progress
 */
export const updateLearningProgress = async (moduleId, progressData) => {
  try {
    validateRequired({ moduleId }, ['moduleId']);
    
    const user = await getAuthenticatedUser();

    // Validate progress percentage if provided
    if (progressData.progress_percentage !== undefined) {
      const percentage = progressData.progress_percentage;
      if (typeof percentage !== 'number' || percentage < 0 || percentage > 100) {
        throw new Error('progress_percentage must be a number between 0 and 100');
      }
    }

    const updateData = {
      user_id: user.id,
      module_id: moduleId,
      ...progressData,
      updated_at: new Date().toISOString(),
    };

    // If marking as completed, set completed_at
    if (progressData.completed && !progressData.completed_at) {
      updateData.completed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('learning_progress')
      .upsert(updateData, {
        onConflict: 'user_id,module_id',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating learning progress:', error);
    throw error;
  }
};

/**
 * Mark module as completed
 * @param {string|number} moduleId - Module ID
 * @returns {Promise<Object>} Updated progress
 */
export const completeModule = async (moduleId) => {
  return await updateLearningProgress(moduleId, {
    completed: true,
    progress_percentage: 100,
    completed_at: new Date().toISOString(),
  });
};

// ============================================
// EDUCATIONAL MODULES
// ============================================

/**
 * Get all educational modules
 * @returns {Promise<Object[]>} Array of modules
 */
export const getEducationalModules = async () => {
  try {
    const { data, error } = await supabase
      .from('educational_modules')
      .select('*')
      .order('id', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting educational modules:', error);
    return [];
  }
};

/**
 * Get a single educational module by ID
 * @param {string|number} moduleId - Module ID
 * @returns {Promise<Object|null>} Module object or null
 */
export const getModuleById = async (moduleId) => {
  try {
    validateRequired({ moduleId }, ['moduleId']);

    const { data, error } = await supabase
      .from('educational_modules')
      .select('*')
      .eq('id', moduleId)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting module:', error);
    return null;
  }
};

/**
 * Get ordered paragraphs for a module
 * @param {string|number} moduleId - Module ID
 * @returns {Promise<Object[]>} Array of paragraph objects { type, paragraph, image_url }
 */
export const getModuleParagraphs = async (moduleId) => {
  try {
    validateRequired({ moduleId }, ['moduleId']);
    const { data, error } = await supabase
      .from('educational_module_paragraphs')
      .select('type, paragraph, image_url, order_index')
      .eq('module_id', moduleId)
      .order('order_index', { ascending: true });
    if (error) throw error;
    return (data || []).map(row => ({
      type: row.type || 'text',
      value: row.paragraph,
      uri: row.image_url,
    }));
  } catch (error) {
    if (isMissingTableError(error)) {
      console.warn('educational_module_paragraphs not found; returning empty content');
      return [];
    }
    console.error('Error getting module paragraphs:', error);
    return [];
  }
};

// ============================================
// DASHBOARD DATA
// ============================================

/**
 * Get dashboard data for current user
 * @returns {Promise<Object|null>} Dashboard data with stats (null if not authenticated)
 */
export const getDashboardData = async () => {
  try {
    const user = await getAuthenticatedUser(false); // Don't throw if not authenticated
    if (!user) return null;

    // Get all data in parallel for better performance
    const [profile, farms, recommendations, progress] = await Promise.all([
      getUserProfile(),
      getUserFarms(),
      getCropRecommendations(),
      getLearningProgress(),
    ]);

    return {
      profile,
      farms,
      recommendations,
      progress,
      stats: {
        totalFarms: farms?.length || 0,
        totalRecommendations: recommendations?.length || 0,
        completedModules: progress?.filter(p => p.completed).length || 0,
        totalModules: progress?.length || 0,
        completionRate: progress?.length > 0 
          ? Math.round((progress.filter(p => p.completed).length / progress.length) * 100)
          : 0,
      },
    };
  } catch (error) {
    if (error.name !== 'AuthSessionMissingError') {
      console.error('Error getting dashboard data:', error);
    }
    return null;
  }
};

// ============================================
// CROPS
// ============================================

/**
 * Transform database crop to frontend format
 * @private
 */
const transformCrop = (crop) => {
  if (!crop) return null;
  
  return {
    id: crop.id,
    name: crop.name || 'Unknown',
    fullName: crop.full_name || crop.name || 'Unknown',
    category: crop.category || 'Uncategorized',
    suitability: crop.suitability_baseline || 0,
    suitabilityLabel: crop.suitability_label || 'Unknown',
    description: crop.description || '',
    shortDescription: crop.short_description || crop.description || '',
    // Priority: Use image_url if available, fallback to image_emoji
    image: crop.image_url || crop.image_emoji || '🌱',
    imageUrl: crop.image_url || null,
    imagePath: crop.image_path || null,
    tempRange: (crop.temp_range_min !== null && crop.temp_range_max !== null)
      ? `${crop.temp_range_min}-${crop.temp_range_max}°C`
      : 'Variable',
    rainfall: (crop.rainfall_min !== null && crop.rainfall_max !== null)
      ? `${crop.rainfall_min}-${crop.rainfall_max}mm`
      : 'Variable',
    humidity: (crop.humidity_min !== null && crop.humidity_max !== null)
      ? `${crop.humidity_min}-${crop.humidity_max}%`
      : 'Variable',
    soil: crop.soil_type || 'Various',
    growingSeason: (crop.growing_season_min && crop.growing_season_max)
      ? `${crop.growing_season_min}-${crop.growing_season_max} days`
      : 'Variable',
    growingMonths: crop.growing_months || 'Year-round',
    waterNeeds: crop.water_needs || 'Moderate',
    plantingDepth: (crop.planting_depth_min && crop.planting_depth_max)
      ? `${crop.planting_depth_min}-${crop.planting_depth_max} ${crop.planting_depth_unit || 'cm'}`
      : 'Variable',
    spacing: (crop.spacing_rows && crop.spacing_plants)
      ? `${crop.spacing_rows}, ${crop.spacing_plants}`
      : 'Variable',
    companionPlants: crop.companion_plants || 'None specified',
    commonDiseases: crop.common_diseases || [],
    management: crop.management_practices || 'Standard practices',
  };
};

/**
 * Get all available crops
 * @returns {Promise<Object[]>} Array of crops in frontend format
 */
export const getAllCrops = async () => {
  try {
    const { data, error } = await supabase
      .from('crops')
      .select('*')
      .order('id', { ascending: true });

    if (error) throw error;
    
    return (data || []).map(transformCrop).filter(Boolean);
  } catch (error) {
    console.error('Error getting crops:', error);
    return [];
  }
};

/**
 * Get a single crop by ID
 * @param {string|number} cropId - Crop ID
 * @returns {Promise<Object|null>} Crop object or null
 */
export const getCropById = async (cropId) => {
  try {
    validateRequired({ cropId }, ['cropId']);

    const { data, error } = await supabase
      .from('crops')
      .select('*')
      .eq('id', cropId)
      .maybeSingle();

    if (error) throw error;
    return transformCrop(data);
  } catch (error) {
    console.error('Error getting crop:', error);
    return null;
  }
};

/**
 * Get crops by category
 * @param {string} category - Crop category
 * @returns {Promise<Object[]>} Array of crops
 */
export const getCropsByCategory = async (category) => {
  try {
    validateRequired({ category }, ['category']);

    const { data, error } = await supabase
      .from('crops')
      .select('*')
      .eq('category', category)
      .order('name', { ascending: true });

    if (error) throw error;
    return (data || []).map(transformCrop).filter(Boolean);
  } catch (error) {
    console.error('Error getting crops by category:', error);
    return [];
  }
};

// ============================================
// BATCH OPERATIONS
// ============================================

/**
 * Batch create multiple farms
 * @param {Object[]} farmsData - Array of farm data objects
 * @returns {Promise<Object[]>} Array of created farms
 */
export const batchCreateFarms = async (farmsData) => {
  try {
    if (!Array.isArray(farmsData) || farmsData.length === 0) {
      throw new Error('farmsData must be a non-empty array');
    }

    // Validate all farms have required fields
    farmsData.forEach((farm, index) => {
      validateRequired(farm, ['name']);
    });

    const user = await getAuthenticatedUser();

    const farmsToInsert = farmsData.map(farm => ({
      user_id: user.id,
      ...farm,
    }));

    const { data, error } = await supabase
      .from('farms')
      .insert(farmsToInsert)
      .select();

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error batch creating farms:', error);
    throw error;
  }
};

/**
 * Test the connection to Supabase
 * @returns {Promise<boolean>} True if connection is successful
 */
export const testSupabaseConnection = async () => {
  try {
    console.log('--- CROP-IQ-DEBUG: TESTING SUPABASE CONNECTION ---');
    console.log('Supabase URL:', supabase.supabaseUrl);
    
    const { data, error } = await supabase
      .from('educational_modules')
      .select('id')
      .limit(1);
      
    if (error) {
      console.error('Supabase connection test failed:', error);
      return false;
    }
    
    console.log('Supabase connection test SUCCESSFUL. Data received:', data);
    return true;
  } catch (error) {
    console.error('Supabase connection test FATAL error:', error);
    return false;
  }
};

// ============================================
// EXPORTS
// ============================================

export default {
  // Auth helpers
  isAuthenticated,
  getCurrentUser,
  
  // User Profiles
  getUserProfile,
  updateUserProfile,
  upsertUserProfile,
  updateSelectedCrops,
  uploadProfilePictureToStorage,
  deleteProfilePictureFromStorage,
  updateProfilePictureUrl,
  
  // Farms
  getUserFarms,
  getFarmById,
  createFarm,
  updateFarm,
  deleteFarm,
  batchCreateFarms,
  
  // Crop Recommendations
  getCropRecommendations,
  saveCropRecommendation,
  deleteCropRecommendation,
  
  // Learning Progress
  getLearningProgress,
  updateLearningProgress,
  completeModule,
  
  // Educational Modules
  getEducationalModules,
  getModuleById,
  getModuleParagraphs,
  
  // Dashboard
  getDashboardData,
  
  // Crops
  getAllCrops,
  getCropById,
  getCropsByCategory,
  testSupabaseConnection,
};