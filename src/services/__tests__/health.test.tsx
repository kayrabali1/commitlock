import { HealthDataService } from '../health';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('../auth', () => ({
  API_URL: 'http://localhost:3000',
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  NativeModules: {
    AppleHealthKit: {
      initHealthKit: jest.fn((options, cb) => cb(null)),
      getDailyStepCountSamples: jest.fn((options, cb) => cb(null, [{ value: 5000, startDate: '2023-10-05T00:00:00.000Z' }])),
      getDistanceWalkingRunning: jest.fn((options, cb) => cb(null, { value: 5400 })),
      getDailyDistanceWalkingRunningSamples: jest.fn((options, cb) => cb(null, [{ value: 5.4, startDate: new Date().toISOString() }])),
      getAnchoredWorkouts: jest.fn((options, cb) => cb(null, { data: [{ activityType: 'running', startDate: new Date().toISOString(), totalDistance: 3.3554 }] })),
      getMindfulSession: jest.fn((options, cb) => cb(null, [{ startDate: '2023-10-05T08:00:00.000Z', endDate: '2023-10-05T08:15:00.000Z' }])),
      Constants: { Permissions: {} }
    }
  }
}));

// Mock react-native-health
jest.mock('react-native-health', () => ({
  default: {
    Constants: { Permissions: {} }
  }
}), { virtual: true });

describe('HealthDataService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    }) as jest.Mock;
  });

  describe('formatLocalYYYYMMDD', () => {
    it('should format date string correctly', () => {
      expect(HealthDataService.formatLocalYYYYMMDD('2023-10-05')).toBe('2023-10-05');
      const d = new Date(2023, 9, 5); // Month is 0-indexed
      expect(HealthDataService.formatLocalYYYYMMDD(d)).toBe('2023-10-05');
    });
  });

  describe('requestPermissions', () => {
    it('should return true for iOS when AppleHealthKit is available', async () => {
      const originalDev = global.__DEV__;
      global.__DEV__ = false;
      const res = await HealthDataService.requestPermissions();
      expect(res).toBe(true);
      global.__DEV__ = originalDev;
    });

    it('should return true immediately if __DEV__ is true', async () => {
      const originalDev = global.__DEV__;
      global.__DEV__ = true;
      const res = await HealthDataService.requestPermissions();
      expect(res).toBe(true);
      global.__DEV__ = originalDev;
    });
  });

  describe('querySingleDayMetric', () => {
    it('should query steps correctly', async () => {
      const originalDev = global.__DEV__;
      global.__DEV__ = false;
      const res = await HealthDataService.querySingleDayMetric('steps', '2023-10-05');
      expect(res).toBe(5000); // from mock
      global.__DEV__ = originalDev;
    });

    it('should return mock value if __DEV__ is true and platform is unsupported', async () => {
      const originalDev = global.__DEV__;
      const originalOS = Platform.OS;
      global.__DEV__ = true;
      Platform.OS = 'web';
      // '2023-10-05' is a Thursday
      const res = await HealthDataService.querySingleDayMetric('steps', '2023-10-05');
      expect(res).toBe(12100); // Thu steps mock
      global.__DEV__ = originalDev;
      Platform.OS = originalOS;
    });
  });

  describe('queryTodayMetrics', () => {
    it('should query today metrics', async () => {
      const originalDev = global.__DEV__;
      global.__DEV__ = false;
      const res = await HealthDataService.queryTodayMetrics();
      expect(res.steps.status).toBe('granted');
      expect(res.distance.status).toBe('granted');
      expect(res.distance.value).toBeCloseTo(5.4, 4); // 3.3554 miles * 1.609344 = 5.39999... km
      global.__DEV__ = originalDev;
    });
  });

  describe('API calls', () => {
    it('getActiveCommitments should call API', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ id: 'c1', status: 'active' }, { id: 'c2', status: 'failed' }])
      });
      const commitments = await HealthDataService.getActiveCommitments();
      expect(commitments.length).toBe(1);
      expect(commitments[0].id).toBe('c1');
    });

    it('getHistory should call API', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ id: 'c1', status: 'active' }, { id: 'c2', status: 'failed' }])
      });
      const history = await HealthDataService.getHistory();
      expect(history.length).toBe(1);
      expect(history[0].id).toBe('c2');
    });
    
    it('saveActiveCommitment should make POST request', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ commitment: { id: 'c1' } })
      });
      await HealthDataService.saveActiveCommitment({
        id: 'c1', metricType: 'steps', targetValue: 10000, durationDays: 7, stakeAmount: 10, startDate: '2023-10-01', endDate: '2023-10-07', status: 'active', createdAt: ''
      });
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/commitments'), expect.objectContaining({ method: 'POST' }));
    });
  });
});
