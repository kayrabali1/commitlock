import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Alert } from 'react-native';
import CommitScreen from '../commit';

// Mock Alert
const mockAlert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

// Mock dependencies
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    dismissAll: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
  useFocusEffect: (cb: any) => cb(),
}));

jest.mock('@/services/health', () => ({
  HealthDataService: {
    fetchWeeklyData: jest.fn().mockResolvedValue([{ date: '2026-06-20', value: 5000 }]),
    addHistoryEntry: jest.fn().mockResolvedValue(true),
    getActiveCommitments: jest.fn().mockResolvedValue([]),
    getActiveCommitment: jest.fn().mockResolvedValue(null),
    clearActiveCommitment: jest.fn().mockResolvedValue(true),
    saveActiveCommitment: jest.fn().mockResolvedValue(true),
    resetSimulatedData: jest.fn().mockResolvedValue(true),
    getMetricUnit: jest.fn().mockImplementation((type) => {
      switch (type) {
        case 'steps': return 'steps';
        case 'calories': return 'kcal';
        case 'activeTime': return 'mins';
        case 'mindfulness': return 'mins';
        default: return 'km';
      }
    }),
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
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success' },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue('mock-token'),
}));

// We'll override the auth context mock in each test
let mockUser: any = {
  passes: 0,
  bronzePasses: 0,
  silverPasses: 0,
  goldPasses: 0
};
const mockPurchasePasses = jest.fn().mockResolvedValue(true);

jest.mock('@/services/auth', () => ({
  useAuth: () => ({
    user: mockUser,
    refreshUser: jest.fn().mockResolvedValue(true),
    purchasePasses: mockPurchasePasses,
    lockPassValue: jest.fn().mockResolvedValue(true)
  }),
  API_URL: 'http://mock-api.com'
}));

describe('CommitScreen Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('New User Flow: Renders simulated buy passes flow when passes are 0', async () => {
    mockUser.passes = 0;

    const { findByText } = render(
      <SafeAreaProvider initialMetrics={{ insets: { top: 0, left: 0, right: 0, bottom: 0 }, frame: { x: 0, y: 0, width: 320, height: 640 } }}>
        <CommitScreen />
      </SafeAreaProvider>
    );

    // Select the STEPS metric to advance to Step 2
    const stepsCard = await findByText('METRICS.STEPS');
    fireEvent.press(stepsCard);

    // Click CONTINUE to go from Step 2 to Step 3
    const continueBtn = await findByText('CONTINUE');
    fireEvent.press(continueBtn);

    // Verify it shows the coin selection prompt
    const selectPrompt = await findByText('DRAG OR TAP COIN TO UNLOCK');
    expect(selectPrompt).toBeTruthy();

    // Select the Bronze coin (disabled but clickable to purchase)
    const bronzeCoin = await findByText('Bronze');
    fireEvent.press(bronzeCoin);

    // Click App Store confirm button on the payment sheet
    const confirmBtn = await findByText('Double Click or Tap to Confirm');
    fireEvent.press(confirmBtn);

    await waitFor(() => {
      expect(mockPurchasePasses).toHaveBeenCalledWith(1, 'bronze');
    });
  });

  it('Existing User Flow: Creates commitment successfully if passes are >= 1', async () => {
    mockUser.passes = 3;
    mockUser.bronzePasses = 1;
    mockUser.silverPasses = 1;
    mockUser.goldPasses = 1;

    const { getByText, findByText } = render(
      <SafeAreaProvider initialMetrics={{ insets: { top: 0, left: 0, right: 0, bottom: 0 }, frame: { x: 0, y: 0, width: 320, height: 640 } }}>
        <CommitScreen />
      </SafeAreaProvider>
    );
    
    // Select the STEPS metric to advance to Step 2
    const stepsCard = await findByText('METRICS.STEPS');
    fireEvent.press(stepsCard);

    // Click CONTINUE to go from Step 2 to Step 3
    const continueBtn = await findByText('CONTINUE');
    fireEvent.press(continueBtn);

    // Select a stake first (since passes are >= 1, coins are available)
    const stake10 = await findByText('Silver');
    fireEvent.press(stake10);

    const pledgeButton = await findByText('LOCK CONTRACT');
    fireEvent.press(pledgeButton);

    const confirmButton = await findByText('SIGN CONTRACT');
    fireEvent.press(confirmButton);

    await waitFor(() => {
      // Since it's successful, it moves to 'success' step and shows:
      expect(getByText('Protocol Locked')).toBeTruthy();
    });

    // Alert should NOT have been called
    expect(mockAlert).not.toHaveBeenCalled();
  });
});
