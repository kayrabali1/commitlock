import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useRouter, useLocalSearchParams } from 'expo-router';

import { Spacing } from '@/constants/theme';
import { HealthDataService, Commitment, DailyHealthData } from '@/services/health';
import { DisciplineCard } from '@/components/DisciplineCard';

export default function ResolutionScreen() {
  const router = useRouter();
  const { id, debug_auto_resolve } = useLocalSearchParams<{ id?: string; debug_auto_resolve?: string }>();

  // States
  const [activeCommitment, setActiveCommitment] = useState<Commitment | null>(null);
  const [weeklyData, setWeeklyData] = useState<DailyHealthData[]>([]);
  const [phase, setPhase] = useState<'syncing' | 'checking' | 'resolved'>('syncing');
  const [currentCheckingIndex, setCurrentCheckingIndex] = useState(-1);
  const [isSuccess, setIsSuccess] = useState(true);
  const [activeStreak, setActiveStreak] = useState(1);

  // Animations
  const [radarScale] = useState(new Animated.Value(1));
  const [radarOpacity] = useState(new Animated.Value(0.6));
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    // Load active commitment and weekly health data
    const prepareResolution = async () => {
      const commitment = await HealthDataService.getActiveCommitment(id);
      if (!commitment) {
        // Safe redirect if no commitment
        router.replace('/');
        return;
      }
      setActiveCommitment(commitment);
      
      const data = await HealthDataService.fetchWeeklyData(commitment.metricType);
      setWeeklyData(data);
      
      // Determine overall outcome (must pass all 7 days for daily, or reach sum for weekly)
      let passedAll = false;
      if (commitment.targetScope === 'weekly') {
        const total = data.reduce((acc, d) => acc + d.value, 0);
        passedAll = total >= commitment.targetValue;
      } else {
        passedAll = data.every((d) => d.value >= commitment.targetValue);
      }
      setIsSuccess(passedAll);

      // Load history to compute active streak
      try {
        const history = await HealthDataService.getHistory();
        let currentStreak = 0;
        for (const item of history) {
          if (item.status === 'success') {
            currentStreak++;
          } else {
            break;
          }
        }
        // If this resolved commitment is successful, add to the streak
        setActiveStreak(passedAll ? currentStreak + 1 : currentStreak);
      } catch (e) {
        console.error('Error calculating streak in resolution', e);
      }
    };

    prepareResolution();
  }, [router, id]);

  // Radar Syncing Animation
  useEffect(() => {
    if (phase === 'syncing') {
      Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(radarScale, {
              toValue: 1.8,
              duration: 2000,
              useNativeDriver: true,
            }),
            Animated.timing(radarScale, {
              toValue: 1,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(radarOpacity, {
              toValue: 0,
              duration: 2000,
              useNativeDriver: true,
            }),
            Animated.timing(radarOpacity, {
              toValue: 0.6,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
        ])
      ).start();

      // Transits to sequential checking after 3 seconds
      const timer = setTimeout(() => {
        setPhase('checking');
        setCurrentCheckingIndex(0);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [phase, radarOpacity, radarScale]);

  // Sequential Day Checking Loop
  useEffect(() => {
    if (phase === 'checking' && currentCheckingIndex >= 0) {
      if (currentCheckingIndex < 7) {
        if (weeklyData && weeklyData[currentCheckingIndex]) {
          // Trigger haptic feedback for each day check
          const dayPassed = activeCommitment?.targetScope === 'weekly'
            ? weeklyData[currentCheckingIndex].value > 0
            : weeklyData[currentCheckingIndex].value >= (activeCommitment?.targetValue || 0);
          
          if (dayPassed) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          } else {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          }
        }

        const timer = setTimeout(() => {
          setCurrentCheckingIndex((prev) => prev + 1);
        }, 800); // Check speed (800ms per day to build suspense!)
        return () => clearTimeout(timer);
      } else {
        // Finished checking all 7 days!
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPhase('resolved');
        Haptics.notificationAsync(
          isSuccess 
            ? Haptics.NotificationFeedbackType.Success 
            : Haptics.NotificationFeedbackType.Error
        );
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }).start();
      }
    }
  }, [phase, currentCheckingIndex, weeklyData, activeCommitment, isSuccess, fadeAnim]);

  // Dev auto-resolve helper
  useEffect(() => {
    if (phase === 'resolved' && __DEV__ && debug_auto_resolve === 'true') {
      const timer = setTimeout(() => {
        handleResolveAction();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [phase, debug_auto_resolve, activeCommitment, isSuccess, weeklyData]);

  const handleResolveAction = async () => {
    if (!activeCommitment) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Prepare updated commitment object
    const resolvedCommitment: Commitment = {
      ...activeCommitment,
      status: isSuccess ? 'success' : 'failed',
      performanceData: weeklyData,
    };

    // Add commitment to history logs
    await HealthDataService.addHistoryEntry(resolvedCommitment);
    
    // Clear active commitment slot
    await HealthDataService.clearActiveCommitment(activeCommitment.id);

    // Redirect home to dashboard
    router.replace('/');
  };

  const getMetricLabel = () => {
    if (!activeCommitment) return '';
    switch (activeCommitment.metricType) {
      case 'steps': return 'steps';
      case 'run': return 'km';
      case 'cycle': return 'km';
      case 'calories': return 'kcal';
      case 'activeTime': return 'mins';
      case 'mindfulness': return 'mins';
    }
  };

  const getRunningTotal = (upToIndex: number) => {
    if (!weeklyData || weeklyData.length === 0) return 0;
    return weeklyData.slice(0, upToIndex).reduce((acc, d) => acc + d.value, 0);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      
      {/* 1. SYNCING PHASE */}
      {phase === 'syncing' && (
        <View style={styles.centerContainer}>
          <View style={styles.syncRadarWrapper}>
            <Animated.View
              style={[
                styles.radarCircle,
                {
                  transform: [{ scale: radarScale }],
                  opacity: radarOpacity,
                },
              ]}
            />
            <View style={styles.radarCore}>
              <MaterialCommunityIcons name="shield-sync" size={48} color="#7C3AED" />
            </View>
          </View>
          <Text style={styles.syncTitle}>Retrieving Encrypted Sensors</Text>
          <Text style={styles.syncSubtitle}>
            Syncing data for {activeCommitment?.startDate} - {activeCommitment?.endDate}
          </Text>
          <Text style={styles.sensorSourceText}>
            Direct Handshake with {Platform.OS === 'ios' ? 'Apple HealthKit' : 'Google Health Connect'}
          </Text>
          <ActivityIndicator size="small" color="#7C3AED" style={{ marginTop: Spacing.four }} />
        </View>
      )}

      {/* 2. CHECKING PHASE */}
      {phase === 'checking' && (
        <View style={styles.checkingContainer}>
          <Text style={styles.checkingTitle}>
            {activeCommitment?.targetScope === 'weekly' 
              ? 'Aggregating Weekly Log totals...' 
              : 'Analyzing Weekly Targets...'}
          </Text>
          
          {activeCommitment?.targetScope === 'weekly' && (
            <View style={styles.weeklyRunningTotalCard}>
              <Text style={styles.runningTotalLabel}>RUNNING TOTAL</Text>
              <Text style={styles.runningTotalValue}>
                {activeCommitment?.metricType === 'steps' || activeCommitment?.metricType === 'calories'
                  ? Math.round(getRunningTotal(currentCheckingIndex)).toLocaleString()
                  : getRunningTotal(currentCheckingIndex).toFixed(1)}{' '}
                / {activeCommitment?.targetValue.toLocaleString()} {getMetricLabel()}
              </Text>
            </View>
          )}
          
          <View style={styles.checkingDaysList}>
            {weeklyData.map((day, index) => {
              const isChecked = index < currentCheckingIndex;
              const isCheckingNow = index === currentCheckingIndex;
              const target = activeCommitment?.targetValue || 0;
              const isPassed = activeCommitment?.targetScope === 'weekly'
                ? day.value > 0
                : day.value >= target;
 
              return (
                <View 
                  key={day.dayName} 
                  style={[
                    styles.checkingDayRow,
                    isCheckingNow && styles.checkingDayRowActive,
                    isChecked && (isPassed ? styles.checkingDayRowPassed : styles.checkingDayRowFailed)
                  ]}
                >
                  <View style={styles.dayLeft}>
                    <Text style={[styles.dayNameText, isCheckingNow && { color: '#8B5CF6' }]}>
                      {day.dayName}
                    </Text>
                    <Text style={styles.dayValText}>
                      {activeCommitment?.metricType === 'steps' || activeCommitment?.metricType === 'calories'
                        ? Math.round(day.value).toLocaleString()
                        : activeCommitment?.metricType === 'activeTime' || activeCommitment?.metricType === 'mindfulness'
                        ? Math.round(day.value).toString()
                        : day.value.toFixed(1)} {getMetricLabel()}
                    </Text>
                  </View>
 
                  <View style={styles.dayRight}>
                    {isCheckingNow && (
                      <ActivityIndicator size="small" color="#7C3AED" />
                    )}
                    {isChecked && isPassed && (
                      <MaterialCommunityIcons name="check-circle" size={20} color="#05D38E" />
                    )}
                    {isChecked && !isPassed && (
                      <MaterialCommunityIcons 
                        name={activeCommitment?.targetScope === 'weekly' ? 'circle-outline' : 'close-circle'} 
                        size={20} 
                        color={activeCommitment?.targetScope === 'weekly' ? '#576880' : '#FF4655'} 
                      />
                    )}
                    {!isChecked && !isCheckingNow && (
                      <MaterialCommunityIcons name="circle-outline" size={20} color="#475569" />
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* 3. RESOLVED OUTCOME PHASE */}
      {phase === 'resolved' && (
        <Animated.View style={[styles.resolvedContainer, { opacity: fadeAnim, flex: 1 }]}>
          <ScrollView 
            showsVerticalScrollIndicator={false} 
            contentContainerStyle={{ paddingVertical: Spacing.four, gap: Spacing.four }}
          >
            {isSuccess ? (
              /* SUCCESS / REFUND LAYOUT WITH DISCIPLINE CARD */
              <View style={styles.outcomeWrapper}>
                <Text style={styles.outcomeTitle}>Goal Achieved!</Text>
                
                {activeCommitment && (
                  <DisciplineCard
                    commitment={{
                      ...activeCommitment,
                      performanceData: weeklyData,
                    }}
                    activeStreak={activeStreak}
                    onClaim={handleResolveAction}
                    claimLabel="Claim Refund & Return"
                  />
                )}
              </View>
            ) : (
              /* FAILURE / FORFEIT LAYOUT */
              <View style={styles.outcomeWrapper}>
                <View style={styles.failedIconOuter}>
                  <LinearGradient colors={['#FF4655', '#D2003B']} style={styles.failedIconInner}>
                    <MaterialCommunityIcons name="skull" size={42} color="#FFFFFF" />
                  </LinearGradient>
                </View>

                <Text style={styles.failedOutcomeTitle}>Pledge Forfeited</Text>
                <Text style={styles.failedOutcomeDesc}>
                  {activeCommitment?.targetScope === 'weekly'
                    ? `You only achieved a total of ${weeklyData.reduce((acc, d) => acc + d.value, 0).toLocaleString()} ${getMetricLabel()} (Goal: ${activeCommitment?.targetValue.toLocaleString()}). According to the loss aversion agreement, your pledge funds are forfeited.`
                    : 'You missed your daily target on at least one day. According to the loss aversion agreement, your pledge funds are forfeited.'}
                </Text>

                <LinearGradient colors={['#11131E', '#0B0C14']} style={[styles.outcomeDetailsCard, { borderColor: 'rgba(255, 70, 85, 0.15)' }]}>
                  <Text style={[styles.refundLabel, { color: '#FF4655' }]}>STAKE FORFEITED</Text>
                  <Text style={[styles.refundAmount, { color: '#FF4655' }]}>€{activeCommitment?.stakeAmount}.00</Text>
                  <Text style={styles.refundSubtext}>Processed as platform revenue</Text>

                </LinearGradient>

                <TouchableOpacity
                  onPress={handleResolveAction}
                  style={styles.actionButton}
                  activeOpacity={0.9}
                >
                  <LinearGradient colors={['#FF4655', '#D2003B']} style={styles.btnGradient}>
                    <Text style={styles.actionBtnText}>Acknowledge & Accept</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </Animated.View>
      )}

    </SafeAreaView>
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
  },
  syncRadarWrapper: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: Spacing.four,
  },
  radarCircle: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#7C3AED',
  },
  radarCore: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  syncTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: Spacing.two,
  },
  syncSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    marginBottom: Spacing.one,
  },
  sensorSourceText: {
    color: '#05D38E',
    fontSize: 11,
    fontWeight: 'bold',
  },
  checkingContainer: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
  },
  checkingTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: Spacing.four,
  },
  checkingDaysList: {
    gap: Spacing.two,
  },
  checkingDayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#11131E',
    borderWidth: 1,
    borderColor: '#181B28',
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  checkingDayRowActive: {
    borderColor: '#7C3AED',
    borderWidth: 1.5,
  },
  checkingDayRowPassed: {
    borderColor: 'rgba(5, 211, 142, 0.2)',
    backgroundColor: 'rgba(5, 211, 142, 0.02)',
  },
  checkingDayRowFailed: {
    borderColor: 'rgba(255, 70, 85, 0.2)',
    backgroundColor: 'rgba(255, 70, 85, 0.02)',
  },
  dayLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  dayNameText: {
    color: '#94A3B8',
    fontSize: 15,
    fontWeight: 'bold',
    width: 40,
  },
  dayValText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  dayRight: {
    width: 24,
    alignItems: 'center',
  },
  resolvedContainer: {
    flex: 1,
    paddingHorizontal: Spacing.four,
  },
  outcomeWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.four,
  },
  successIconOuter: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(5, 211, 142, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successIconInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  outcomeTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: 'bold',
  },
  outcomeDesc: {
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: Spacing.two,
  },
  outcomeDetailsCard: {
    width: '100%',
    padding: Spacing.four,
    borderRadius: Spacing.three,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#181B28',
  },
  refundLabel: {
    fontFamily: Fonts.mono,
    color: '#05D38E',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: Spacing.one,
  },
  refundAmount: {
    color: '#05D38E',
    fontSize: 40,
    fontWeight: 'bold',
    marginBottom: Spacing.half,
  },
  refundSubtext: {
    color: '#576880',
    fontSize: 12,
  },
  actionButton: {
    width: '100%',
    borderRadius: Spacing.four,
    overflow: 'hidden',
    marginTop: Spacing.two,
  },
  btnGradient: {
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  failedIconOuter: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 70, 85, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  failedIconInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  failedOutcomeTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: 'bold',
  },
  failedOutcomeDesc: {
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: Spacing.two,
  },
  weeklyRunningTotalCard: {
    backgroundColor: '#11131E',
    borderRadius: Spacing.three,
    padding: Spacing.three,
    marginBottom: Spacing.three,
    borderWidth: 1,
    borderColor: '#7C3AED',
    alignItems: 'center',
    width: '100%',
  },
  runningTotalLabel: {
    fontFamily: Fonts.mono,
    color: '#7C3AED',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  runningTotalValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 4,
  },
});


