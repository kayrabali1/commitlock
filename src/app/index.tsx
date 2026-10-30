import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Platform,
  AppState,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { Spacing, BottomTabInset } from '@/constants/theme';
import { HealthDataService, Commitment, DailyHealthData } from '@/services/health';
import HowItWorksPane from '@/components/HowItWorksPane';
import { VerificationGuideModal } from '@/components/VerificationGuideModal';
import AppHeader, { BASE_HEADER_HEIGHT } from '@/components/AppHeader';
import { NotificationService } from '@/services/notifications';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/services/auth';
import WelcomePassesModal from '@/components/WelcomePassesModal';
import ClaimCoinSuccessModal from '@/components/ClaimCoinSuccessModal';

function generateRandomId() {
  return Math.random().toString(36).substring(2, 11);
}

export default function TrackerDashboard() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user, refundPassValue, purchasePasses, refreshUser } = useAuth();
  const insets = useSafeAreaInsets();
  
  // State
  const [isWelcomeVisible, setIsWelcomeVisible] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [activeCommitments, setActiveCommitments] = useState<Commitment[]>([]);
  const [commitmentsWeeklyData, setCommitmentsWeeklyData] = useState<Record<string, DailyHealthData[]>>({});
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isVerificationGuideVisible, setIsVerificationGuideVisible] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState<Record<string, boolean>>({});
  const [isResolving, setIsResolving] = useState<Record<string, boolean>>({});
  const [claimingCommitment, setClaimingCommitment] = useState<Commitment | null>(null);
  
  // Simulator Panel Visibility & Target Commitment
  const [simulatingCommitment, setSimulatingCommitment] = useState<Commitment | null>(null);

  const handleClaimStarterPack = async () => {
    setIsClaiming(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await purchasePasses(3);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        "Starter Pack Unlocked!",
        "We've added 3 Challenge Passes to your accountability balance for free. Use them to establish your first habits!"
      );
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Could not claim your free passes. Please try again.");
    } finally {
      setIsClaiming(false);
    }
  };

  // Load state from local storage and sync HealthKit
  const loadData = async () => {
    try {
      if (refreshUser) {
        await refreshUser();
      }
      const commitments = await HealthDataService.getActiveCommitments();
      setActiveCommitments(commitments);

      // Mark active commitments as loading logs
      setLogsLoading((prev) => {
        const next = { ...prev };
        commitments.forEach((c) => {
          next[c.id] = true;
        });
        return next;
      });

      // Real HealthKit sync
      if (Platform.OS === 'ios') {
        try {
          await HealthDataService.syncActiveCommitmentsWithHealthKit(commitments);
        } catch (e) {
          console.error('[TrackerDashboard] Error syncing HealthKit data:', e);
        }
      }

      await Promise.all(
        commitments.map(async (commitment) => {
          try {
            const data = await HealthDataService.fetchWeeklyData(commitment.metricType, commitment);
            setCommitmentsWeeklyData((prev) => ({
              ...prev,
              [commitment.id]: data,
            }));

            // Check for goal completion and trigger immediate achievement notifications
            const todayStr = HealthDataService.getTodayDateString();
            const todayEntry = data.find(d => d.dateString === todayStr);
            if (todayEntry) {
              await NotificationService.checkAndTriggerCompletionNotification(commitment, todayEntry.value);
            }
          } catch (e) {
            console.error(`Failed to fetch weekly data for ${commitment.id}:`, e);
          } finally {
            setLogsLoading((prev) => ({
              ...prev,
              [commitment.id]: false,
            }));
          }
        })
      );

      // Re-schedule all local reminders based on achievements and current active commitments
      await NotificationService.scheduleAllNotifications();

      // Always sync iOS widget layout & snapshot to App Group storage (even when 0 active commitments)
      if (Platform.OS === 'ios') {
        await HealthDataService.syncWidgets();
      }
    } catch (error) {
      console.error('Failed to load tracking data', error);
    } finally {
      setIsInitialLoading(false);
    }
  };

  // Check welcome passes modal
  useEffect(() => {
    const checkWelcome = async () => {
      if (user) {
        const welcomeShown = await AsyncStorage.getItem('@commitlock_welcome_shown');
        if (!welcomeShown) {
          setIsWelcomeVisible(true);
        }
      }
    };
    checkWelcome();
  }, [user]);

  const handleWelcomeClaim = async () => {
    try {
      // Credit the 3 starter coins (capped at 1 per tier / 3 total)
      if ((user?.passes ?? 0) < 3) {
        await purchasePasses(3);
      }
      await AsyncStorage.setItem('@commitlock_welcome_shown', 'true');
      setIsWelcomeVisible(false);
    } catch (e) {
      console.error(e);
    }
  };

  // Request native permissions automatically when the user first opens the application
  useEffect(() => {
    const requestInitialPermissions = async () => {
      try {
        await HealthDataService.requestPermissions();
      } catch (e) {
        console.error('[TrackerDashboard] Failed requesting initial HealthKit permissions:', e);
      }
    };
    requestInitialPermissions();
  }, []);

  const toggleExpandLog = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedLogs((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Listen for AppState changes to refresh data when app returns to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        loadData();
      }
    });
    return () => {
      subscription.remove();
    };
  }, []);

  // Reload data every time tab gains focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const handleRefresh = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsRefreshing(true);
    await loadData();
    // Short artificial delay to simulate HealthKit background data sync
    setTimeout(() => {
      setIsRefreshing(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 1000);
  };

  const getMetricIcon = (type: string) => {
    switch (type) {
      case 'steps': return 'walk';
      case 'run': return 'run';
      case 'cycle': return 'bicycle';
      case 'calories': return 'fire';
      case 'activeTime': return 'clock-outline';
      case 'mindfulness': return 'spa';
      default: return 'help-circle';
    }
  };

  const getMetricLabel = (type: string) => {
    switch (type) {
      case 'steps': return 'Steps';
      case 'run': return 'km Run';
      case 'cycle': return 'km Cycle';
      case 'calories': return 'Active Calories';
      case 'activeTime': return 'mins Active';
      case 'mindfulness': return 'mins Mindfulness';
      default: return '';
    }
  };

  const getMetricUnit = (type: string) => {
    switch (type) {
      case 'steps': return 'steps';
      case 'calories': return 'kcal';
      case 'activeTime': return 'mins';
      case 'mindfulness': return 'mins';
      default: return 'km';
    }
  };

  // Helper to parse date strings safely in local timezone
  const parseLocalDate = (dateStr: string, hours = 0, minutes = 0, seconds = 0): Date => {
    const parts = dateStr.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // 0-indexed
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day, hours, minutes, seconds);
  };

  const getCommitmentDaysList = (commitment: Commitment) => {
    try {
      const start = parseLocalDate(commitment.startDate, 12, 0, 0);
      const end = parseLocalDate(commitment.endDate, 12, 0, 0);
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
  };

  // Calculate stats for active commitment
  const getCommitmentStats = (commitment: Commitment, weeklyDataList: DailyHealthData[]) => {
    if (!commitment || !weeklyDataList || weeklyDataList.length === 0) {
      return { completedDays: 0, failedDays: 0, overallProgress: 0, totalAccumulated: 0 };
    }

    const todayDateStr = HealthDataService.getTodayDateString();
    // Only count values up to today (inclusive) for current tracking progress
    const pastAndTodayData = weeklyDataList.filter(d => d.dateString <= todayDateStr);
    const totalAccumulated = pastAndTodayData.reduce((acc, day) => acc + day.value, 0);

    const allDays = getCommitmentDaysList(commitment);
    const totalDays = allDays.length || 7;

    let overallProgress = 0;

      let sumProgress = 0;
      
      allDays.forEach((dateStr) => {
        if (dateStr <= todayDateStr) {
          const dayData = weeklyDataList.find(d => d.dateString === dateStr);
          if (dayData) {
            sumProgress += Math.min(dayData.value / commitment.targetValue, 1);
          } else if (dateStr < todayDateStr) {
            // Assume daily target met in past weeks
            sumProgress += 1.0;
          }
        }
      });
      
      overallProgress = Math.min(Math.round((sumProgress / totalDays) * 100), 100);

    let completed = 0;
    let failed = 0;
    pastAndTodayData.forEach((day) => {
      const dayTarget = commitment.targetValue;
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
  };

  // Check if any day has failed up to today
  const hasFailedSoFar = (commitment: Commitment, weeklyDataList: DailyHealthData[]) => {
    if (!commitment || !weeklyDataList || weeklyDataList.length === 0) return false;

    const todayDateStr = HealthDataService.getTodayDateString();
    // For tracking loss aversion: check if any resolved day (before today) has failed
    return weeklyDataList.some(
      (day) => day.dateString < todayDateStr && day.value < commitment.targetValue
    );
  };

  const getRemainingDays = (commitment: Commitment, weeklyDataList: DailyHealthData[]) => {
    if (!commitment) return '0 Days';
    try {
      const today = new Date();
      const end = parseLocalDate(commitment.endDate, 23, 59, 59);
      
      const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endMidnight = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      
      const diffMs = endMidnight.getTime() - todayMidnight.getTime();
      
      if (diffMs < 0) {
        // Commitment has ended. Calculate grace period remaining (48 hours from end of endDate day)
        // Which is Wednesday 00:00:00 if endDate was Sunday
        const [year, month, day] = commitment.endDate.split('-').map(Number);
        const gracePeriodEnd = new Date(year, month - 1, day + 3, 0, 0, 0, 0);
        const graceDiffMs = gracePeriodEnd.getTime() - today.getTime();
        
        if (graceDiffMs > 0) {
          const graceDiffHours = Math.max(0, Math.ceil(graceDiffMs / (1000 * 60 * 60)));
          return `${graceDiffHours}h sync window`;
        }
        return 'Expired';
      }
      
      const diffDays = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
      return `${diffDays} Day${diffDays !== 1 ? 's' : ''}`;
    } catch {
      return '0 Days';
    }
  };

  const handleProlong = async (commitment: Commitment, weeklyDataList: DailyHealthData[]) => {
    try {
      setIsResolving(prev => ({ ...prev, [commitment.id]: true }));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // 1. Resolve old commitment as success
      const resolvedCommitment: Commitment = {
        ...commitment,
        status: 'success',
        performanceData: weeklyDataList,
      };
      await HealthDataService.addHistoryEntry(resolvedCommitment);
      
      // 2. Clear active commitment slot
      await HealthDataService.clearActiveCommitment(commitment.id);
      
      // 3. Calculate new dates for prolonging
      const [year, month, day] = commitment.endDate.split('-').map(Number);
      const endDateObj = new Date(year, month - 1, day, 12, 0, 0);
      const newStartDateObj = new Date(endDateObj);
      newStartDateObj.setDate(endDateObj.getDate() + 1); // starts next day (Monday)
      
      const newEndDateObj = new Date(newStartDateObj);
      newEndDateObj.setDate(newStartDateObj.getDate() + commitment.durationDays - 1);
      
      const formatLocalDate = (d: Date) => {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      };
      
      // 4. Create new commitment
      const newCommitment = {
        id: generateRandomId(),
        metricType: commitment.metricType,
        targetValue: commitment.targetValue,
        durationDays: commitment.durationDays,
        stakeAmount: commitment.stakeAmount,
        startDate: formatLocalDate(newStartDateObj),
        endDate: formatLocalDate(newEndDateObj),
        status: 'active' as const,
        createdAt: new Date().toISOString(),

      };
      
      await HealthDataService.saveActiveCommitment(newCommitment);
      await HealthDataService.resetSimulatedData();
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Goal Prolonged!',
        `Your Challenge Pass has been rolled over to next week (${newCommitment.startDate} to ${newCommitment.endDate}).`
      );
      
      await loadData();
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to prolong commitment. Please try again.');
    } finally {
      setIsResolving(prev => ({ ...prev, [commitment.id]: false }));
    }
  };

  const handleRollover = (commitment: Commitment) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/commit',
      params: {
        rolloverFrom: commitment.id,
        rolloverStake: commitment.stakeAmount.toString(),
      }
    });
  };

  const handleEdit = (commitment: Commitment) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/commit',
      params: {
        editId: commitment.id,
      }
    });
  };

  const handlePassRefund = async (commitment: Commitment, weeklyDataList: DailyHealthData[]) => {
    try {
      setIsResolving(prev => ({ ...prev, [commitment.id]: true }));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // 1. Resolve old commitment as success with refundMethod: 'pass'
      const resolvedCommitment: Commitment = {
        ...commitment,
        status: 'success',
        performanceData: weeklyDataList,
        refundMethod: 'pass',
      };
      await HealthDataService.addHistoryEntry(resolvedCommitment);
      
      // 2. Clear active commitment slot
      await HealthDataService.clearActiveCommitment(commitment.id);

      // Refund the pass value back to user's available list
      if (refundPassValue) {
        await refundPassValue(commitment.stakeAmount);
      }
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Pass Returned!',
        `Your Challenge Pass has been returned to your balance.`
      );
      
      await loadData();
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to process pass refund. Please try again.');
    } finally {
      setIsResolving(prev => ({ ...prev, [commitment.id]: false }));
    }
  };

  const handleAcknowledgeForfeiture = async (commitment: Commitment, weeklyDataList: DailyHealthData[]) => {
    try {
      setIsResolving(prev => ({ ...prev, [commitment.id]: true }));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // 1. Resolve old commitment as failed
      const resolvedCommitment: Commitment = {
        ...commitment,
        status: 'failed',
        performanceData: weeklyDataList,
      };
      await HealthDataService.addHistoryEntry(resolvedCommitment);
      
      // 2. Clear active commitment slot
      await HealthDataService.clearActiveCommitment(commitment.id);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(
        'Forfeiture Acknowledged',
        `The Challenge Pass spent on this goal has been lost. Keep trying!`
      );
      
      await loadData();
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to acknowledge forfeiture. Please try again.');
    } finally {
      setIsResolving(prev => ({ ...prev, [commitment.id]: false }));
    }
  };

  if (isInitialLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#06070B', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: BASE_HEADER_HEIGHT + insets.top + Spacing.three },
            activeCommitments.length === 0 && { paddingBottom: BottomTabInset + Spacing.five }
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#7C3AED"
              title={t('active.syncing')}
              titleColor="#7C3AED"
              progressViewOffset={BASE_HEADER_HEIGHT + insets.top}
            />
          }
        >

          {activeCommitments.length === 0 ? (
            /* EMPTY STATE - NO ACTIVE COMMITMENTS */
            <View style={styles.emptyContainer}>
              {/* Welcome Banner */}
              <View style={styles.welcomeBanner}>
                <Text style={styles.welcomeSubtitle}>READY FOR A CHALLENGE?</Text>
                <Text style={styles.welcomeTitle}>
                  {user?.name ? `Hello, ${user.name}!` : "Welcome!"}
                </Text>
              </View>

              {/* Passes Balance Indicator */}
              <LinearGradient
                colors={['#141722', '#0C0E14']}
                style={styles.passesCard}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
              >
                <View style={styles.passesCardHeader}>
                  <View style={styles.passesCardIconBg}>
                    <Text style={styles.passesCardIcon}>🎫</Text>
                  </View>
                  <View style={styles.passesCardTextCol}>
                    <Text style={styles.passesCardLabel}>YOUR ACCOUNTABILITY ACCOUNT</Text>
                    <Text style={styles.passesCardTitle}>
                      {t('active.availablePasses', { count: user?.passes ?? 0 })}
                    </Text>
                  </View>
                </View>
                
                {user?.passes && user.passes > 0 ? (
                  <Text style={styles.passesCardDesc}>
                    You have passes ready to secure a new commitment. Meet your daily target every day of the duration to keep your pass!
                  </Text>
                ) : (
                  <View style={styles.claimContainer}>
                    <Text style={styles.claimWelcomeText}>
                      🎁 Get started with your Welcome Pack! Claim 3 free coins to secure your first habit commitment now.
                    </Text>
                    <TouchableOpacity 
                      style={styles.claimBtn} 
                      onPress={handleClaimStarterPack}
                      disabled={isClaiming}
                      activeOpacity={0.85}
                    >
                      {isClaiming ? (
                        <ActivityIndicator size="small" color="#000000" />
                      ) : (
                        <>
                          <MaterialCommunityIcons name="gift-outline" size={16} color="#000000" />
                          <Text style={styles.claimBtnText}>CLAIM 3 FREE COINS</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </LinearGradient>

              {/* Rules Section directly embedded for simpler logic understanding - REDUCED TO 3 STEPS */}
              <LinearGradient
                colors={['#0F111A', '#08090D']}
                style={styles.rulesCard}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
              >
                <View style={styles.rulesCardHeader}>
                  <View style={styles.rulesCardIconBg}>
                    <MaterialCommunityIcons name="shield-check" size={18} color="#05D38E" />
                  </View>
                  <View>
                    <Text style={styles.rulesCardTitle}>{t('active.howItWorksTitle')}</Text>
                    <Text style={styles.rulesCardSubtitle}>{t('active.howItWorksSubtitle')}</Text>
                  </View>
                </View>

                <View style={styles.rulesTimeline}>
                  {/* Step 1 */}
                  <View style={styles.timelineRow}>
                    <View style={styles.timelineLeftCol}>
                      <View style={styles.timelineStepIconBg}>
                        <MaterialCommunityIcons name="ticket-confirmation-outline" size={14} color="#05D38E" />
                      </View>
                      <View style={styles.timelineLine} />
                    </View>
                    <View style={styles.timelineRightCol}>
                      <Text style={styles.timelineStepTitle}>1. Choose your Stake</Text>
                      <Text style={styles.timelineStepDesc}>Pick steps, running, or mindfulness, select your daily target, and stake 1 coin to back it.</Text>
                    </View>
                  </View>

                  {/* Step 2 */}
                  <View style={styles.timelineRow}>
                    <View style={styles.timelineLeftCol}>
                      <View style={styles.timelineStepIconBg}>
                        <MaterialCommunityIcons name="calendar-sync-outline" size={14} color="#05D38E" />
                      </View>
                      <View style={styles.timelineLine} />
                    </View>
                    <View style={styles.timelineRightCol}>
                      <Text style={styles.timelineStepTitle}>2. Verify Daily Tasks</Text>
                      <Text style={styles.timelineStepDesc}>Hit your target every day. The app automatically syncs with Apple Health in the background.</Text>
                    </View>
                  </View>

                  {/* Step 3 */}
                  <View style={styles.timelineRow}>
                    <View style={styles.timelineLeftCol}>
                      <View style={styles.timelineStepIconBg}>
                        <MaterialCommunityIcons name="sync" size={14} color="#05D38E" />
                      </View>
                    </View>
                    <View style={styles.timelineRightCol}>
                      <Text style={styles.timelineStepTitle}>3. Succeed and Reclaim</Text>
                      <Text style={styles.timelineStepDesc}>Hit your targets to reclaim your coin. Succeed consistently to build your streak scores!</Text>
                    </View>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setIsVerificationGuideVisible(true);
                  }}
                  style={styles.rulesLearnMoreBtn}
                  activeOpacity={0.8}
                >
                  <Text style={styles.rulesLearnMoreText}>Tap for full verification details</Text>
                  <MaterialCommunityIcons name="arrow-right" size={12} color="#05D38E" />
                </TouchableOpacity>
              </LinearGradient>

              {/* Start Commitment CTA Button - MOVED TO VERY BOTTOM */}
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push('/commit');
                }}
                style={styles.emptyButton}
              >
                <LinearGradient
                  colors={['#7C3AED', '#4F46E5']}
                  style={styles.emptyButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <MaterialCommunityIcons name="lock-plus-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.emptyButtonText}>{t('active.lockDownNow')}</Text>
                  <MaterialCommunityIcons name="arrow-right" size={16} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
        ) : (
          /* DETAILED COMMITMENTS LIST */
          <View style={styles.activeContainer}>
            {activeCommitments.map((commitment) => {
              const weeklyDataList = commitmentsWeeklyData[commitment.id] || [];
              const { overallProgress, totalAccumulated } = getCommitmentStats(commitment, weeklyDataList);
              const isBroken = hasFailedSoFar(commitment, weeklyDataList);
              const isExpanded = !!expandedLogs[commitment.id];

              // Grace Period & Completed status calculation
              const end = parseLocalDate(commitment.endDate, 23, 59, 59);
              const today = new Date();
              const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
              const endMidnight = new Date(end.getFullYear(), end.getMonth(), end.getDate());
              const diffMs = endMidnight.getTime() - todayMidnight.getTime();
              const isCompleted = diffMs < 0;
              const allDaysList = getCommitmentDaysList(commitment);
              const isSuccess = allDaysList.length > 0 && allDaysList.every(dateStr => {
                const dayData = weeklyDataList.find(d => d.dateString === dateStr);
                return (dayData ? dayData.value : 0) >= commitment.targetValue;
              });

              let graceDiffHours = 0;
              if (isCompleted) {
                const [year, month, day] = commitment.endDate.split('-').map(Number);
                const gracePeriodEnd = new Date(year, month - 1, day + 3, 0, 0, 0, 0);
                const graceDiffMs = gracePeriodEnd.getTime() - today.getTime();
                graceDiffHours = Math.max(0, Math.ceil(graceDiffMs / (1000 * 60 * 60)));
              }

              const isLogLoading = logsLoading[commitment.id] !== false && 
                (commitmentsWeeklyData[commitment.id] === undefined || logsLoading[commitment.id] === true);

              const isBronze = commitment.stakeAmount === 5 || commitment.stakeAmount === 1.99;
              const isSilver = commitment.stakeAmount === 10 || commitment.stakeAmount === 4.99;
              const isGold = commitment.stakeAmount === 20 || commitment.stakeAmount === 9.99;

              const coinColor = isBronze ? '#CD7F32' : isSilver ? '#BDC3C7' : isGold ? '#FBBF24' : '#94A3B8';
              const coinIconName = isBronze ? 'shield' : isSilver ? 'medal' : isGold ? 'crown' : 'ticket-confirmation';
              const coinLabel = isBronze ? 'Bronze' : isSilver ? 'Silver' : isGold ? 'Gold' : 'Pass';
              const coinColors = isBronze ? ['#4A2E1B', '#2A170C'] : isSilver ? ['#2D3748', '#1A202C'] : isGold ? ['#3B2C1A', '#1F150C'] : ['#1E293B', '#0F172A'];

              return (
                <View key={commitment.id} style={styles.commitmentCardContainer}>
                  <LinearGradient
                    colors={['#141722', '#0C0E14']}
                    style={styles.commitmentCard}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                  >
                    {/* Header */}
                    <View style={styles.commitmentHeader}>
                      <View style={styles.commitmentTitleCol}>
                        <View style={styles.commitmentIconTitleRow}>
                          <View style={styles.commitmentIconBg}>
                            <MaterialCommunityIcons 
                              name={getMetricIcon(commitment.metricType)} 
                              size={16} 
                              color="#FFFFFF" 
                            />
                          </View>
                          <Text style={styles.commitmentGoalTitle}>
                            {getMetricLabel(commitment.metricType)}
                          </Text>
                        </View>
                        <Text style={styles.commitmentPeriodSubtitle}>
                          {t('active.dailyTarget')} • {commitment.targetValue.toLocaleString()} {getMetricUnit(commitment.metricType)}
                        </Text>
                        <Text style={[styles.commitmentPeriodSubtitle, { opacity: 0.8, marginTop: 4, fontStyle: 'italic' }]} numberOfLines={2}>
                          {HealthDataService.getCommitmentSentence(commitment)}
                        </Text>
                        {/* Edit Button if not started */}
                        {commitment.startDate > HealthDataService.getTodayDateString() && (
                          <TouchableOpacity 
                            style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 4 }}
                            onPress={() => handleEdit(commitment)}
                          >
                            <MaterialCommunityIcons name="pencil-outline" size={14} color="#7C3AED" />
                            <Text style={{ color: '#7C3AED', fontSize: 12, fontWeight: 'bold' }}>Edit Commitment</Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      <View style={styles.commitmentHeaderRightMini}>
                        {/* 3D-styled circular coin base */}
                        <View style={[
                          styles.miniCoinBase, 
                          { 
                            shadowColor: coinColor,
                            borderColor: isBronze || isSilver || isGold ? coinColor : 'rgba(255,255,255,0.1)',
                          }
                        ]}>
                          <LinearGradient
                            colors={coinColors}
                            style={styles.miniCoinGradient}
                            start={{ x: 0.1, y: 0.1 }}
                            end={{ x: 0.9, y: 0.9 }}
                          >
                            <View style={styles.coinGlossyOverlay} />
                            <MaterialCommunityIcons 
                              name={coinIconName as any} 
                              size={14} 
                              color={coinColor} 
                            />
                          </LinearGradient>
                        </View>
                        {/* Coin Label */}
                        <Text style={[
                          styles.miniCoinLabel, 
                          { 
                            color: coinColor 
                          }
                        ]}>
                          {coinLabel}
                        </Text>
                      </View>
                    </View>

                    {/* Progress indicators & warning badges */}
                    <View style={styles.commitmentStatusRow}>
                      <View style={styles.statusLabelContainer}>
                        <MaterialCommunityIcons 
                          name={isBroken ? "alert-circle" : "check-circle"} 
                          size={14} 
                          color={isBroken ? '#FF4655' : '#05D38E'} 
                        />
                        <Text style={[
                          styles.statusLabelText, 
                          { color: isBroken ? '#FF4655' : '#05D38E' }
                        ]}>
                          {isBroken 
                            ? t('active.brokenCommitment') 
                            : t('active.onTrack')}
                        </Text>
                      </View>

                      <View style={styles.remainingBadge}>
                        <MaterialCommunityIcons name="clock-outline" size={12} color="#94A3B8" />
                        <Text style={styles.remainingText}>{getRemainingDays(commitment, weeklyDataList)}</Text>
                      </View>
                    </View>

                    {/* Sliced Progress Bar */}
                    <View style={styles.progressSection}>
                      <View style={styles.progressBarHeader}>
                        <Text style={styles.progressBarLabel}>{t('active.goalProgress')} ({overallProgress}%)</Text>
                        <Text style={styles.progressBarValue}>
                          {`${overallProgress}% ${t('active.completed')}`}
                        </Text>
                      </View>
                      
                      <View style={styles.slicedBarContainer}>
                        {getCommitmentDaysList(commitment).map((dateStr) => {
                          const todayDateStr = HealthDataService.getTodayDateString();
                            const dayData = weeklyDataList.find(d => d.dateString === dateStr);
                            
                            let sliceColor = '#1E293B'; // Default/Future (Dark slate)
                            
                            if (dateStr > todayDateStr) {
                              sliceColor = '#1E293B'; // Future/Remaining (Dark Gray/Slate)
                            } else if (dateStr === todayDateStr) {
                              const isGoalMet = dayData
                                ? dayData.value >= commitment.targetValue
                                : false;
                              sliceColor = isGoalMet ? '#05D38E' : '#FACC15'; // Solid green if achieved, yellow if not
                            } else {
                              // Past Day
                              const isGoalMet = dayData
                                ? dayData.value >= commitment.targetValue
                                : true; // Default to true for past weeks outside current weeklyDataList scope
                              
                              sliceColor = isGoalMet ? '#05D38E' : '#FF4655'; // Green if achieved, Red if failed
                            }
                            
                            return (
                              <View
                                key={dateStr}
                                style={[
                                  styles.slicedBarSegment,
                                  { backgroundColor: sliceColor }
                                ]}
                              />
                            );
                          })}
                      </View>
                    </View>



                    {/* Expandable Health Logs Section Toggle */}
                    <TouchableOpacity
                      onPress={() => toggleExpandLog(commitment.id)}
                      style={styles.expandToggleRow}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.expandToggleText}>
                        {isExpanded ? t('active.hideDailyLogs') : t('active.showDailyLogs')}
                      </Text>
                      <MaterialCommunityIcons 
                        name={isExpanded ? "chevron-up" : "chevron-down"} 
                        size={16} 
                        color="#64748B" 
                      />
                    </TouchableOpacity>

                    {/* Expanded logs list */}
                    {isExpanded && (
                      <View style={styles.logsListContainer}>
                        <ScrollView 
                          style={{ maxHeight: 300 }} 
                          showsVerticalScrollIndicator={true}
                          nestedScrollEnabled={true}
                        >
                          <View style={{ gap: Spacing.two }}>
                            {(() => {
                              const allDaysList = getCommitmentDaysList(commitment);
                              const todayDateStr = HealthDataService.getTodayDateString();
                              
                              return allDaysList.map((dateStr) => {
                                // Find day data in current weekly data
                                const currentWeekDay = weeklyDataList.find((d) => d.dateString === dateStr);
                                
                                // Determine properties
                                const dateObj = parseLocalDate(dateStr, 12, 0, 0);
                                const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                                
                                const isToday = todayDateStr === dateStr;
                                const isFuture = dateStr > todayDateStr;
                                
                                // Determine value and goal met status
                                let value = 0;
                                let isGoalMet = false;
                                
                                if (currentWeekDay) {
                                  value = currentWeekDay.value;
                                  isGoalMet = currentWeekDay.value >= commitment.targetValue;
                                } else if (!isFuture) {
                                  // Past day outside current week: assume completed successfully
                                  value = commitment.targetValue;
                                  isGoalMet = true;
                                }
                                
                                let dayBgColor = '#141722';
                                let borderColor = '#1F2937';
                                let iconName = 'clock-outline';
                                let iconColor = '#475569';

                                if (isFuture) {
                                  dayBgColor = '#0D0F15';
                                  borderColor = '#11141E';
                                  iconName = 'circle-outline';
                                } else if (isToday) {
                                  borderColor = '#7C3AED';
                                  iconName = 'refresh-circle';
                                  iconColor = '#7C3AED';
                                } else if (isGoalMet) {
                                  dayBgColor = 'rgba(5, 211, 142, 0.05)';
                                  borderColor = 'rgba(5, 211, 142, 0.15)';
                                  iconName = 'checkbox-marked-circle';
                                  iconColor = '#05D38E';
                                } else {
                                  dayBgColor = 'rgba(255, 70, 85, 0.05)';
                                  borderColor = 'rgba(255, 70, 85, 0.15)';
                                  iconName = 'close-circle';
                                  iconColor = '#FF4655';
                                }

                                return (
                                  <View 
                                    key={dateStr} 
                                    style={[
                                      styles.logDayRow, 
                                      { backgroundColor: dayBgColor, borderColor },
                                      isToday && styles.logTodayRow
                                    ]}
                                  >
                                    <View style={styles.dayLeftCol}>
                                      <MaterialCommunityIcons name={iconName as any} size={18} color={iconColor} />
                                      <View>
                                        <Text style={[styles.dayNameText, isToday && { color: '#7C3AED', fontWeight: 'bold' }]}>
                                          {dayName} {isToday && t('active.today')}
                                        </Text>
                                        <Text style={styles.dayDateText}>{dateStr}</Text>
                                      </View>
                                    </View>

                                    <View style={styles.dayRightCol}>
                                      <Text style={styles.dayValueText}>
                                        {commitment.metricType === 'steps' || commitment.metricType === 'calories'
                                          ? Math.round(value).toLocaleString()
                                          : commitment.metricType === 'activeTime' || commitment.metricType === 'mindfulness'
                                          ? Math.round(value).toString()
                                          : value.toFixed(1)}
                                      </Text>
                                        <Text style={styles.dayTargetText}>
                                          / {commitment.targetValue} {getMetricUnit(commitment.metricType)}
                                        </Text>
                                    </View>
                                  </View>
                                );
                              });
                            })()}
                          </View>
                        </ScrollView>
                      </View>
                    )}

                    {/* Grace Period or Early Failure Decision Panel */}
                    {(isCompleted || isBroken) && (
                      <View style={styles.decisionPanelContainer}>
                        {isLogLoading ? (
                          <ActivityIndicator size="small" color="#7C3AED" style={{ marginVertical: 12 }} />
                        ) : isCompleted && isSuccess && graceDiffHours > 0 ? (
                          <TouchableOpacity 
                            onPress={() => {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                              setClaimingCommitment(commitment);
                            }}
                            activeOpacity={0.9}
                            style={{ marginBottom: Spacing.two }}
                          >
                            <LinearGradient
                              colors={['rgba(5, 211, 142, 0.15)', 'rgba(2, 179, 119, 0.05)']}
                              style={[styles.decisionSuccessCard, { borderColor: 'rgba(5, 211, 142, 0.3)', borderWidth: 1 }]}
                            >
                              <View style={{ alignItems: 'center', paddingVertical: Spacing.two }}>
                                <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(5, 211, 142, 0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.two }}>
                                  <MaterialCommunityIcons name="medal-outline" size={24} color="#05D38E" />
                                </View>
                                <Text style={[styles.decisionTitle, { color: '#05D38E', fontSize: 18, marginBottom: 4 }]}>Goal Conquered!</Text>
                                <Text style={[styles.decisionSubtitle, { textAlign: 'center', marginBottom: Spacing.three }]}>
                                  You proved your discipline. Tap here to claim your {coinLabel} coin back to your vault.
                                </Text>
                                
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#05D38E', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 }}>
                                  <MaterialCommunityIcons name="hand-pointing-up" size={16} color="#FFFFFF" />
                                  <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 }}>Tap to Claim</Text>
                                </View>
                              </View>
                            </LinearGradient>
                          </TouchableOpacity>
                        ) : (
                          <LinearGradient
                            colors={['rgba(255, 70, 85, 0.15)', 'rgba(210, 0, 59, 0.05)']}
                            style={styles.decisionFailedCard}
                          >
                            <View style={styles.decisionHeaderRow}>
                              <MaterialCommunityIcons name="alert-circle-outline" size={20} color="#FF4655" />
                              <Text style={[styles.decisionTitle, { color: '#FF4655' }]}>Goal Failed: Pass Lost</Text>
                            </View>
                            <Text style={styles.decisionSubtitle}>
                              {isCompleted 
                                ? 'Please archive and send to history.' 
                                : 'You missed a daily target. You can archive and send it to history now.'}
                            </Text>

                            {isResolving[commitment.id] ? (
                              <View style={{ paddingVertical: 12, alignItems: 'center' }}>
                                <ActivityIndicator size="small" color="#FF4655" />
                              </View>
                            ) : (
                              <TouchableOpacity
                                style={styles.forfeitAcknowledgeButton}
                                onPress={() => handleAcknowledgeForfeiture(commitment, weeklyDataList)}
                                activeOpacity={0.8}
                              >
                                <Text style={styles.forfeitAcknowledgeText}>Archive & Send to History</Text>
                              </TouchableOpacity>
                            )}
                          </LinearGradient>
                        )}
                      </View>
                    )}

                  </LinearGradient>
                </View>
              );
            })}
          </View>
        )}

        </ScrollView>

        <AppHeader />
      </View>

      {/* Verification Guide Modal */}
      <VerificationGuideModal
        visible={isVerificationGuideVisible}
        onClose={() => setIsVerificationGuideVisible(false)}
      />

      {/* Welcome passes celebration modal */}
      <WelcomePassesModal
        visible={isWelcomeVisible}
        onClaim={handleWelcomeClaim}
      />

      {/* Claim Coin Success Modal */}
      <ClaimCoinSuccessModal
        visible={claimingCommitment !== null}
        coinType={
          claimingCommitment?.stakeAmount === 5 || claimingCommitment?.stakeAmount === 1.99 ? 'Bronze' :
          claimingCommitment?.stakeAmount === 10 || claimingCommitment?.stakeAmount === 4.99 ? 'Silver' :
          claimingCommitment?.stakeAmount === 20 || claimingCommitment?.stakeAmount === 9.99 ? 'Gold' : 'Pass'
        }
        onClaim={() => {
          if (claimingCommitment) {
            handlePassRefund(claimingCommitment, commitmentsWeeklyData[claimingCommitment.id] || []);
            setClaimingCommitment(null);
          }
        }}
      />

    </View>
  );
}

