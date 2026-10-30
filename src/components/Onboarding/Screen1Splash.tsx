import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import PrimaryButton from './PrimaryButton';

interface Props {
  onNext: () => void;
}

const STARTER_COINS = [
  {
    name: 'Bronze',
    price: '€1.99',
    color: '#CD7F32',
    borderColor: 'rgba(205, 127, 50, 0.45)',
    bgColors: ['#241710', '#140C08'] as const,
    source: require('@/assets/images/bronze_coin.png'),
  },
  {
    name: 'Silver',
    price: '€4.99',
    color: '#BDC3C7',
    borderColor: 'rgba(189, 195, 199, 0.5)',
    bgColors: ['#1C2536', '#0E1522'] as const,
    source: require('@/assets/images/silver_coin.png'),
  },
  {
    name: 'Gold',
    price: '€9.99',
    color: '#FBBF24',
    borderColor: 'rgba(251, 191, 36, 0.5)',
    bgColors: ['#2C2110', '#181106'] as const,
    source: require('@/assets/images/gold_coin.png'),
  },
];

export default function Screen1Splash({ onNext }: Props) {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(124, 58, 237, 0.18)', 'transparent']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.45 }}
      />

      <View style={styles.content}>
        <Animated.View entering={FadeInDown.duration(700).delay(100)} style={styles.iconWrapper}>
          <Image
            source={require('@/assets/images/icon.png')}
            style={styles.appLogo}
            contentFit="cover"
          />
        </Animated.View>

        <Animated.Text entering={FadeInUp.duration(700).delay(250)} style={styles.title}>
          Discipline, Forged.
        </Animated.Text>

        <Animated.Text entering={FadeInUp.duration(700).delay(400)} style={styles.subtitle}>
          Lock in daily health commitments backed by real Vault Coins and verified automatically via Apple Health.
        </Animated.Text>

        {/* Visual Showcase of the 3 Gifted Starter Coins */}
        <Animated.View entering={FadeInUp.duration(700).delay(550)} style={styles.coinsShowcaseCard}>
          <View style={styles.giftBadgeRow}>
            <MaterialCommunityIcons name="gift" size={16} color="#FBBF24" />
            <Text style={styles.giftBadgeText}>WELCOME GIFT • NO PAYMENT REQUIRED</Text>
          </View>

          <Text style={styles.showcaseTitle}>Start with 3 Free Vault Coins</Text>
          <Text style={styles.showcaseSubtitle}>
            Receive 1 coin of each tier in your Vault for free:
          </Text>

          <View style={styles.coinsRow}>
            {STARTER_COINS.map((coin) => (
              <LinearGradient
                key={coin.name}
                colors={coin.bgColors}
                style={[styles.coinMiniCard, { borderColor: coin.borderColor }]}
              >
                <View style={styles.freeTag}>
                  <Text style={styles.freeTagText}>1x FREE</Text>
                </View>
                <Image
                  source={coin.source}
                  style={styles.coinImage}
                  contentFit="contain"
                />
                <Text style={[styles.coinName, { color: coin.color }]}>{coin.name}</Text>
                <View style={styles.priceRow}>
                  <Text style={styles.strikePrice}>{coin.price}</Text>
                  <Text style={styles.freePrice}>€0.00</Text>
                </View>
              </LinearGradient>
            ))}
          </View>
        </Animated.View>
      </View>

      <Animated.View entering={FadeInUp.duration(700).delay(750)} style={styles.footer}>
        <PrimaryButton title="Claim Free Coins & Start" icon="arrow-right" onPress={onNext} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 56,
    justifyContent: 'space-between',
    backgroundColor: '#06070B',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconWrapper: {
    marginBottom: 20,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  appLogo: {
    width: 76,
    height: 76,
    borderRadius: 20,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.8,
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  coinsShowcaseCard: {
    width: '100%',
    backgroundColor: 'rgba(17, 19, 30, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.25)',
    borderRadius: 20,
    padding: 18,
    alignItems: 'center',
  },
  giftBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(251, 191, 36, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 10,
  },
  giftBadgeText: {
    color: '#FBBF24',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  showcaseTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
    textAlign: 'center',
  },
  showcaseSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    marginBottom: 16,
    textAlign: 'center',
  },
  coinsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 10,
  },
  coinMiniCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  freeTag: {
    backgroundColor: 'rgba(5, 211, 142, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(5, 211, 142, 0.4)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 6,
  },
  freeTagText: {
    color: '#05D38E',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  coinImage: {
    width: 60,
    height: 60,
    marginVertical: 4,
  },
  coinName: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  strikePrice: {
    color: '#64748B',
    fontSize: 11,
    textDecorationLine: 'line-through',
  },
  freePrice: {
    color: '#05D38E',
    fontSize: 11,
    fontWeight: '800',
  },
  footer: {
    width: '100%',
    paddingBottom: 20,
  },
});
