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
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface WelcomePassesModalProps {
  visible: boolean;
  onClaim: () => void;
}

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
      
      // Main container entry
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
        })
      ]).start(() => {
        // Staggered card entries
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
          })
        ]).start(() => {
          // Play continuous hover float animation
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
              })
            ])
          ).start();
        });
      });
    }
  }, [visible]);

  const handleClaimPress = async () => {
    // Premium claim haptics sequence
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), 100);
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), 250);

    // Fade out modal
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
      })
    ]).start(() => {
      setShowContent(false);
      onClaim();
    });
  };

  if (!visible && !showContent) return null;

  // Float interpolations for cards
  const floatOffsetY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  });

  const renderCardCutouts = () => (
    <>
      <View style={[styles.cutout, styles.cutoutLeft]} />
      <View style={[styles.cutout, styles.cutoutRight]} />
      <View style={styles.dashLine} />
    </>
  );

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
            colors={['rgba(124, 58, 237, 0.15)', 'rgba(0, 0, 0, 0)']}
            style={styles.glowHeader}
          />

          <View style={styles.header}>
            <View style={styles.giftIconContainer}>
              <MaterialCommunityIcons name="gift" size={32} color="#A78BFA" />
            </View>
            <Text style={styles.title}>WELCOME GIFT ACTIVATED</Text>
            <Text style={styles.subtitle}>
              Your journey to build life-changing habits starts now. We've credited your profile with 3 Premium Challenge Passes!
            </Text>
          </View>

          {/* Cards Showcase Showcase Area */}
          <View style={styles.cardsShowcase}>
            
            {/* €1.99 Pass - Bronze Theme */}
            <Animated.View
              style={[
                styles.cardWrapper,
                {
                  opacity: card1Anim,
                  transform: [
                    { scale: card1Anim },
                    { rotate: '-6deg' },
                    { translateX: -15 },
                    { translateY: Animated.add(floatOffsetY, new Animated.Value(10)) },
                  ],
                },
              ]}
            >
              <LinearGradient
                colors={['#1E152A', '#130C1E']}
                style={[styles.card, { borderColor: 'rgba(167, 139, 250, 0.4)' }]}
              >
                {renderCardCutouts()}
                <MaterialCommunityIcons name="shield" size={24} color="#CD7F32" style={styles.cardIcon} />
                <Text style={[styles.cardValueText, { color: '#CD7F32', fontSize: 26 }]}>€1.99</Text>
                <Text style={styles.cardLevelText}>BRONZE PASS</Text>
              </LinearGradient>
            </Animated.View>

            {/* €4.99 Pass - Silver Theme (Centered, higher zIndex) */}
            <Animated.View
              style={[
                styles.cardWrapper,
                {
                  zIndex: 10,
                  elevation: 10,
                  opacity: card2Anim,
                  transform: [
                    { scale: card2Anim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.1] }) },
                    { rotate: '0deg' },
                    { translateY: floatOffsetY },
                  ],
                },
              ]}
            >
              <LinearGradient
                colors={['#1A253C', '#0E1726']}
                style={[styles.card, { borderColor: 'rgba(189, 195, 199, 0.5)' }]}
              >
                {renderCardCutouts()}
                <MaterialCommunityIcons name="medal" size={26} color="#BDC3C7" style={styles.cardIcon} />
                <Text style={[styles.cardValueText, { color: '#BDC3C7', fontSize: 32 }]}>€4.99</Text>
                <Text style={[styles.cardLevelText, { color: '#BDC3C7' }]}>SILVER PASS</Text>
              </LinearGradient>
            </Animated.View>

            {/* €9.99 Pass - Gold Theme */}
            <Animated.View
              style={[
                styles.cardWrapper,
                {
                  opacity: card3Anim,
                  transform: [
                    { scale: card3Anim },
                    { rotate: '6deg' },
                    { translateX: 15 },
                    { translateY: Animated.add(floatOffsetY, new Animated.Value(10)) },
                  ],
                },
              ]}
            >
              <LinearGradient
                colors={['#2D231E', '#1C130D']}
                style={[styles.card, { borderColor: 'rgba(251, 191, 36, 0.4)' }]}
              >
                {renderCardCutouts()}
                <MaterialCommunityIcons name="crown" size={24} color="#FBBF24" style={styles.cardIcon} />
                <Text style={[styles.cardValueText, { color: '#FBBF24', fontSize: 26 }]}>€9.99</Text>
                <Text style={styles.cardLevelText}>GOLD PASS</Text>
              </LinearGradient>
            </Animated.View>

          </View>

          <View style={styles.footer}>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="shield-lock-outline" size={16} color="#94A3B8" />
              <Text style={styles.infoText}>
                Use them as accountability stakes. Succeed and keep your pass. Fail and the pass is lost.
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
                <Text style={styles.claimText}>CLAIM CHALLENGE PASSES</Text>
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
    width: SCREEN_WIDTH * 0.9,
    backgroundColor: '#07080E',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
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
    paddingHorizontal: 24,
    paddingTop: 32,
    marginBottom: 20,
  },
  giftIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.3)',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 1.5,
    textAlign: 'center',
    marginBottom: 10,
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
    justifyContent: 'center',
    height: 180,
    width: '100%',
    marginVertical: 12,
  },
  cardWrapper: {
    width: 100,
    height: 140,
    position: 'absolute',
  },
  card: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  cardIcon: {
    marginBottom: 6,
  },
  cardValueText: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
  },
  cardLevelText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#94A3B8',
    marginTop: 4,
    letterSpacing: 1,
  },
  cutout: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#07080E',
    top: '55%',
  },
  cutoutLeft: {
    left: -7,
  },
  cutoutRight: {
    right: -7,
  },
  dashLine: {
    position: 'absolute',
    left: 10,
    right: 10,
    top: '60%',
    height: 1,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderStyle: 'dashed',
  },
  footer: {
    width: '100%',
    paddingHorizontal: 24,
    marginTop: 20,
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
    borderColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 20,
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
    gap: 6,
  },
  claimText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
});
