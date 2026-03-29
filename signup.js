// signup.js - CropIQ Signup Page with OTP Support
import React, { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  Platform,
  Image,
} from 'react-native';
const { KeyboardAvoidingView: RNKeyboardAvoidingView } = require('react-native');
const CompatKeyboardAvoidingView = RNKeyboardAvoidingView || View;
import styles from './Styles.js';
import { supabase } from './supabase.js';

const SignupPage = ({ onSignup, onSwitchToLogin, navigation }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [useOTP, setUseOTP] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  // Password-based signup
  const handlePasswordSignup = async () => {
    // Validation
    if (!name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      setError('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: password,
        options: {
          data: {
            full_name: name.trim(),
          },
        },
      });

      if (signUpError) {
        throw signUpError;
      }

      if (data?.user && onSignup) {
        onSignup({ 
          name: name.trim(),
          email: data.user.email,
          id: data.user.id,
          user: data.user 
        });
      }
    } catch (err) {
      console.error('Signup error:', err);
      
      // Handle specific Supabase errors
      let errorMessage = err.message || 'Signup failed. Please try again.';
      
      if (err.message?.includes('invalid')) {
        errorMessage = 'Email address format is invalid. Please check and try again.';
      } else if (err.message?.includes('already registered')) {
        errorMessage = 'This email is already registered. Please log in or use a different email.';
      } else if (err.message?.includes('rate limit')) {
        errorMessage = 'Too many signup attempts. Please try again in a few minutes.';
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Send OTP for signup
  const handleSendOTP = async () => {
    if (!name.trim() || !email.trim()) {
      setError('Please enter your name and email');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // For signup, we use signInWithOtp which will create the user if they don't exist
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          data: {
            full_name: name.trim(),
          },
          shouldCreateUser: true, // Allow new user creation via OTP
        }
      });

      if (otpError) {
        setError(otpError.message || 'Failed to send verification code. Please try again.');
        return;
      }

      setOtpSent(true);
      setError(null);
    } catch (err) {
      console.error('OTP send error:', err);
      setError(err.message || 'Failed to send verification code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Verify OTP and complete signup
  const handleVerifyOTP = async () => {
    if (!otp.trim()) {
      setError('Please enter the verification code');
      return;
    }

    if (otp.trim().length !== 6) {
      setError('Verification code must be 6 digits');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: otp.trim(),
        type: 'email',
      });

      if (verifyError) {
        setError(verifyError.message || 'Invalid verification code. Please try again.');
        return;
      }

      if (data?.user) {
        // Update user metadata with name if not already set
        if (name.trim() && !data.user.user_metadata?.full_name) {
          await supabase.auth.updateUser({
            data: { full_name: name.trim() }
          });
        }

        if (onSignup) {
          onSignup({ 
            name: name.trim(),
            email: data.user.email,
            id: data.user.id,
            user: data.user 
          });
        }
      } else {
        setError('Signup failed. Please try again.');
      }
    } catch (err) {
      console.error('OTP verify error:', err);
      setError(err.message || 'Invalid verification code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset OTP state
  const handleBackToEmail = () => {
    setOtpSent(false);
    setOtp('');
    setError(null);
  };

  return (
    <SafeAreaView style={styles.loginSafeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#16a34a" />
      <CompatKeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.loginContainer}
      >
        <ScrollView
          contentContainerStyle={styles.loginScrollContent}
          keyboardShouldPersistTaps="always"
        >
          <View style={styles.loginHeader}>
            <Image 
              source={require('./assets/logo.png')} 
              style={styles.loginLogo}
              resizeMode="contain"
            />
            <Text style={styles.loginSubtitle}>Create Account</Text>
            <Text style={styles.loginDescription}>
              {useOTP 
                ? 'Sign up with email verification code' 
                : 'Sign up to get personalized crop recommendations'}
            </Text>
          </View>

          <View style={styles.loginForm}>
            {error && (
              <View style={styles.loginErrorBox}>
                <Ionicons name="alert-circle" size={20} color="#ef4444" />
                <Text style={styles.loginErrorText}>{error}</Text>
              </View>
            )}

            {/* Name input - always shown */}
            <View style={styles.loginInputContainer}>
              <Ionicons name="person-outline" size={20} color="#6b7280" style={styles.loginInputIcon} />
              <TextInput
                style={styles.loginInput}
                placeholder="Full Name"
                placeholderTextColor="#9ca3af"
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  setError(null);
                }}
                autoCapitalize="words"
                autoCorrect={false}
                editable={!isLoading && !otpSent}
              />
            </View>

            {/* Email input - always shown */}
            <View style={styles.loginInputContainer}>
              <Ionicons name="mail-outline" size={20} color="#6b7280" style={styles.loginInputIcon} />
              <TextInput
                style={styles.loginInput}
                placeholder="Email"
                placeholderTextColor="#9ca3af"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  setError(null);
                }}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                editable={!isLoading && !otpSent}
              />
            </View>

            {/* Show OTP input if OTP was sent */}
            {useOTP && otpSent ? (
              <>
                <View style={styles.loginInputContainer}>
                  <Ionicons name="keypad-outline" size={20} color="#6b7280" style={styles.loginInputIcon} />
                  <TextInput
                    style={styles.loginInput}
                    placeholder="Enter 6-digit code"
                    placeholderTextColor="#9ca3af"
                    value={otp}
                    onChangeText={(text) => {
                      setOtp(text);
                      setError(null);
                    }}
                    keyboardType="number-pad"
                    maxLength={6}
                    editable={!isLoading}
                  />
                </View>

                <TouchableOpacity
                  onPress={handleBackToEmail}
                  style={styles.loginForgotPassword}
                >
                  <Text style={styles.loginForgotPasswordText}>← Back to email</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
                  onPress={handleVerifyOTP}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.loginButtonText}>Verify & Sign Up</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleSendOTP}
                  disabled={isLoading}
                  style={styles.loginForgotPassword}
                >
                  <Text style={styles.loginForgotPasswordText}>Resend code</Text>
                </TouchableOpacity>
              </>
            ) : useOTP ? (
              // OTP mode but not sent yet
              <>
                <TouchableOpacity
                  style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
                  onPress={handleSendOTP}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.loginButtonText}>Send Verification Code</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              // Password mode
              <>
                <View style={styles.loginInputContainer}>
                  <Ionicons name="lock-closed-outline" size={20} color="#6b7280" style={styles.loginInputIcon} />
                  <TextInput
                    style={styles.loginInput}
                    placeholder="Password"
                    placeholderTextColor="#9ca3af"
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      setError(null);
                    }}
                    secureTextEntry={!showPassword}
                    editable={!isLoading}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.loginPasswordToggle}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color="#6b7280"
                    />
                  </TouchableOpacity>
                </View>

                <View style={styles.loginInputContainer}>
                  <Ionicons name="lock-closed-outline" size={20} color="#6b7280" style={styles.loginInputIcon} />
                  <TextInput
                    style={styles.loginInput}
                    placeholder="Confirm Password"
                    placeholderTextColor="#9ca3af"
                    value={confirmPassword}
                    onChangeText={(text) => {
                      setConfirmPassword(text);
                      setError(null);
                    }}
                    secureTextEntry={!showConfirmPassword}
                    editable={!isLoading}
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={styles.loginPasswordToggle}
                  >
                    <Ionicons
                      name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color="#6b7280"
                    />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
                  onPress={handlePasswordSignup}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.loginButtonText}>Sign Up</Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            <View style={styles.loginDivider}>
              <View style={styles.loginDividerLine} />
              <Text style={styles.loginDividerText}>OR</Text>
              <View style={styles.loginDividerLine} />
            </View>

            {/* Toggle between password and OTP */}
            <TouchableOpacity
              style={[styles.loginButton, { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#22c55e' }]}
              onPress={() => {
                setUseOTP(!useOTP);
                setOtpSent(false);
                setOtp('');
                setPassword('');
                setConfirmPassword('');
                setError(null);
              }}
              disabled={isLoading}
            >
              <Ionicons 
                name={useOTP ? 'lock-closed-outline' : 'logo-google'}
                size={20}
                color="#22c55e"
                style={{ marginRight: 8 }}
              />
              <Text style={[styles.loginButtonText, { color: '#22c55e' }]}>
                {useOTP ? 'Use Password Instead' : 'Sign in with Google'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.loginSignupLink}
              onPress={() => {
                if (onSwitchToLogin) {
                  onSwitchToLogin();
                } else if (navigation) {
                  navigation.navigate('Login');
                }
              }}
            >
              <Text style={styles.loginSignupLinkText}>
                Already have an account? <Text style={styles.loginSignupLinkBold}>Sign In</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </CompatKeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default SignupPage;