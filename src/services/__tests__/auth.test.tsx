import React from 'react';
import { render, act, waitFor } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '../auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AppleAuthentication from 'expo-apple-authentication';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { Platform, Text, View } from 'react-native';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  multiRemove: jest.fn(),
}));

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn().mockResolvedValue(true),
    signIn: jest.fn(),
    signOut: jest.fn(),
  }
}));

jest.mock('expo-apple-authentication', () => ({
  signInAsync: jest.fn(),
  AppleAuthenticationScope: {
    FULL_NAME: 0,
    EMAIL: 1,
  }
}));

jest.mock('expo-file-system/legacy', () => ({
  readAsStringAsync: jest.fn().mockResolvedValue('mockbase64string'),
  EncodingType: { Base64: 'base64' }
}));

// Provide a mock fetch
global.fetch = jest.fn() as jest.Mock;

const TestComponent = () => {
  const auth = useAuth();
  return (
    <View>
      <Text testID="user">{auth.user ? JSON.stringify(auth.user) : 'null'}</Text>
      <Text testID="isLoading">{auth.isLoading ? 'true' : 'false'}</Text>
      <Text testID="error">{auth.error || 'none'}</Text>
    </View>
  );
};

describe('Auth Service Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default fetch to a success response for initialization
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ user: { id: '1', name: 'Init User' } })
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should load user from valid token', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('mock-token');

      const { getByTestId } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(getByTestId('isLoading').props.children).toBe('true');

      await waitFor(() => {
        expect(getByTestId('isLoading').props.children).toBe('false');
      });

      expect(getByTestId('user').props.children).toContain('Init User');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('@habitcontract_user_profile', expect.any(String));
    });

    it('should fallback to local cache if no token is found', async () => {
      (AsyncStorage.getItem as jest.Mock)
        .mockResolvedValueOnce(null) // no token
        .mockResolvedValueOnce(JSON.stringify({ id: '2', name: 'Cached User' })); // cached user

      const { getByTestId } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(getByTestId('isLoading').props.children).toBe('false');
      });

      expect(getByTestId('user').props.children).toContain('Cached User');
    });

    it('should clear token if validation fails', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('invalid-token');
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
      });

      const { getByTestId } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(getByTestId('isLoading').props.children).toBe('false');
      });

      expect(AsyncStorage.multiRemove).toHaveBeenCalledWith(['@habitcontract_jwt_token', '@habitcontract_user_profile']);
      expect(getByTestId('user').props.children).toBe('null');
    });
  });

  describe('signIn', () => {
    it('should sign in successfully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ token: 'new-token', user: { id: '3', name: 'Login User' } })
      });

      let authContext: any;
      const CaptureComponent = () => {
        authContext = useAuth();
        return null;
      };

      render(
        <AuthProvider>
          <CaptureComponent />
        </AuthProvider>
      );

      await act(async () => {
        await authContext.signIn('test@test.com', 'password');
      });

      expect(AsyncStorage.setItem).toHaveBeenCalledWith('@habitcontract_jwt_token', 'new-token');
      expect(authContext.user.name).toBe('Login User');
    });

    it('should throw an error on failed sign in', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Invalid credentials' })
      });

      let authContext: any;
      const CaptureComponent = () => {
        authContext = useAuth();
        return null;
      };

      const { getByTestId } = render(
        <AuthProvider>
          <CaptureComponent />
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(getByTestId('isLoading').props.children).toBe('false');
      });

      let caughtError: any;
      await act(async () => {
        try {
          await authContext.signIn('test@test.com', 'wrong');
        } catch (e) {
          caughtError = e;
        }
      });

      expect(caughtError.message).toBe('Invalid credentials');
      expect(authContext.error).toBe('Invalid credentials');
    });
  });

  describe('signUp', () => {
    it('should sign up successfully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ token: 'new-token', user: { id: '4', name: 'Signup User' } })
      });

      let authContext: any;
      const CaptureComponent = () => {
        authContext = useAuth();
        return null;
      };

      render(
        <AuthProvider>
          <CaptureComponent />
        </AuthProvider>
      );

      await act(async () => {
        await authContext.signUp('Signup User', 'test@test.com', 'password');
      });

      expect(AsyncStorage.setItem).toHaveBeenCalledWith('@habitcontract_jwt_token', 'new-token');
      expect(authContext.user.name).toBe('Signup User');
    });
  });

  describe('signInWithGoogle', () => {
    it('should sign in with google successfully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (GoogleSignin.signIn as jest.Mock).mockResolvedValueOnce({
        type: 'success',
        data: { idToken: 'google-token', user: { name: 'Google User' } }
      });
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ token: 'app-token', user: { id: '5', name: 'Google User Backend' } })
      });

      let authContext: any;
      const CaptureComponent = () => {
        authContext = useAuth();
        return null;
      };

      render(
        <AuthProvider>
          <CaptureComponent />
        </AuthProvider>
      );

      await act(async () => {
        await authContext.signInWithGoogle();
      });

      expect(GoogleSignin.signIn).toHaveBeenCalled();
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('@habitcontract_jwt_token', 'app-token');
      expect(authContext.user.name).toBe('Google User Backend');
    });

    it('should handle cancellation without errors', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (GoogleSignin.signIn as jest.Mock).mockResolvedValueOnce({
        type: 'cancelled'
      });

      let authContext: any;
      const CaptureComponent = () => {
        authContext = useAuth();
        return null;
      };

      render(
        <AuthProvider>
          <CaptureComponent />
        </AuthProvider>
      );

      await act(async () => {
        await authContext.signInWithGoogle();
      });

      expect(global.fetch).not.toHaveBeenCalled();
      expect(authContext.error).toBe(null);
    });
  });

  describe('signInWithApple', () => {
    it('should sign in with apple successfully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (AppleAuthentication.signInAsync as jest.Mock).mockResolvedValueOnce({
        identityToken: 'apple-token',
        fullName: { givenName: 'Apple', familyName: 'User' }
      });
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ token: 'app-token', user: { id: '6', name: 'Apple User Backend' } })
      });

      let authContext: any;
      const CaptureComponent = () => {
        authContext = useAuth();
        return null;
      };

      render(
        <AuthProvider>
          <CaptureComponent />
        </AuthProvider>
      );

      await act(async () => {
        await authContext.signInWithApple();
      });

      expect(AppleAuthentication.signInAsync).toHaveBeenCalled();
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('@habitcontract_jwt_token', 'app-token');
      expect(authContext.user.name).toBe('Apple User Backend');
    });
  });

  describe('signOut', () => {
    it('should sign out successfully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      
      let authContext: any;
      const CaptureComponent = () => {
        authContext = useAuth();
        return null;
      };

      render(
        <AuthProvider>
          <CaptureComponent />
        </AuthProvider>
      );

      await act(async () => {
        await authContext.signOut();
      });

      expect(AsyncStorage.multiRemove).toHaveBeenCalledWith(['@habitcontract_jwt_token', '@habitcontract_user_profile']);
      expect(authContext.user).toBe(null);
    });
  });

});
