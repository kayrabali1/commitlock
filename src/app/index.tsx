import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { Spacing, BottomTabInset } from '@/constants/theme';
import { HealthDataService, Commitment, DailyHealthData } from '@/services/health';
import SensorSimulator from '@/components/SensorSimulator';
import HowItWorksPane from '@/components/HowItWorksPane';
import { VerificationGuideModal } from '@/components/VerificationGuideModal';
import AppHeader, { BASE_HEADER_HEIGHT } from '@/components/AppHeader';

export default function TrackerDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  // State
  const [activeCommitments, setActiveCommitments] = useState<Commitment[]>([]);
  const [commitmentsWeeklyData, setCommitmentsWeeklyData] = useState<Record<string, DailyHealthData[]>>({});
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isVerificationGuideVisible, setIsVerificationGuideVisible] = useState(false);
  
  // Simulator Panel Visibility & Target Commitment
  const [simulatingCommitment, setSimulatingCommitment] = useState<Commitment | null>(null);

  // Load state from local storage
  const loadData = async () => {
    try {
      const commitments = await HealthDataService.getActiveCommitments();
      setActiveCommitments(commitments);

      const weeklyDataMap: Record<string, DailyHealthData[]> = {};
      for (const commitment of commitments) {
        const data = await HealthDataService.fetchWeeklyData(commitment.metricType, commitment);
        weeklyDataMap[commitment.id] = data;
      }
      setCommitmentsWeeklyData(weeklyDataMap);
    } catch (error) {
      console.error('Failed to load tracking data', error);
    }
  };

  const toggleExpandLog = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedLogs((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

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

  // Find today's daily index (for simulation, let's pretend today is Wednesday, index 2)
  const simulatedTodayIndex = 2;

  // Calculate stats for active commitment
  const getCommitmentStats = (commitment: Commitment, weeklyDataList: DailyHealthData[]) => {
    if (!commitment || !weeklyDataList || weeklyDataList.length === 0) {
      return { completedDays: 0, failedDays: 0, overallProgress: 0, totalAccumulated: 0 };
    }

    // Only count values up to today's index (inclusive) for current tracking progress
    const pastAndTodayData = weeklyDataList.slice(0, simulatedTodayIndex + 1);
    const totalAccumulated = pastAndTodayData.reduce((acc, day) => acc + day.value, 0);

    const allDays = getCommitmentDaysList(commitment);
    const totalDays = allDays.length || 7;
    const todayDateStr = weeklyDataList?.[simulatedTodayIndex]?.dateString;

    let overallProgress = 0;

    if (commitment.targetScope === 'weekly') {
      const dailyAverage = commitment.targetValue / 7;
      const totalCommitmentTarget = dailyAverage * totalDays;
      let accumulated = 0;
      
      allDays.forEach((dateStr) => {
        if (todayDateStr && dateStr <= todayDateStr) {
          const dayData = weeklyDataList.find(d => d.dateString === dateStr);
          if (dayData) {
            accumulated += dayData.value;
          } else if (dateStr < todayDateStr) {
            // Assume daily target met in past weeks
            accumulated += dailyAverage;
          }
        }
      });
      
      overallProgress = Math.min(Math.round((accumulated / totalCommitmentTarget) * 100), 100);
    } else {
      let sumProgress = 0;
      
      allDays.forEach((dateStr) => {
        if (todayDateStr && dateStr <= todayDateStr) {
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
    }

    let completed = 0;
    let failed = 0;
    pastAndTodayData.forEach((day, index) => {
      const dayTarget = commitment.targetScope === 'weekly' ? commitment.targetValue / 7 : commitment.targetValue;
      if (day.value >= dayTarget) {
        completed++;
      } else {
        if (index < simulatedTodayIndex) {
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
    if (commitment.targetScope === 'weekly') {
      return false;
    }
    // For tracking loss aversion: check if any resolved day (before today) has failed
    return weeklyDataList.slice(0, simulatedTodayIndex).some(
      (day) => day.value < commitment.targetValue
    );
  };

  const getRemainingDays = (commitment: Commitment, weeklyDataList: DailyHealthData[]) => {
    if (!commitment) return '0 Days';
    try {
      const todayDateStr = weeklyDataList?.[simulatedTodayIndex]?.dateString;
      const now = new Date();
      const today = todayDateStr 
        ? parseLocalDate(todayDateStr, now.getHours(), now.getMinutes(), now.getSeconds())
        : now;
      
      const end = parseLocalDate(commitment.endDate, 23, 59, 59);
      
      const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endMidnight = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      
      const diffMs = endMidnight.getTime() - todayMidnight.getTime();
      const diffDays = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
      
      return `${diffDays} Day${diffDays !== 1 ? 's' : ''}`;
    } catch {
      return '0 Days';
    }
  };

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
              title="Syncing Apple HealthKit..."
              titleColor="#7C3AED"
              progressViewOffset={BASE_HEADER_HEIGHT + insets.top}
            />
          }
        >

        {activeCommitments.length === 0 ? (
          /* EMPTY STATE - NO ACTIVE COMMITMENTS */
          <View style={styles.emptyContainer}>
            <LinearGradient
              colors={['#141722', '#0C0E14']}
              style={styles.emptyCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            >
              <LinearGradient
                colors={['rgba(124, 58, 237, 0.15)', 'rgba(79, 70, 229, 0.08)']}
                style={styles.lockIconOuter}
              >
                <MaterialCommunityIcons name="lock-open-outline" size={26} color="#7C3AED" />
              </LinearGradient>

              <Text style={styles.emptyTitle}>No Pledge Locked</Text>
              <Text style={styles.emptyText}>
                Set a weekly goal and stake money to stay accountable. Complete your goal to keep your money.
              </Text>

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
                  <Text style={styles.emptyButtonText}>Lock down a commitment now</Text>
                  <MaterialCommunityIcons name="arrow-right" size={16} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>

            <HowItWorksPane onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setIsVerificationGuideVisible(true);
            }} />
          </View>
        ) : (
          /* DETAILED COMMITMENTS LIST */
          <View style={styles.activeContainer}>
            {activeCommitments.map((commitment) => {
              const weeklyDataList = commitmentsWeeklyData[commitment.id] || [];
              const { overallProgress, totalAccumulated } = getCommitmentStats(commitment, weeklyDataList);
              const isBroken = hasFailedSoFar(commitment, weeklyDataList);
              const isExpanded = !!expandedLogs[commitment.id];

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
                          {commitment.targetScope === 'weekly' ? 'Weekly' : 'Daily'} Target • {commitment.targetValue.toLocaleString()} {getMetricUnit(commitment.metricType)}
                        </Text>
                      </View>

                      <View style={styles.commitmentHeaderRight}>
                        <Text style={styles.commitmentPledgeAmount}>€{commitment.stakeAmount}</Text>
                        <Text style={styles.commitmentPledgeLabel}>PLEDGED</Text>
                      </View>
                    </View>

                    {/* Progress indicators & warning badges */}
                    <View style={styles.commitmentStatusRow}>
                      <View style={styles.statusLabelContainer}>
                        <MaterialCommunityIcons 
                          name={isBroken ? "alert-circle" : (commitment.targetScope === 'weekly' ? "shield-check" : "check-circle")} 
                          size={14} 
                          color={isBroken ? '#FF4655' : '#05D38E'} 
                        />
                        <Text style={[
                          styles.statusLabelText, 
                          { color: isBroken ? '#FF4655' : '#05D38E' }
                        ]}>
                          {isBroken 
                            ? 'Broken Commitment' 
                            : (commitment.targetScope === 'weekly' ? 'Weekly Accumulator Safe' : 'On Track for Refund')}
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
                        <Text style={styles.progressBarLabel}>Goal Progress ({overallProgress}%)</Text>
                        <Text style={styles.progressBarValue}>
                          {commitment.targetScope === 'weekly'
                            ? `${Math.round(totalAccumulated).toLocaleString()} / ${commitment.targetValue.toLocaleString()} ${getMetricUnit(commitment.metricType)}`
                            : `${overallProgress}% completed`}
                        </Text>
                      </View>
                      
                      <View style={styles.slicedBarContainer}>
                        {getCommitmentDaysList(commitment).map((dateStr) => {
                          const todayDateStr = weeklyDataList?.[simulatedTodayIndex]?.dateString;
                          const dayData = weeklyDataList.find(d => d.dateString === dateStr);
                          
                          let sliceColor = '#1E293B'; // Default/Future (Dark slate)
                          
                          if (todayDateStr) {
                            if (dateStr > todayDateStr) {
                              sliceColor = '#1E293B'; // Future/Remaining (Dark Gray/Slate)
                            } else if (dateStr === todayDateStr) {
                              sliceColor = 'rgba(5, 211, 142, 0.25)'; // Current Day (Light transparent green)
                            } else {
                              // Past Day
                              const isGoalMet = dayData
                                ? (commitment.targetScope === 'weekly'
                                  ? dayData.value > 0
                                  : dayData.value >= commitment.targetValue)
                                : true; // Default to true for past weeks outside current weeklyDataList scope
                              
                              sliceColor = isGoalMet ? '#05D38E' : '#FF4655'; // Green if achieved, Red if failed
                            }
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
                        {isExpanded ? 'Hide Daily Logs' : 'Show Daily Logs'}
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
                              const todayDateStr = weeklyDataList?.[simulatedTodayIndex]?.dateString;
                              
                              return allDaysList.map((dateStr) => {
                                // Find day data in current weekly data
                                const currentWeekDay = weeklyDataList.find((d) => d.dateString === dateStr);
                                
                                // Determine properties
                                const dateObj = parseLocalDate(dateStr, 12, 0, 0);
                                const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                                
                                const isToday = todayDateStr === dateStr;
                                const isFuture = todayDateStr ? dateStr > todayDateStr : false;
                                
                                // Determine value and goal met status
                                let value = 0;
                                let isGoalMet = false;
                                
                                if (currentWeekDay) {
                                  value = currentWeekDay.value;
                                  isGoalMet = commitment.targetScope === 'weekly'
                                    ? currentWeekDay.value > 0
                                    : currentWeekDay.value >= commitment.targetValue;
                                } else if (!isFuture) {
                                  // Past day outside current week: assume completed successfully
                                  value = commitment.targetScope === 'weekly'
                                    ? commitment.targetValue / 7
                                    : commitment.targetValue;
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
                                  iconName = commitment.targetScope === 'weekly' ? 'plus-circle' : 'checkbox-marked-circle';
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
                                          {dayName} {isToday && '(Today)'}
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
                                      {commitment.targetScope !== 'weekly' ? (
                                        <Text style={styles.dayTargetText}>
                                          / {commitment.targetValue} {getMetricUnit(commitment.metricType)}
                                        </Text>
                                      ) : (
                                        <Text style={styles.dayTargetText}>
                                          {' '}{getMetricUnit(commitment.metricType)}
                                        </Text>
                                      )}
                                    </View>
                                  </View>
                                );
                              });
                            })()}
                          </View>
                        </ScrollView>

                        {/* Inline Action Buttons inside Expanded Logs */}
                        <View style={[styles.cardActionsRow, { marginTop: Spacing.three }]}>
                          <TouchableOpacity
                            onPress={() => {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              setSimulatingCommitment(commitment);
                            }}
                            style={styles.cardActionButton}
                            activeOpacity={0.8}
                          >
                            <MaterialCommunityIcons name="developer-board" size={14} color="#7C3AED" />
                            <Text style={styles.cardActionButtonText}>Simulate Sensors</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() => {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                              router.push({
                                pathname: '/resolution',
                                params: { id: commitment.id }
                              });
                            }}
                            style={[styles.cardActionButton, styles.cardActionButtonPrimary]}
                            activeOpacity={0.8}
                          >
                            <MaterialCommunityIcons name="clock-fast" size={14} color="#FFFFFF" />
                            <Text style={[styles.cardActionButtonText, { color: '#FFFFFF' }]}>Simulate Resolution</Text>
                          </TouchableOpacity>
                        </View>
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

      {/* Sensor Simulator Bottom Sheet Panel */}
      <SensorSimulator 
        visible={simulatingCommitment !== null} 
        onClose={() => setSimulatingCommitment(null)} 
        onDataChanged={loadData}
        commitment={simulatingCommitment}
      />

      {/* Verification Guide Modal */}
      <VerificationGuideModal
        visible={isVerificationGuideVisible}
        onClose={() => setIsVerificationGuideVisible(false)}
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
    gap: 10,
  },
  emptyCard: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#181B28',
  },
  lockIconOuter: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 12.5,
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 16,
  },
  emptyButton: {
    width: '100%',
    borderRadius: Spacing.two,
    overflow: 'hidden',
  },
  emptyButtonGradient: {
    height: 40,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.two,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
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
    alignItems: 'center',
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
});