// Custom Fonts Fallback Helper for React Native Stylesheet compilation
const Fonts = {
  sans: Platform.select({ ios: 'System', android: 'sans-serif' }),
  mono: Platform.select({ ios: 'Courier', android: 'monospace' }),
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#06070B',
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.six,
  },
  simButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#11131E',
    borderWidth: 1,
    borderColor: '#181B28',
    paddingHorizontal: Spacing.two,
    paddingVertical: 8,
    borderRadius: 16,
  },
  simButtonText: {
    color: '#7C3AED',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyContainer: {
    gap: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
  },
  welcomeBanner: {
    marginTop: Spacing.two,
    marginBottom: Spacing.one,
  },
  welcomeSubtitle: {
    color: '#A855F7',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    fontFamily: Fonts.sans,
    marginBottom: 4,
  },
  welcomeTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
    fontFamily: Fonts.sans,
    letterSpacing: -0.5,
  },
  passesCard: {
    borderRadius: Spacing.three,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: '#1E293B',
    gap: Spacing.three,
  },
  passesCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  passesCardIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  passesCardIcon: {
    fontSize: 20,
  },
  passesCardTextCol: {
    flex: 1,
    gap: 2,
  },
  passesCardLabel: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  passesCardTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: 'bold',
  },
  passesCardDesc: {
    color: '#94A3B8',
    fontSize: 12.5,
    lineHeight: 18,
  },
  outOfPassesContainer: {
    gap: 8,
  },
  outOfPassesBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  outOfPassesBadgeText: {
    color: '#F87171',
    fontSize: 10,
    fontWeight: 'bold',
  },
  emptyButton: {
    width: '100%',
    borderRadius: Spacing.three,
    overflow: 'hidden',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyButtonGradient: {
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.two,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 0.2,
  },
  rulesCard: {
    borderRadius: Spacing.three,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: '#1E293B',
    gap: Spacing.four,
  },
  rulesCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    paddingBottom: Spacing.three,
  },
  rulesCardIconBg: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(5, 211, 142, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(5, 211, 142, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rulesCardTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  rulesCardSubtitle: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 1,
  },
  rulesTimeline: {
    gap: 0,
  },
  timelineRow: {
    flexDirection: 'row',
    gap: 14,
  },
  timelineLeftCol: {
    alignItems: 'center',
    width: 22,
  },
  timelineStepIconBg: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(5, 211, 142, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(5, 211, 142, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  timelineLine: {
    width: 1.5,
    backgroundColor: 'rgba(5, 211, 142, 0.12)',
    flex: 1,
    marginVertical: 2,
    minHeight: 24,
  },
  timelineRightCol: {
    flex: 1,
    paddingBottom: 20,
  },
  timelineStepTitle: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '600',
    marginBottom: 4,
  },
  timelineStepDesc: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 16.5,
  },
  rulesLearnMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingTop: Spacing.three,
    marginTop: Spacing.one,
  },
  rulesLearnMoreText: {
    color: '#05D38E',
    fontSize: 12,
    fontWeight: '600',
  },
  activeContainer: {
    gap: Spacing.three,
  },
  commitmentCardContainer: {
    borderRadius: Spacing.four,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#181B28',
  },
  commitmentCard: {
    padding: Spacing.four,
  },
  commitmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#181B28',
    paddingBottom: Spacing.three,
    marginBottom: Spacing.three,
  },
  commitmentTitleCol: {
    gap: 4,
    flex: 1,
  },
  commitmentIconTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  commitmentIconBg: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
  },
  commitmentGoalTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: Fonts.sans,
  },
  commitmentPeriodSubtitle: {
    color: '#64748B',
    fontSize: 11,
    fontFamily: Fonts.sans,
  },
  commitmentHeaderRight: {
    alignItems: 'flex-end',
  },
  commitmentPledgeAmount: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: Fonts.sans,
  },
  commitmentPledgeLabel: {
    color: '#64748B',
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginTop: 2,
  },
  commitmentStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.three,
  },
  commitmentStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  commitmentStatusText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  remainingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#11131E',
    borderWidth: 1,
    borderColor: '#181B28',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  remainingText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: 'bold',
  },
  progressSection: {
    gap: Spacing.three,
    marginBottom: Spacing.three,
  },
  progressBarWrapper: {
    gap: 6,
  },
  progressBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressBarLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '500',
  },
  progressBarValue: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: '#11131E',
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#181B28',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  warningBox: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    flexDirection: 'row',
    borderWidth: 1,
    marginBottom: Spacing.three,
  },
  warningIcon: {
    marginRight: Spacing.two,
    marginTop: 2,
  },
  warningTextCol: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  warningDesc: {
    color: '#94A3B8',
    fontSize: 11,
    lineHeight: 15,
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  cardActionButton: {
    flex: 1,
    height: 38,
    borderRadius: 19,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#11131E',
    borderWidth: 1,
    borderColor: '#181B28',
  },
  cardActionButtonPrimary: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  cardActionButtonText: {
    color: '#7C3AED',
    fontSize: 12,
    fontWeight: 'bold',
  },
  expandToggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#181B28',
    marginTop: Spacing.two,
  },
  expandToggleText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '500',
  },
  logsListContainer: {
    gap: Spacing.two,
    marginTop: Spacing.two,
    borderTopWidth: 1,
    borderTopColor: '#181B28',
    paddingTop: Spacing.three,
  },
  logDayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  logTodayRow: {
    borderWidth: 1.5,
  },
  dayLeftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  dayNameText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  dayDateText: {
    color: '#576880',
    fontSize: 10,
    marginTop: 1,
  },
  dayRightCol: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  dayValueText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  dayTargetText: {
    color: '#576880',
    fontSize: 11,
    marginLeft: 2,
  },
  slicedBarContainer: {
    flexDirection: 'row',
    height: 10,
    gap: 3,
    marginTop: 6,
    width: '100%',
  },
  slicedBarSegment: {
    flex: 1,
    height: '100%',
    borderRadius: 3.5,
  },
  statusLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusLabelText: {
    fontSize: 12,
    fontWeight: '600',
  },
  decisionPanelContainer: {
    marginTop: Spacing.four,
    borderTopWidth: 1,
    borderTopColor: '#181B28',
    paddingTop: Spacing.three,
  },
  decisionSuccessCard: {
    borderRadius: 12,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.25)',
  },
  decisionFailedCard: {
    borderRadius: 12,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: 'rgba(255, 70, 85, 0.25)',
  },
  decisionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  decisionTitle: {
    color: '#05D38E',
    fontSize: 14,
    fontWeight: 'bold',
  },
  decisionSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    marginBottom: Spacing.three,
  },
  decisionActionsCol: {
    gap: 8,
  },
  prolongButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  prolongGradient: {
    height: 38,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  prolongText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: 'bold',
  },
  rolloverButton: {
    height: 38,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#7C3AED',
    borderRadius: 8,
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
  },
  rolloverText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: 'bold',
  },
  refundButton: {
    height: 38,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    borderRadius: 8,
    backgroundColor: '#1E293B',
  },
  refundText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: 'bold',
  },
  forfeitAcknowledgeButton: {
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#FF4655',
  },
  forfeitAcknowledgeText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: 'bold',
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 4,
  },
  claimContainer: {
    marginTop: Spacing.two,
    gap: Spacing.three,
  },
  claimWelcomeText: {
    color: '#E2E8F0',
    fontSize: 12.5,
    lineHeight: 18,
  },
  claimBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#05D38E',
    paddingVertical: 12,
    borderRadius: 12,
  },
  claimBtnText: {
    color: '#000000',
    fontSize: 12.5,
    fontWeight: '900',
    letterSpacing: 1,
  },
  commitmentHeaderRightMini: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  miniCoinBase: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.2,
    backgroundColor: '#0F111A',
    justifyContent: 'center',
    alignItems: 'center',
    // Glow effect
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 3,
  },
  miniCoinGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  miniCoinLabel: {
    fontSize: 7.5,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  coinGlossyOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
});


