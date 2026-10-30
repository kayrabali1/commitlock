import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
  Easing,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface WelcomePassesModalProps {
  visible: boolean;
  onClaim: () => void;
}

const GIFT_COINS = [
  {
    name: 'BRONZE COIN',
    price: '€1.99',
    color: '#CD7F32',
    borderColor: 'rgba(205, 127, 50, 0.5)',
    bgColors: ['#241710', '#140C08'] as const,
    source: require('@/assets/images/bronze_coin.png'),
  },
  {
    name: 'SILVER COIN',
    price: '€4.99',
    color: '#BDC3C7',
    borderColor: 'rgba(189, 195, 199, 0.6)',
    bgColors: ['#1C2536', '#0E1522'] as const,
    source: require('@/assets/images/silver_coin.png'),
  },
  {
    name: 'GOLD COIN',
    price: '€9.99',
    color: '#FBBF24',
    borderColor: 'rgba(251, 191, 36, 0.6)',
    bgColors: ['#2C2110', '#181106'] as const,
    source: require('@/assets/images/gold_coin.png'),
  },
];

export default function WelcomePassesModal({ visible, onClaim }: WelcomePassesModalProps) {
  const [showContent, setShowContent] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Cards entry animations
  const card1Anim = useRef(new Animated.Value(0)).current;
  const card2Anim = useRef(new Animated.Value(0)).current;
  const card3Anim = useRef(new Animated.Value(0)).current;

  // Floating hover animations
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setShowContent(true);

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          easing: Easing.out(Easing.back(1.2)),
          useNativeDriver: true,
        }),
      ]).start(() => {
        Animated.stagger(150, [
          Animated.spring(card1Anim, {
            toValue: 1,
            friction: 6,
            tension: 40,
            useNativeDriver: true,
          }),
          Animated.spring(card2Anim, {
            toValue: 1,
            friction: 6,
            tension: 40,
            useNativeDriver: true,
          }),
          Animated.spring(card3Anim, {
            toValue: 1,
            friction: 6,
            tension: 40,
            useNativeDriver: true,
          }),
        ]).start(() => {
          Animated.loop(
            Animated.sequence([
              Animated.timing(floatAnim, {
                toValue: 1,
                duration: 2000,
                easing: Easing.inOut(Easing.ease),
                useNativeDriver: true,
              }),
              Animated.timing(floatAnim, {
                toValue: 0,
                duration: 2000,
                easing: Easing.inOut(Easing.ease),
                useNativeDriver: true,
              }),
            ])
          ).start();
        });
      });
    }
  }, [visible]);

  const handleClaimPress = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), 100);
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), 250);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 100,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowContent(false);
      onClaim();
    });
  };

  if (!visible && !showContent) return null;

  const floatOffsetY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -6],
  });

  const cardAnims = [card1Anim, card2Anim, card3Anim];

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
    >
      <BlurView style={styles.overlay} intensity={95} tint="dark">
        <Animated.View
          style={[
            styles.container,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Neon Glow Header */}
          <LinearGradient
            colors={['rgba(124, 58, 237, 0.2)', 'rgba(0, 0, 0, 0)']}
            style={styles.glowHeader}
          />

          <View style={styles.header}>
            <View style={styles.giftIconContainer}>
              <MaterialCommunityIcons name="gift" size={32} color="#FBBF24" />
            </View>

            <View style={styles.noPaymentBadge}>
              <MaterialCommunityIcons name="check-decagram" size={14} color="#05D38E" />
              <Text style={styles.noPaymentBadgeText}>100% FREE GIFT • NO PAYMENT REQUIRED</Text>
            </View>

            <Text style={styles.title}>WELCOME GIFT ACTIVATED</Text>
            <Text style={styles.subtitle}>
              We've gifted you 1 of each Vault Coin (Bronze, Silver & Gold) to start your habit journey. These 3 coins are completely free—no payment required!
            </Text>
          </View>

          {/* 3 Gifted Coins Visual Showcase */}
          <View style={styles.cardsShowcase}>
            {GIFT_COINS.map((coin, idx) => {
              const anim = cardAnims[idx];
              const isCenter = idx === 1;
              return (
                <Animated.View
                  key={coin.name}
                  style={[
                    styles.cardWrapper,
                    {
                      opacity: anim,
                      transform: [
                        { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.8, isCenter ? 1.04 : 1] }) },
                        { translateY: floatOffsetY },
                      ],
                    },
                  ]}
                >
                  <LinearGradient
                    colors={coin.bgColors}
                    style={[styles.card, { borderColor: coin.borderColor }]}
                  >
                    <View style={styles.freePill}>
                      <Text style={styles.freePillText}>GIFT • €0</Text>
                    </View>

                    <Image
                      source={coin.source}
                      style={styles.coinImage}
                      contentFit="contain"
                    />

                    <Text style={[styles.cardLevelText, { color: coin.color }]}>
                      {coin.name}
                    </Text>

                    <View style={styles.priceBadge}>
                      <Text style={styles.strikePriceText}>{coin.price}</Text>
                      <Text style={styles.freeLabelText}>FREE</Text>
                    </View>
                  </LinearGradient>
                </Animated.View>
              );
            })}
          </View>

          <View style={styles.footer}>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="shield-lock-outline" size={18} color="#05D38E" />
              <Text style={styles.infoText}>
                Stake 1 coin per commitment. Hit your daily target to keep your coin in the Vault—only replace a coin if you lose it in a challenge.
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleClaimPress}
              style={styles.claimButton}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#8B5CF6', '#6366F1']}
                style={styles.claimGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialCommunityIcons name="gift-open-outline" size={18} color="#FFFFFF" />
                <Text style={styles.claimText}>CLAIM 3 FREE GIFT COINS</Text>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: SCREEN_WIDTH * 0.92,
    backgroundColor: '#07080E',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    paddingBottom: 24,
    alignItems: 'center',
  },
  glowHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 180,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 28,
    marginBottom: 14,
  },
  giftIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(251, 191, 36, 0.14)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.35)',
  },
  noPaymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(5, 211, 142, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(5, 211, 142, 0.35)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 10,
  },
  noPaymentBadgeText: {
    color: '#05D38E',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 1.2,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
  },
  cardsShowcase: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 16,
    gap: 10,
    marginVertical: 10,
  },
  cardWrapper: {
    flex: 1,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  freePill: {
    backgroundColor: 'rgba(5, 211, 142, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(5, 211, 142, 0.45)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginBottom: 6,
  },
  freePillText: {
    color: '#05D38E',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  coinImage: {
    width: 68,
    height: 68,
    marginVertical: 4,
  },
  cardLevelText: {
    fontSize: 10,
    fontWeight: '800',
    marginTop: 4,
    letterSpacing: 0.6,
    textAlign: 'center',
  },
  priceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  strikePriceText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textDecorationLine: 'line-through',
  },
  freeLabelText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#05D38E',
  },
  footer: {
    width: '100%',
    paddingHorizontal: 20,
    marginTop: 14,
    alignItems: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 11,
    color: '#94A3B8',
    lineHeight: 15,
  },
  claimButton: {
    width: '100%',
    height: 50,
    borderRadius: 12,
    overflow: 'hidden',
  },
  claimGradient: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  claimText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
});
