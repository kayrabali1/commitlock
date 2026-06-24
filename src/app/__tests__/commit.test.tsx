import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import * as Haptics from 'expo-haptics';
import CommitScreen from '../commit';

// Mock dependencies
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn()
  }),
  useLocalSearchParams: () => ({}),
}));

jest.mock('@/services/health', () => ({
  HealthDataService: {
    fetchWeeklyData: jest.fn().mockResolvedValue([{ date: '2026-06-20', value: 5000 }]),
    addHistoryEntry: jest.fn().mockResolvedValue(true),
    getActiveCommitment: jest.fn().mockResolvedValue(null),
    clearActiveCommitment: jest.fn().mockResolvedValue(true),
    saveActiveCommitment: jest.fn().mockResolvedValue(true),
    resetSimulatedData: jest.fn().mockResolvedValue(true),
  }
}));

jest.mock('@/components/AppHeader', () => 'AppHeader');
jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { changeLanguage: jest.fn() }
  })
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success' },
}));

jest.mock('expo-web-browser', () => ({
  openAuthSessionAsync: jest.fn().mockResolvedValue({ type: 'success' })
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue('mock-token'),
}));

// We'll override the auth context mock in each test
let mockUser: any = {
  hasPaymentMethod: false
};

jest.mock('@/services/auth', () => ({
  useAuth: () => ({
    user: mockUser,
    refreshUser: jest.fn().mockResolvedValue(true)
  }),
  API_URL: 'http://mock-api.com'
}));

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({ url: 'http://mock-url/add-payment' }),
    ok: true,
  })
) as jest.Mock;

describe('CommitScreen Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('New User Flow: Initiates WebBrowser for payment setup if hasPaymentMethod is false', async () => {
    mockUser.hasPaymentMethod = false;

    const { getByText, findByText, debug } = render(
      <SafeAreaProvider initialMetrics={{ insets: { top: 0, left: 0, right: 0, bottom: 0 }, frame: { x: 0, y: 0, width: 320, height: 640 } }}>
        <CommitScreen />
      </SafeAreaProvider>
    );
    
    // Select a stake of €10 first so that allStepsReady becomes true
    const stake10 = await findByText('€10');
    fireEvent.press(stake10);

    const pledgeButton = await findByText('commit.pledgeAndLock');
    fireEvent.press(pledgeButton);

    debug(); // See what is rendered

    // Now the modal is open, tap confirm
    const confirmButton = await findByText('commit.payConfirm');
    fireEvent.press(confirmButton);

    await waitFor(() => {
      // It should fetch the session from backend
      expect(global.fetch).toHaveBeenCalledWith(
        'http://mock-api.com/api/stripe/create-setup-session',
        expect.objectContaining({ method: 'POST' })
      );
    });

    await waitFor(() => {
      // It should open the web browser to the returned URL
      expect(WebBrowser.openAuthSessionAsync).toHaveBeenCalledWith(
        'http://mock-url/add-payment',
        'commitlock://payment-success'
      );
    });
  });

  it('Existing User Flow: Creates commitment successfully if hasPaymentMethod is true', async () => {
    mockUser.hasPaymentMethod = true;

    const { getByText, findByText, queryByText } = render(
      <SafeAreaProvider initialMetrics={{ insets: { top: 0, left: 0, right: 0, bottom: 0 }, frame: { x: 0, y: 0, width: 320, height: 640 } }}>
        <CommitScreen />
      </SafeAreaProvider>
    );
    
    // Select a stake of €10 first so that allStepsReady becomes true
    const stake10 = await findByText('€10');
    fireEvent.press(stake10);

    const pledgeButton = await findByText('commit.pledgeAndLock');
    fireEvent.press(pledgeButton);

    const confirmButton = await findByText('commit.payConfirm');
    fireEvent.press(confirmButton);

    await waitFor(() => {
      // It should show processing text (we mocked the component so we can check if it tries to confirm payment)
      // Since it's successful, it moves to 'success' step and shows:
      expect(getByText('commit.paySuccess')).toBeTruthy();
    });

    // WebBrowser should NOT have been called
    expect(WebBrowser.openAuthSessionAsync).not.toHaveBeenCalled();
    // fetch for stripe session should NOT have been called
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
