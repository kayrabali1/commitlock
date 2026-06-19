import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Pressable,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { Spacing } from '@/constants/theme';

interface SyncVerificationModalProps {
  visible: boolean;
  onClose: () => void;
  metrics: {
    steps: { value: number; status: 'granted' | 'denied' | 'unsupported' };
    calories: { value: number; status: 'granted' | 'denied' | 'unsupported' };
    mindfulness: { value: number; status: 'granted' | 'denied' | 'unsupported' };
    distance: { value: number; status: 'granted' | 'denied' | 'unsupported' };
  };
}

export function SyncVerificationModal({ visible, onClose, metrics }: SyncVerificationModalProps) {
  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  const getStatusDetails = (status: 'granted' | 'denied' | 'unsupported') => {
    switch (status) {
      case 'granted':
        return { label: 'Active', icon: 'check-circle', color: '#10B981' };
      case 'denied':
        return { label: 'Restricted', icon: 'alert-circle', color: '#EF4444' };
      case 'unsupported':
      default:
        return { label: 'Simulated', icon: 'clock-outline', color: '#8B5CF6' };
    }
  };

  const metricItems = [
    {
      icon: 'walk',
      label: 'Steps Today',
      value: `${Math.round(metrics.steps.value).toLocaleString()} steps`,
      status: metrics.steps.status,
      color: '#10B981',
      bgColor: 'rgba(16, 185, 129, 0.1)',
    },
    {
      icon: 'fire',
      label: 'Calories Today',
      value: `${Math.round(metrics.calories.value)} kcal`,
      status: metrics.calories.status,
      color: '#EF4444',
      bgColor: 'rgba(239, 68, 68, 0.1)',
    },
    {
      icon: 'spa',
      label: 'Mindful Minutes Today',
      value: `${Math.round(metrics.mindfulness.value)} mins`,
      status: metrics.mindfulness.status,
      color: '#8B5CF6',
      bgColor: 'rgba(139, 92, 246, 0.1)',
    },
    {
      icon: 'run',
      label: 'Distance Today',
      value: `${metrics.distance.value.toFixed(2)} km`,
      status: metrics.distance.status,
      color: '#3B82F6',
      bgColor: 'rgba(59, 130, 246, 0.1)',
    },
  ];

  // Calculate overall state
  const allGranted = 
    metrics.steps.status === 'granted' &&
    metrics.calories.status === 'granted' &&
    metrics.mindfulness.status === 'granted' &&
    metrics.distance.status === 'granted';

  const anyDenied = 
    metrics.steps.status === 'denied' ||
    metrics.calories.status === 'denied' ||
    metrics.mindfulness.status === 'denied' ||
    metrics.distance.status === 'denied';

  const headerColors = anyDenied 
    ? ['rgba(239, 68, 68, 0.2)', 'rgba(239, 68, 68, 0.05)'] as const
    : (!allGranted 
      ? ['rgba(139, 92, 246, 0.2)', 'rgba(139, 92, 246, 0.05)'] as const
      : ['rgba(16, 185, 129, 0.2)', 'rgba(16, 185, 129, 0.05)'] as const);

  const headerTitle = anyDenied 
    ? 'Sync Permission Issue' 
    : (!allGranted ? 'Sandbox Connection' : 'Sensor Sync Verified');

  const headerSubtitle = anyDenied 
    ? 'Some permissions are restricted. Please enable them in your Apple Health settings.'
    : (!allGranted 
      ? 'Health sensor connection loaded in sandbox simulation mode.' 
      : `Successfully connected to ${Platform.OS === 'ios' ? 'Apple HealthKit' : 'Google Health Connect'}`);

  const headerIcon = anyDenied 
    ? 'heart-broken' 
    : (!allGranted ? 'heart-pulse' : 'heart-flash');

  const headerIconColor = anyDenied 
    ? '#EF4444' 
    : (!allGranted ? '#8B5CF6' : '#10B981');

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable 
          style={StyleSheet.absoluteFill}
          onPress={handleClose}
        />
        
        <View style={styles.modalContentWrapper}>
          <BlurView tint="dark" intensity={95} style={styles.modalContent}>
            
            {/* Header / Success Indicator */}
            <View style={styles.successHeader}>
              <LinearGradient
                colors={headerColors}
                style={styles.iconPulseRing}
              >
                <View style={[styles.iconInnerRing, { borderColor: headerIconColor + '40' }]}>
                  <MaterialCommunityIcons name={headerIcon as any} size={36} color={headerIconColor} />
                </View>
              </LinearGradient>
              
              <Text style={styles.successTitle}>{headerTitle}</Text>
              <Text style={styles.successSubtitle}>{headerSubtitle}</Text>
            </View>

            {/* Live Data Display Section */}
            <View style={styles.liveDataBox}>
              <View style={styles.liveIndicatorRow}>
                <View style={[styles.pulseCircle, { backgroundColor: headerIconColor }]} />
                <Text style={[styles.liveIndicatorText, { color: headerIconColor }]}>
                  {anyDenied ? 'READING RESTRICTED SENSORS' : 'LIVE SENSOR READOUTS'}
                </Text>
              </View>

              <View style={styles.metricsContainer}>
                {metricItems.map((item, idx) => {
                  const statusInfo = getStatusDetails(item.status);
                  return (
                    <View key={idx} style={styles.metricRow}>
                      <View style={[styles.metricIconBg, { backgroundColor: item.bgColor }]}>
                        <MaterialCommunityIcons name={item.icon as any} size={18} color={item.color} />
                      </View>
                      <View style={styles.metricTextContent}>
                        <Text style={styles.metricLabel}>{item.label}</Text>
                        <Text style={styles.metricValue}>
                          {item.status === 'denied' ? 'Restricted' : item.value}
                        </Text>
                      </View>
                      <View style={styles.statusBadgeWrapper}>
                        <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + '10', borderColor: statusInfo.color + '30' }]}>
                          <MaterialCommunityIcons name={statusInfo.icon as any} size={12} color={statusInfo.color} />
                          <Text style={[styles.statusBadgeText, { color: statusInfo.color }]}>
                            {statusInfo.label}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            <Text style={styles.disclaimerText}>
              Verification utilizes physical sensor data only. Manually typed-in steps or workout entries are automatically filtered and not counted.
            </Text>

            {/* Action button */}
            <TouchableOpacity
              onPress={handleClose}
              style={styles.actionButton}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={anyDenied ? ['#EF4444', '#DC2626'] as const : (allGranted ? ['#10B981', '#059669'] as const : ['#8B5CF6', '#7C3AED'] as const)}
                style={styles.actionButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.actionButtonText}>Done</Text>
              </LinearGradient>
            </TouchableOpacity>

          </BlurView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 6, 10, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  modalContentWrapper: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2D314E',
  },
  modalContent: {
    backgroundColor: '#0F111D',
    padding: Spacing.four,
    alignItems: 'center',
  },
  successHeader: {
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
  iconPulseRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  iconInnerRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  successTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 6,
  },
  successSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: Spacing.two,
  },
  liveDataBox: {
    width: '100%',
    backgroundColor: '#16192E',
    borderRadius: 16,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: '#2D314E',
    marginBottom: Spacing.three,
  },
  liveIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.three,
  },
  pulseCircle: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  liveIndicatorText: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  metricsContainer: {
    gap: Spacing.two,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E223D',
    borderRadius: 12,
    padding: Spacing.two,
    borderWidth: 1,
    borderColor: '#363C66',
  },
  metricIconBg: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  metricTextContent: {
    flex: 1,
  },
  metricLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 2,
  },
  metricValue: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  statusBadgeWrapper: {
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  disclaimerText: {
    color: '#64748B',
    fontSize: 10,
    lineHeight: 14,
    textAlign: 'center',
    marginBottom: Spacing.four,
    paddingHorizontal: Spacing.one,
  },
  actionButton: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionButtonGradient: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
