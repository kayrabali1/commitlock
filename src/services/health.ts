import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, NativeModules } from 'react-native';
import { API_URL } from './auth';

let AppleHealthKit: any;
if (Platform.OS === 'ios') {
  try {
    const healthModule = require('react-native-health');
    const nativeModule = NativeModules.AppleHealthKit || NativeModules.RCTAppleHealthKit;
    
    if (nativeModule) {
      // Merge JS constants with native module methods to bypass the Object.assign non-enumerable bug
      AppleHealthKit = Object.assign({}, nativeModule, healthModule.default || healthModule, {
        initHealthKit: nativeModule.initHealthKit ? nativeModule.initHealthKit.bind(nativeModule) : undefined,
        getDailyStepCountSamples: nativeModule.getDailyStepCountSamples ? nativeModule.getDailyStepCountSamples.bind(nativeModule) : undefined,
        getDailyDistanceWalkingRunningSamples: nativeModule.getDailyDistanceWalkingRunningSamples ? nativeModule.getDailyDistanceWalkingRunningSamples.bind(nativeModule) : undefined,
        getDailyDistanceCyclingSamples: nativeModule.getDailyDistanceCyclingSamples ? nativeModule.getDailyDistanceCyclingSamples.bind(nativeModule) : undefined,
        getActiveEnergyBurned: nativeModule.getActiveEnergyBurned ? nativeModule.getActiveEnergyBurned.bind(nativeModule) : undefined,
        getAppleExerciseTime: nativeModule.getAppleExerciseTime ? nativeModule.getAppleExerciseTime.bind(nativeModule) : undefined,
        getMindfulSession: nativeModule.getMindfulSession ? nativeModule.getMindfulSession.bind(nativeModule) : undefined,
      });
      console.log('[HealthDataService] Successfully bound raw AppleHealthKit native methods');
    } else {
      AppleHealthKit = healthModule.default || healthModule;
      console.warn('[HealthDataService] Raw NativeModule.AppleHealthKit not found on NativeModules');
    }
  } catch (e) {
    console.warn('[HealthDataService] react-native-health could not be loaded:', e);
  }
}


export type MetricType = 'steps' | 'run' | 'mindfulness' | 'cycle' | 'calories' | 'activeTime';

export interface Commitment {
  id: string;
  metricType: MetricType;
  targetValue: number; // e.g., 10000 steps, 5 km, 15 km, 500 kcal, 30 mins, 7 hrs
  period: 'week' | 'month';
  stakeAmount: number; // e.g., 5, 10, 20
  startDate: string; // Monday date string (YYYY-MM-DD)
  endDate: string; // Sunday date string (YYYY-MM-DD)
  status: 'active' | 'success' | 'failed';
  createdAt: string;
  targetScope?: 'daily' | 'weekly'; // 'daily' or 'weekly'
  performanceData?: DailyHealthData[];
}

export interface DailyHealthData {
  dayName: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
  value: number; // steps, km, kcal, mins, or hrs
  dateString: string; // YYYY-MM-DD
}

const STORAGE_KEYS = {
  SELECTED_COMMITMENT_ID: 'habitcontract_selected_active_commitment_id',
  HISTORY: 'habitcontract_history',
};

