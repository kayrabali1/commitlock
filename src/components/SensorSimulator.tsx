import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
  Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Spacing } from '@/constants/theme';
import { HealthDataService, DailyHealthData, Commitment } from '@/services/health';

const { height } = Dimensions.get('window');

interface SensorSimulatorProps {
  visible: boolean;
  onClose: () => void;
  onDataChanged: () => void;
  commitment: Commitment | null;
}

export default function SensorSimulator({
  visible,
  onClose,
  onDataChanged,
  commitment,
}: SensorSimulatorProps) {
  const [dayLogs, setDayLogs] = useState<DailyHealthData[]>([]);

  const metricType = commitment?.metricType || 'steps';

  const loadSimulatedData = React.useCallback(async () => {
    const data = await HealthDataService.fetchWeeklyData(metricType);
    setDayLogs(data);
  }, [metricType]);

  useEffect(() => {
    if (visible) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadSimulatedData();
    }
  }, [visible, loadSimulatedData]);

  const updateValue = async (dayName: string, text: string) => {
    // Only allow numeric values and decimals
    const cleanVal = text.replace(/[^0-9.]/g, '');
    const num = parseFloat(cleanVal) || 0;
    
    // Update local state
    setDayLogs((prev) =>
      prev.map((d) => (d.dayName === dayName ? { ...d, value: num } : d))
    );

    // Save override to AsyncStorage
    await HealthDataService.updateSimulatedDay(metricType, dayName, num);
    onDataChanged();
  };

  const handleQuickPreset = async (type: 'pass' | 'fail') => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // Get target value dynamically from the passed commitment prop, or fallback to default
    let target = commitment?.targetValue;
    if (!target) {
      switch (metricType) {
        case 'steps': target = 10000; break;
        case 'run': target = 5; break;
        case 'mindfulness': target = 15; break;
        case 'cycle': target = 15; break;
        case 'calories': target = 500; break;
        case 'activeTime': target = 30; break;
        default: target = 10;
      }
    }
    
    const isWeekly = commitment?.targetScope === 'weekly';
    const presetValues = dayLogs.map((d, index) => {
      if (isWeekly) {
        const dailyAverage = target / 7;
        if (type === 'pass') {
          // Add 10% buffer above average daily contribution
          let val = dailyAverage * 1.1;
          if (metricType === 'steps') val = Math.round(val);
          else if (metricType === 'calories') val = Math.round(val);
          else if (metricType === 'activeTime' || metricType === 'mindfulness') val = Math.round(val);
          else val = parseFloat(val.toFixed(1));
          return { ...d, value: val };
        } else {
          // Wednesday is 0 contribution, others are 15% below average
          if (index === 2) {
            return { ...d, value: 0 };
          }
          let val = dailyAverage * 0.85;
          if (metricType === 'steps') val = Math.round(val);
          else if (metricType === 'calories') val = Math.round(val);
          else if (metricType === 'activeTime' || metricType === 'mindfulness') val = Math.round(val);
          else val = parseFloat(val.toFixed(1));
          return { ...d, value: val };
        }
      } else {
        // For failure, we make Wednesday fail (index 2)
        let val = target + (
          metricType === 'steps' ? 1200 : 
          metricType === 'calories' ? 80 : 
          metricType === 'activeTime' || metricType === 'mindfulness' ? 10 : 2
        );
        if (type === 'fail' && index === 2) {
          val = target - (
            metricType === 'steps' ? 2000 : 
            metricType === 'calories' ? 100 : 
            metricType === 'activeTime' || metricType === 'mindfulness' ? 8 : 1.5
          );
        }
        val = Math.max(0, val);
        return { ...d, value: val };
      }
    });

    setDayLogs(presetValues);

    for (const d of presetValues) {
      await HealthDataService.updateSimulatedDay(metricType, d.dayName, d.value);
    }
    
    onDataChanged();
  };

  const handleReset = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await HealthDataService.resetSimulatedData();
    await loadSimulatedData();
    onDataChanged();
  };

  const getStepHint = () => {
    const target = commitment?.targetValue;
    const scope = commitment?.targetScope || 'daily';
    const isWeekly = scope === 'weekly';
    const suffix = isWeekly ? 'week' : 'day';

    let displayTarget = target;
    if (!displayTarget) {
      switch (metricType) {
        case 'steps': displayTarget = isWeekly ? 70000 : 10000; break;
        case 'run': displayTarget = isWeekly ? 35 : 5; break;
        case 'mindfulness': displayTarget = isWeekly ? 105 : 15; break;
        case 'cycle': displayTarget = isWeekly ? 105 : 15; break;
        case 'calories': displayTarget = isWeekly ? 3500 : 500; break;
        case 'activeTime': displayTarget = isWeekly ? 210 : 30; break;
        default: displayTarget = isWeekly ? 70 : 10;
      }
    }

    const formattedTarget = metricType === 'steps' || metricType === 'calories' 
      ? displayTarget.toLocaleString() 
      : displayTarget.toString();

    switch (metricType) {
      case 'steps': return `Target: ${formattedTarget} steps/${suffix}`;
      case 'run': return `Target: ${formattedTarget} km/${suffix}`;
      case 'mindfulness': return `Target: ${formattedTarget} mins/${suffix}`;
      case 'cycle': return `Target: ${formattedTarget} km/${suffix}`;
      case 'calories': return `Target: ${formattedTarget} kcal/${suffix}`;
      case 'activeTime': return `Target: ${formattedTarget} mins/${suffix}`;
    }
  };

  const getUnitText = () => {
    switch (metricType) {
      case 'steps': return 'steps';
      case 'calories': return 'kcal';
      case 'activeTime': return 'mins';
      case 'mindfulness': return 'mins';
      default: return 'km';
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Tap outside to dismiss */}
        <TouchableOpacity style={styles.dismissArea} onPress={onClose} activeOpacity={1} />
        
        <BlurView tint="dark" intensity={98} style={styles.sheetContainer}>
          <View style={styles.header}>
            <View style={styles.pullBar} />
            <View style={styles.headerTitleRow}>
              <MaterialCommunityIcons name="developer-board" size={24} color="#7C3AED" />
              <View>
                <Text style={styles.headerTitle}>Health Sensor Simulator</Text>
                <Text style={styles.headerSubtitle}>Mock Apple HealthKit / Google Health Connect</Text>
              </View>
            </View>
          </View>
          
          {/* Quick Presets */}
          <View style={styles.presetContainer}>
            <TouchableOpacity
              onPress={() => handleQuickPreset('pass')}
              style={[styles.presetButton, styles.presetPass]}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="check-all" size={16} color="#05D38E" />
              <Text style={styles.presetPassText}>Preset: Pass All Days</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleQuickPreset('fail')}
              style={[styles.presetButton, styles.presetFail]}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="close-circle-multiple-outline" size={16} color="#FF4655" />
              <Text style={styles.presetFailText}>Preset: Fail Wed</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollList} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.infoText}>
              Adjust values below to simulate fitness sensor sync data. Current Active commitment: <Text style={{ color: '#7C3AED', fontWeight: 'bold' }}>{(metricType === 'calories' ? 'active calories' : metricType).toUpperCase()}</Text>.
            </Text>
            <Text style={styles.targetHint}>{getStepHint()}</Text>

            {dayLogs.map((day) => (
              <View key={day.dayName} style={styles.dayRow}>
                <View style={styles.dayLabelWrapper}>
                  <Text style={styles.dayName}>{day.dayName}</Text>
                  <Text style={styles.dayDate}>{day.dateString}</Text>
                </View>

                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={day.value.toString()}
                    onChangeText={(text) => updateValue(day.dayName, text)}
                  />
                  <Text style={styles.unitText}>{getUnitText()}</Text>
                </View>
              </View>
            ))}

            <TouchableOpacity onPress={handleReset} style={styles.resetButton} activeOpacity={0.8}>
              <MaterialCommunityIcons name="refresh" size={16} color="#94A3B8" />
              <Text style={styles.resetText}>Reset to Default Sandbox Data</Text>
            </TouchableOpacity>

          </ScrollView>

          <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.8}>
            <Text style={styles.closeText}>Close Console</Text>
          </TouchableOpacity>
        </BlurView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  dismissArea: {
    flex: 1,
  },
  sheetContainer: {
    height: height * 0.75,
    borderTopLeftRadius: Spacing.four,
    borderTopRightRadius: Spacing.four,
    overflow: 'hidden',
    paddingBottom: Platform.OS === 'ios' ? Spacing.five : Spacing.four,
  },
  header: {
    alignItems: 'center',
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: '#181B28',
  },
  pullBar: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#1C1F30',
    marginBottom: Spacing.two,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    width: '100%',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#576880',
    fontSize: 11,
  },
  presetContainer: {
    flexDirection: 'row',
    padding: Spacing.three,
    gap: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: '#181B28',
  },
  presetButton: {
    flex: 1,
    height: 38,
    borderRadius: 19,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
  },
  presetPass: {
    backgroundColor: 'rgba(5, 211, 142, 0.08)',
    borderColor: 'rgba(5, 211, 142, 0.2)',
  },
  presetPassText: {
    color: '#05D38E',
    fontSize: 12,
    fontWeight: 'bold',
  },
  presetFail: {
    backgroundColor: 'rgba(255, 70, 85, 0.08)',
    borderColor: 'rgba(255, 70, 85, 0.2)',
  },
  presetFailText: {
    color: '#FF4655',
    fontSize: 12,
    fontWeight: 'bold',
  },
  scrollList: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.four,
  },
  infoText: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: Spacing.one,
  },
  targetHint: {
    color: '#7C3AED',
    fontSize: 11,
    fontWeight: 'bold',
    fontStyle: 'italic',
    marginBottom: Spacing.three,
  },
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: '#181B28',
  },
  dayLabelWrapper: {
    gap: 2,
  },
  dayName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  dayDate: {
    color: '#576880',
    fontSize: 11,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#11131E',
    borderWidth: 1,
    borderColor: '#181B28',
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  input: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    height: 36,
    width: 80,
    textAlign: 'right',
    paddingRight: 4,
  },
  unitText: {
    color: '#576880',
    fontSize: 12,
    fontWeight: 'bold',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: Spacing.four,
    marginBottom: Spacing.two,
  },
  resetText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: 'bold',
  },
  closeButton: {
    backgroundColor: '#7C3AED',
    height: 48,
    borderRadius: 24,
    marginHorizontal: Spacing.four,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
