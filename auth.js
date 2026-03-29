// auth.js - Authentication helper functions for CropIQ (React Native/Expo)
import { supabase } from './supabase.js';

// ============================================
// SIGN UP
// ============================================

/**
 * Sign up a new user with email and password
 * Creates user profile automatically via database trigger
 * @param {Object} credentials - User credentials
 * @param {string} credentials.email - User email
 * @param {string} credentials.password - User password (min 6 characters)
 * @param {string} credentials.fullName - User's full name
 * @param {Object} [additionalData] - Additional profile data (province, farm_size, etc.)
 * @returns {Promise<Object>} { user, session, error, needsEmailConfirmation }
 */
export const signUp = async ({ email, password, fullName }, additionalData = {}) => {
  try {
    // Validate inputs
    if (!email?.trim() || !password || !fullName?.trim()) {
      throw new Error('Email, password, and full name are required');
    }

    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      throw new Error('Please enter a valid email address');
    }

    // Sign up with Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          ...additionalData
        }
      }
    });

    if (error) throw error;

    // Note: User profile is automatically created by the database trigger
    // defined in your SQL: handle_new_user()

    return {
      user: data.user,
      session: data.session,
      error: null,
      needsEmailConfirmation: !data.session // true if email confirmation required
    };
  } catch (error) {
    console.error('Error signing up:', error);
    return {
      user: null,
      session: null,
      error: error.message || 'Signup failed. Please try again.'
    };
  }
};

// ============================================
// SIGN IN
// ============================================

/**
 * Sign in with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} { user, session, error }
 */
export const signIn = async (email, password) => {
  try {
    if (!email?.trim() || !password) {
      throw new Error('Email and password are required');
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      // Handle specific error cases
      if (error.message.includes('Invalid login credentials')) {
        throw new Error('Invalid email or password. Please try again.');
      } else if (error.message.includes('Email not confirmed')) {
        throw new Error('Please verify your email address before signing in.');
      }
      throw error;
    }

    return {
      user: data.user,
      session: data.session,
      error: null
    };
  } catch (error) {
    console.error('Error signing in:', error);
    return {
      user: null,
      session: null,
      error: error.message || 'Login failed. Please try again.'
    };
  }
};

// ============================================
// EMAIL OTP (NEW)
// ============================================

/**
 * Send OTP code to user's email
 * @param {string} email - User email
 * @returns {Promise<Object>} { error }
 */
export const sendEmailOTP = async (email) => {
  try {
    if (!email?.trim()) {
      throw new Error('Email is required');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      throw new Error('Please enter a valid email address');
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
    });

    if (error) throw error;

    return { error: null };
  } catch (error) {
    console.error('Error sending OTP:', error);
    return { error: error.message || 'Failed to send OTP. Please try again.' };
  }
};

/**
 * Verify OTP code
 * @param {string} email - User email
 * @param {string} token - 6-digit OTP code
 * @returns {Promise<Object>} { user, session, error }
 */
export const verifyEmailOTP = async (email, token) => {
  try {
    if (!email?.trim() || !token?.trim()) {
      throw new Error('Email and OTP code are required');
    }

    if (token.trim().length !== 6) {
      throw new Error('OTP code must be 6 digits');
    }

    const { data, error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: token.trim(),
      type: 'email',
    });

    if (error) throw error;

    return {
      user: data.user,
      session: data.session,
      error: null
    };
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return {
      user: null,
      session: null,
      error: error.message || 'Invalid OTP code. Please try again.'
    };
  }
};

// ============================================
// SIGN OUT
// ============================================

/**
 * Sign out the current user
 * @returns {Promise<Object>} { error }
 */
export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;

    return { error: null };
  } catch (error) {
    console.error('Error signing out:', error);
    return { error: error.message };
  }
};

// ============================================
// PASSWORD RESET
// ============================================

/**
 * Send password reset email
 * @param {string} email - User email
 * @param {string} [redirectTo] - Custom redirect URL (default: cropiq://reset-password)
 * @returns {Promise<Object>} { error }
 */
export const sendPasswordReset = async (email, redirectTo = 'cropiq://reset-password') => {
  try {
    if (!email?.trim()) {
      throw new Error('Email is required');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      throw new Error('Please enter a valid email address');
    }

    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo }
    );

    if (error) throw error;

    return { error: null };
  } catch (error) {
    console.error('Error sending password reset:', error);
    return { error: error.message || 'Failed to send password reset email' };
  }
};

/**
 * Update user password
 * @param {string} newPassword - New password (min 6 characters)
 * @returns {Promise<Object>} { error }
 */
