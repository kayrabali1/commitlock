import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import PrimaryButton from './PrimaryButton';

interface Props {
  onNext: () => void;
}

export default function Screen1Splash({ onNext }: Props) {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(124, 58, 237, 0.1)', 'transparent']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.4 }}
      />
      
      <View style={styles.content}>
        <Animated.View entering={FadeInDown.duration(800).delay(200)} style={styles.iconWrapper}>
          <MaterialCommunityIcons name="shield-check" size={80} color="#7C3AED" />
        </Animated.View>

        <Animated.Text entering={FadeInUp.duration(800).delay(400)} style={styles.title}>
          Focus, realized.
        </Animated.Text>
        
        <Animated.Text entering={FadeInUp.duration(800).delay(600)} style={styles.subtitle}>
          The most elegant way to manage your day.
        </Animated.Text>

        <Animated.View entering={FadeInUp.duration(800).delay(800)} style={styles.promoBox}>
          <MaterialCommunityIcons name="poker-chip" size={24} color="#F59E0B" />
          <View style={styles.promoTextContainer}>
            <Text style={styles.promoTitle}>Start with 1,000 Free Coins</Text>
            <Text style={styles.promoSubtitle}>Our welcome gift. No credit card required.</Text>
          </View>
        </Animated.View>
      </View>

      <Animated.View entering={FadeInUp.duration(800).delay(1000)} style={styles.footer}>
        <PrimaryButton title="Claim Coins & Start" icon="arrow-right" onPress={onNext} />
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
    alignItems: 'center',
  },
  iconWrapper: {
    marginBottom: 40,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontSize: 40,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 48,
    lineHeight: 24,
  },
  promoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 16,
    padding: 16,
    width: '100%',
  },
  promoTextContainer: {
    marginLeft: 16,
    flex: 1,
  },
  promoTitle: {
    color: '#F59E0B',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  promoSubtitle: {
    color: '#FDE68A',
    fontSize: 13,
    opacity: 0.9,
  },
  footer: {
    width: '100%',
    paddingBottom: 20,
  },
});
