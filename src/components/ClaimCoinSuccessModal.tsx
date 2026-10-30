import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions, Animated, Easing } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface ClaimCoinSuccessModalProps {
  visible: boolean;
  onClaim: () => void;
  coinType?: 'Bronze' | 'Silver' | 'Gold' | 'Pass';
}

const { width } = Dimensions.get('window');

export default function ClaimCoinSuccessModal({ visible, onClaim, coinType = 'Bronze' }: ClaimCoinSuccessModalProps) {
  const scaleAnim = new Animated.Value(0);
  const rotateAnim = new Animated.Value(0);
  const opacityAnim = new Animated.Value(0);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.loop(
          Animated.timing(rotateAnim, {
            toValue: 1,
            duration: 6000,
            easing: Easing.linear,
            useNativeDriver: true,
          })
        )
      ]).start();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      scaleAnim.setValue(0);
      rotateAnim.setValue(0);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  if (!visible) return null;

  const isBronze = coinType === 'Bronze';
  const isSilver = coinType === 'Silver';
  const isGold = coinType === 'Gold';

  const coinColor = isBronze ? '#CD7F32' : isSilver ? '#BDC3C7' : isGold ? '#FBBF24' : '#94A3B8';
  const coinIconName = isBronze ? 'shield' : isSilver ? 'medal' : isGold ? 'crown' : 'ticket-confirmation';
  const coinColors = isBronze ? ['#4A2E1B', '#2A170C'] : isSilver ? ['#2D3748', '#1A202C'] : isGold ? ['#3B2C1A', '#1F150C'] : ['#1E293B', '#0F172A'];

  return (
    <Modal visible={visible} transparent animationType="fade">
      <BlurView intensity={60} tint="dark" style={styles.container}>
        <Animated.View style={[styles.modalContent, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}>
          <LinearGradient
            colors={['#1A1D2D', '#0F111A']}
            style={styles.gradientBg}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          >
            {/* Glossy Glow Effect Behind Coin */}
            <Animated.View style={[styles.glowRing, { borderColor: coinColor, transform: [{ rotate: spin }] }]} />
            <Animated.View style={[styles.glowRing2, { borderColor: coinColor, transform: [{ rotate: spin }] }]} />
            
            <View style={[styles.coinContainer, { shadowColor: coinColor }]}>
              <LinearGradient
                colors={coinColors}
                style={styles.coinGradient}
                start={{ x: 0.1, y: 0.1 }}
                end={{ x: 0.9, y: 0.9 }}
              >
                <View style={styles.coinGlossyOverlay} />
                <MaterialCommunityIcons 
                  name={coinIconName as any} 
                  size={48} 
                  color={coinColor} 
                />
              </LinearGradient>
            </View>

            <View style={styles.textContainer}>
              <Text style={styles.titleText}>Victory!</Text>
              <Text style={styles.subtitleText}>
                Your discipline has brought your {coinType} coin back to your vault. Keep this momentum going for your next commitment!
              </Text>
            </View>

            <TouchableOpacity 
              style={styles.claimButton} 
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                onClaim();
              }}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#05D38E', '#02B377']}
                style={styles.claimButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <MaterialCommunityIcons name="treasure-chest" size={20} color="#FFFFFF" />
                <Text style={styles.claimButtonText}>Collect Reward</Text>
              </LinearGradient>
            </TouchableOpacity>

          </LinearGradient>
        </Animated.View>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContent: {
    width: width * 0.85,
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  gradientBg: {
    padding: 32,
    alignItems: 'center',
  },
  glowRing: {
    position: 'absolute',
    top: 30,
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderStyle: 'dashed',
    opacity: 0.3,
  },
  glowRing2: {
    position: 'absolute',
    top: 20,
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1,
    borderStyle: 'dotted',
    opacity: 0.15,
  },
  coinContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    elevation: 20,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    marginBottom: 24,
    marginTop: 16,
  },
  coinGradient: {
    flex: 1,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
  },
  coinGlossyOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  titleText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 12,
    letterSpacing: 1,
  },
  subtitleText: {
    color: '#94A3B8',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  claimButton: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#05D38E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  claimButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 8,
  },
  claimButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
