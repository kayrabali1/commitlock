import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  useColorScheme,
  Modal,
  ActivityIndicator,
  Dimensions,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';

import { Colors, Fonts, Spacing } from '@/constants/theme';
import { useAuth } from '@/services/auth';
import { HealthDataService } from '@/services/health';

interface AppHeaderProps {
  showProfile?: boolean;
}

export const BASE_HEADER_HEIGHT = 56;

export default function AppHeader({ showProfile = true }: AppHeaderProps) {
  const router = useRouter();
  const { user, purchasePasses } = useAuth();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors.dark; // The app uses a dark cosmic void aesthetic permanently

  const [isVaultVisible, setIsVaultVisible] = useState(false);
  const [selectedBuyCoin, setSelectedBuyCoin] = useState<{
    amount: number;
    title: string;
    tier: 'bronze' | 'silver' | 'gold';
    accent: string;
    source: any;
  } | null>(null);
  const [buyStep, setBuyStep] = useState<'idle' | 'processing' | 'success'>('idle');

  const [activeCoins, setActiveCoins] = useState<{ bronze: boolean; silver: boolean; gold: boolean }>({
    bronze: false,
    silver: false,
    gold: false,
  });
  const [isLoadingStakes, setIsLoadingStakes] = useState(false);

  // Fetch active commitments to determine coin states
  const fetchActiveStakes = async () => {
    setIsLoadingStakes(true);
    try {
      const activeList = await HealthDataService.getActiveCommitments();
      
      const hasBronze = activeList.some(c => c.stakeAmount === 1.99 || c.stakeAmount === 5);
      const hasSilver = activeList.some(c => c.stakeAmount === 4.99 || c.stakeAmount === 10);
      const hasGold = activeList.some(c => c.stakeAmount === 9.99 || c.stakeAmount === 20);

      setActiveCoins({
        bronze: hasBronze,
        silver: hasSilver,
        gold: hasGold,
      });
    } catch (err) {
      console.warn('Failed to load active commitments for vault popup:', err);
    } finally {
      setIsLoadingStakes(false);
    }
  };

  useEffect(() => {
    fetchActiveStakes();
    if (isVaultVisible) {
      fetchActiveStakes();
    }
  }, [isVaultVisible]);

  const availablePasses = user?.passes ?? 0;

  const toggleVaultModal = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsVaultVisible(!isVaultVisible);
  };

  const handleProfilePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/settings');
  };

  const HeaderContent = (
    <View style={styles.innerContainer}>
      {/* Brand logo & name */}
      <View style={styles.brandContainer}>
        <View style={[styles.logoFrame, { borderColor: colors.border }]}>
          <Image
            source={require('@/assets/images/icon.png')}
            style={styles.logoImage}
            contentFit="cover"
            transition={200}
          />
        </View>
        <Text style={[styles.brandText, { color: colors.text }]}>
          Commit<Text style={{ color: colors.primary }}>Lock</Text>
        </Text>
      </View>

      {/* User profile avatar & passes pill */}
      {showProfile && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity
            style={styles.passesPill}
            onPress={toggleVaultModal}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="safe" size={16} color="#FBBF24" />
            <Text style={[styles.passesText, { color: colors.text }]}>
              {availablePasses}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleProfilePress}
            style={styles.avatarButton}
          >
            <LinearGradient
              colors={['#7C3AED', '#4F46E5']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatarGradientRing}
            >
              <View style={[styles.avatarGap, { backgroundColor: colors.background }]}>
                {user?.avatar ? (
                  <Image
                    source={{ uri: user.avatar }}
                    style={styles.avatarImage}
                    contentFit="cover"
                    transition={200}
                  />
                ) : (
                  <View style={[styles.avatarFallback, { backgroundColor: colors.backgroundSelected }]}>
                    <MaterialCommunityIcons name="account" size={18} color={colors.primary} />
                  </View>
                )}
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  // Define coin statuses based on state and user passes
  const getCoinStatus = (coinAmount: number) => {
    const isGold = coinAmount === 9.99;
    const isSilver = coinAmount === 4.99;
    const isBronze = coinAmount === 1.99;

    let inUse = false;
    if (isBronze) inUse = activeCoins.bronze;
    if (isSilver) inUse = activeCoins.silver;
    if (isGold) inUse = activeCoins.gold;

    if (inUse) return 'IN_USE';
    if (user) {
      if (isBronze && (user.bronzePasses ?? 0) > 0) return 'AVAILABLE';
      if (isSilver && (user.silverPasses ?? 0) > 0) return 'AVAILABLE';
      if (isGold && (user.goldPasses ?? 0) > 0) return 'AVAILABLE';
    }
    return 'LOST';
  };

  const confirmBuyCoin = async () => {
    if (!selectedBuyCoin) return;
    setBuyStep('processing');
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Simulate purchase latency
      await new Promise(resolve => setTimeout(resolve, 1500));

      if (purchasePasses) {
        await purchasePasses(1, selectedBuyCoin.tier);
      }

      setBuyStep('success');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await fetchActiveStakes();
    } catch (err) {
      console.error('Failed mock purchase:', err);
      setBuyStep('idle');
      Alert.alert('Purchase Failed', 'Failed to complete mock purchase.');
    }
  };

  const cancelBuyCoin = async () => {
    if (buyStep === 'processing') return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedBuyCoin(null);
    setBuyStep('idle');
    setIsVaultVisible(true);
  };

  const handleVaultCoinPress = (coinAmount: number, status: 'AVAILABLE' | 'IN_USE' | 'LOST') => {
    const coinLabel = coinAmount === 1.99 ? 'Bronze' : coinAmount === 4.99 ? 'Silver' : 'Gold';
    if (status === 'LOST') {
      const tier = coinAmount === 1.99 ? 'bronze' : coinAmount === 4.99 ? 'silver' : 'gold';
      const accent = coinAmount === 1.99 ? '#CD7F32' : coinAmount === 4.99 ? '#BDC3C7' : '#FBBF24';
      const source = coinAmount === 1.99 
        ? require('../../assets/images/bronze_coin.png') 
        : coinAmount === 4.99 
          ? require('../../assets/images/silver_coin.png') 
          : require('../../assets/images/gold_coin.png');
      
      setIsVaultVisible(false);
      setSelectedBuyCoin({
        amount: coinAmount,
        title: coinLabel,
        tier,
        accent,
        source
      });
      setBuyStep('idle');
    } else if (status === 'IN_USE') {
      Alert.alert(
        'Coin in Use',
        `Your ${coinLabel} Coin is secured in an active commitment. Meet your daily targets to complete the challenge and recover it!`
      );
    } else {
      Alert.alert(
        'Available for Use',
        `Your ${coinLabel} Coin is ready to forge! Go to the Forge screen, adjust your settings, and drag the coin to lock a new commitment.`
      );
    }
  };

  const VaultModal = (
    <Modal
      visible={isVaultVisible}
      transparent
      animationType="fade"
      onRequestClose={toggleVaultModal}
    >
      <View style={styles.modalOverlay}>
        <BlurView intensity={100} tint="dark" style={StyleSheet.absoluteFill}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={toggleVaultModal} />
        </BlurView>
        
        <View style={styles.vaultContainer}>
          {/* Header */}
          <View style={styles.vaultHeader}>
            <View style={styles.vaultIconContainer}>
              <MaterialCommunityIcons name="safe" size={44} color="#FBBF24" />
            </View>
            <Text style={styles.vaultTitle}>Coin Vault</Text>
            <Text style={styles.vaultSubtitle}>Secure your habits in immutable steel</Text>
          </View>

          {isLoadingStakes ? (
            <ActivityIndicator size="large" color="#C084FC" style={{ marginVertical: 40 }} />
          ) : (
            <View style={styles.vaultCoinsWrapper}>
              {[
                { amount: 1.99, title: 'Bronze', accent: '#CD7F32', source: require('../../assets/images/bronze_coin.png') },
                { amount: 4.99, title: 'Silver', accent: '#BDC3C7', source: require('../../assets/images/silver_coin.png') },
                { amount: 9.99, title: 'Gold', accent: '#FBBF24', source: require('../../assets/images/gold_coin.png') }
              ].map(coin => {
                const status = getCoinStatus(coin.amount);
                const isLost = status === 'LOST';
                const isInUse = status === 'IN_USE';
                const isAvailable = status === 'AVAILABLE';
                
                return (
                  <TouchableOpacity
                    key={coin.title}
                    activeOpacity={0.85}
                    onPress={() => handleVaultCoinPress(coin.amount, status)}
                    style={[
                      styles.vaultCoinCard,
                      isLost && styles.vaultCoinCardLost,
                      isInUse && styles.vaultCoinCardInUse
                    ]}
                  >


                    {/* 3D Styled Coin inside Vault */}
                    <Animated.View 
                      style={[
                        styles.vaultCoinCircle, 
                        { shadowColor: coin.accent },
                        isAvailable && {
                          shadowColor: coin.accent,
                          shadowOpacity: 0.9,
                          shadowRadius: 16,
                          shadowOffset: { width: 0, height: 4 },
                          transform: [{ scale: 1.05 }]
                        },
                        isLost && { opacity: 0.15, shadowOpacity: 0 },
                        isInUse && { opacity: 0.65, shadowOpacity: 0.2 }
                      ]}
                    >
                      <Image
                        source={coin.source}
                        style={{ width: 88, height: 88 }}
                        contentFit="contain"
                      />
                      {isAvailable && (
                        <LinearGradient
                          colors={['rgba(255, 255, 255, 0.45)', 'rgba(255, 255, 255, 0.05)', 'transparent']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={[styles.vaultCoinGlossyGlassOverlay, { borderColor: coin.accent }]}
                        />
                      )}
                    </Animated.View>

                    {/* Text Details */}
                    <Text style={[styles.vaultCoinTitle, isLost && { color: '#475569' }]}>
                      {coin.title}
                    </Text>

                    {/* Status Badge */}
                    {isAvailable && (
                      <View style={[styles.vaultBadge, styles.badgeAvailable]}>
                        <Text style={styles.badgeTextAvailable}>AVAILABLE</Text>
                      </View>
                    )}
                    {isInUse && (
                      <View style={[styles.vaultBadge, styles.badgeInUse]}>
                        <Text style={styles.badgeTextInUse}>IN USE</Text>
                      </View>
                    )}
                    {isLost && (
                      <View style={[styles.vaultBadge, styles.badgeLost]}>
                        <Text style={styles.badgeTextLost}>LOST</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* User passes footer info */}
          <View style={styles.vaultPassesInfo}>
            <MaterialCommunityIcons name="ticket-confirmation-outline" size={16} color="#C084FC" />
            <Text style={styles.vaultPassesInfoText}>
              Available Passes: <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>{availablePasses}</Text>
            </Text>
          </View>

          {/* Footer Actions */}
          <View style={styles.vaultFooter}>
            <TouchableOpacity style={styles.vaultCloseBtn} onPress={toggleVaultModal}>
              <Text style={styles.vaultCloseBtnText}>Close Vault</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const BuyCoinModal = (
    <Modal
      visible={selectedBuyCoin !== null}
      transparent
      animationType="fade"
      onRequestClose={cancelBuyCoin}
    >
      <View style={[styles.modalOverlay, buyStep === 'success' && { justifyContent: 'center' }]}>
        <TouchableOpacity 
          style={StyleSheet.absoluteFill} 
          activeOpacity={1} 
          onPress={cancelBuyCoin} 
        />
        {selectedBuyCoin && (
          buyStep === 'success' ? (
            <BlurView tint="dark" intensity={120} style={styles.successCard}>
              <View style={[styles.successGlowHalo, { backgroundColor: selectedBuyCoin.accent, opacity: 0.15 }]} />
              
              <View style={styles.successCoinContainer}>
                <Image
                  source={selectedBuyCoin.source}
                  style={styles.successCoinImage}
                  contentFit="contain"
                />
                <LinearGradient
                  colors={['rgba(255, 255, 255, 0.45)', 'rgba(255, 255, 255, 0.05)', 'transparent']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.successCoinGlassOverlay}
                />
              </View>

              <View style={styles.successBadge}>
                <MaterialCommunityIcons name="check-decagram" size={24} color="#05D38E" />
              </View>

              <Text style={styles.successCongratsTitle}>UNLOCKED</Text>
              <Text style={styles.successCongratsSubtitle}>
                {selectedBuyCoin.title} Token
              </Text>
              
              <Text style={styles.successCongratsDesc}>
                Your Accountability Token is now secured. Go to the Forge screen to adjust your settings and lock a new commitment.
              </Text>

              <TouchableOpacity
                onPress={async () => {
                  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedBuyCoin(null);
                  setBuyStep('idle');
                  setIsVaultVisible(true);
                }}
                style={[styles.successCongratsBtn, { shadowColor: selectedBuyCoin.accent }]}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#7C3AED', '#4F46E5']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <Text style={styles.successCongratsBtnText}>AWESOME</Text>
              </TouchableOpacity>
            </BlurView>
          ) : (
            <BlurView tint="dark" intensity={120} style={styles.iapSheetContent}>
              {buyStep === 'idle' ? (
                Platform.OS === 'ios' ? (
                  // iOS Apple App Store sheet
                  <View style={styles.iapSheetBody}>
                    <View style={styles.iapAppleHeader}>
                      <View style={styles.iapAppleLogoBg}>
                        <MaterialCommunityIcons name="apple" size={16} color="#000000" />
                      </View>
                      <Text style={styles.iapAppleHeaderTitle}>App Store</Text>
                    </View>

                    <View style={styles.iapProductRow}>
                      <View style={[styles.iapProductIcon, { backgroundColor: '#1E1B4B', borderColor: '#4338CA' }]}>
                        <MaterialCommunityIcons 
                          name={selectedBuyCoin.tier === 'bronze' ? 'shield' : selectedBuyCoin.tier === 'silver' ? 'medal' : 'crown'} 
                          size={24} 
                          color={selectedBuyCoin.accent} 
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.iapProductName}>CommitLock</Text>
                        <Text style={styles.iapProductSubtitle}>
                          1 {selectedBuyCoin.title} Coin
                        </Text>
                        <Text style={styles.iapProductDev}>HabitContract LLC</Text>
                      </View>
                    </View>

                    <View style={styles.iapDivider} />

                    <View style={styles.iapDetailRow}>
                      <Text style={styles.iapDetailLabel}>ACCOUNT</Text>
                      <Text style={styles.iapDetailValue} numberOfLines={1}>
                        {user?.email || 'apple-id@habitcontract.com'}
                      </Text>
                    </View>

                    <View style={styles.iapDivider} />

                    <View style={styles.iapDetailRow}>
                      <Text style={styles.iapDetailLabel}>PRICE</Text>
                      <Text style={styles.iapPriceValue}>€{selectedBuyCoin.amount}</Text>
                    </View>

                    <View style={styles.iapDivider} />

                    <TouchableOpacity 
                      onPress={confirmBuyCoin} 
                      style={styles.iapApplePayBtn} 
                      activeOpacity={0.8}
                    >
                      <MaterialCommunityIcons name="face-recognition" size={28} color="#FFFFFF" style={{ marginRight: 8 }} />
                      <Text style={styles.iapApplePayBtnText}>Double Click or Tap to Confirm</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  // Android Google Play Store sheet
                  <View style={styles.iapSheetBody}>
                    <View style={styles.iapGoogleHeader}>
                      <MaterialCommunityIcons name="google-play" size={16} color="#0F9D58" style={{ marginRight: 6 }} />
                      <Text style={styles.iapGoogleHeaderTitle}>Google Play</Text>
                    </View>

                    <View style={styles.iapProductRow}>
                      <View style={[styles.iapProductIcon, { backgroundColor: '#111827', borderColor: '#1F2937' }]}>
                        <MaterialCommunityIcons 
                          name={selectedBuyCoin.tier === 'bronze' ? 'shield' : selectedBuyCoin.tier === 'silver' ? 'medal' : 'crown'} 
                          size={24} 
                          color={selectedBuyCoin.accent} 
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.iapProductName}>
                          {selectedBuyCoin.title} Coin
                        </Text>
                        <Text style={styles.iapProductSubtitle}>CommitLock App Store</Text>
                        <Text style={styles.iapProductDev}>HabitContract LLC</Text>
                      </View>
                    </View>

                    <View style={styles.iapDivider} />

                    <View style={styles.iapDetailRow}>
                      <Text style={styles.iapDetailLabel}>GOOGLE ACCOUNT</Text>
                      <Text style={styles.iapDetailValue} numberOfLines={1}>
                        {user?.email || 'google-play@gmail.com'}
                      </Text>
                    </View>

                    <View style={styles.iapDivider} />

                    <View style={styles.iapDetailRow}>
                      <Text style={styles.iapDetailLabel}>PRICE</Text>
                      <Text style={styles.iapPriceValue}>€{selectedBuyCoin.amount}</Text>
                    </View>

                    <View style={styles.iapDivider} />

                    <TouchableOpacity 
                      onPress={confirmBuyCoin} 
                      style={styles.iapGooglePayBtn} 
                      activeOpacity={0.9}
                    >
                      <Text style={styles.iapGooglePayBtnText}>1-TAP BUY</Text>
                    </TouchableOpacity>
                  </View>
                )
              ) : (
                <View style={styles.iapSheetCenterBody}>
                  <ActivityIndicator size="large" color="#A855F7" />
                  <Text style={styles.processingText}>
                    Processing App Store purchase...
                  </Text>
                </View>
              )}
            </BlurView>
          )
        )}
      </View>
    </Modal>
  );

  const bottomBorderColor = colorScheme === 'light' 
    ? 'rgba(0, 0, 0, 0.05)' 
    : 'rgba(255, 255, 255, 0.06)';

  if (Platform.OS === 'ios') {
    return (
      <>
        <BlurView
          intensity={90}
          tint={colorScheme === 'light' ? 'light' : 'dark'}
          style={[
            styles.container, 
            { 
              height: BASE_HEADER_HEIGHT + insets.top,
              paddingTop: insets.top,
              borderBottomColor: bottomBorderColor,
            }
          ]}
        >
          {HeaderContent}
        </BlurView>
        {VaultModal}
        {BuyCoinModal}
      </>
    );
  }

  // Android & Web fallback: slightly lighter translucent dark to mimic iOS blur
  const translucentBg = 'rgba(24, 26, 33, 0.88)';

  return (
    <>
      <View style={[
        styles.container, 
        { 
          height: BASE_HEADER_HEIGHT + insets.top,
          paddingTop: insets.top,
          backgroundColor: translucentBg,
          borderBottomColor: bottomBorderColor,
        }
      ]}>
        {HeaderContent}
      </View>
      {VaultModal}
      {BuyCoinModal}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    borderBottomWidth: 0.5,
  },
  innerContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoFrame: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    padding: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  logoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  brandText: {
    fontSize: 20,
    fontWeight: '800',
    fontFamily: Fonts.sans,
    letterSpacing: -0.6,
  },
  avatarButton: {
    justifyContent: 'center',
    alignItems: 'center',
    // Glow effect
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarGradientRing: {
    width: 38,
    height: 38,
    borderRadius: 19,
    padding: 1.2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarGap: {
    width: 35.6,
    height: 35.6,
    borderRadius: 17.8,
    padding: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 32.6,
    height: 32.6,
    borderRadius: 16.3,
  },
  avatarFallback: {
    width: 32.6,
    height: 32.6,
    borderRadius: 16.3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  passesPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.3)',
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 10,
    gap: 4,
  },
  passesIcon: {
    fontSize: 14,
  },
  passesText: {
    fontSize: 13,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  vaultContainer: {
    width: '90%',
    backgroundColor: '#0A0A0E',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(192, 132, 252, 0.25)',
    padding: Spacing.four,
    alignItems: 'center',
    // shadow glow
    shadowColor: '#C084FC',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 8,
  },
  vaultHeader: {
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
  vaultIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(251, 191, 36, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    // pulse glow
    shadowColor: '#FBBF24',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  vaultTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: Fonts.sans,
    textAlign: 'center',
    marginBottom: 4,
  },
  vaultSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
  },
  vaultCoinsWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginVertical: Spacing.four,
    gap: 10,
  },
  vaultCoinCard: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    position: 'relative',
  },
  vaultCoinCardLost: {},
  vaultCoinCardInUse: {},

  vaultCoinCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    // soft 3D shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 8,
  },
  vaultCoinGlossyGlassOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 44,
    borderWidth: 2.5,
    overflow: 'hidden',
  },
  vaultCoinGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  vaultCoinGlossy: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  vaultCoinInnerRing: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
  },
  vaultCoinTitle: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: Fonts.sans,
    marginBottom: 6,
  },
  vaultBadge: {
    paddingVertical: 2.5,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgeAvailable: {
    borderColor: 'rgba(34, 197, 94, 0.3)',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  badgeInUse: {
    borderColor: 'rgba(245, 158, 11, 0.3)',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  badgeLost: {
    borderColor: 'rgba(239, 68, 68, 0.3)',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  badgeTextAvailable: {
    color: '#4ADE80',
    fontSize: 7.5,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  badgeTextInUse: {
    color: '#FBBF24',
    fontSize: 7.5,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  badgeTextLost: {
    color: '#F87171',
    fontSize: 7.5,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  lostTapPrompt: {
    color: '#F87171',
    fontSize: 8,
    fontWeight: 'bold',
    marginTop: 4,
    textDecorationLine: 'underline',
  },
  vaultPassesInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.two,
    marginBottom: Spacing.four,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(192, 132, 252, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(192, 132, 252, 0.1)',
  },
  vaultPassesInfoText: {
    color: '#94A3B8',
    fontSize: 12.5,
  },
  vaultFooter: {
    width: '100%',
    alignItems: 'stretch',
  },
  vaultCloseBtn: {
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
  },
  vaultCloseBtnText: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: 'bold',
  },
  iapSheetContent: {
    width: '100%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: 'rgba(10, 10, 14, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderBottomWidth: 0,
    marginTop: 'auto',
  },
  iapSheetBody: {
    padding: Spacing.four,
    width: '100%',
    backgroundColor: '#000000',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  iapAppleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.four,
    gap: 8,
  },
  iapAppleLogoBg: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iapAppleHeaderTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  iapGoogleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
  iapGoogleHeaderTitle: {
    color: '#E4E4E7',
    fontSize: 15,
    fontWeight: '600',
  },
  iapProductRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: Spacing.four,
  },
  iapProductIcon: {
    width: 52,
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iapProductName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  iapProductSubtitle: {
    color: '#E4E4E7',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 1,
  },
  iapProductDev: {
    color: '#71717A',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  iapDivider: {
    height: 1,
    backgroundColor: '#27272A',
    marginVertical: Spacing.two,
  },
  iapDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  iapDetailLabel: {
    color: '#71717A',
    fontSize: 11,
    fontWeight: 'bold',
  },
  iapDetailValue: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
    maxWidth: '70%',
  },
  iapPriceValue: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  iapApplePayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#18181B',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#3F3F46',
    paddingVertical: Spacing.three,
    marginTop: Spacing.four,
  },
  iapApplePayBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  iapGooglePayBtn: {
    backgroundColor: '#0F9D58',
    borderRadius: 8,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.four,
  },
  iapGooglePayBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  iapSheetCenterBody: {
    padding: Spacing.six,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  processingText: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: Spacing.four,
    textAlign: 'center',
  },
  successCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
  successText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  successCardContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  successCard: {
    width: '88%',
    maxWidth: 340,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    padding: Spacing.six,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
  },
  successGlowHalo: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    top: -50,
  },
  successCoinContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.three,
    position: 'relative',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  successCoinImage: {
    width: 120,
    height: 120,
  },
  successCoinGlassOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    overflow: 'hidden',
  },
  successBadge: {
    position: 'absolute',
    top: 106,
    right: '38%',
    zIndex: 10,
    backgroundColor: '#0F172A',
    borderRadius: 18,
    padding: 2,
  },
  successCongratsTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#05D38E',
    letterSpacing: 2,
    marginBottom: Spacing.one,
    textAlign: 'center',
  },
  successCongratsSubtitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: Spacing.three,
    textAlign: 'center',
  },
  successCongratsDesc: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: Spacing.six,
    paddingHorizontal: Spacing.two,
  },
  successCongratsBtn: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  successCongratsBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
});
