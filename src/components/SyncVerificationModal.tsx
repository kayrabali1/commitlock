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
    steps: number;
    calories: number;
    mindfulness: number;
    distance: number;
  };
}

export function SyncVerificationModal({ visible, onClose, metrics }: SyncVerificationModalProps) {
  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  const metricItems = [
    {
      icon: 'walk',
      label: 'Steps Today',
      value: `${Math.round(metrics.steps).toLocaleString()} steps`,
      color: '#10B981',
      bgColor: 'rgba(16, 185, 129, 0.1)',
    },
    {
      icon: 'fire',
      label: 'Active Energy Burned',
      value: `${Math.round(metrics.calories)} kcal`,
      color: '#EF4444',
      bgColor: 'rgba(239, 68, 68, 0.1)',
    },
    {
      icon: 'spa',
      label: 'Mindful Sessions',
      value: `${Math.round(metrics.mindfulness)} mins`,
      color: '#8B5CF6',
      bgColor: 'rgba(139, 92, 246, 0.1)',
    },
    {
      icon: 'run',
      label: 'Exercise Distance',
      value: `${metrics.distance.toFixed(2)} km`,
      color: '#3B82F6',
      bgColor: 'rgba(59, 130, 246, 0.1)',
    },
  ];

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
                colors={['rgba(16, 185, 129, 0.2)', 'rgba(16, 185, 129, 0.05)']}
                style={styles.iconPulseRing}
              >
                <View style={styles.iconInnerRing}>
                  <MaterialCommunityIcons name="heart-flash" size={36} color="#10B981" />
                </View>
              </LinearGradient>
              
              <Text style={styles.successTitle}>Sensor Sync Verified</Text>
              <Text style={styles.successSubtitle}>
                Commitlock is successfully connected to {Platform.OS === 'ios' ? 'Apple HealthKit' : 'Google Health Connect'}
              </Text>
            </View>

            {/* Live Data Display Section */}
            <View style={styles.liveDataBox}>
              <View style={styles.liveIndicatorRow}>
                <View style={styles.pulseGreenCircle} />
                <Text style={styles.liveIndicatorText}>LIVE READS FROM YOUR SENSORS</Text>
              </View>

              <View style={styles.metricsContainer}>
                {metricItems.map((item, idx) => (
                  <View key={idx} style={styles.metricRow}>
                    <View style={[styles.metricIconBg, { backgroundColor: item.bgColor }]}>
                      <MaterialCommunityIcons name={item.icon as any} size={18} color={item.color} />
                    </View>
                    <View style={styles.metricTextContent}>
                      <Text style={styles.metricLabel}>{item.label}</Text>
                      <Text style={styles.metricValue}>{item.value}</Text>
                    </View>
                    <View style={styles.checkmarkWrapper}>
                      <MaterialCommunityIcons name="check-circle" size={18} color="#10B981" />
                    </View>
                  </View>
                ))}
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
                colors={['#10B981', '#059669']}
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
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
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
  pulseGreenCircle: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  liveIndicatorText: {
    color: '#10B981',
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
  checkmarkWrapper: {
    paddingHorizontal: 4,
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
