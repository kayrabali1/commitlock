import { NotificationService } from '../notifications';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HealthDataService } from '../health';

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  setNotificationChannelAsync: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  SchedulableTriggerInputTypes: { DATE: 'date' },
  AndroidImportance: { MAX: 5 }
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

jest.mock('../health', () => ({
  HealthDataService: {
    getActiveCommitments: jest.fn(),
    fetchWeeklyData: jest.fn(),
    getMetricLabel: jest.fn().mockReturnValue('steps'),
    getMetricUnit: jest.fn().mockReturnValue('steps'),
    getCommitmentDaysList: jest.fn().mockReturnValue(['2023-10-05', '2023-10-06']),
    parseLocalDate: jest.fn(),
    getTodayDateString: jest.fn().mockReturnValue('2023-10-05'),
  }
}));

describe('NotificationService', () => {
  let RealDate: any;

  beforeEach(() => {
    jest.clearAllMocks();
    RealDate = global.Date;
  });

  afterEach(() => {
    global.Date = RealDate;
  });

  describe('requestPermissions', () => {
    it('should resolve to true if already granted', async () => {
      const res = await NotificationService.requestPermissions();
      expect(res).toBe(true);
    });

    it('should request permissions if not granted', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'undetermined' });
      const res = await NotificationService.requestPermissions();
      expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
      expect(res).toBe(true);
    });

    it('should set channel on Android', async () => {
      Platform.OS = 'android';
      await NotificationService.requestPermissions();
      expect(Notifications.setNotificationChannelAsync).toHaveBeenCalled();
      Platform.OS = 'ios';
    });
  });

  describe('scheduleAllNotifications', () => {
    it('should cancel all existing notifications', async () => {
      (HealthDataService.getActiveCommitments as jest.Mock).mockResolvedValueOnce([]);
      await NotificationService.scheduleAllNotifications();
      expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
    });

    it('should schedule motivation and grace period notifications', async () => {
      const mockCommitment = {
        id: 'c1',
        metricType: 'steps',
        targetValue: 10000,
        stakeAmount: 10,
        endDate: '2023-10-06'
      };
      (HealthDataService.getActiveCommitments as jest.Mock).mockResolvedValueOnce([mockCommitment]);
      (HealthDataService.fetchWeeklyData as jest.Mock).mockResolvedValueOnce([
        { dateString: '2023-10-05', value: 0 }
      ]);
      (HealthDataService.parseLocalDate as jest.Mock).mockImplementation((dateStr, h=0, m=0, s=0) => {
        // Return a future date so it schedules
        return new RealDate(RealDate.now() + 100000);
      });
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify({
        dailyReminder: true,
        gracePeriodSync: true,
        achievementAlerts: true
      }));

      await NotificationService.scheduleAllNotifications();

      // Motivation for 2023-10-05, and grace period
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalled();
    });
  });

  describe('checkAndTriggerCompletionNotification', () => {
    it('should not notify if achievementAlerts are disabled', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify({ achievementAlerts: false }));
      await NotificationService.checkAndTriggerCompletionNotification({} as any, 10000);
      expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    });

    it('should notify if target met and inside allowed hours', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify({ achievementAlerts: true }));
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null); // not sent yet
      
      const mockDate = new RealDate();
      mockDate.setHours(12); // Noon, inside 07:00-22:00 window
      
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);
      (HealthDataService.getActiveCommitments as jest.Mock).mockResolvedValueOnce([]);

      await NotificationService.checkAndTriggerCompletionNotification({
        id: 'c1', targetValue: 5000, stakeAmount: 10, metricType: 'steps'
      } as any, 6000);

      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(expect.objectContaining({ trigger: null }));
    });
  });
});
