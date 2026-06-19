import React from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Spacing } from '@/constants/theme';

interface HowItWorksPaneProps {
  onPress?: () => void;
}

export default function HowItWorksPane({ onPress }: HowItWorksPaneProps) {
  const steps = [
    {
      icon: 'target',
      title: '1. Set Your Goal',
      description: 'Choose steps, run distance, active calories, or mindfulness and set your target.',
    },
    {
      icon: 'lock-outline',
      title: '2. Commit & Pledge',
      description: 'Stake a pledge amount (e.g. €5, €10) to secure your accountability.',
    },
    {
      icon: 'heart-pulse',
      title: '3. Track with Sensors',
      description: 'Only physical device sensor data counts. Manual entries are ignored.',
    },
    {
      icon: 'scale-balance',
      title: '4. Refund or Forfeit',
      description: 'Succeed to get a refund. Fail, and your stake is forfeited to operations.',
    },
  ];

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={onPress ? 0.8 : 1}>
      <LinearGradient
        colors={['rgba(5, 211, 142, 0.08)', 'rgba(5, 211, 142, 0.02)']}
        style={styles.container}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <View style={styles.headerRow}>
          <View style={styles.leftTimeline}>
            <View style={styles.headerIconBg}>
              <MaterialCommunityIcons name="shield-check" size={18} color="#05D38E" />
            </View>
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>How HabitContract Works</Text>
            <Text style={styles.subtitle}>Four simple steps to verified accountability</Text>
          </View>
        </View>

        <View style={styles.stepsContainer}>
          {steps.map((step, index) => {
            const isLast = index === steps.length - 1;
            return (
              <View key={index} style={styles.stepRow}>
                <View style={styles.leftTimeline}>
                  <View style={styles.iconCircle}>
                    <MaterialCommunityIcons name={step.icon as any} size={13} color="#05D38E" />
                  </View>
                  {!isLast && <View style={styles.timelineLine} />}
                </View>

                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepDescription}>{step.description}</Text>
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Tap for full verification details</Text>
          <MaterialCommunityIcons name="arrow-right" size={13} color="#05D38E" />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const Fonts = {
  sans: Platform.select({ ios: 'System', android: 'sans-serif' }),
  mono: Platform.select({ ios: 'Courier', android: 'monospace' }),
};

const styles = StyleSheet.create({
  container: {
    borderRadius: Spacing.three,
    borderWidth: 1.5,
    borderColor: 'rgba(5, 211, 142, 0.15)',
    padding: 12,
    marginTop: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  headerIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(5, 211, 142, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(5, 211, 142, 0.25)',
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
    fontFamily: Fonts.sans,
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 11.5,
    marginTop: 1,
    fontFamily: Fonts.sans,
  },
  stepsContainer: {
    gap: 0,
  },
  stepRow: {
    flexDirection: 'row',
    gap: 12,
  },
  leftTimeline: {
    alignItems: 'center',
    width: 20,
  },
  iconCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(5, 211, 142, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(5, 211, 142, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  timelineLine: {
    width: 1.5,
    backgroundColor: 'rgba(5, 211, 142, 0.15)',
    flex: 1,
    marginVertical: 2,
    minHeight: 14,
  },
  stepContent: {
    flex: 1,
    paddingBottom: 8,
  },
  stepTitle: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '600',
    fontFamily: Fonts.sans,
    marginBottom: 2,
  },
  stepDescription: {
    color: '#94A3B8',
    fontSize: 11.5,
    lineHeight: 15,
    fontFamily: Fonts.sans,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(5, 211, 142, 0.10)',
    paddingTop: 10,
    marginTop: 2,
  },
  footerText: {
    color: '#05D38E',
    fontSize: 11.5,
    fontWeight: '600',
    fontFamily: Fonts.sans,
  },
});
