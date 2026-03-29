// login.js - CropIQ Login Page with OTP Support
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

const LoginPage = ({ onLogin, onSwitchToSignup, navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [useOTP, setUseOTP] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  // Handle password login
  const handlePasswordLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password,
      });

      if (signInError) {
        if (signInError.message.includes('Invalid login credentials')) {
          setError('Invalid email or password. Please try again.');
        } else if (signInError.message.includes('Email not confirmed')) {
          setError('Please verify your email address before signing in.');
        } else {
          setError(signInError.message || 'Login failed. Please try again.');
        }
        return;
      }

      if (data?.user) {
        if (onLogin) {
          onLogin({ 
            email: data.user.email,
            id: data.user.id,
            user: data.user 
          });
        }
      } else {
        setError('Login failed. Please try again.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Send OTP to email
  const handleSendOTP = async () => {
    if (!email.trim()) {
      setError('Please enter your email address');
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
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
      });

      if (otpError) {
        setError(otpError.message || 'Failed to send OTP. Please try again.');
        return;
      }

      setOtpSent(true);
      setError(null);
    } catch (err) {
      console.error('OTP send error:', err);
      setError(err.message || 'Failed to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Verify OTP
  const handleVerifyOTP = async () => {
    if (!otp.trim()) {
      setError('Please enter the OTP code');
      return;
    }

    if (otp.trim().length !== 6) {
      setError('OTP code must be 6 digits');
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
        setError(verifyError.message || 'Invalid OTP code. Please try again.');
        return;
      }

      if (data?.user) {
        if (onLogin) {
          onLogin({ 
            email: data.user.email,
            id: data.user.id,
            user: data.user 
          });
        }
      } else {
        setError('Login failed. Please try again.');
      }
    } catch (err) {
      console.error('OTP verify error:', err);
      setError(err.message || 'Invalid OTP code. Please try again.');
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
            <Text style={styles.loginSubtitle}>Welcome back!</Text>
            <Text style={styles.loginDescription}>
              {useOTP 
                ? 'Sign in with email verification code' 
                : 'Sign in to access your crop recommendations'}
            </Text>
          </View>

          <View style={styles.loginForm}>
            {error && (
              <View style={styles.loginErrorBox}>
                <Ionicons name="alert-circle" size={20} color="#ef4444" />
                <Text style={styles.loginErrorText}>{error}</Text>
              </View>
            )}

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
                    <Text style={styles.loginButtonText}>Verify Code</Text>
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
                    <Text style={styles.loginButtonText}>Send Code</Text>
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

                <TouchableOpacity
                  style={styles.loginForgotPassword}
                  onPress={async () => {
                    if (!email.trim()) {
                      setError('Please enter your email address first');
                      return;
                    }
                    
                    try {
                      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
                        email.trim().toLowerCase(),
                        { redirectTo: 'cropiq://reset-password' }
                      );
                      
                      if (resetError) {
                        setError('Failed to send password reset email. Please try again.');
                      } else {
                        setError(null);
                        alert('Password reset email sent! Please check your inbox.');
                      }
                    } catch (err) {
                      setError('Failed to send password reset email.');
                    }
                  }}
                >
                  <Text style={styles.loginForgotPasswordText}>Forgot Password?</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
                  onPress={handlePasswordLogin}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.loginButtonText}>Sign In</Text>
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
                setError(null);
              }}
              disabled={isLoading}
            >
              <Ionicons 
                name={useOTP ? 'lock-closed-outline' : 'mail-outline'} 
                size={20} 
                color="#22c55e" 
                style={{ marginRight: 8 }}
              />
              <Text style={[styles.loginButtonText, { color: '#22c55e' }]}>
                {useOTP ? 'Use Password Instead' : 'Use Email Code Instead'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.loginSignupLink}
              onPress={() => {
                if (onSwitchToSignup) {
                  onSwitchToSignup();
                } else if (navigation) {
                  navigation.navigate('Signup');
                }
              }}
            >
              <Text style={styles.loginSignupLinkText}>
                Don't have an account? <Text style={styles.loginSignupLinkBold}>Sign Up</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </CompatKeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default LoginPage;