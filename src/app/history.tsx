import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  Platform,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { Spacing, BottomTabInset } from '@/constants/theme';
import { HealthDataService, Commitment, DailyHealthData } from '@/services/health';
import { DisciplineCard } from '@/components/DisciplineCard';
import AppHeader, { BASE_HEADER_HEIGHT } from '@/components/AppHeader';

const { width } = Dimensions.get('window');

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const [history, setHistory] = useState<Commitment[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedItemForCard, setSelectedItemForCard] = useState<Commitment | null>(null);

  const toggleExpand = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const getOrGeneratePerformanceData = (item: Commitment): DailyHealthData[] => {
    if (item.performanceData && item.performanceData.length > 0) {
      return item.performanceData;
    }
    
    // Fallback generator if performanceData is missing (e.g. legacy entries)
    const isSuccess = item.status === 'success';
    const target = item.targetValue;
    const days: ('Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun')[] = 
      ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    if (item.targetScope === 'weekly') {
      const baseValue = target / 7;
      const multiplier = isSuccess ? 1.12 : 0.82;
      return days.map((day, i) => {
        // Deterministic pseudo-random variation based on item ID
        const charCodeSum = item.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const seed = Math.sin(charCodeSum + i) * 10000;
        const randomFactor = 0.8 + (seed - Math.floor(seed)) * 0.4;
        
        let value = baseValue * multiplier * randomFactor;
        value = item.metricType === 'steps' || item.metricType === 'calories' ? Math.round(value) : Math.round(value * 10) / 10;
        return {
          dayName: day,
          value,
          dateString: `${item.startDate.substring(0, 8)}${String(i + 1).padStart(2, '0')}`,
        };
      });
    } else {
      return days.map((day, i) => {
        // Deterministic pseudo-random variation based on item ID
        const charCodeSum = item.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const seed = Math.sin(charCodeSum + i) * 10000;
        const randomFactor = seed - Math.floor(seed);
        
        let value = 0;
        if (isSuccess) {
          // Success: met target on all days
          value = target * (1.05 + randomFactor * 0.3);
        } else {
          // Failure: missed on 1 or 2 days
          const dayFailed = i === 1 || i === 4; // Fail Tue or Fri
          if (dayFailed) {
            value = target * (0.65 + randomFactor * 0.25);
          } else {
            value = target * (1.02 + randomFactor * 0.2);
          }
        }
        
        value = item.metricType === 'steps' || item.metricType === 'calories' ? Math.round(value) : Math.round(value * 10) / 10;
        return {
          dayName: day,
          value,
          dateString: `${item.startDate.substring(0, 8)}${String(i + 1).padStart(2, '0')}`,
        };
      });
    }
  };

  const loadHistory = async () => {
    try {
      const logs = await HealthDataService.getHistory();
      setHistory(logs);
    } catch (e) {
      console.error(e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [])
  );

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

  const getMetricUnit = (type: string) => {
    switch (type) {
      case 'steps': return 'steps';
      case 'calories': return 'kcal';
      case 'activeTime': return 'mins';
      case 'mindfulness': return 'mins';
      default: return 'km';
    }
  };



  return (
    <View style={styles.container}>
      <View style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: BASE_HEADER_HEIGHT + insets.top + Spacing.three }
          ]}
          showsVerticalScrollIndicator={false}
        >
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Commitment History</Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Completed Commitments</Text>
        </View>

        {history.length === 0 ? (
          <View style={styles.emptyLogsCard}>
            <MaterialCommunityIcons name="file-document-outline" size={36} color="#475569" />
            <Text style={styles.emptyLogsText}>No completed commitments yet.</Text>
            <Text style={styles.emptyLogsSubtext}>
              Commitment periods will resolve every Monday morning. Results will be logged here.
            </Text>
          </View>
        ) : (
          <View style={styles.logsList}>
            {history.map((item) => {
              const isSuccess = item.status === 'success';
              const isExpanded = expandedId === item.id;
              
              let performance = getOrGeneratePerformanceData(item);
              if (item.resolvedAt) {
                const resolvedDateStr = item.resolvedAt.substring(0, 10);
                performance = performance.filter(d => d.dateString <= resolvedDateStr);
                if (performance.length === 0) {
                  performance = getOrGeneratePerformanceData(item).slice(0, 1);
                }
              }
              const totalAchieved = performance.reduce((acc, d) => acc + d.value, 0);
              const dailyAvg = totalAchieved / performance.length;
              
              let bestDay = performance[0];
              performance.forEach(d => {
                if (d.value > bestDay.value) bestDay = d;
              });

              const targetVal = item.targetValue;
              const dailyTargetVal = item.targetScope === 'weekly' ? targetVal / 7 : targetVal;
              const failedDays = performance.filter(d => 
                item.targetScope === 'weekly' ? false : d.value < targetVal
              );
              const failedDaysCount = failedDays.length;
              const failedDayNames = failedDays.map(d => d.dayName).join(' & ');

              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.logCard,
                    isSuccess ? styles.logCardSuccess : styles.logCardFailed,
                    isExpanded && styles.logCardExpanded
                  ]}
                  onPress={() => toggleExpand(item.id)}
                  activeOpacity={0.9}
                >
                  <View style={styles.logCardHeader}>
                    <View style={styles.logLeftCol}>
                      <View style={[styles.iconContainer, isSuccess ? styles.iconSuccessBg : styles.iconFailedBg]}>
                        <MaterialCommunityIcons
                          name={getMetricIcon(item.metricType)}
                          size={20}
                          color={isSuccess ? '#05D38E' : '#FF4655'}
                        />
                      </View>
                      <View style={styles.logDetails}>
                        <Text style={styles.logGoalTitle}>
                          {(item.metricType === 'calories' ? 'active calories' : item.metricType).toUpperCase()}: {item.targetValue.toLocaleString()} {getMetricUnit(item.metricType)}{item.targetScope === 'weekly' ? '/week' : '/day'}
                        </Text>
                        <Text style={styles.logDates}>
                          {item.startDate} to {item.endDate}
                          {item.resolvedAt ? ` • Archived ${item.resolvedAt.substring(0, 10)}` : ''}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.logRightCol}>
                      <View style={styles.rightStatusRow}>
                        <Text style={[styles.logStatusText, isSuccess ? styles.textSuccess : styles.textFailed]}>
                          {isSuccess ? 'Achieved' : 'Failed'}
                        </Text>
                        <MaterialCommunityIcons
                          name={isExpanded ? 'chevron-up' : 'chevron-down'}
                          size={18}
                          color={isSuccess ? '#05D38E' : '#FF4655'}
                          style={{ marginLeft: 4 }}
                        />
                      </View>
                    </View>
                  </View>

                  {/* Expandable detailed visualization */}
                  {isExpanded && (
                    <View style={styles.expandedContent}>
                      {/* Highlight Banner */}
                      {isSuccess ? (
                        <View style={styles.highlightBannerSuccess}>
                          <MaterialCommunityIcons name="checkbox-marked-circle" size={16} color="#05D38E" />
                          <Text style={styles.highlightTextSuccess}>
                            {item.targetScope === 'weekly'
                              ? `Goal achieved! Exceeded weekly target by ${Math.round(totalAchieved - targetVal).toLocaleString()} ${getMetricUnit(item.metricType)}. Stake of €${item.stakeAmount} refunded.`
                              : `Goal achieved! Met the daily target of ${targetVal.toLocaleString()} ${getMetricUnit(item.metricType)} every single day. Stake of €${item.stakeAmount} refunded.`}
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.highlightBannerFailed}>
                          <MaterialCommunityIcons name="alert-circle" size={16} color="#FF4655" />
                          <Text style={styles.highlightTextFailed}>
                            {item.targetScope === 'weekly'
                              ? `Target missed by ${Math.round(targetVal - totalAchieved).toLocaleString()} ${getMetricUnit(item.metricType)}. Stake of €${item.stakeAmount} forfeited.`
                              : `Daily target missed on ${failedDaysCount} day${failedDaysCount > 1 ? 's' : ''} (${failedDayNames}). Stake of €${item.stakeAmount} forfeited.`}
                          </Text>
                        </View>
                      )}



                      {/* Performance Stats Cards */}
                      <View style={styles.expandedStatsGrid}>
                        <View style={styles.expandedStatsCard}>
                          <Text style={styles.expandedStatsLabel}>TOTAL ACHIEVED</Text>
                          <Text style={styles.expandedStatsVal}>
                            {item.metricType === 'steps' || item.metricType === 'calories'
                              ? Math.round(totalAchieved).toLocaleString()
                              : totalAchieved.toFixed(1)}{' '}
                            <Text style={styles.expandedStatsUnit}>{getMetricUnit(item.metricType)}</Text>
                          </Text>
                        </View>
                        <View style={styles.expandedStatsCard}>
                          <Text style={styles.expandedStatsLabel}>DAILY AVERAGE</Text>
                          <Text style={styles.expandedStatsVal}>
                            {item.metricType === 'steps' || item.metricType === 'calories'
                              ? Math.round(dailyAvg).toLocaleString()
                              : dailyAvg.toFixed(1)}{' '}
                            <Text style={styles.expandedStatsUnit}>{getMetricUnit(item.metricType)}</Text>
                          </Text>
                        </View>
                        <View style={styles.expandedStatsCard}>
                          <Text style={styles.expandedStatsLabel}>BEST DAY</Text>
                          <Text style={styles.expandedStatsVal}>
                            {item.metricType === 'steps' || item.metricType === 'calories'
                              ? Math.round(bestDay.value).toLocaleString()
                              : bestDay.value.toFixed(1)}{' '}
                            <Text style={styles.expandedStatsUnit}>({bestDay.dayName})</Text>
                          </Text>
                        </View>
                      </View>

                      {/* Daily Breakdown List */}
                      <View style={styles.breakdownContainer}>
                        <Text style={styles.breakdownHeaderTitle}>DAILY BREAKDOWN</Text>
                        {performance.map((dayData) => {
                          const isDayGoalMet = dayData.value >= dailyTargetVal;
                          
                          const diff = dayData.value - dailyTargetVal;
                          const diffText = diff >= 0 
                            ? `+${item.metricType === 'steps' || item.metricType === 'calories' ? Math.round(diff).toLocaleString() : diff.toFixed(1)}`
                            : `${item.metricType === 'steps' || item.metricType === 'calories' ? Math.round(diff).toLocaleString() : diff.toFixed(1)}`;

                          return (
                            <View key={dayData.dayName} style={styles.breakdownRow}>
                              <View style={styles.breakdownDayLeft}>
                                <MaterialCommunityIcons
                                  name={isDayGoalMet ? "check-circle-outline" : "close-circle-outline"}
                                  size={16}
                                  color={isDayGoalMet ? "#05D38E" : "#FF4655"}
                                />
                                <Text style={styles.breakdownDayName}>{dayData.dayName}</Text>
                                <Text style={styles.breakdownDayDate}>{dayData.dateString}</Text>
                              </View>
                              <View style={styles.breakdownDayRight}>
                                <Text style={styles.breakdownDayValue}>
                                  {item.metricType === 'steps' || item.metricType === 'calories'
                                    ? Math.round(dayData.value).toLocaleString()
                                    : dayData.value.toFixed(1)}{' '}
                                  <Text style={styles.breakdownDayUnit}>{getMetricUnit(item.metricType)}</Text>
                                </Text>
                                <Text style={[styles.breakdownDayDiff, isDayGoalMet ? styles.textSuccess : styles.textFailed]}>
                                  {diffText}
                                </Text>
                              </View>
                            </View>
                          );
                        })}
                      </View>

                      {isSuccess && (
                        <TouchableOpacity
                          style={styles.viewCardButton}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            setSelectedItemForCard(item);
                          }}
                          activeOpacity={0.8}
                        >
                          <MaterialCommunityIcons name="badge-account-horizontal" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                          <Text style={styles.viewCardButtonText}>View Discipline Card</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        </ScrollView>
        <AppHeader />
      </View>

      {/* Discipline Card Modal */}
      <Modal
        visible={selectedItemForCard !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedItemForCard(null)}
      >
        <SafeAreaView style={styles.modalSafeArea} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setSelectedItemForCard(null)}
              style={styles.modalCloseButton}
            >
              <MaterialCommunityIcons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.modalHeaderTitle}>Proof of Discipline</Text>
            <View style={{ width: 40 }} />
          </View>
          
          <ScrollView
            contentContainerStyle={styles.modalScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {selectedItemForCard && (
              <DisciplineCard
                commitment={{
                  ...selectedItemForCard,
                  performanceData: getOrGeneratePerformanceData(selectedItemForCard),
                }}
                activeStreak={(() => {
                  const idx = history.findIndex(h => h.id === selectedItemForCard.id);
                  if (idx === -1) return 1;
                  
                  let streak = 0;
                  for (let i = idx; i < history.length; i++) {
                    if (history[i].status === 'success') {
                      streak++;
                    } else {
                      break;
                    }
                  }
                  return Math.max(1, streak);
                })()}
                isModalContext={true}
              />
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
  header: {
    marginBottom: Spacing.four,
  },

  headerTitle: {
    fontFamily: Fonts.sans,
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
  },


  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  clearText: {
    color: '#FF4655',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyLogsCard: {
    backgroundColor: '#11131E',
    borderWidth: 1,
    borderColor: '#181B28',
    borderRadius: Spacing.three,
    padding: Spacing.four,
    alignItems: 'center',
    gap: Spacing.one,
  },
  emptyLogsText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: Spacing.one,
  },
  emptyLogsSubtext: {
    color: '#64748B',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 15,
  },
  logsList: {
    gap: Spacing.two,
  },
  logCard: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
  },
  logCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logCardSuccess: {
    backgroundColor: 'rgba(5, 211, 142, 0.03)',
    borderColor: 'rgba(5, 211, 142, 0.15)',
  },
  logCardFailed: {
    backgroundColor: 'rgba(255, 70, 85, 0.03)',
    borderColor: 'rgba(255, 70, 85, 0.15)',
  },
  logCardExpanded: {
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  logLeftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconSuccessBg: {
    backgroundColor: 'rgba(5, 211, 142, 0.12)',
  },
  iconFailedBg: {
    backgroundColor: 'rgba(255, 70, 85, 0.12)',
  },
  logDetails: {
    maxWidth: width * 0.5,
  },
  logGoalTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  logDates: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 1,
  },
  logRightCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  rightStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logStatusText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  textSuccess: {
    color: '#05D38E',
  },
  textFailed: {
    color: '#FF4655',
  },
  expandedContent: {
    marginTop: Spacing.three,
    borderTopWidth: 1,
    borderTopColor: '#181B28',
    paddingTop: Spacing.two,
  },
  highlightBannerFailed: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 70, 85, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 70, 85, 0.15)',
    padding: Spacing.two,
    borderRadius: Spacing.two,
    marginTop: Spacing.two,
    gap: Spacing.two,
  },
  highlightBannerSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(5, 211, 142, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(5, 211, 142, 0.15)',
    padding: Spacing.two,
    borderRadius: Spacing.two,
    marginTop: Spacing.two,
    gap: Spacing.two,
  },
  highlightTextFailed: {
    color: '#FF4655',
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
    lineHeight: 15,
  },
  highlightTextSuccess: {
    color: '#05D38E',
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
    lineHeight: 15,
  },
  expandedStatsGrid: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
  expandedStatsCard: {
    flex: 1,
    backgroundColor: '#0B0C13',
    borderWidth: 1,
    borderColor: '#181B28',
    borderRadius: Spacing.two,
    padding: 8,
    alignItems: 'center',
  },
  expandedStatsLabel: {
    color: '#64748B',
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  expandedStatsVal: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 4,
  },
  expandedStatsUnit: {
    fontSize: 8,
    color: '#64748B',
    fontWeight: 'normal',
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    position: 'relative',
    marginTop: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: '#181B28',
  },
  targetLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderStyle: 'dashed',
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    height: 1,
    zIndex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  targetLineText: {
    color: '#64748B',
    fontSize: 8,
    paddingHorizontal: 4,
    marginTop: -10,
    fontWeight: 'bold',
  },
  chartBarCol: {
    flex: 1,
    alignItems: 'center',
    height: 106,
  },
  chartBarValContainer: {
    height: 16,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  chartBarVal: {
    color: '#94A3B8',
    fontSize: 8,
    fontWeight: 'bold',
  },
  chartBarTrack: {
    width: 12,
    height: 70,
    backgroundColor: 'rgba(24, 27, 40, 0.5)',
    borderRadius: 6,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  chartBarFill: {
    width: '100%',
    borderRadius: 6,
  },
  chartBarLabelContainer: {
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartBarLabel: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '600',
  },
  breakdownContainer: {
    marginTop: Spacing.three,
    gap: 1,
  },
  breakdownHeaderTitle: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: Spacing.two,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#181B28',
  },
  breakdownDayLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  breakdownDayName: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    width: 30,
  },
  breakdownDayDate: {
    color: '#64748B',
    fontSize: 10,
  },
  breakdownDayRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  breakdownDayValue: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  breakdownDayUnit: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: 'normal',
  },
  breakdownDayDiff: {
    fontSize: 10,
    fontWeight: 'bold',
    width: 45,
    textAlign: 'right',
  },

  viewCardButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#7C3AED',
    paddingVertical: 12,
    borderRadius: Spacing.two,
    marginTop: Spacing.three,
  },
  viewCardButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalSafeArea: {
    flex: 1,
    backgroundColor: '#06070B',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
    borderColor: '#181B28',
  },
  modalHeaderTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalScrollContent: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.six,
  },
});