// Default simulated values for the week
const DEFAULT_SIMULATED_DATA: Record<MetricType, DailyHealthData[]> = {
  steps: [
    { dayName: 'Mon', value: 11200, dateString: '' },
    { dayName: 'Tue', value: 10450, dateString: '' },
    { dayName: 'Wed', value: 9200, dateString: '' }, // Slightly below 10k by default to trigger decision making
    { dayName: 'Thu', value: 12100, dateString: '' },
    { dayName: 'Fri', value: 10800, dateString: '' },
    { dayName: 'Sat', value: 13400, dateString: '' },
    { dayName: 'Sun', value: 10050, dateString: '' },
  ],
  run: [
    { dayName: 'Mon', value: 5.2, dateString: '' },
    { dayName: 'Tue', value: 4.8, dateString: '' }, // Slightly below 5k
    { dayName: 'Wed', value: 5.5, dateString: '' },
    { dayName: 'Thu', value: 6.1, dateString: '' },
    { dayName: 'Fri', value: 5.0, dateString: '' },
    { dayName: 'Sat', value: 7.2, dateString: '' },
    { dayName: 'Sun', value: 5.1, dateString: '' },
  ],
  cycle: [
    { dayName: 'Mon', value: 15.5, dateString: '' },
    { dayName: 'Tue', value: 16.2, dateString: '' },
    { dayName: 'Wed', value: 14.1, dateString: '' }, // Slightly below 15k
    { dayName: 'Thu', value: 15.0, dateString: '' },
    { dayName: 'Fri', value: 17.5, dateString: '' },
    { dayName: 'Sat', value: 22.0, dateString: '' },
    { dayName: 'Sun', value: 15.2, dateString: '' },
  ],
  calories: [
    { dayName: 'Mon', value: 580, dateString: '' },
    { dayName: 'Tue', value: 520, dateString: '' },
    { dayName: 'Wed', value: 460, dateString: '' }, // Slightly below 500
    { dayName: 'Thu', value: 610, dateString: '' },
    { dayName: 'Fri', value: 505, dateString: '' },
    { dayName: 'Sat', value: 780, dateString: '' },
    { dayName: 'Sun', value: 510, dateString: '' },
  ],
  activeTime: [
    { dayName: 'Mon', value: 35, dateString: '' },
    { dayName: 'Tue', value: 32, dateString: '' },
    { dayName: 'Wed', value: 25, dateString: '' }, // Slightly below 30
    { dayName: 'Thu', value: 40, dateString: '' },
    { dayName: 'Fri', value: 30, dateString: '' },
    { dayName: 'Sat', value: 55, dateString: '' },
    { dayName: 'Sun', value: 31, dateString: '' },
  ],
  mindfulness: [
    { dayName: 'Mon', value: 15, dateString: '' },
    { dayName: 'Tue', value: 10, dateString: '' }, // Slightly below 15 mins
    { dayName: 'Wed', value: 20, dateString: '' },
    { dayName: 'Thu', value: 15, dateString: '' },
    { dayName: 'Fri', value: 0, dateString: '' }, // Missed session
    { dayName: 'Sat', value: 15, dateString: '' },
    { dayName: 'Sun', value: 15, dateString: '' },
  ],
};

