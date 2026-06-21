import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar: string;
  tier: string;
  provider: 'email' | 'google' | 'apple';
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
  updateAvatar: (avatarUri: string | null) => Promise<void>;
  refreshUser: () => Promise<void>;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_STORAGE_KEY = '@habitcontract_user_profile';
const TOKEN_STORAGE_KEY = '@habitcontract_jwt_token';

// Smart backend URL detection
export const getBaseUrl = (): string => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  if (__DEV__) {
    const hostUri = Constants.expoConfig?.hostUri;
    if (hostUri) {
      const ip = hostUri.split(':')[0];
      return `http://${ip}:8080`;
    }
    return Platform.OS === 'android' ? 'http://10.0.2.2:8080' : 'http://localhost:8080';
  }

  return 'https://habitcontract-backend-658642477326.europe-west3.run.app';
};

export const API_URL = getBaseUrl();

export const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// Configure Google Sign-In on mobile platforms (only outside of Expo Go)
if (Platform.OS !== 'web' && !isExpoGo) {
  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB || '658642477326-4f1s58o3kiqv0ssggldsnc61j98s6tf4.apps.googleusercontent.com',
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS || '658642477326-718qg3nkpmjn0ccnfl8qhqq27h149prs.apps.googleusercontent.com',
  });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize and load user session from backend
  useEffect(() => {
    const loadStoredUser = async () => {
      try {
        const token = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
        if (token) {
          // Validate token with backend
          const response = await fetch(`${API_URL}/api/auth/validate`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            const data = await response.json();
            setUser(data.user);
            await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
          } else {
            // Token expired or invalid
            await AsyncStorage.multiRemove([TOKEN_STORAGE_KEY, USER_STORAGE_KEY]);
            setUser(null);
          }
        } else {
          // Fallback to local profile cache if offline/no token
          const storedUser = await AsyncStorage.getItem(USER_STORAGE_KEY);
          if (storedUser) {
            setUser(JSON.parse(storedUser));
          }
        }
      } catch (e) {
        console.error('Failed to load authenticated user session', e);
        // Fallback to local profile cache in case backend is down
        try {
          const storedUser = await AsyncStorage.getItem(USER_STORAGE_KEY);
          if (storedUser) setUser(JSON.parse(storedUser));
        } catch { }
      } finally {
        setIsLoading(false);
      }
    };
    loadStoredUser();
  }, []);

  const clearError = () => setError(null);

  // Refresh User Profile
  const refreshUser = async () => {
    try {
      const token = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
      if (token) {
        const response = await fetch(`${API_URL}/api/auth/validate`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
          await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
        }
      }
    } catch (e) {
      console.error('Failed to refresh user profile from backend', e);
    }
  };

  // Local Sign In
  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid email or password.');
      }

      await AsyncStorage.setItem(TOKEN_STORAGE_KEY, data.token);
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
      setUser(data.user);
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Local Sign Up
  const signUp = async (name: string, email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed.');
      }

      await AsyncStorage.setItem(TOKEN_STORAGE_KEY, data.token);
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
      setUser(data.user);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Real Google Sign In
  const signInWithGoogle = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (Platform.OS === 'web') {
        throw new Error('Google Sign-In is not supported on web. Please use email or a mobile device.');
      }

      if (isExpoGo) {
        // Expo Go fallback to mock sign-in to prevent native crashes
        Alert.alert(
          'Expo Go Sandbox',
          'Native Google Sign-In requires a custom development build. We will log you in with a demo athlete profile for testing.',
          [{ text: 'Continue' }]
        );

        await signIn('demo@habitcontract.com', 'password');
        return;
      }

      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();

      if (userInfo.type === 'cancelled') {
        // User cancelled the sign-in flow, resolve gracefully without throwing/showing errors
        return;
      }

      const idToken = userInfo.data?.idToken;

      if (!idToken) {
        throw new Error('No idToken returned from Google Sign-In.');
      }

      // Send to backend
      const response = await fetch(`${API_URL}/api/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idToken,
          name: userInfo.data?.user?.name || undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Google sign-in failed on server.');
      }

      await AsyncStorage.setItem(TOKEN_STORAGE_KEY, data.token);
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
      setUser(data.user);
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      setError(err.message || 'Google Sign-In failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Real Apple Sign In
  const signInWithApple = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (Platform.OS === 'web') {
        throw new Error('Apple Sign-In is not supported on web. Please use email or a mobile device.');
      }

      if (isExpoGo) {
        // Expo Go fallback to mock sign-in to prevent native crashes
        Alert.alert(
          'Expo Go Sandbox',
          'Native Apple Sign-In requires a custom development build. We will log you in with a demo athlete profile for testing.',
          [{ text: 'Continue' }]
        );

        await signIn('demo@habitcontract.com', 'password');
        return;
      }

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        throw new Error('No identityToken returned from Apple Sign-In.');
      }

      // Format name if present
      let name = undefined;
      if (credential.fullName) {
        const given = credential.fullName.givenName || '';
        const family = credential.fullName.familyName || '';
        name = `${given} ${family}`.trim() || undefined;
      }

      // Send to backend
      const response = await fetch(`${API_URL}/api/auth/apple`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identityToken: credential.identityToken,
          name,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Apple sign-in failed on server.');
      }

      await AsyncStorage.setItem(TOKEN_STORAGE_KEY, data.token);
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
      setUser(data.user);
    } catch (err: any) {
      console.error('Apple Sign-In Error:', err);
      setError(err.message || 'Apple Sign-In failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Sign Out
  const signOut = async () => {
    setIsLoading(true);
    try {
      if (Platform.OS !== 'web' && !isExpoGo) {
        try {
          await GoogleSignin.signOut();
        } catch { }
      }
      await AsyncStorage.multiRemove([TOKEN_STORAGE_KEY, USER_STORAGE_KEY]);
      setUser(null);
    } catch (err: any) {
      console.error('Failed to log out correctly', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Update Avatar and upload to backend
  const updateAvatar = async (avatarUri: string | null) => {
    if (!user) return;
    setIsLoading(true);

    try {
      let finalAvatar = '';

      if (avatarUri) {
        if (Platform.OS !== 'web') {
          // Read local image as base64 string
          const base64 = await FileSystem.readAsStringAsync(avatarUri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          finalAvatar = `data:image/jpeg;base64,${base64}`;
        } else {
          finalAvatar = avatarUri;
        }
      } else {
        // Reset to placeholder
        finalAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=8B5CF6&color=fff&bold=true`;
      }

      const token = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);

      const response = await fetch(`${API_URL}/api/user/avatar`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ avatar: finalAvatar }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload avatar to backend');
      }

      const updatedUser: User = {
        ...user,
        avatar: finalAvatar,
      };

      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
      setUser(updatedUser);
    } catch (e) {
      console.error('Failed to upload/update avatar on backend', e);
      throw e;
    } finally {
      setIsLoading(true);

      // Force loading state reset
      setTimeout(() => setIsLoading(false), 200);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        signIn,
        signUp,
        signInWithGoogle,
        signInWithApple,
        signOut,
        updateAvatar,
        refreshUser,
        error,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
