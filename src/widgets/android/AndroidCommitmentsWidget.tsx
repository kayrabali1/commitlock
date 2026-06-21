import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

export interface Commitment {
  id: string;
  metricType: string;
  targetValue: number;
  period: 'week' | 'month';
  stakeAmount: number;
  startDate: string;
  endDate: string;
  status: 'active' | 'success' | 'failed';
  createdAt: string;
  targetScope?: 'daily' | 'weekly';
}

export interface DailyHealthData {
  dayName: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
  value: number;
  dateString: string;
}

export type AndroidCommitmentsWidgetProps = {
  commitments: Commitment[];
  weeklyData: Record<string, DailyHealthData[]>;
};

const getMetricEmoji = (type: string) => {
  switch (type) {
    case 'steps': return '👟';
    case 'run': return '🏃';
    case 'cycle': return '🚴';
    case 'calories': return '🔥';
    case 'activeTime': return '⏱️';
    case 'mindfulness': return '🧘';
    default: return '🎯';
  }
};

const getMetricLabel = (type: string) => {
  switch (type) {
    case 'steps': return 'Steps';
    case 'run': return 'Run';
    case 'cycle': return 'Cycle';
    case 'calories': return 'Calories';
    case 'activeTime': return 'Active Time';
    case 'mindfulness': return 'Mindfulness';
    default: return 'Commitment';
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

// Simulated date parser matching HealthDataService.parseLocalDate
const parseLocalDate = (dateStr: string): Date => {
  const parts = dateStr.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  return new Date(year, month, day, 12, 0, 0);
};

const getCommitmentDaysList = (commitment: Commitment) => {
  try {
    const start = parseLocalDate(commitment.startDate);
    const end = parseLocalDate(commitment.endDate);
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

const simulatedTodayIndex = 2; // Simulated Wednesday index

export default function AndroidCommitmentsWidget({ commitments = [], weeklyData = {} }: AndroidCommitmentsWidgetProps) {
  const listItems = commitments.slice(0, 2);

  if (listItems.length === 0) {
    return (
      <FlexWidget
        clickAction="OPEN_APP"
        style={{
          height: 'match_parent',
          width: 'match_parent',
          backgroundColor: '#06070B',
          borderRadius: 16,
          padding: 16,
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <TextWidget
          text="HabitContract 🔒"
          style={{
            fontSize: 16,
            fontWeight: 'bold',
            color: '#FFFFFF',
            marginBottom: 8,
          }}
        />
        <TextWidget
          text="No active commitments."
          style={{
            fontSize: 13,
            color: '#8F93A3',
            textAlign: 'center',
            marginBottom: 4,
          }}
        />
        <TextWidget
          text="Tap to open the app and lock one!"
          style={{
            fontSize: 11,
            color: '#4F46E5',
            textAlign: 'center',
          }}
        />
      </FlexWidget>
    );
  }

  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: '#06070B',
        borderRadius: 16,
        padding: 16,
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      {/* Widget Header */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: 'match_parent',
          marginBottom: 8,
        }}
      >
        <TextWidget
          text="HABITCONTRACT ACTIVE PROGRESS"
          style={{
            fontSize: 10,
            fontWeight: 'bold',
            color: '#8F93A3',
          }}
        />
        <TextWidget
          text="🔒 PLEDGED"
          style={{
            fontSize: 10,
            fontWeight: 'bold',
            color: '#4F46E5',
          }}
        />
      </FlexWidget>

      {/* Commitments List */}
      {listItems.map((commitment, index) => {
        const weeklyDataList = weeklyData[commitment.id] || [];
        const emoji = getMetricEmoji(commitment.metricType);
        const label = getMetricLabel(commitment.metricType);
        
        // Calculate stats
        let overallProgress = 0;
        let totalAccumulated = 0;
        let isBroken = false;
        
        if (commitment && weeklyDataList.length > 0) {
          const pastAndTodayData = weeklyDataList.slice(0, simulatedTodayIndex + 1);
          totalAccumulated = pastAndTodayData.reduce((acc, day) => acc + day.value, 0);

          const allDays = getCommitmentDaysList(commitment);
          const totalDays = allDays.length || 7;
          const todayDateStr = weeklyDataList?.[simulatedTodayIndex]?.dateString;

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
                  sumProgress += 1.0;
                }
              }
            });
            overallProgress = Math.min(Math.round((sumProgress / totalDays) * 100), 100);
          }

          // Check if broken
          if (commitment.targetScope !== 'weekly') {
            isBroken = weeklyDataList.slice(0, simulatedTodayIndex).some(
              (day) => day.value < commitment.targetValue
            );
          }
        }

        // Calculate remaining days
        let remainingDays = '0 Days';
        try {
          const todayDateStr = weeklyDataList?.[simulatedTodayIndex]?.dateString;
          const now = new Date();
          const today = todayDateStr ? parseLocalDate(todayDateStr) : now;
          const end = parseLocalDate(commitment.endDate);
          const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          const endMidnight = new Date(end.getFullYear(), end.getMonth(), end.getDate());
          const diffMs = endMidnight.getTime() - todayMidnight.getTime();
          const diffDays = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
          remainingDays = `${diffDays}d`;
        } catch {}

        return (
          <FlexWidget
            key={commitment.id || index}
            style={{
              flexDirection: 'column',
              width: 'match_parent',
              marginTop: index > 0 ? 8 : 0,
            }}
          >
            {/* Header info */}
            <FlexWidget
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: 'match_parent',
                marginBottom: 2,
              }}
            >
              <TextWidget
                text={`${emoji} ${label} (${overallProgress}%)`}
                style={{
                  fontSize: 13,
                  fontWeight: 'bold',
                  color: '#FFFFFF',
                }}
              />
              <TextWidget
                text={isBroken ? '⚠️ Broken' : `€${commitment.stakeAmount} Pledged`}
                style={{
                  fontSize: 12,
                  color: isBroken ? '#FF4655' : '#05D38E',
                }}
              />
            </FlexWidget>

            {/* Sliced or Continuous progress bar */}
            <FlexWidget
              style={{
                flexDirection: 'row',
                width: 'match_parent',
                height: 8,
                marginTop: 4,
                marginBottom: 4,
              }}
            >
              {commitment.targetScope === 'weekly' ? (
                <FlexWidget
                  style={{
                    flex: 1,
                    height: 'match_parent',
                    backgroundColor: '#1E293B',
                    borderRadius: 2,
                    flexDirection: 'row',
                    overflow: 'hidden',
                  }}
                >
                  <FlexWidget
                    style={{
                      flex: overallProgress,
                      height: 'match_parent',
                      backgroundColor: '#05D38E',
                      borderRadius: 2,
                    }}
                  />
                  <FlexWidget
                    style={{
                      flex: 100 - overallProgress,
                      height: 'match_parent',
                      backgroundColor: 'transparent',
                    }}
                  />
                </FlexWidget>
              ) : (
                getCommitmentDaysList(commitment).map((dateStr, segmentIdx) => {
                  const todayDateStr = weeklyDataList?.[simulatedTodayIndex]?.dateString;
                  const dayData = weeklyDataList.find(d => d.dateString === dateStr);
                  
                  let segmentColor = '#1E293B'; // Default future slate
                  
                  if (todayDateStr) {
                    if (dateStr > todayDateStr) {
                      segmentColor = '#1E293B';
                    } else if (dateStr === todayDateStr) {
                      segmentColor = '#7C3AED'; // Purple highlight for today
                    } else {
                      const isGoalMet = dayData
                        ? (commitment.targetScope === 'weekly'
                          ? dayData.value > 0
                          : dayData.value >= commitment.targetValue)
                        : true;
                      
                      segmentColor = isGoalMet ? '#05D38E' : '#FF4655';
                    }
                  }

                  return (
                    <FlexWidget
                      key={dateStr}
                      style={{
                        flex: 1,
                        height: 'match_parent',
                        backgroundColor: segmentColor as any,
                        borderRadius: 2,
                        marginLeft: segmentIdx > 0 ? 3 : 0,
                      }}
                    />
                  );
                })
              )}
            </FlexWidget>

            {/* Target details */}
            <FlexWidget
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                width: 'match_parent',
              }}
            >
              <TextWidget
                text={`${commitment.targetScope === 'weekly' ? 'Weekly' : 'Daily'} target • ${commitment.targetValue.toLocaleString()} ${getMetricUnit(commitment.metricType)}`}
                style={{
                  fontSize: 10,
                  color: '#8F93A3',
                }}
              />
              <TextWidget
                text={`${remainingDays} left`}
                style={{
                  fontSize: 10,
                  color: '#8F93A3',
                }}
              />
            </FlexWidget>
          </FlexWidget>
        );
      })}
    </FlexWidget>
  );
}
