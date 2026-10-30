import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppHeader from '../AppHeader';

// Mock Router
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
}));

// Mock HealthDataService
jest.mock('@/services/health', () => ({
  HealthDataService: {
    getActiveCommitments: jest.fn().mockResolvedValue([]),
  },
}));

// Mock Haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success' },
}));

// Mock Expo Blur
jest.mock('expo-blur', () => ({
  BlurView: ({ children }: any) => children,
}));

// Mock Expo Image
jest.mock('expo-image', () => ({
  Image: 'Image',
}));

// Mock Auth
let mockUser: any = {
  passes: 0,
  bronzePasses: 0,
  silverPasses: 0,
  goldPasses: 0,
};
const mockPurchasePasses = jest.fn().mockResolvedValue(true);

jest.mock('@/services/auth', () => ({
  useAuth: () => ({
    user: mockUser,
    purchasePasses: mockPurchasePasses,
  }),
}));

describe('AppHeader Vault In-App Purchase Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the mock buy popup when clicking on a lost token', async () => {
    mockUser.passes = 0;
    mockUser.bronzePasses = 0;
    mockUser.silverPasses = 0;
    mockUser.goldPasses = 0;

    const { getByText, findByText, findAllByText } = render(
      <SafeAreaProvider>
        <AppHeader />
      </SafeAreaProvider>
    );

    // Open vault modal
    const passesPill = getByText('0');
    fireEvent.press(passesPill);

    // Check if the modal title is present
    const vaultTitle = await findByText('Coin Vault');
    expect(vaultTitle).toBeTruthy();

    // Verify tap to buy prompt is present for LOST token (e.g. Bronze)
    const lostBadges = await findAllByText('LOST');
    expect(lostBadges.length).toBeGreaterThan(0);

    // Click on the Bronze Coin card/element to trigger IAP buy flow
    fireEvent.press(lostBadges[0]);

    // Check if the Buy modal header (iOS App Store or Android Google Play) is rendered
    const iapHeader = await findByText(/App Store|Google Play/);
    expect(iapHeader).toBeTruthy();

    // Verify price / info is correct
    const priceText = await findByText('€1.99');
    expect(priceText).toBeTruthy();

    // Find pay/confirm button and press it
    const payBtn = await findByText(/Confirm|1-TAP BUY/);
    fireEvent.press(payBtn);

    // Verify it transitions to processing
    const processingText = await findByText(/Processing/);
    expect(processingText).toBeTruthy();

    // Verify purchasePasses mock is called
    await waitFor(() => {
      expect(mockPurchasePasses).toHaveBeenCalledWith(1, 'bronze');
    }, { timeout: 2000 });

    // Verify it shows success card
    const successText = await findByText('UNLOCKED');
    expect(successText).toBeTruthy();
  });
});
