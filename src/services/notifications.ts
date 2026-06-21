import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HealthDataService, Commitment, DailyHealthData } from './health';

const MOTIVATION_MESSAGES = [
  "Stop slacking. Go hit your daily [targetVal] [unit] [metricLabel] target now.",
  "Your €[stakeAmount] stake is on the line. Get up and hit your [metricLabel] goal!",
  "Zero progress today is not an option. Move now to save your €[stakeAmount] pledge.",
  "Don't let laziness cost you €[stakeAmount]. Run your [metricLabel] goal right now.",
  "Discipline check. Go complete your daily [metricLabel] target of [targetVal] [unit]."
];

export class NotificationService {
  /**
   * Request device permissions for local notifications
   */
  static async requestPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('[NotificationService] Notification permissions not granted');
        return false;
      }

      // Android requires a channel setup
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#7C3AED',
        });
      }

      console.log('[NotificationService] Notification permissions granted and channel set up');
      return true;
    } catch (e) {
      console.error('[NotificationService] Error requesting notification permissions:', e);
      return false;
    }
  }

  /**
   * Helper to format a motivational message
   */
  private static getMotivationalMessage(commitment: Commitment, targetVal: number): string {
    const metricLabel = HealthDataService.getMetricLabel(commitment.metricType);
    const unit = HealthDataService.getMetricUnit(commitment.metricType);
    const stakeAmount = commitment.stakeAmount;
    
    const template = MOTIVATION_MESSAGES[Math.floor(Math.random() * MOTIVATION_MESSAGES.length)];
    return template
      .replace(/\[targetVal\]/g, Math.round(targetVal).toLocaleString())
      .replace(/\[unit\]/g, unit)
      .replace(/\[metricLabel\]/g, metricLabel)
      .replace(/\[stakeAmount\]/g, stakeAmount.toString());
  }

  /**
   * Schedule all notifications based on active commitments and settings
   */
  static async scheduleAllNotifications(): Promise<void> {
    try {
      // 1. Cancel all scheduled notifications first to ensure clean state
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('[NotificationService] Canceled all scheduled notifications');

      // 2. Load settings
      const settingsStr = await AsyncStorage.getItem('user_notification_settings');
      const settings = settingsStr ? JSON.parse(settingsStr) : {
        dailyReminder: true,
        gracePeriodSync: true,
        achievementAlerts: true,
      };

      const commitments = await HealthDataService.getActiveCommitments();
      const now = new Date();

      for (const commitment of commitments) {
        // Daily target calculation
        const targetVal = commitment.targetScope === 'weekly' 
          ? commitment.targetValue / 7 
          : commitment.targetValue;
        
        const metricLabel = HealthDataService.getMetricLabel(commitment.metricType);

        // Fetch logs for this commitment to see which days are already met
        const logs: DailyHealthData[] = await HealthDataService.fetchWeeklyData(
          commitment.metricType, 
          commitment
        );

        // A. Daily motivation reminder (if enabled)
        if (settings.dailyReminder) {
          const days = HealthDataService.getCommitmentDaysList(commitment);
          for (const dayStr of days) {
            // Find progress value for this day
            const logEntry = logs.find(l => l.dateString === dayStr);
            const value = logEntry ? logEntry.value : 0;
            const isCompleted = value >= targetVal;

            if (!isCompleted) {
              // Parse date and set time to 17:00 (5:00 PM) local time
              const reminderTime = HealthDataService.parseLocalDate(dayStr, 17, 0, 0);

              // Schedule only if the reminder time is in the future
              if (reminderTime.getTime() > now.getTime()) {
                const bodyMsg = this.getMotivationalMessage(commitment, targetVal);
                
                await Notifications.scheduleNotificationAsync({
                  content: {
                    title: `Discipline Check 🔒`,
                    body: bodyMsg,
                    data: {
                      type: 'dailyMotivation',
                      commitmentId: commitment.id,
                      dateString: dayStr,
                    },
                  },
                  trigger: {
                    type: Notifications.SchedulableTriggerInputTypes.DATE,
                    date: reminderTime,
                  },
                });
                console.log(`[NotificationService] Scheduled Daily Reminder for ${dayStr} at 17:00`);
              }
            }
          }
        }

        // B. Grace Period refund reminder (if enabled)
        if (settings.gracePeriodSync) {
          // Grace period is 48 hours after commitment ends.
          // If endDate is Sunday (e.g. 2026-06-21), grace days are Monday (2026-06-22) and Tuesday (2026-06-23).
          const endDateObj = HealthDataService.parseLocalDate(commitment.endDate);
          
          const graceDays = [
            { offset: 1, label: 'Day 1' },
            { offset: 2, label: 'Day 2' }
          ];

          for (const gd of graceDays) {
            const graceTime = new Date(endDateObj.getTime() + gd.offset * 24 * 60 * 60 * 1000);
            graceTime.setHours(10, 0, 0, 0); // 10:00 AM

            if (graceTime.getTime() > now.getTime()) {
              const year = graceTime.getFullYear();
              const month = String(graceTime.getMonth() + 1).padStart(2, '0');
              const day = String(graceTime.getDate()).padStart(2, '0');
              const dateStr = `${year}-${month}-${day}`;

              await Notifications.scheduleNotificationAsync({
                content: {
                  title: `Refund Awaiting! 💰`,
                  body: `Your ${metricLabel} commitment has ended! Open the app now and approve your refund of €${commitment.stakeAmount} before it's forfeited.`,
                  data: {
                    type: 'gracePeriod',
                    commitmentId: commitment.id,
                    dateString: dateStr,
                  },
                },
                trigger: {
                  type: Notifications.SchedulableTriggerInputTypes.DATE,
                  date: graceTime,
                },
              });
              console.log(`[NotificationService] Scheduled Grace Period Reminder for ${dateStr} at 10:00 AM`);
            }
          }
        }
      }
    } catch (e) {
      console.error('[NotificationService] Error scheduling notifications:', e);
    }
  }

  /**
   * Real-time check to trigger completion notification immediately once target is achieved.
   * Also cancels today's scheduled motivation reminder.
   */
  static async checkAndTriggerCompletionNotification(commitment: Commitment, todayValue: number): Promise<void> {
    try {
      // 1. Load settings
      const settingsStr = await AsyncStorage.getItem('user_notification_settings');
      const settings = settingsStr ? JSON.parse(settingsStr) : {
        dailyReminder: true,
        gracePeriodSync: true,
        achievementAlerts: true,
      };

      if (!settings.achievementAlerts) {
        return;
      }

      // 2. Check target scope
      const targetVal = commitment.targetScope === 'weekly' 
        ? commitment.targetValue / 7 
        : commitment.targetValue;
      
      const isCompleted = todayValue >= targetVal;
      if (!isCompleted) {
        return;
      }

      // 3. Check if already notified today for this commitment
      const todayStr = HealthDataService.getTodayDateString();
      const storageKey = `@habitcontract_sent_achievement_${commitment.id}_${todayStr}`;
      const sentFlag = await AsyncStorage.getItem(storageKey);
      
      if (sentFlag === 'true') {
        // Already sent today
        return;
      }

      // 4. Respect time window: 07:00 - 22:00
      const now = new Date();
      const currentHour = now.getHours();
      if (currentHour < 7 || currentHour >= 22) {
        console.log(`[NotificationService] Goal met, but outside allowed hours (07:00 - 22:00). Current hour: ${currentHour}. Skipping notification.`);
        return;
      }

      // 5. Send notification immediately
      const metricLabel = HealthDataService.getMetricLabel(commitment.metricType);
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `Goal Achieved! 🎉`,
          body: `You've successfully hit your daily ${metricLabel} target today! Your €${commitment.stakeAmount} stake is safe.`,
          data: {
            type: 'achievement',
            commitmentId: commitment.id,
            dateString: todayStr,
          },
        },
        trigger: null, // null means immediate delivery
      });

      console.log(`[NotificationService] Triggered completion notification for ${commitment.id}`);
      
      // Save sent flag
      await AsyncStorage.setItem(storageKey, 'true');

      // 6. Refresh all scheduled notifications (this will clear all and reschedule them,
      // and since today is now completed, today's daily motivation reminder will NOT be scheduled!)
      await this.scheduleAllNotifications();
    } catch (e) {
      console.error('[NotificationService] Error in checkAndTriggerCompletionNotification:', e);
    }
  }
}