export class HealthDataService {
  // Helper to make authenticated HTTP requests to the backend API
  private static async authenticatedFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const token = await AsyncStorage.getItem('@habitcontract_jwt_token');
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers,
    };
    return fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });
  }

  /**
   * Request native health tracking permission (Apple HealthKit / Google Health Connect)
   */
  static async requestPermissions(): Promise<boolean> {
    try {
      if (Platform.OS !== 'ios' || !AppleHealthKit || typeof AppleHealthKit.initHealthKit !== 'function') {
        console.log('[HealthDataService] Mocking permission request on non-iOS or native module not loaded');
        return true;
      }
      return new Promise((resolve) => {
        const permissions = {
          permissions: {
            read: [
              AppleHealthKit.Constants.Permissions.StepCount,
              AppleHealthKit.Constants.Permissions.DistanceWalkingRunning,
              AppleHealthKit.Constants.Permissions.DistanceCycling,
              AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
              AppleHealthKit.Constants.Permissions.AppleExerciseTime,
              AppleHealthKit.Constants.Permissions.MindfulSession,
            ],
            write: [],
          },
        };
        AppleHealthKit.initHealthKit(permissions, (error: string) => {
          if (error) {
            console.error('[HealthDataService] Error requesting health permissions:', error);
            resolve(false);
          } else {
            console.log('[HealthDataService] Health permissions granted/synced successfully');
            resolve(true);
          }
        });
      });
    } catch (e) {
      console.error('Error requesting health permissions', e);
      return false;
    }
  }

  /**
   * Queries daily health data for a specific metric over a date range from native HealthKit
   */
  /**
   * Helper to format any date input to local YYYY-MM-DD string
   */
  static formatLocalYYYYMMDD(dateInput: string | Date | number): string {
    if (typeof dateInput === 'string' && dateInput.length === 10 && dateInput.includes('-')) {
      return dateInput;
    }
    const d = new Date(dateInput);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Helper to query a single day's metric from native HealthKit
   */
  static async querySingleDayMetric(metric: MetricType, dateStr: string): Promise<number> {
    if (Platform.OS !== 'ios' || !AppleHealthKit || typeof AppleHealthKit.getDailyStepCountSamples !== 'function') {
      return 0;
    }

    try {
      const result = await new Promise<Record<string, number>>((resolve, reject) => {
        const startDate = this.parseLocalDate(dateStr, 0, 0, 0);
        const endDate = this.parseLocalDate(dateStr, 23, 59, 59);
        const options = {
          startDate: startDate.toISOString().replace('Z', '+0000'),
          endDate: endDate.toISOString().replace('Z', '+0000'),
          ascending: true,
          includeManuallyAdded: true,
        };

        const callback = (err: any, results: any) => {
          if (err) {
            reject(err);
            return;
          }
          const dailyValues: Record<string, number> = {};
          if (Array.isArray(results)) {
            results.forEach((sample: any) => {
              if (!sample.startDate) return;
              const dateKey = this.formatLocalYYYYMMDD(sample.startDate);
              let val = Number(sample.value) || 0;
              if (metric === 'run' || metric === 'cycle') {
                val = val / 1000;
              }
              dailyValues[dateKey] = (dailyValues[dateKey] || 0) + val;
            });
          } else if (results && typeof results === 'object' && results.value !== undefined) {
            const rawDate = results.startDate || dateStr;
            const dateKey = this.formatLocalYYYYMMDD(rawDate);
            let val = Number(results.value) || 0;
            if (metric === 'run' || metric === 'cycle') {
              val = val / 1000;
            }
            dailyValues[dateKey] = val;
          }
          resolve(dailyValues);
        };

        switch (metric) {
          case 'steps':
            AppleHealthKit.getDailyStepCountSamples(options, callback);
            break;
          case 'run':
            AppleHealthKit.getDailyDistanceWalkingRunningSamples({ ...options, unit: 'km' }, callback);
            break;
          case 'cycle':
            AppleHealthKit.getDailyDistanceCyclingSamples({ ...options, unit: 'km' }, callback);
            break;
          case 'calories':
            AppleHealthKit.getActiveEnergyBurned(options, callback);
            break;
          case 'activeTime':
            AppleHealthKit.getAppleExerciseTime(options, callback);
            break;
          case 'mindfulness':
            AppleHealthKit.getMindfulSession(options, (err: any, results: any) => {
              if (err) {
                reject(err);
                return;
              }
              const dailyValues: Record<string, number> = {};
              if (Array.isArray(results)) {
                results.forEach((sample: any) => {
                  if (!sample.startDate || !sample.endDate) return;
                  const start = new Date(sample.startDate).getTime();
                  const end = new Date(sample.endDate).getTime();
                  const durationMins = (end - start) / (1000 * 60);
                  const d = new Date(sample.startDate);
                  const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                  dailyValues[dateKey] = (dailyValues[dateKey] || 0) + durationMins;
                });
              }
              resolve(dailyValues);
            });
            break;
          default:
            resolve({});
        }
      });

      return result[dateStr] || 0;
    } catch (error) {
      console.error(`[HealthDataService] Error querying single day ${metric} for ${dateStr}:`, error);
      return 0;
    }
  }

  /**
   * Queries daily health data for a specific metric over a date range from native HealthKit
   */
  static async queryHealthDataDaily(metric: MetricType, startDateStr: string, endDateStr: string): Promise<Record<string, number>> {
    if (Platform.OS !== 'ios' || !AppleHealthKit || typeof AppleHealthKit.getDailyStepCountSamples !== 'function') {
      return {};
    }

    try {
      const dailyValues: Record<string, number> = {};
      
      // Generate dates list
      const start = this.parseLocalDate(startDateStr);
      const end = this.parseLocalDate(endDateStr);
      const current = new Date(start);
      const dates: string[] = [];
      while (current <= end) {
        const year = current.getFullYear();
        const month = String(current.getMonth() + 1).padStart(2, '0');
        const date = String(current.getDate()).padStart(2, '0');
        dates.push(`${year}-${month}-${date}`);
        current.setDate(current.getDate() + 1);
      }

      // Query each day individually in parallel
      const queries = dates.map(async (dateStr) => {
        const val = await this.querySingleDayMetric(metric, dateStr);
        dailyValues[dateStr] = val;
      });
      await Promise.all(queries);

      console.log(`[HealthDataService] queryHealthDataDaily accumulated results for ${metric}:`, JSON.stringify(dailyValues));
      return dailyValues;
    } catch (e) {
      console.error(`[HealthDataService] Exception querying HealthKit daily range for ${metric}:`, e);
      return {};
    }
  }

  /**
   * Log health data directly to the backend API
   */
  static async logHealthData(metric: MetricType, dateStr: string, value: number): Promise<void> {
    try {
      const response = await this.authenticatedFetch('/api/health/log', {
        method: 'POST',
        body: JSON.stringify({
          metricType: metric,
          dateString: dateStr,
          value: Number(value),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update daily metric on backend');
      }
    } catch (e) {
      console.error('[HealthDataService] Error logging health data to backend:', e);
    }
  }

  /**
   * Synchronizes active commitments with Apple HealthKit (called on index screen focus)
   */
  static async syncActiveCommitmentsWithHealthKit(commitments: Commitment[]): Promise<void> {
    if (Platform.OS !== 'ios' || !AppleHealthKit || typeof AppleHealthKit.initHealthKit !== 'function') {
      return;
    }

    const permissionSuccess = await this.requestPermissions();
    if (!permissionSuccess) {
      console.log('[HealthDataService] HealthKit permissions not granted, skipping sync');
      return;
    }

    const todayStr = this.getTodayDateString();

    for (const commitment of commitments) {
      const dates = this.getCommitmentDaysList(commitment);
      if (dates.length === 0) continue;

      const startDateStr = dates[0];
      // Do not query past the current day to avoid potential native query side-effects with future dates.
      const endDateStr = dates[dates.length - 1] > todayStr ? todayStr : dates[dates.length - 1];

      // Query real HealthKit data
      const dailyData = await this.queryHealthDataDaily(commitment.metricType, startDateStr, endDateStr);

      // Upload to backend
      for (const dateStr of dates) {
        const value = dailyData[dateStr] || 0;
        await this.logHealthData(commitment.metricType, dateStr, value);
      }
    }
    await this.syncWidgets();
  }

  /**
   * Helper to query today's metric with status
   */
  static async queryTodayMetricWithStatus(metric: MetricType): Promise<{
    value: number;
    status: 'granted' | 'denied' | 'unsupported';
  }> {
    if (Platform.OS !== 'ios' || !AppleHealthKit || typeof AppleHealthKit.getDailyStepCountSamples !== 'function') {
      // Mock/fallback values if running on Web / Android / Expo Go
      const defaults: Record<string, number> = {
        steps: 7420,
        calories: 340,
        mindfulness: 15,
        run: 4.2,
        cycle: 0,
        activeTime: 30,
      };
      return {
        value: defaults[metric] || 0,
        status: 'unsupported',
      };
    }

    const todayStr = this.getTodayDateString();
    const value = await this.querySingleDayMetric(metric, todayStr);
    return {
      value,
      status: 'granted',
    };
  }

  /**
   * Queries live HealthKit metrics for today (used in connection check modal)
   */
  static async queryTodayMetrics(): Promise<{
    steps: { value: number; status: 'granted' | 'denied' | 'unsupported' };
    calories: { value: number; status: 'granted' | 'denied' | 'unsupported' };
    mindfulness: { value: number; status: 'granted' | 'denied' | 'unsupported' };
    distance: { value: number; status: 'granted' | 'denied' | 'unsupported' };
  }> {
    const stepsData = await this.queryTodayMetricWithStatus('steps');
    const caloriesData = await this.queryTodayMetricWithStatus('calories');
    const mindfulnessData = await this.queryTodayMetricWithStatus('mindfulness');
    
    // Check both run and cycle distances for combined distance
    const runData = await this.queryTodayMetricWithStatus('run');
    const cycleData = await this.queryTodayMetricWithStatus('cycle');

    let distanceStatus: 'granted' | 'denied' | 'unsupported' = 'granted';
    if (runData.status === 'unsupported' || cycleData.status === 'unsupported') {
      distanceStatus = 'unsupported';
    } else if (runData.status === 'denied' && cycleData.status === 'denied') {
      distanceStatus = 'denied';
    }

    return {
      steps: stepsData,
      calories: caloriesData,
      mindfulness: mindfulnessData,
      distance: {
        value: runData.value + cycleData.value,
        status: distanceStatus,
      },
    };
  }

  static parseLocalDate(dateStr: string, hours = 12, minutes = 0, seconds = 0): Date {
    const parts = dateStr.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // 0-indexed
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day, hours, minutes, seconds);
  }

  static getTodayDateString(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  /**
   * Gets the dates of the current week (Monday to Sunday)
   */
  static getWeekDates(): string[] {
    const dates: string[] = [];
    const today = new Date();
    const day = today.getDay();
    // Calculate Monday of current week
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    
    // Create Monday at local midnight to prevent time-of-day shifting in calculations
    const monday = new Date(today.getFullYear(), today.getMonth(), diff);

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const date = String(d.getDate()).padStart(2, '0');
      dates.push(`${year}-${month}-${date}`);
    }
    return dates;
  }

  /**
   * Fetch daily data for active commitment week from GCP backend.
   */
  static async fetchWeeklyData(metric: MetricType, commitment?: Commitment): Promise<DailyHealthData[]> {
    try {
      let dates: string[];
      if (commitment) {
        dates = [];
        const start = this.parseLocalDate(commitment.startDate);
        const end = this.parseLocalDate(commitment.endDate);
        const current = new Date(start);
        while (current <= end) {
          const year = current.getFullYear();
          const month = String(current.getMonth() + 1).padStart(2, '0');
          const date = String(current.getDate()).padStart(2, '0');
          dates.push(`${year}-${month}-${date}`);
          current.setDate(current.getDate() + 1);
        }
      } else {
        dates = this.getWeekDates();
      }

      // 1. Fetch from local HealthKit directly if available on iOS
      let localHealthData: Record<string, number> = {};
      if (Platform.OS === 'ios' && AppleHealthKit && typeof AppleHealthKit.getDailyStepCountSamples === 'function') {
        try {
          const todayStr = this.getTodayDateString();
          const startDateStr = dates[0];
          const endDateStr = dates[dates.length - 1] > todayStr ? todayStr : dates[dates.length - 1];
          localHealthData = await this.queryHealthDataDaily(metric, startDateStr, endDateStr);
        } catch (err) {
          console.error('[HealthDataService] Error querying local HealthKit data inside fetchWeeklyData:', err);
        }
      }

      // 2. Fetch from GCP Backend (as backup or for dates that are not local/cached)
      const response = await this.authenticatedFetch(
        `/api/health/range?metricType=${metric}&startDate=${dates[0]}&endDate=${dates[dates.length - 1]}`
      );
      
      const backendLogs: any[] = response.ok ? await response.json() : [];

      // Map response to our daily data layout, prioritizing live local HealthKit data
      return dates.map((dateStr, index) => {
        const match = backendLogs.find(log => log.dateString === dateStr);
        const dateObj = this.parseLocalDate(dateStr);
        const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' }) as DailyHealthData['dayName'];

        let value = 0;
        if (localHealthData[dateStr] !== undefined && localHealthData[dateStr] > 0) {
          value = localHealthData[dateStr];
        } else if (match) {
          value = match.value;
        } else if (localHealthData[dateStr] !== undefined) {
          value = localHealthData[dateStr];
        }

        return {
          dayName,
          value,
          dateString: dateStr,
        };
      });
    } catch (e) {
      console.error('Error fetching health data from backend', e);
      return [];
    }
  }

  /**
   * Update a specific day's simulated health data on the backend.
   */
  static async updateSimulatedDay(metric: MetricType, dayName: string, value: number): Promise<void> {
    try {
      const dates = this.getWeekDates();
      const dayIndex = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(dayName);
      
      if (dayIndex !== -1 && dates[dayIndex]) {
        const dateStr = dates[dayIndex];
        
        const response = await this.authenticatedFetch('/api/health/log', {
          method: 'POST',
          body: JSON.stringify({
            metricType: metric,
            dateString: dateStr,
            value: Number(value),
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to update daily metric on backend');
        }
      }
      
      await this.syncWidgets();
    } catch (e) {
      console.error('Error updating simulated health day on backend:', e);
    }
  }

  /**
   * Reset simulated health data to defaults (Local mock only)
   */
  static async resetSimulatedData(): Promise<void> {
    // No-op for backend range metrics
  }

  /**
   * Reset all commitment, history, and simulation data to factory defaults
   */
  static async resetAllData(): Promise<void> {
    try {
      const commitments = await this.getActiveCommitments();
      for (const c of commitments) {
        await this.authenticatedFetch(`/api/commitments/${c.id}`, {
          method: 'DELETE',
        });
      }
      await AsyncStorage.removeItem(STORAGE_KEYS.SELECTED_COMMITMENT_ID);
      await this.syncWidgets();
    } catch (e) {
      console.error('Failed to reset backend data:', e);
    }
  }

  // --- Wallet & Commitment Operations ---

  static async getActiveCommitments(): Promise<Commitment[]> {
    try {
      const response = await this.authenticatedFetch('/api/commitments');
      if (response.ok) {
        const list = await response.json();
        return list.filter((c: any) => c.status === 'active');
      }
      return [];
    } catch {
      return [];
    }
  }

  static async setSelectedActiveCommitmentId(id: string): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.SELECTED_COMMITMENT_ID, id);
  }

  static async getActiveCommitment(id?: string): Promise<Commitment | null> {
    try {
      const commitments = await this.getActiveCommitments();
      if (commitments.length === 0) return null;
      if (id) {
        return commitments.find((c) => c.id === id) || null;
      }
      
      const selectedId = await AsyncStorage.getItem(STORAGE_KEYS.SELECTED_COMMITMENT_ID);
      if (selectedId) {
        const selected = commitments.find((c) => c.id === selectedId);
        if (selected) return selected;
      }
      return commitments[0] || null;
    } catch {
      return null;
    }
  }

  static async saveActiveCommitment(commitment: Commitment): Promise<void> {
    try {
      const response = await this.authenticatedFetch('/api/commitments', {
        method: 'POST',
        body: JSON.stringify({
          metricType: commitment.metricType,
          targetValue: commitment.targetValue,
          period: commitment.period,
          stakeAmount: commitment.stakeAmount,
          startDate: commitment.startDate,
          endDate: commitment.endDate,
          targetScope: commitment.targetScope || 'daily',
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to create active commitment');
      }

      const data = await response.json();
      await this.setSelectedActiveCommitmentId(data.commitment.id);
      
      // Update cached user wallet balance
      const storedUser = await AsyncStorage.getItem('@habitcontract_user_profile');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        user.walletBalance = data.walletBalance;
        await AsyncStorage.setItem('@habitcontract_user_profile', JSON.stringify(user));
      }

      await this.syncWidgets();
    } catch (e) {
      console.error('Error saving active commitment', e);
      throw e;
    }
  }

  static async clearActiveCommitment(id?: string): Promise<void> {
    try {
      const response = await this.authenticatedFetch('/api/commitments');
      if (!response.ok) return;

      const list = await response.json();
      const activeCommitments = list.filter((c: any) => c.status === 'active');
      
      const targetId = id || (await AsyncStorage.getItem(STORAGE_KEYS.SELECTED_COMMITMENT_ID)) || (activeCommitments[0]?.id);
      
      if (targetId) {
        const isActive = activeCommitments.some((c: any) => c.id === targetId);
        if (isActive) {
          // Send DELETE request to cancel and refund
          const delResponse = await this.authenticatedFetch(`/api/commitments/${targetId}`, {
            method: 'DELETE',
          });

          if (delResponse.ok) {
            const data = await delResponse.json();
            // Update cached wallet balance
            const storedUser = await AsyncStorage.getItem('@habitcontract_user_profile');
            if (storedUser) {
              const user = JSON.parse(storedUser);
              user.walletBalance = data.walletBalance;
              await AsyncStorage.setItem('@habitcontract_user_profile', JSON.stringify(user));
            }
          }
        }
        
        const selectedId = await AsyncStorage.getItem(STORAGE_KEYS.SELECTED_COMMITMENT_ID);
        if (selectedId === targetId) {
          const remaining = activeCommitments.filter((c: any) => c.id !== targetId);
          if (remaining.length > 0) {
            await this.setSelectedActiveCommitmentId(remaining[0].id);
          } else {
            await AsyncStorage.removeItem(STORAGE_KEYS.SELECTED_COMMITMENT_ID);
          }
        }
        await this.syncWidgets();
      }
    } catch (e) {
      console.error('Error clearing active commitment', e);
    }
  }

  static async getHistory(): Promise<Commitment[]> {
    try {
      const response = await this.authenticatedFetch('/api/commitments');
      if (response.ok) {
        const list = await response.json();
        const history = list.filter((c: any) => c.status !== 'active');
        if (history.length > 0) {
          return history;
        }
      }
      
      return [];
    } catch {
      return [];
    }
  }

  static async addHistoryEntry(commitment: Commitment): Promise<void> {
    try {
      // Send resolution request to the backend API
      const response = await this.authenticatedFetch(`/api/commitments/${commitment.id}/resolve`, {
        method: 'POST',
        body: JSON.stringify({
          status: commitment.status,
          performanceData: commitment.performanceData || [],
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to resolve commitment on backend');
      }

      const data = await response.json();
      
      // Update cached wallet balance
      const storedUser = await AsyncStorage.getItem('@habitcontract_user_profile');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        user.walletBalance = data.walletBalance;
        await AsyncStorage.setItem('@habitcontract_user_profile', JSON.stringify(user));
      }
    } catch (e) {
      console.error('Error resolving commitment on backend', e);
    }
  }

  static async getWalletBalance(): Promise<number> {
    try {
      const response = await this.authenticatedFetch('/api/user/profile');
      if (response.ok) {
        const data = await response.json();
        // Update cached profile
        await AsyncStorage.setItem('@habitcontract_user_profile', JSON.stringify(data));
        return data.walletBalance;
      }
    } catch (e) {
      console.error('Failed to get wallet balance from backend', e);
    }

    try {
      const stored = await AsyncStorage.getItem('@habitcontract_user_profile');
      if (stored) {
        const user = JSON.parse(stored);
        return user.walletBalance || 100.0;
      }
    } catch {}
    return 100.0;
  }

  static async updateWalletBalance(amount: number): Promise<number> {
    try {
      const response = await this.authenticatedFetch('/api/user/wallet', {
        method: 'PUT',
        body: JSON.stringify({ amount }),
      });

      if (response.ok) {
        const data = await response.json();
        // Update cached profile
        const storedUser = await AsyncStorage.getItem('@habitcontract_user_profile');
        if (storedUser) {
          const user = JSON.parse(storedUser);
          user.walletBalance = data.walletBalance;
          await AsyncStorage.setItem('@habitcontract_user_profile', JSON.stringify(user));
        }
        return data.walletBalance;
      }
    } catch (e) {
      console.error('Failed to update wallet balance on backend', e);
    }

    // Fallback to local offline addition
    const current = await this.getWalletBalance();
    const updated = Math.max(0, current + amount);
    return updated;
  }

  static getMetricLabel(type: string): string {
    switch (type) {
      case 'steps': return 'Steps';
      case 'run': return 'km Run';
      case 'cycle': return 'km Cycle';
      case 'calories': return 'Active Calories';
      case 'activeTime': return 'mins Active';
      case 'mindfulness': return 'mins Mindfulness';
      default: return '';
    }
  }

  static getMetricUnit(type: string): string {
    switch (type) {
      case 'steps': return 'steps';
      case 'calories': return 'kcal';
      case 'activeTime': return 'mins';
      case 'mindfulness': return 'mins';
      default: return 'km';
    }
  }

  static getCommitmentDaysList(commitment: Commitment): string[] {
    try {
      const start = this.parseLocalDate(commitment.startDate);
      const end = this.parseLocalDate(commitment.endDate);
      const dates: string[] = [];
      const current = new Date(start);
      
      while (current <= end) {
        const year = current.getFullYear();
        const month = String(current.getMonth() + 1).padStart(2, '0');
        const day = String(current.getDate()).padStart(2, '0');
        dates.push(`${year}-${month}-${day}`);
        current.setDate(current.getDate() + 1);
      }
      return dates;
    } catch {
      return [];
    }
  }

  static getTodayIndex(): number {
    const day = new Date().getDay();
    return day === 0 ? 6 : day - 1;
  }

  static getCommitmentStats(commitment: Commitment, weeklyDataList: DailyHealthData[]) {
    if (!commitment || !weeklyDataList || weeklyDataList.length === 0) {
      return { completedDays: 0, failedDays: 0, overallProgress: 0, totalAccumulated: 0 };
    }

    const todayDateStr = this.getTodayDateString();
    const pastAndTodayData = weeklyDataList.filter(d => d.dateString <= todayDateStr);
    const totalAccumulated = pastAndTodayData.reduce((acc, day) => acc + day.value, 0);

    const allDays = this.getCommitmentDaysList(commitment);
    const totalDays = allDays.length || 7;

    let overallProgress = 0;

    if (commitment.targetScope === 'weekly') {
      const dailyAverage = commitment.targetValue / 7;
      const totalCommitmentTarget = dailyAverage * totalDays;
      let accumulated = 0;
      
      allDays.forEach((dateStr) => {
        if (dateStr <= todayDateStr) {
          const dayData = weeklyDataList.find(d => d.dateString === dateStr);
          if (dayData) {
            accumulated += dayData.value;
          } else if (dateStr < todayDateStr) {
            accumulated += dailyAverage;
          }
        }
      });
      
      overallProgress = Math.min(Math.round((accumulated / totalCommitmentTarget) * 100), 100);
    } else {
      let sumProgress = 0;
      
      allDays.forEach((dateStr) => {
        if (dateStr <= todayDateStr) {
          const dayData = weeklyDataList.find(d => d.dateString === dateStr);
          if (dayData) {
            sumProgress += Math.min(dayData.value / commitment.targetValue, 1);
          } else if (dateStr < todayDateStr) {
            sumProgress += 1.0;
          }
        }
      });
      
      overallProgress = Math.min(Math.round((sumProgress / totalDays) * 100), 100);
    }

    let completed = 0;
    let failed = 0;
    pastAndTodayData.forEach((day) => {
      const dayTarget = commitment.targetScope === 'weekly' ? commitment.targetValue / 7 : commitment.targetValue;
      if (day.value >= dayTarget) {
        completed++;
      } else {
        if (day.dateString < todayDateStr) {
          failed++;
        }
      }
    });

    return {
      completedDays: completed,
      failedDays: failed,
      overallProgress,
      totalAccumulated,
    };
  }

  static hasFailedSoFar(commitment: Commitment, weeklyDataList: DailyHealthData[]) {
    if (!commitment || !weeklyDataList || weeklyDataList.length === 0) return false;
    if (commitment.targetScope === 'weekly') {
      return false;
    }
    const todayDateStr = this.getTodayDateString();
    return weeklyDataList.some(
      (day) => day.dateString < todayDateStr && day.value < commitment.targetValue
    );
  }

  static getRemainingDaysString(commitment: Commitment, weeklyDataList: DailyHealthData[]) {
    if (!commitment) return '0 Days';
    try {
      const today = new Date();
      const end = this.parseLocalDate(commitment.endDate, 23, 59, 59);
      
      const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endMidnight = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      
      const diffMs = endMidnight.getTime() - todayMidnight.getTime();
      const diffDays = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
      
      return `${diffDays} Day${diffDays !== 1 ? 's' : ''}`;
    } catch {
      return '0 Days';
    }
  }

  static getCommitmentSegments(commitment: Commitment, weeklyDataList: DailyHealthData[]): ('future' | 'success' | 'failed' | 'today')[] {
    const segments: ('future' | 'success' | 'failed' | 'today')[] = [];
    const allDays = this.getCommitmentDaysList(commitment);
    const todayDateStr = this.getTodayDateString();

    allDays.forEach((dateStr) => {
      const dayData = weeklyDataList.find(d => d.dateString === dateStr);
      
      if (dateStr > todayDateStr) {
        segments.push('future');
      } else if (dateStr === todayDateStr) {
        segments.push('today');
      } else {
        const isGoalMet = dayData
          ? (commitment.targetScope === 'weekly'
            ? dayData.value > 0
            : dayData.value >= commitment.targetValue)
          : true;
        
        segments.push(isGoalMet ? 'success' : 'failed');
      }
    });

    return segments;
  }

  static async syncWidgets(): Promise<void> {
    try {
      const commitments = await this.getActiveCommitments();

      // 1. Sync Android Widget
      if (Platform.OS === 'android') {
        try {
          const { requestWidgetUpdate } = require('react-native-android-widget');
          requestWidgetUpdate();
        } catch (e) {
          console.error('Failed to trigger Android widget update', e);
        }
      }

      // 2. Sync iOS Widget
      if (Platform.OS === 'ios') {
        try {
          const CommitmentsProgressWidget = require('@/widgets/ios').default;
          
          const statsList = [];
          for (const commitment of commitments) {
            const weeklyDataList = await this.fetchWeeklyData(commitment.metricType, commitment);
            const stats = this.getCommitmentStats(commitment, weeklyDataList);
            const isBroken = this.hasFailedSoFar(commitment, weeklyDataList);
            const segments = this.getCommitmentSegments(commitment, weeklyDataList);

            statsList.push({
              id: commitment.id,
              metricType: commitment.metricType,
              targetValue: commitment.targetValue,
              overallProgress: stats.overallProgress,
              label: this.getMetricLabel(commitment.metricType),
              unit: this.getMetricUnit(commitment.metricType),
              remainingDays: this.getRemainingDaysString(commitment, weeklyDataList),
              isBroken,
              targetScope: commitment.targetScope || 'daily',
              stakeAmount: commitment.stakeAmount,
              segments,
            });
          }

          CommitmentsProgressWidget.updateSnapshot({
            commitments: statsList,
          });
        } catch (e) {
          console.error('Failed to update iOS widget', e);
        }
      }
    } catch (e) {
      console.error('Error in syncWidgets', e);
    }
  }
}