export const updatePassword = async (newPassword) => {
  try {
    if (!newPassword || newPassword.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) throw error;

    return { error: null };
  } catch (error) {
    console.error('Error updating password:', error);
    return { error: error.message || 'Failed to update password' };
  }
};

// ============================================
// SESSION MANAGEMENT
// ============================================

/**
 * Get current session
 * @returns {Promise<Object|null>} Current session or null
 */
export const getSession = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
  } catch (error) {
    if (error.name !== 'AuthSessionMissingError') {
      console.error('Error getting session:', error);
    }
    return null;
  }
};

/**
 * Get current user
 * @returns {Promise<Object|null>} Current user or null
 */
export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error && error.name !== 'AuthSessionMissingError') {
      throw error;
    }
    return user;
  } catch (error) {
    if (error.name !== 'AuthSessionMissingError') {
      console.error('Error getting current user:', error);
    }
    return null;
  }
};

/**
 * Check if user is authenticated
 * @returns {Promise<boolean>} True if authenticated
 */
export const isAuthenticated = async () => {
  const session = await getSession();
  return !!session;
};

/**
 * Refresh the current session
 * @returns {Promise<Object>} { session, error }
 */
export const refreshSession = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.refreshSession();
    if (error) throw error;

    return { session, error: null };
  } catch (error) {
    console.error('Error refreshing session:', error);
    return { session: null, error: error.message };
  }
};

// ============================================
// AUTH STATE LISTENER
// ============================================

/**
 * Listen to auth state changes
 * @param {Function} callback - Callback function (event, session) => {}
 * @returns {Object} Subscription object with unsubscribe method
 * 
 * Events: SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, USER_UPDATED, PASSWORD_RECOVERY
 */
export const onAuthStateChange = (callback) => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {
      console.log('Auth event:', event);
      callback(event, session);
    }
  );

  return subscription;
};

// ============================================
// PROFILE UPDATES
// ============================================

/**
 * Update user email
 * @param {string} newEmail - New email address
 * @returns {Promise<Object>} { error }
 */
export const updateEmail = async (newEmail) => {
  try {
    if (!newEmail?.trim()) {
      throw new Error('Email is required');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail.trim())) {
      throw new Error('Please enter a valid email address');
    }

    const { error } = await supabase.auth.updateUser({
      email: newEmail.trim().toLowerCase()
    });

    if (error) throw error;

    return { error: null };
  } catch (error) {
    console.error('Error updating email:', error);
    return { error: error.message || 'Failed to update email' };
  }
};

/**
 * Update user metadata
 * @param {Object} metadata - User metadata
 * @returns {Promise<Object>} { error }
 */
export const updateUserMetadata = async (metadata) => {
  try {
    const { error } = await supabase.auth.updateUser({
      data: metadata
    });

    if (error) throw error;

    return { error: null };
  } catch (error) {
    console.error('Error updating user metadata:', error);
    return { error: error.message || 'Failed to update metadata' };
  }
};

// ============================================
// UTILITIES
// ============================================

/**
 * Check if email is valid
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Check if password meets requirements
 * @param {string} password - Password to validate
 * @returns {Object} { valid, message }
 */
export const validatePassword = (password) => {
  if (!password) {
    return { valid: false, message: 'Password is required' };
  }
  if (password.length < 6) {
    return { valid: false, message: 'Password must be at least 6 characters' };
  }
  return { valid: true, message: '' };
};

/**
 * Get user-friendly error message
 * @param {Error} error - Error object
 * @returns {string} User-friendly error message
 */
export const getErrorMessage = (error) => {
  if (!error) return 'An unknown error occurred';
  
  const message = error.message || error;
  
  // Map common errors to user-friendly messages
  const errorMap = {
    'Invalid login credentials': 'Invalid email or password. Please try again.',
    'Email not confirmed': 'Please verify your email address before signing in.',
    'User already registered': 'An account with this email already exists.',
    'Password should be at least 6 characters': 'Password must be at least 6 characters.',
    'Invalid OTP': 'Invalid or expired code. Please try again.',
  };
  
  for (const [key, value] of Object.entries(errorMap)) {
    if (message.includes(key)) {
      return value;
    }
  }
  
  return message;
};



export default {
  // Sign up / Sign in
  signUp,
  signIn,
  signOut,
  
  // Email OTP
  sendEmailOTP,
  verifyEmailOTP,
  
  // Password management
  sendPasswordReset,
  updatePassword,
  
  // Session
  getSession,
  getCurrentUser,
  isAuthenticated,
  refreshSession,
  
  // Auth state
  onAuthStateChange,
  
  // Profile
  updateEmail,
  updateUserMetadata,
  
  // Utilities
  isValidEmail,
  validatePassword,
  getErrorMessage,
};