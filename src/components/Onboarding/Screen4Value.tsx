import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInUp, useSharedValue, withTiming, useAnimatedStyle, withRepeat } from 'react-native-reanimated';
import PrimaryButton from './PrimaryButton';

interface Props {
  onNext: () => void;
}

export default function Screen4Value({ onNext }: Props) {
  const pulse = useSharedValue(0.5);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 1500 }),
      -1,
      true
    );
  }, [pulse]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulse.value,
    transform: [{ scale: 1 + (pulse.value * 0.05) }]
  }));

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(124, 58, 237, 0.1)', 'transparent']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.5 }}
      />
      
      <View style={styles.content}>
        <Animated.View entering={FadeInUp.duration(800).delay(100)} style={styles.header}>
          <Text style={styles.title}>Your workspace is ready.</Text>
          <Text style={styles.subtitle}>We've customized the experience to help you achieve your goals.</Text>
        </Animated.View>

        {/* Mock UI Representation */}
        <Animated.View entering={FadeInUp.duration(1000).delay(400)} style={styles.mockupContainer}>
          <Animated.View style={[styles.glowBackground, pulseStyle]} />
          
          <View style={styles.mockupCard}>
            <View style={styles.mockupRow}>
              <View style={styles.mockupAvatar} />
              <View style={styles.mockupTextGroup}>
                <View style={styles.mockupTextLine1} />
                <View style={styles.mockupTextLine2} />
              </View>
            </View>
            
            <View style={styles.mockupStatRow}>
              <View style={styles.mockupStatBox}>
                <MaterialCommunityIcons name="lightning-bolt" size={20} color="#F59E0B" />
                <Text style={styles.statText}>Focus Score</Text>
                <Text style={styles.statValue}>94%</Text>
              </View>
              <View style={styles.mockupStatBox}>
                <MaterialCommunityIcons name="poker-chip" size={20} color="#7C3AED" />
                <Text style={styles.statText}>Coins</Text>
                <Text style={styles.statValue}>1,000</Text>
              </View>
            </View>
          </View>
        </Animated.View>
      </View>

      <Animated.View entering={FadeInUp.duration(600).delay(800)} style={styles.footer}>
        <PrimaryButton title="Unlock My Dashboard" icon="lock-open-variant" onPress={onNext} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  mockupContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 240,
    width: '100%',
  },
  glowBackground: {
    position: 'absolute',
    width: 200,
    height: 200,
    backgroundColor: 'rgba(124, 58, 237, 0.4)',
    borderRadius: 100,
    filter: 'blur(40px)',
  },
  mockupCard: {
    backgroundColor: 'rgba(17, 19, 30, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 10,
  },
  mockupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  mockupAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  mockupTextGroup: {
    marginLeft: 16,
    flex: 1,
    gap: 8,
  },
  mockupTextLine1: {
    height: 12,
    width: '60%',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 6,
  },
  mockupTextLine2: {
    height: 10,
    width: '40%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 5,
  },
  mockupStatRow: {
    flexDirection: 'row',
    gap: 16,
  },
  mockupStatBox: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  statText: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 8,
    marginBottom: 4,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  footer: {
    width: '100%',
    paddingBottom: 20,
  },
});
