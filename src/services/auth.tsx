import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar: string;
  tier: string;
  walletBalance: number;
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
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_STORAGE_KEY = '@commitlock_user_profile';
const TOKEN_STORAGE_KEY = '@commitlock_jwt_token';

// Smart backend URL detection
// 1. Check EXPO_PUBLIC_API_URL environment variable
// 2. In Dev mode, resolve to host machine's IP (so physical devices can connect locally)
// 3. Fallback to GCP Cloud Run address
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

  // Replace with the deployed Cloud Run URL when available
  return 'https://commitlock-backend-yigcukfpnq-ey.a.run.app';
};

export const API_URL = getBaseUrl();

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

  // Google Sign In (Simulated for iOS client, matches simulator config)
  const signInWithGoogle = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Simulate Google OAuth flow
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Auto-register/login demo google user on our server
      await signUp('Google Athlete', 'google.user@gmail.com', 'google_oauth_bypass_pwd_123');
    } catch (err: any) {
      setError('Google Sign-In was cancelled or failed.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Apple Sign In (Simulated for iOS client, matches simulator config)
  const signInWithApple = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Simulate Apple ID flow
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Auto-register/login demo apple user on our server
      await signUp('Apple Champion', 'apple.fitness@icloud.com', 'apple_oauth_bypass_pwd_123');
    } catch (err: any) {
      setError('Apple Sign-In was cancelled or failed.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Sign Out
  const signOut = async () => {
    setIsLoading(true);
    try {
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
