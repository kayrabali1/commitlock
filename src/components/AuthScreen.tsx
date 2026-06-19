import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Modal,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';

import { useAuth } from '@/services/auth';
import { Spacing } from '@/constants/theme';

export default function AuthScreen() {
  const {
    signIn,
    signUp,
    signInWithGoogle,
    signInWithApple,
    error: authError,
    clearError,
  } = useAuth();

  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Local loading state for auth actions
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Social Auth Overlay Mock State
  const [socialModalVisible, setSocialModalVisible] = useState(false);
  const [socialProvider, setSocialProvider] = useState<'Google' | 'Apple' | null>(null);
  const [socialLoadingStep, setSocialLoadingStep] = useState(0);

  // Focus and keyboard tracking for responsive UI
  const [focusedField, setFocusedField] = useState<'name' | 'email' | 'password' | 'confirmPassword' | null>(null);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => setKeyboardVisible(false)
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  const toggleAuthMode = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsSignUp(!isSignUp);
    setValidationError(null);
    clearError();
  };

  const validateForm = () => {
    if (!email || !email.includes('@')) {
      setValidationError('Please enter a valid email address.');
      return false;
    }
    if (password.length < 6) {
      setValidationError('Password must be at least 6 characters.');
      return false;
    }
    if (isSignUp) {
      if (!name.trim()) {
        setValidationError('Please enter your name.');
        return false;
      }
      if (password !== confirmPassword) {
        setValidationError('Passwords do not match.');
        return false;
      }
    }
    setValidationError(null);
    return true;
  };

  const handleEmailAuth = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!validateForm()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setLoading(true);
    clearError();

    try {
      if (isSignUp) {
        await signUp(name, email, password);
      } else {
        await signIn(email, password);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const triggerSocialAuth = async (provider: 'Google' | 'Apple') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    clearError();

    try {
      if (provider === 'Google') {
        await signInWithGoogle();
      } else {
        await signInWithApple();
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const displayError = validationError || authError;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <LinearGradient
        colors={['#0F0C20', '#06070B', '#06070B']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      <LinearGradient
        colors={['rgba(124, 58, 237, 0.18)', 'rgba(79, 70, 229, 0.03)', 'transparent']}
        style={styles.topGlow}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      <View style={styles.innerContainer}>
        {/* Header Hero Area */}
        {!isKeyboardVisible && (
          <View style={styles.heroSection}>
            <View style={styles.logoContainer}>
              <Image 
                source={require('@/assets/images/icon.png')} 
                style={styles.logoImage} 
              />
              <Text style={styles.appName}>HabitContract</Text>
              <Text style={styles.appTagline}>Verify workouts. Protect stakes. Build discipline.</Text>
            </View>
          </View>
        )}

        {/* Input Card Container */}
        <View style={[styles.authCard, isKeyboardVisible && styles.authCardKeyboardVisible]}>
          <Text style={styles.cardHeaderTitle}>
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </Text>
          {!isKeyboardVisible && (
            <Text style={styles.cardHeaderSubtitle}>
              {isSignUp ? 'Sign up to lock in your commitments.' : 'Sign in to track your active commitments.'}
            </Text>
          )}

          {/* Error Banner */}
          {displayError && (
            <View style={styles.errorBanner}>
              <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#FF4655" />
              <Text style={styles.errorText}>{displayError}</Text>
            </View>
          )}

          {/* Form Fields */}
          <View style={[styles.formContainer, isKeyboardVisible && { gap: Spacing.two }]}>
            {isSignUp && (
              <View style={[styles.inputWrapper, focusedField === 'name' && styles.inputWrapperFocused]}>
                <MaterialCommunityIcons 
                  name="account-outline" 
                  size={20} 
                  color={focusedField === 'name' ? '#7C3AED' : '#576880'} 
                  style={styles.inputIcon} 
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="Full Name"
                  placeholderTextColor="#576880"
                  value={name}
                  onChangeText={(val) => {
                    setName(val);
                    if (validationError) setValidationError(null);
                  }}
                  onFocus={() => setFocusedField('name')}
                  onBlur={() => setFocusedField(null)}
                  autoCapitalize="words"
                />
              </View>
            )}

            <View style={[styles.inputWrapper, focusedField === 'email' && styles.inputWrapperFocused]}>
              <MaterialCommunityIcons 
                name="email-outline" 
                size={20} 
                color={focusedField === 'email' ? '#7C3AED' : '#576880'} 
                style={styles.inputIcon} 
              />
              <TextInput
                style={styles.textInput}
                placeholder="Email Address"
                placeholderTextColor="#576880"
                value={email}
                onChangeText={(val) => {
                  setEmail(val);
                  if (validationError) setValidationError(null);
                }}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={[styles.inputWrapper, focusedField === 'password' && styles.inputWrapperFocused]}>
              <MaterialCommunityIcons 
                name="lock-outline" 
                size={20} 
                color={focusedField === 'password' ? '#7C3AED' : '#576880'} 
                style={styles.inputIcon} 
              />
              <TextInput
                style={styles.textInput}
                placeholder={isSignUp ? "Password (min. 6 chars)" : "Password"}
                placeholderTextColor="#576880"
                secureTextEntry
                value={password}
                onChangeText={(val) => {
                  setPassword(val);
                  if (validationError) setValidationError(null);
                }}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                autoCapitalize="none"
              />
            </View>

            {isSignUp && (
              <View style={[styles.inputWrapper, focusedField === 'confirmPassword' && styles.inputWrapperFocused]}>
                <MaterialCommunityIcons 
                  name="lock-check-outline" 
                  size={20} 
                  color={focusedField === 'confirmPassword' ? '#7C3AED' : '#576880'} 
                  style={styles.inputIcon} 
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="Confirm Password"
                  placeholderTextColor="#576880"
                  secureTextEntry
                  value={confirmPassword}
                  onChangeText={(val) => {
                    setConfirmPassword(val);
                    if (validationError) setValidationError(null);
                  }}
                  onFocus={() => setFocusedField('confirmPassword')}
                  onBlur={() => setFocusedField(null)}
                  autoCapitalize="none"
                />
              </View>
            )}

            {/* Forgot Password Link */}
            {!isSignUp && (
              <TouchableOpacity style={styles.forgotPasswordContainer} activeOpacity={0.7}>
                <Text style={styles.forgotPasswordText}>Forgot password?</Text>
              </TouchableOpacity>
            )}

            {/* Email Primary Auth Button */}
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleEmailAuth}
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#7C3AED', '#4F46E5']}
                style={styles.primaryButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <View style={styles.primaryButtonContent}>
                    <Text style={styles.primaryButtonText}>
                      {isSignUp ? 'Create Account' : 'Sign In'}
                    </Text>
                    <MaterialCommunityIcons name="arrow-right" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Dev Hint Box */}
            {!isSignUp && !isKeyboardVisible && (
              <View style={styles.demoHintBox}>
                <MaterialCommunityIcons name="information" size={14} color="#8B5CF6" />
                <Text style={styles.demoHintText}>
                  Testing: Use <Text style={styles.boldText}>demo@habitcontract.com</Text> / <Text style={styles.boldText}>password</Text>
                </Text>
              </View>
            )}
          </View>

          {/* Divider & Social Buttons (only show when keyboard is closed) */}
          {!isKeyboardVisible && (
            <>
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.socialButtonsContainer}>
                {/* Apple Sign In Button */}
                <TouchableOpacity
                  style={styles.socialButton}
                  onPress={() => triggerSocialAuth('Apple')}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="apple" size={20} color="#FFFFFF" />
                  <Text style={styles.socialButtonText}>Apple</Text>
                </TouchableOpacity>

                {/* Google Sign In Button */}
                <TouchableOpacity
                  style={styles.socialButton}
                  onPress={() => triggerSocialAuth('Google')}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="google" size={18} color="#FFFFFF" />
                  <Text style={styles.socialButtonText}>Google</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Toggle Auth Mode Button */}
          <View style={[styles.toggleModeContainer, isKeyboardVisible && styles.toggleModeContainerKeyboardVisible]}>
            <Text style={styles.toggleModeText}>
              {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
            </Text>
            <TouchableOpacity onPress={toggleAuthMode} activeOpacity={0.7}>
              <Text style={styles.toggleModeLink}>
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#06070B',
  },
  innerContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Platform.OS === 'ios' ? Spacing.five : Spacing.four,
  },
  topGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 350,
  },
  heroSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.three,
    width: '100%',
    marginBottom: Spacing.three,
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoImage: {
    width: 72,
    height: 72,
    borderRadius: 18,
    marginBottom: Spacing.two,
  },
  appName: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  appTagline: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: Spacing.one,
    opacity: 0.8,
  },
  authCard: {
    backgroundColor: 'rgba(17, 19, 30, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    padding: Spacing.four,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  authCardKeyboardVisible: {
    padding: Spacing.three,
    marginTop: -Spacing.four,
  },
  cardHeaderTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: Spacing.one,
    textAlign: 'center',
  },
  cardHeaderSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 18,
    marginBottom: Spacing.four,
    textAlign: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: 'rgba(255, 70, 85, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 70, 85, 0.2)',
    padding: Spacing.three,
    borderRadius: Spacing.two,
    marginBottom: Spacing.three,
  },
  errorText: {
    color: '#FF4655',
    fontSize: 12,
    flex: 1,
  },
  formContainer: {
    gap: Spacing.three,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(6, 7, 11, 0.6)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    height: 52,
  },
  inputWrapperFocused: {
    borderColor: '#7C3AED',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
    backgroundColor: '#06070B',
  },
  inputIcon: {
    marginRight: Spacing.two,
  },
  textInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    height: '100%',
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginTop: -Spacing.two,
    marginBottom: Spacing.one,
  },
  forgotPasswordText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '500',
  },
  primaryButton: {
    borderRadius: 12,
    height: 52,
    marginTop: Spacing.one,
    overflow: 'hidden',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  demoHintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 6,
    backgroundColor: 'rgba(124, 58, 237, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.12)',
    paddingVertical: 6,
    paddingHorizontal: Spacing.three,
    borderRadius: 20,
    marginTop: Spacing.two,
  },
  demoHintText: {
    color: '#94A3B8',
    fontSize: 11,
  },
  boldText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.three,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  dividerText: {
    color: '#576880',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    paddingHorizontal: Spacing.three,
  },
  socialButtonsContainer: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginBottom: Spacing.two,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  socialButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  toggleModeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.three,
  },
  toggleModeContainerKeyboardVisible: {
    marginTop: Spacing.two,
  },
  toggleModeText: {
    color: '#94A3B8',
    fontSize: 13,
  },
  toggleModeLink: {
    color: '#7C3AED',
    fontSize: 13,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  modalContent: {
    backgroundColor: '#11131E',
    borderWidth: 1,
    borderColor: '#181B28',
    borderRadius: Spacing.four,
    padding: Spacing.five,
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  modalIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: Spacing.one,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: Spacing.four,
    lineHeight: 18,
  },
  loadingSpinnerContainer: {
    marginVertical: Spacing.three,
  },
  modalFooterText: {
    color: '#576880',
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: Spacing.three,
  },
});
