import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Modal,
  ActivityIndicator,
  Platform,
  Alert,
  PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import Animated, { 
  FadeIn,
  FadeOut,
  ZoomIn, 
  ZoomOut, 
  useSharedValue,
  SharedValue,
  withRepeat,
  withTiming,
  withSequence,
  useAnimatedStyle,
  withSpring,
  Easing,
  useAnimatedScrollHandler,
  interpolate,
  Extrapolation,
  interpolateColor,
  useAnimatedRef,
} from 'react-native-reanimated';

import { useTranslation } from 'react-i18next';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { HealthDataService, MetricType } from '@/services/health';
import AppHeader, { BASE_HEADER_HEIGHT } from '@/components/AppHeader';
import { Image } from 'expo-image';
import { useAuth } from '@/services/auth';

const { width, height } = Dimensions.get('window');

interface AnimatedPassCoinProps {
  amount: number;
  isSelected: boolean;
  isAvailable: boolean;
  isLocked: boolean;
  panHandlers: any;
  dragX: SharedValue<number>;
  dragY: SharedValue<number>;
  isDragging: SharedValue<boolean>;
  bob: SharedValue<number>;
  themeColors: string[];
  accentColor: string;
  cardIcon: string;
  passTitle: string;
  onPress: () => void;
}

function AnimatedPassCoin({
  amount,
  isSelected,
  isAvailable,
  isLocked,
  panHandlers,
  dragX,
  dragY,
  isDragging,
  bob,
  themeColors,
  accentColor,
  cardIcon,
  passTitle,
  onPress,
}: AnimatedPassCoinProps) {
  // Glow effect for token when it is locked (showing IN USE)
  const lockedPulse = useSharedValue(0.4);
  useEffect(() => {
    if (isLocked) {
      lockedPulse.value = withRepeat(
        withSequence(
          withTiming(0.85, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.4, { duration: 1200, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    }
  }, [isLocked]);

  const lockedAuraStyle = useAnimatedStyle(() => {
    return {
      opacity: lockedPulse.value,
      transform: [{ scale: interpolate(lockedPulse.value, [0.4, 0.85], [1.0, 1.12]) }]
    };
  });

  const animatedCoinStyle = useAnimatedStyle(() => {
    if (!isAvailable) {
      return {
        transform: [{ translateY: 0 }],
        opacity: 0.25,
      };
    }
    
    return {
      transform: [
        { translateX: dragX.value },
        { translateY: dragY.value + bob.value },
        { scale: isDragging.value ? 1.25 : 1.0 },
      ],
      zIndex: isDragging.value ? 100 : 10,
    };
  });

  // Dynamic metallic glint shine (unused with static images but kept for hooks compatibility)
  const animatedShineStyle = useAnimatedStyle(() => {
    const shineTranslateX = interpolate(dragX.value, [-150, 150], [-40, 40], Extrapolation.CLAMP);
    return {
      transform: [{ translateX: shineTranslateX - 10 }],
    };
  });

  const borderGlowStyle = useAnimatedStyle(() => {
    return {
      borderColor: isDragging.value ? accentColor : 'transparent',
      shadowOpacity: isDragging.value ? 0.9 : 0.25,
      shadowRadius: isDragging.value ? 16 : 6,
    };
  });

  // If the coin is in use, render an empty slot placeholder with glowing aura (placed AFTER all hooks are declared)
  if (isLocked) {
    const auraRgb = accentColor === '#C084FC' ? '192,132,252' : accentColor === '#38BDF8' ? '56,189,248' : '251,191,36';
    return (
      <View style={styles.coinGridSlot}>
        <View style={styles.lockedCoinContainer}>
          <Animated.View style={[styles.lockedAura, { shadowColor: accentColor }, lockedAuraStyle]}>
            <LinearGradient
              colors={[`rgba(${auraRgb}, 0.25)`, `rgba(${auraRgb}, 0.05)`, 'transparent']}
              style={styles.auraGradient}
              start={{ x: 0.5, y: 0.5 }}
              end={{ x: 1, y: 1 }}
            />
          </Animated.View>
          <View style={[styles.coinBaseLocked, { borderColor: `rgba(${auraRgb}, 0.55)`, shadowColor: accentColor }]}>
            <LinearGradient
              colors={['rgba(15, 23, 42, 0.75)', 'rgba(30, 41, 59, 0.6)']}
              style={styles.coinGradientLocked}
              start={{ x: 0.1, y: 0.1 }}
              end={{ x: 0.9, y: 0.9 }}
            >
              <View style={[styles.coinInnerRing, { borderColor: `rgba(${auraRgb}, 0.2)` }]} />
              <MaterialCommunityIcons name="clock-outline" size={24} color={accentColor} style={styles.lockedCoinIcon} />
              <Text style={[styles.lockedPlaceholderCoinText, { color: accentColor }]}>IN USE</Text>
            </LinearGradient>
          </View>
        </View>
        <Text style={styles.coinTitleTextDisabled}>
          {passTitle}
        </Text>
      </View>
    );
  }

  // Load static transparent PNG coin images
  const coinSource = amount === 1.99
    ? require('../../assets/images/bronze_coin.png')
    : amount === 4.99
      ? require('../../assets/images/silver_coin.png')
      : require('../../assets/images/gold_coin.png');

  return (
    <View style={styles.coinGridSlot}>
      <TouchableOpacity 
        activeOpacity={0.9}
        onPress={() => {
          if (isAvailable && !isSelected) onPress();
        }}
        disabled={!isAvailable || isSelected}
        style={styles.touchableCoin}
      >
        <Animated.View 
          style={[
            styles.coinBase, 
            animatedCoinStyle, 
            borderGlowStyle, 
            { shadowColor: accentColor },
            isAvailable && {
              shadowColor: accentColor,
              shadowOpacity: 0.8,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 4 },
            }
          ]}
          {...(!isAvailable ? {} : panHandlers)}
        >
          <Image
            source={coinSource}
            style={{ width: '100%', height: '100%' }}
            contentFit="contain"
          />
          {isAvailable && (
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.45)', 'rgba(255, 255, 255, 0.05)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.coinGlossyGlassOverlay, { borderColor: accentColor }]}
            />
          )}
        </Animated.View>
      </TouchableOpacity>
      <Text style={isAvailable ? styles.coinTitleText : styles.coinTitleTextDisabled}>
        {passTitle}
      </Text>
    </View>
  );
}


// Subtle pulsing geometric grid background
function GridBackground() {
  const pulse = useSharedValue(0.25);
  
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(0.45, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.25, { duration: 3000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const gridStyle = useAnimatedStyle(() => {
    return {
      opacity: pulse.value,
    };
  });

  const columns = 8;
  const rows = 16;
  const colWidth = width / columns;
  const rowHeight = height / rows;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.gridContainer, gridStyle]} pointerEvents="none">
      {Array.from({ length: columns + 1 }).map((_, i) => (
        <View
          key={`col-${i}`}
          style={[
            styles.gridLineVertical,
            { left: i * colWidth }
          ]}
        />
      ))}
      {Array.from({ length: rows + 1 }).map((_, i) => (
        <View
          key={`row-${i}`}
          style={[
            styles.gridLineHorizontal,
            { top: i * rowHeight }
          ]}
        />
      ))}
    </Animated.View>
  );
}

// Rotating holographic wireframe mesh
function RotatingMesh() {
  const rotateVal = useSharedValue(0);
  useEffect(() => {
    rotateVal.value = withRepeat(
      withTiming(360, { duration: 25000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);
  
  const rotateStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotateVal.value}deg` }]
    };
  });

  return (
    <Animated.View style={[styles.rotatingMeshContainer, rotateStyle]} pointerEvents="none">
      <View style={styles.meshLine1} />
      <View style={styles.meshLine2} />
    </Animated.View>
  );
}

export default function CommitScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ buyPasses?: string; stake?: string; editId?: string; rolloverFrom?: string; rolloverStake?: string }>();
  const { user, lockPassValue, purchasePasses, refreshUser } = useAuth();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const [isPurchasing, setIsPurchasing] = useState(false);

  const handlePurchasePassesInline = async () => {
    setIsPurchasing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      if (purchasePasses) {
        await purchasePasses(3);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Purchase Successful', 'Added 3 Challenge Passes to your accountability balance.');
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to complete simulated purchase.');
    } finally {
      setIsPurchasing(false);
    }
  };

  const [metric, setMetric] = useState<MetricType | null>(null);
  const [targetValue, setTargetValue] = useState<number>(10000);
  const [durationDays, setDurationDays] = useState<number>(3);
  const [startDateChoice, setStartDateChoice] = useState<'today' | 'tomorrow'>('today');
  
  const [isPaymentSheetVisible, setIsPaymentSheetVisible] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'idle' | 'processing' | 'success'>('idle');
  const [isAnyCoinDragging, setIsAnyCoinDragging] = useState(false);

  // Scroll View Setup
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollX = useSharedValue(0);

  // New Shared Values for Premium Visuals
  const trackSweep = useSharedValue(-50);
  const continueScale = useSharedValue(1);
  const slotSweepX = useSharedValue(-150);

  const [activeStakeAmounts, setActiveStakeAmounts] = useState<number[]>([]);
  const [stake, setStake] = useState<number>(0);
  const needsPurchase = useMemo(() => {
    if (!user) return false;
    if (stake === 1.99) return (user.bronzePasses ?? 0) <= 0;
    if (stake === 4.99) return (user.silverPasses ?? 0) <= 0;
    if (stake === 9.99) return (user.goldPasses ?? 0) <= 0;
    return false;
  }, [user, stake]);
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  useEffect(() => {
    if (params?.buyPasses === 'true') {
      const stakeVal = params.stake ? parseFloat(params.stake) : 9.99;
      setStake(stakeVal);
      setIsPaymentSheetVisible(true);
      // Clean params so it doesn't trigger again on reload/navigation
      router.setParams({ buyPasses: undefined, stake: undefined });
    }
    
    if (params?.editId) {
      HealthDataService.getActiveCommitment(params.editId).then(commitment => {
        if (commitment) {
          setMetric(commitment.metricType);
          setTargetValue(commitment.targetValue);
          setDurationDays(commitment.durationDays);
          
          const stakeVal = commitment.stakeAmount === 5 ? 1.99 : commitment.stakeAmount === 10 ? 4.99 : commitment.stakeAmount === 20 ? 9.99 : commitment.stakeAmount;
          setStake(stakeVal);
          
          const today = HealthDataService.getTodayDateString();
          if (commitment.startDate === today) {
            setStartDateChoice('today');
          } else {
            setStartDateChoice('tomorrow');
          }
        }
      });
      // We keep editId in params to know we are editing when submitting
    }
  }, [params?.buyPasses, params?.stake, params?.editId]);

  // Focus effect for active stakes
  useFocusEffect(
    useCallback(() => {
      const loadPassesAndActiveStakes = async () => {
        try {
          if (refreshUser) {
            await refreshUser();
          }
          const activeList = await HealthDataService.getActiveCommitments();
          const activeStakes = activeList.map(c => {
            if (c.stakeAmount === 5) return 1.99;
            if (c.stakeAmount === 10) return 4.99;
            if (c.stakeAmount === 20) return 9.99;
            return c.stakeAmount;
          });
          setActiveStakeAmounts(activeStakes);
        } catch (e) {
          console.error(e);
        }
      };
      loadPassesAndActiveStakes();
    }, [])
  );
  
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const handleMomentumScrollEnd = (e: any) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    if (index > 0 && !metric) {
      scrollRef.current?.scrollTo({ x: 0, y: 0, animated: true });
      setActiveStepIndex(0);
      Alert.alert('Selection Required', 'Please select a habit metric to proceed.');
      return;
    }
    if (index !== activeStepIndex) {
      setActiveStepIndex(index);
      Haptics.selectionAsync();
    }
  };

  // Dynamic Background Glows
  const glowLeftStyle = useAnimatedStyle(() => {
    const page = scrollX.value / width;
    const translateX = interpolate(page, [0, 1, 2], [-50, 0, 50]);
    const translateY = interpolate(page, [0, 1, 2], [-30, 20, -60]);
    const scale = interpolate(page, [0, 1, 2], [1, 1.2, 0.9]);
    return {
      transform: [{ translateX }, { translateY }, { scale }],
      backgroundColor: interpolateColor(page, [0, 1, 2], ['rgba(124,58,237,0.3)', 'rgba(56,189,248,0.25)', 'rgba(236,72,153,0.2)']),
    };
  });

  const glowRightStyle = useAnimatedStyle(() => {
    const page = scrollX.value / width;
    const translateX = interpolate(page, [0, 1, 2], [50, -80, -20]);
    const translateY = interpolate(page, [0, 1, 2], [80, -40, 60]);
    return {
      transform: [{ translateX }, { translateY }],
      backgroundColor: interpolateColor(page, [0, 1, 2], ['rgba(236,72,153,0.15)', 'rgba(168,85,247,0.25)', 'rgba(5,211,142,0.15)']),
    };
  });

  // Reanimated values for vertical bobbing
  const bobBronze = useSharedValue(0);
  const bobSilver = useSharedValue(0);
  const bobGold = useSharedValue(0);

  const dragX5 = useSharedValue(0);
  const dragY5 = useSharedValue(0);
  const isDragging5 = useSharedValue(false);

  const dragX10 = useSharedValue(0);
  const dragY10 = useSharedValue(0);
  const isDragging10 = useSharedValue(false);

  const dragX20 = useSharedValue(0);
  const dragY20 = useSharedValue(0);
  const isDragging20 = useSharedValue(false);

  const socketScale = useSharedValue(1);
  const socketGlow = useSharedValue(0.15);
  const socketPulse = useSharedValue(0.4);

  // Expanding shockwave animation variables
  const shockwaveScale = useSharedValue(0.8);
  const shockwaveOpacity = useSharedValue(0);

  // Dual-layer Holographic sparkle rotation shared values
  const sparkleRotateClockwise = useSharedValue(0);
  const sparkleRotateCounterClockwise = useSharedValue(0);

  // Top-Level Animated Styles to comply with React Hooks rules
  const trackSweepStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: trackSweep.value }],
    };
  });

  const progressTrackFillStyle = useAnimatedStyle(() => {
    const progress = interpolate(scrollX.value, [0, width * 2], [0, 1], Extrapolation.CLAMP);
    return {
      width: `${progress * 100}%`
    };
  });

  const nodeStyle0 = useAnimatedStyle(() => {
    const activeVal = scrollX.value / width;
    const diff = Math.abs(activeVal - 0);
    const scale = interpolate(diff, [0, 1], [1.25, 0.95], Extrapolation.CLAMP);
    const shadowOpacity = interpolate(diff, [0, 1], [0.95, 0.1], Extrapolation.CLAMP);
    const shadowRadius = interpolate(diff, [0, 1], [14, 2], Extrapolation.CLAMP);
    return {
      transform: [{ scale }],
      borderColor: interpolateColor(
        activeVal,
        [-0.5, 0, 0.5],
        ['rgba(255,255,255,0.12)', 'rgba(168,85,247,0.9)', 'rgba(255,255,255,0.12)']
      ),
      backgroundColor: interpolateColor(
        activeVal,
        [-0.5, 0, 0.5],
        ['#090A0F', '#A855F7', '#090A0F']
      ),
      shadowColor: '#A855F7',
      shadowOpacity,
      shadowRadius,
    };
  });

  const nodeStyle1 = useAnimatedStyle(() => {
    const activeVal = scrollX.value / width;
    const diff = Math.abs(activeVal - 1);
    const scale = interpolate(diff, [0, 1], [1.25, 0.95], Extrapolation.CLAMP);
    const shadowOpacity = interpolate(diff, [0, 1], [0.95, 0.1], Extrapolation.CLAMP);
    const shadowRadius = interpolate(diff, [0, 1], [14, 2], Extrapolation.CLAMP);
    return {
      transform: [{ scale }],
      borderColor: interpolateColor(
        activeVal,
        [0.5, 1, 1.5],
        ['rgba(255,255,255,0.12)', 'rgba(99,102,241,0.9)', 'rgba(255,255,255,0.12)']
      ),
      backgroundColor: interpolateColor(
        activeVal,
        [0.5, 1, 1.5],
        ['#090A0F', '#6366F1', '#090A0F']
      ),
      shadowColor: '#6366F1',
      shadowOpacity,
      shadowRadius,
    };
  });

  const nodeStyle2 = useAnimatedStyle(() => {
    const activeVal = scrollX.value / width;
    const diff = Math.abs(activeVal - 2);
    const scale = interpolate(diff, [0, 1], [1.25, 0.95], Extrapolation.CLAMP);
    const shadowOpacity = interpolate(diff, [0, 1], [0.95, 0.1], Extrapolation.CLAMP);
    const shadowRadius = interpolate(diff, [0, 1], [14, 2], Extrapolation.CLAMP);
    return {
      transform: [{ scale }],
      borderColor: interpolateColor(
        activeVal,
        [1.5, 2, 2.5],
        ['rgba(255,255,255,0.12)', 'rgba(0,229,255,0.9)', 'rgba(255,255,255,0.12)']
      ),
      backgroundColor: interpolateColor(
        activeVal,
        [1.5, 2, 2.5],
        ['#090A0F', '#00E5FF', '#090A0F']
      ),
      shadowColor: '#00E5FF',
      shadowOpacity,
      shadowRadius,
    };
  });

  const bannerStyleStep1 = useAnimatedStyle(() => {
    const page = scrollX.value / width;
    const opacity = interpolate(page, [1 - 0.5, 1, 1 + 0.5], [0, 1, 0], Extrapolation.CLAMP);
    return { opacity };
  });

  const bannerStyleStep2 = useAnimatedStyle(() => {
    const page = scrollX.value / width;
    const opacity = interpolate(page, [2 - 0.5, 2, 2 + 0.5], [0, 1, 0], Extrapolation.CLAMP);
    return { opacity };
  });

  const metricInfo = useMemo(() => {
    switch (metric) {
      case 'steps': return { name: 'DAILY STEPS', icon: 'shoe-print', color: '#C084FC' };
      case 'run': return { name: 'RUN DISTANCE', icon: 'run', color: '#38BDF8' };
      case 'mindfulness': return { name: 'MINDFUL MOMENTS', icon: 'meditation', color: '#FBBF24' };
      default: return { name: 'ACTIVE', icon: 'heart', color: '#A855F7' };
    }
  }, [metric]);

  const cardScaleStyleSteps = useAnimatedStyle(() => {
    return {
      transform: [{ scale: withSpring(metric === 'steps' ? 1.025 : 1.0, { damping: 15 }) }]
    };
  });

  const cardScaleStyleRun = useAnimatedStyle(() => {
    return {
      transform: [{ scale: withSpring(metric === 'run' ? 1.025 : 1.0, { damping: 15 }) }]
    };
  });

  const cardScaleStyleMindfulness = useAnimatedStyle(() => {
    return {
      transform: [{ scale: withSpring(metric === 'mindfulness' ? 1.025 : 1.0, { damping: 15 }) }]
    };
  });

  const mechanicalSlotSweepStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: slotSweepX.value }]
    };
  });

  useEffect(() => {
    bobBronze.value = withRepeat(withSequence(withTiming(4, { duration: 1800, easing: Easing.inOut(Easing.ease) }), withTiming(-4, { duration: 1800, easing: Easing.inOut(Easing.ease) })), -1, true);
    bobSilver.value = withRepeat(withSequence(withTiming(-4, { duration: 2000, easing: Easing.inOut(Easing.ease) }), withTiming(4, { duration: 2000, easing: Easing.inOut(Easing.ease) })), -1, true);
    bobGold.value = withRepeat(withSequence(withTiming(3, { duration: 2200, easing: Easing.inOut(Easing.ease) }), withTiming(-5, { duration: 2200, easing: Easing.inOut(Easing.ease) })), -1, true);
    
    // Brighter & Stronger breathing pulse for high visual feedback
    socketPulse.value = withRepeat(
      withSequence(
        withTiming(0.85, { duration: 1400, easing: Easing.inOut(Easing.ease) }), 
        withTiming(0.15, { duration: 1400, easing: Easing.inOut(Easing.ease) })
      ), 
      -1, 
      true
    );

    // Dynamic rotation directions for the sparkle fire chimes
    sparkleRotateClockwise.value = withRepeat(
      withTiming(360, { duration: 2800, easing: Easing.linear }),
      -1,
      false
    );
    sparkleRotateCounterClockwise.value = withRepeat(
      withTiming(-360, { duration: 1800, easing: Easing.linear }),
      -1,
      false
    );

    trackSweep.value = withRepeat(
      withTiming(200, { duration: 1600, easing: Easing.linear }),
      -1,
      false
    );

    continueScale.value = withRepeat(
      withSequence(
        withTiming(1.03, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.0, { duration: 1200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    slotSweepX.value = withRepeat(
      withTiming(320, { duration: 2200, easing: Easing.inOut(Easing.quad) }),
      -1,
      false
    );
  }, []);

  // Soft breathing style for dragging target space
  const breathingSocketStyle = useAnimatedStyle(() => {
    const scale = interpolate(socketPulse.value, [0.15, 0.85], [0.93, 1.07]);
    const opacity = interpolate(socketPulse.value, [0.15, 0.85], [0.25, 0.65]);
    return {
      transform: [{ scale: socketScale.value * scale }],
      borderColor: `rgba(168, 85, 247, ${socketGlow.value + opacity})`,
      backgroundColor: `rgba(168, 85, 247, ${socketGlow.value * 0.15})`,
      shadowOpacity: opacity * 0.7,
      shadowRadius: scale * 12,
    };
  });

  const animatedGlowStyle = useAnimatedStyle(() => {
    return {
      opacity: socketPulse.value * socketGlow.value * 0.8,
      transform: [{ scale: 1.15 }]
    };
  });

  // Premium lock expanding ring animation style
  const shockwaveStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: shockwaveScale.value }],
      opacity: shockwaveOpacity.value,
    };
  });

  // Double-layer sparkle fire rotation styles
  const animatedSparkleClockwiseStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${sparkleRotateClockwise.value}deg` }],
    };
  });

  const animatedSparkleCounterClockwiseStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${sparkleRotateCounterClockwise.value}deg` }],
    };
  });

  // Plays a success UI audio chime using local assets
  const playChimeSound = async () => {
    try {
      /*
      // expo-av is unmaintained and causes crashes on Expo 56.
      // TODO: Migrate to expo-audio
      const { NativeModules } = require('react-native');
      const isAVSupported = !!NativeModules.ExponentAV || !!(global as any).ExpoModules?.ExponentAV;
      if (!isAVSupported) {
        console.log('[CommitScreen] ExponentAV native module not compiled yet. Skipping sound play.');
        return;
      }
      const { Audio } = require('expo-av');
      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/success.mp3')
      );
      await sound.playAsync();
      */
    } catch (e) {
      console.warn('Audio feedback failed to load:', e);
    }
  };

  // Triggers premium particle expanding shockwave
  const triggerPremiumLockEffect = () => {
    shockwaveScale.value = 0.7;
    shockwaveOpacity.value = 1.0;
    shockwaveScale.value = withTiming(2.4, { duration: 750, easing: Easing.out(Easing.quad) });
    shockwaveOpacity.value = withTiming(0, { duration: 750 });
  };

  const handleStakeChange = (val: number) => {
    setStake(val);
    Haptics.selectionAsync();
    if (val > 0) {
      setTimeout(() => {
        triggerPremiumLockEffect();
        playChimeSound();
      }, 50);

      let tierPasses = 0;
      if (val === 1.99) tierPasses = user?.bronzePasses ?? 0;
      if (val === 4.99) tierPasses = user?.silverPasses ?? 0;
      if (val === 9.99) tierPasses = user?.goldPasses ?? 0;

      if (user && tierPasses <= 0) {
        setTimeout(() => {
          setPaymentStep('idle');
          setIsPaymentSheetVisible(true);
        }, 300);
      }
    }
  };

  const createCoinPanResponder = (amount: number, dragX: SharedValue<number>, dragY: SharedValue<number>, isDragging: SharedValue<boolean>) => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        isDragging.value = true;
        setIsAnyCoinDragging(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      },
      onPanResponderMove: (evt, gestureState) => {
        dragX.value = gestureState.dx;
        dragY.value = gestureState.dy;
        const isHovering = gestureState.dy < -50 && Math.abs(gestureState.dx) < 120; 
        if (isHovering) {
          socketScale.value = withSpring(1.08);
          socketGlow.value = withTiming(0.85, { duration: 100 });
        } else {
          socketScale.value = withSpring(1.0);
          socketGlow.value = withTiming(stake > 0 ? 0.6 : 0.15, { duration: 100 });
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        isDragging.value = false;
        setIsAnyCoinDragging(false);
        const isTap = Math.abs(gestureState.dx) < 5 && Math.abs(gestureState.dy) < 5;
        if (isTap) {
          if (!activeStakeAmounts.includes(amount)) {
            if (stake === amount) handleStakeChange(0);
            else handleStakeChange(amount);
          }
          dragX.value = withSpring(0);
          dragY.value = withSpring(0);
          return;
        }
        const dropThreshold = -50;
        if (gestureState.dy < dropThreshold && Math.abs(gestureState.dx) < 120) {
          if (!activeStakeAmounts.includes(amount)) {
            handleStakeChange(amount);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            socketScale.value = withSequence(withTiming(1.12, { duration: 80 }), withTiming(1.0, { duration: 180 }));
          } else {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          }
        } else {
          socketScale.value = withSpring(1.0);
        }
        dragX.value = withSpring(0);
        dragY.value = withSpring(0);
      }
    });
  };

  const panResponder5 = useMemo(() => createCoinPanResponder(1.99, dragX5, dragY5, isDragging5), [stake, activeStakeAmounts]);
  const panResponder10 = useMemo(() => createCoinPanResponder(4.99, dragX10, dragY10, isDragging10), [stake, activeStakeAmounts]);
  const panResponder20 = useMemo(() => createCoinPanResponder(9.99, dragX20, dragY20, isDragging20), [stake, activeStakeAmounts]);

  // Combined 3D rotation applied to parent wrapper, preventing rim Z-intersection clip
  const selectedAnimatedStyle = useAnimatedStyle(() => {
    let bob = bobBronze;
    if (stake === 4.99) bob = bobSilver;
    else if (stake === 9.99) bob = bobGold;
    return {
      transform: [
        { translateY: bob.value * 0.5 }
      ]
    };
  }, [stake]);

  const getMetricFullName = (type: MetricType) => {
    switch (type) {
      case 'steps': return t('metrics.steps');
      case 'run': return t('metrics.run');
      case 'mindfulness': return t('metrics.mindfulness');
      default: return 'Metric';
    }
  };

  const getMetricLabel = () => HealthDataService.getMetricUnit(metric);

  const getCommitmentDates = (choice: 'today' | 'tomorrow', duration: number | undefined) => {
    const startD = new Date();
    startD.setHours(0, 0, 0, 0);
    if (choice === 'tomorrow') startD.setDate(startD.getDate() + 1);
    const endD = new Date(startD);
    endD.setDate(startD.getDate() + ((duration || 3) - 1));
    endD.setHours(23, 59, 59, 999);
    return { startDate: startD, endDate: endD };
  };

  const getDateISOStr = (d: Date) => {
    if (isNaN(d.getTime())) {
      console.warn('Invalid date passed to getDateISOStr. Using current date as fallback.');
      d = new Date();
    }
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const triggerPaymentSheet = () => {
    if (stake <= 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('Forge Empty', 'Please drag a pass into the holographic forge socket first.');
      return;
    }
    setPaymentStep('idle');
    setIsPaymentSheetVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  async function confirmPayment() {
    setPaymentStep('processing');
    try {
      let needsPurchase = false;
      let tierStr = 'bronze';
      if (stake === 1.99) {
        tierStr = 'bronze';
        needsPurchase = !user || (user.bronzePasses ?? 0) <= 0;
      } else if (stake === 4.99) {
        tierStr = 'silver';
        needsPurchase = !user || (user.silverPasses ?? 0) <= 0;
      } else if (stake === 9.99) {
        tierStr = 'gold';
        needsPurchase = !user || (user.goldPasses ?? 0) <= 0;
      }

      if (needsPurchase) {
        await purchasePasses(1, tierStr);
      }
      
      const { startDate, endDate } = getCommitmentDates(startDateChoice, durationDays);
      
      if (params?.editId) {
        // If editing an existing unstarted commitment
        await HealthDataService.updateActiveCommitment(params.editId, {
          metricType: metric,
          targetValue,
          durationDays,
          stakeAmount: stake,
          startDate: getDateISOStr(startDate),
          endDate: getDateISOStr(endDate),
        });
      } else {
        await lockPassValue(stake);
        await HealthDataService.saveActiveCommitment({
          id: '',
          metricType: metric,
          targetValue,
          durationDays,
          stakeAmount: stake,
          startDate: getDateISOStr(startDate),
          endDate: getDateISOStr(endDate),
          status: 'active',
          createdAt: new Date().toISOString(),
        });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPaymentStep('success');
      setTimeout(() => {
        setIsPaymentSheetVisible(false);
        setMetric('steps');
        setTargetValue(10000);
        setDurationDays(3);
        setStartDateChoice('today');
        setStake(0);
        setActiveStepIndex(0);
        scrollRef.current?.scrollTo({ x: 0, y: 0, animated: false });
        router.replace('/');
      }, 1800);
    } catch (e) {
      console.error(e);
      setPaymentStep('idle');
      Alert.alert('Error', 'Failed to lock commitment. Please try again.');
    }
  }

  const goNext = (stepIndex: number, currentMetric: MetricType | null = metric) => {
    if (stepIndex > 0 && !currentMetric) {
      Alert.alert('Selection Required', 'Please select a habit metric to proceed.');
      return;
    }
    scrollRef.current?.scrollTo({ x: width * stepIndex, y: 0, animated: true });
    setActiveStepIndex(stepIndex);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const formatDateLabel = (d: Date) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
  };

  // Sleek minimalist horizontal progress tracker
  const renderStepIndicator = () => {
    return (
      <View style={styles.progressContainer}>
        {/* Track Line Container (prevents overflow past the third node) */}
        <View style={styles.trackWrapper}>
          <View style={styles.progressTrackBg} />
          <Animated.View style={[styles.progressTrackFill, progressTrackFillStyle]}>
            <LinearGradient
              colors={['#A855F7', '#00E5FF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
            {/* Illuminated fiber-optic pulse sweep */}
            <Animated.View style={[styles.trackPulseSweep, trackSweepStyle]}>
              <LinearGradient
                colors={['transparent', 'rgba(255,255,255,0.7)', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          </Animated.View>
        </View>

        {/* Nodes */}
        <View style={styles.progressNodesRow}>
          {[0, 1, 2].map((i) => {
            const nodeStyle = i === 0 ? nodeStyle0 : i === 1 ? nodeStyle1 : nodeStyle2;
            const getIcon = () => {
              if (i === 0) return 'trophy-outline';
              if (i === 1) return 'tune';
              return 'fire';
            };

            return (
              <TouchableOpacity
                key={i}
                activeOpacity={0.8}
                onPress={() => goNext(i)}
                style={styles.progressNodeTouchable}
              >
                <Animated.View style={[styles.progressNodeCircle, nodeStyle]}>
                  <MaterialCommunityIcons
                    name={getIcon()}
                    size={16}
                    color={activeStepIndex === i ? '#FFFFFF' : '#64748B'}
                  />
                </Animated.View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const renderSelectionSummaryBanner = (currentStep: number) => {
    const bannerStyle = currentStep === 1 ? bannerStyleStep1 : bannerStyleStep2;

    return (
      <Animated.View style={[styles.summaryBannerWrapper, bannerStyle]}>
        <View style={styles.summaryBadge}>
          <MaterialCommunityIcons name={metricInfo.icon as any} size={14} color={metricInfo.color} />
          <Text style={[styles.summaryBadgeText, { color: metricInfo.color }]}>{metricInfo.name}</Text>
        </View>
        
        {currentStep === 2 && (
          <View style={styles.summaryBadge}>
            <MaterialCommunityIcons name="bullseye-arrow" size={14} color="#34D399" />
            <Text style={[styles.summaryBadgeText, { color: '#34D399' }]}>
              {targetValue.toLocaleString()} {getMetricLabel()}
            </Text>
            <View style={styles.badgeSeparator} />
            <MaterialCommunityIcons name="clock-outline" size={14} color="#38BDF8" />
            <Text style={[styles.summaryBadgeText, { color: '#38BDF8' }]}>
              {durationDays} Days
            </Text>
          </View>
        )}
      </Animated.View>
    );
  };

  // Static headers removed in favor of clean progress indicators.

  const renderMetricGrid = () => {
    const metrics = [
      { 
        type: 'steps' as MetricType, 
        icon: 'shoe-print', 
        title: t('metrics.steps').toUpperCase(), 
        desc: 'Build consistency with active step pacing.',
        glow: 'rgba(192, 132, 252, 0.15)',
        accent: '#C084FC'
      },
      { 
        type: 'run' as MetricType, 
        icon: 'run', 
        title: t('metrics.run').toUpperCase(), 
        desc: 'Commit to outdoor workouts and fitness sessions.',
        glow: 'rgba(56, 189, 248, 0.15)',
        accent: '#38BDF8'
      },
      { 
        type: 'mindfulness' as MetricType, 
        icon: 'meditation', 
        title: t('metrics.mindfulness').toUpperCase(), 
        desc: 'Integrate mindful breathing and mental wellness.',
        glow: 'rgba(251, 191, 36, 0.15)',
        accent: '#FBBF24'
      },
    ];

    return (
      <View style={styles.stepContainer}>
        <View style={styles.metricGrid}>
          {metrics.map((item, index) => {
            const isSelected = metric === item.type;
            const borderColors: [string, string] = isSelected 
              ? ['#A855F7', '#38BDF8'] 
              : ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.06)'];

            const cardScaleStyle = item.type === 'steps'
              ? cardScaleStyleSteps
              : item.type === 'run'
                ? cardScaleStyleRun
                : cardScaleStyleMindfulness;

            return (
              <Animated.View key={item.type} style={cardScaleStyle}>
                <LinearGradient
                  colors={borderColors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.holographicShardBorder}
                >
                  <TouchableOpacity
                    style={[
                      styles.metricCardPremium,
                      isSelected && styles.metricCardPremiumSelected
                    ]}
                    activeOpacity={0.9}
                    onPress={() => {
                      setMetric(item.type);
                      const defaults: Record<MetricType, number> = {
                        steps: 10000, run: 5, cycle: 15, calories: 500, activeTime: 30, mindfulness: 5
                      };
                      setTargetValue(defaults[item.type]);
                      Haptics.selectionAsync();
                      setTimeout(() => goNext(1, item.type), 350);
                    }}
                  >
                    <View style={[styles.premiumMetricGlow, { backgroundColor: item.glow }]} />
                    <View style={styles.cardHeaderRow}>
                      <View style={[styles.metricIconBoxPremium, { borderColor: isSelected ? item.accent : 'rgba(255,255,255,0.05)' }]}>
                        <MaterialCommunityIcons name={item.icon as any} size={24} color={isSelected ? item.accent : '#94A3B8'} />
                      </View>
                      <Text style={[styles.metricCardTextPremium, isSelected && { color: '#FFFFFF' }]}>
                        {item.title}
                      </Text>
                      {isSelected ? (
                        <Animated.View entering={ZoomIn} style={[styles.premiumBadgeSelect, { backgroundColor: item.accent }]}>
                          <MaterialCommunityIcons name="rhombus-split" size={14} color="#000" />
                        </Animated.View>
                      ) : (
                        <View style={styles.unselectedCardRuneSlot}>
                          <MaterialCommunityIcons name="rhombus-outline" size={14} color="rgba(255,255,255,0.15)" />
                        </View>
                      )}
                    </View>
                    <Text style={styles.metricCardDesc}>
                      {item.desc}
                    </Text>
                  </TouchableOpacity>
                </LinearGradient>
              </Animated.View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderGoalConfig = () => {
    return (
      <View style={styles.stepContainer}>
        {renderSelectionSummaryBanner(1)}

        {/* Target Stepper Console */}
        <View style={styles.consolePanel}>
          <View style={styles.consoleHeader}>
            <Text style={styles.configLabel}>Daily Target Goal</Text>
            <View style={styles.consolePulseRing} />
          </View>
          
          <View style={styles.premiumStepper}>
            <TouchableOpacity 
              style={styles.glassmorphicBtn}
              activeOpacity={0.7}
              onPress={() => {
                const step = (metric === 'run' || metric === 'mindfulness') ? 1 : (metric === 'steps' ? 1000 : 5);
                setTargetValue(Math.max(1, targetValue - step));
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <View style={styles.glassmorphicBtnInner}>
                <MaterialCommunityIcons name="minus" size={22} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
            
            <View style={styles.digitalLensContainer}>
              <Text style={styles.premiumTargetNumber}>{targetValue.toLocaleString()}</Text>
              <Text style={styles.premiumTargetUnit}>{getMetricLabel()}</Text>
            </View>
            
            <TouchableOpacity 
              style={styles.glassmorphicBtn}
              activeOpacity={0.7}
              onPress={() => {
                const step = (metric === 'run' || metric === 'mindfulness') ? 1 : (metric === 'steps' ? 1000 : 5);
                setTargetValue(targetValue + step);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <View style={styles.glassmorphicBtnInner}>
                <MaterialCommunityIcons name="plus" size={22} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Unified Schedule & Duration Console */}
        <View style={styles.consolePanel}>
          <Text style={styles.configLabel}>Schedule & Duration</Text>
          
          <Text style={styles.subConfigLabel}>Duration (Days)</Text>
          <View style={styles.premiumStepper}>
            <TouchableOpacity 
              style={styles.glassmorphicBtn}
              activeOpacity={0.7}
              onPress={() => {
                setDurationDays(Math.max(3, durationDays - 1));
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <View style={styles.glassmorphicBtnInner}>
                <MaterialCommunityIcons name="minus" size={22} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
            
            <View style={styles.digitalLensContainer}>
              <Text style={styles.premiumTargetNumber}>{durationDays}</Text>
              <Text style={styles.premiumTargetUnit}>DAYS</Text>
            </View>
            
            <TouchableOpacity 
              style={styles.glassmorphicBtn}
              activeOpacity={0.7}
              onPress={() => {
                setDurationDays(Math.min(30, durationDays + 1));
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <View style={styles.glassmorphicBtnInner}>
                <MaterialCommunityIcons name="plus" size={22} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          </View>


          <View style={{ height: 12 }} />

          <View style={styles.activationRow}>
            <Text style={styles.subConfigLabel}>Start Date</Text>
            <View style={styles.activationToggle}>
              <TouchableOpacity 
                style={[styles.activationBtn, startDateChoice === 'today' && styles.activationBtnActive]}
                onPress={() => { setStartDateChoice('today'); Haptics.selectionAsync(); }}
                activeOpacity={0.8}
              >
                <Text style={[styles.activationBtnText, startDateChoice === 'today' && styles.activationBtnTextActive]}>Today</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.activationBtn, startDateChoice === 'tomorrow' && styles.activationBtnActive]}
                onPress={() => { setStartDateChoice('tomorrow'); Haptics.selectionAsync(); }}
                activeOpacity={0.8}
              >
                <Text style={[styles.activationBtnText, startDateChoice === 'tomorrow' && styles.activationBtnTextActive]}>Tomorrow</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.timelineDivider} />

          <View style={styles.timelineContainer}>
            <View style={styles.timelinePoint}>
              <MaterialCommunityIcons name="clock-start" size={16} color="#A855F7" />
              <View style={styles.timelineTextCol}>
                <Text style={styles.timelineLabel}>STARTS</Text>
                <Text style={styles.timelineValue}>
                  {(() => {
                    let d = new Date();
                    if (startDateChoice === 'tomorrow') d.setDate(d.getDate() + 1);
                    return formatDateLabel(d);
                  })()}
                </Text>
              </View>
            </View>

            <View style={styles.timelineConnector}>
              <View style={styles.timelineLine} />
              <View style={styles.timelineDurationBadge}>
                <Text style={styles.timelineDurationText}>{durationDays}d</Text>
              </View>
              <View style={styles.timelineLine} />
            </View>

            <View style={styles.timelinePoint}>
              <MaterialCommunityIcons name="clock-end" size={16} color="#38BDF8" />
              <View style={styles.timelineTextCol}>
                <Text style={styles.timelineLabel}>ENDS</Text>
                <Text style={styles.timelineValue}>
                  {(() => {
                    const { endDate } = getCommitmentDates(startDateChoice, durationDays);
                    return formatDateLabel(endDate);
                  })()}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Inline navigation for Step 2 */}
        <Animated.View style={[styles.inlineContinueBtn, { transform: [{ scale: continueScale }] }]}>
          <TouchableOpacity 
            style={StyleSheet.absoluteFill}
            onPress={() => goNext(2)} 
            activeOpacity={0.9}
          >
            <LinearGradient colors={['#A855F7', '#4F46E5']} style={styles.inlineBtnGradient}>
              <View style={styles.buttonSheenLayer}>
                <LinearGradient
                  colors={['transparent', 'rgba(255,255,255,0.18)', 'transparent']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
              </View>
              <Text style={styles.inlineBtnText}>CONTINUE</Text>
              <MaterialCommunityIcons name="arrow-right" size={15} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  };

  const renderForge = () => {
    // Generate readable plain text commitment statement
    const commitmentPhrase = metric === 'mindfulness' 
      ? `I commit to achieve more than ${targetValue} minutes of mindfulness every day for the next ${durationDays} days.`
      : `I commit to achieve more than ${targetValue.toLocaleString()} ${getMetricLabel()} every day for the next ${durationDays} days.`;

    const coinColor = stake === 1.99 ? '#CD7F32' : stake === 4.99 ? '#BDC3C7' : '#FBBF24';

    return (
      <View style={styles.stepContainer}>
        {renderSelectionSummaryBanner(2)}

        <View style={styles.forgeArea}>
          {/* Concentric swirling portal orbits */}
          <View style={styles.socketWrapper}>
            <Animated.View style={[styles.socketGlowBg, animatedGlowStyle]} />
            
            {/* Swirling neon vortex portal core */}
            <Animated.View style={[styles.portalRingOuter, animatedSparkleClockwiseStyle]} />
            <Animated.View style={[styles.portalRingMid, animatedSparkleCounterClockwiseStyle]} />
            <Animated.View style={[styles.portalRingInnerRing, animatedSparkleClockwiseStyle]} />

            {/* Dual rotating sparkle chimes (outer clockwise, inner counter-clockwise) */}
            {stake > 0 && (
              <>
                <Animated.View style={[styles.socketLockedSpinRingOuter, { borderColor: coinColor, shadowColor: coinColor }, animatedSparkleClockwiseStyle]} />
                <Animated.View style={[styles.socketLockedSpinRingInner, { borderColor: coinColor, shadowColor: coinColor }, animatedSparkleCounterClockwiseStyle]} />
              </>
            )}

            {/* Locked Shockwave ring expands on drag locked */}
            <Animated.View style={[styles.premiumShockwaveRing, { borderColor: coinColor }, shockwaveStyle]} />

            <Animated.View style={[styles.socketInner, breathingSocketStyle]}>
              {stake === 0 ? (
                <View style={styles.socketPlaceholder}>
                  <MaterialCommunityIcons name="radar" size={28} color="rgba(168,85,247,0.3)" style={{ marginBottom: 4 }} />
                  <Text style={styles.socketPlaceholderText}>DROP PASS HERE</Text>
                </View>
              ) : (
                <Animated.View entering={ZoomIn.duration(350)} exiting={ZoomOut.duration(200)} style={styles.lockedCoinFrame}>
                  <TouchableOpacity activeOpacity={0.9} onPress={() => handleStakeChange(0)} style={styles.lockedCoinTouchable}>
                    <Animated.View style={[selectedAnimatedStyle, styles.lockedCoinBase, { shadowColor: coinColor, shadowOpacity: 0.85, shadowRadius: 12 }]}>
                      <Image
                        source={
                          stake === 1.99 
                            ? require('../../assets/images/bronze_coin.png')
                            : stake === 4.99 
                              ? require('../../assets/images/silver_coin.png')
                              : require('../../assets/images/gold_coin.png')
                        }
                        style={{ width: '100%', height: '100%' }}
                        contentFit="contain"
                      />
                    </Animated.View>
                  </TouchableOpacity>
                </Animated.View>
              )}
            </Animated.View>
          </View>

          {/* Release Button below the dotted circle */}
          {stake > 0 && (
            <View style={{ marginTop: -10, marginBottom: 14, alignItems: 'center' }}>
              <TouchableOpacity onPress={() => handleStakeChange(0)} style={styles.ejectPill}>
                <MaterialCommunityIcons name="eject-outline" size={10} color="#A855F7" style={{ marginRight: 2 }} />
                <Text style={styles.ejectPillText}>RELEASE</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Plain Text Commitment Statement */}
          <View style={styles.commitmentStatementContainer}>
            <MaterialCommunityIcons name="format-quote-open" size={14} color="rgba(168,85,247,0.4)" style={{ alignSelf: 'flex-start' }} />
            <Text style={styles.commitmentStatementText}>
              {commitmentPhrase}
            </Text>
            <MaterialCommunityIcons name="format-quote-close" size={14} color="rgba(168,85,247,0.4)" style={{ alignSelf: 'flex-end' }} />
          </View>

          {/* Coins row */}
          <View style={styles.passesRow}>
            <AnimatedPassCoin amount={1.99} isSelected={stake === 1.99} isAvailable={!!user && (user.bronzePasses ?? 0) > 0} isLocked={activeStakeAmounts.includes(1.99)} panHandlers={panResponder5.panHandlers} dragX={dragX5} dragY={dragY5} isDragging={isDragging5} bob={bobBronze} themeColors={['#8A5A36', '#DEB887', '#5C3A21', '#A0522D']} accentColor="#CD7F32" cardIcon="shield" passTitle="Bronze" onPress={() => handleStakeChange(1.99)} />
            <AnimatedPassCoin amount={4.99} isSelected={stake === 4.99} isAvailable={!!user && (user.silverPasses ?? 0) > 0} isLocked={activeStakeAmounts.includes(4.99)} panHandlers={panResponder10.panHandlers} dragX={dragX10} dragY={dragY10} isDragging={isDragging10} bob={bobSilver} themeColors={['#7F8C8D', '#D5DBDB', '#A6ACAF', '#BDC3C7']} accentColor="#BDC3C7" cardIcon="medal" passTitle="Silver" onPress={() => handleStakeChange(4.99)} />
            <AnimatedPassCoin amount={9.99} isSelected={stake === 9.99} isAvailable={!!user && (user.goldPasses ?? 0) > 0} isLocked={activeStakeAmounts.includes(9.99)} panHandlers={panResponder20.panHandlers} dragX={dragX20} dragY={dragY20} isDragging={isDragging20} bob={bobGold} themeColors={['#B7950B', '#F9E79F', '#7D6608', '#D4AC0D']} accentColor="#FBBF24" cardIcon="crown" passTitle="Gold" onPress={() => handleStakeChange(9.99)} />
          </View>

          {/* Action Button */}
          <View style={styles.forgeActionContainer}>
            {stake > 0 ? (
              <TouchableOpacity style={styles.forgeLockBtn} onPress={triggerPaymentSheet} activeOpacity={0.9}>
                <LinearGradient colors={['#A855F7', '#7C3AED']} style={styles.forgeLockBtnGradient}>
                  <MaterialCommunityIcons name="lock-pattern" size={16} color="#FFFFFF" />
                  <Text style={styles.forgeLockBtnText}>LOCK CONTRACT</Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <View style={styles.mechanicalSlotTrack}>
                <Animated.View style={[styles.mechanicalSlotSweep, mechanicalSlotSweepStyle]}>
                  <LinearGradient
                    colors={['transparent', 'rgba(168, 85, 247, 0.22)', 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFill}
                  />
                </Animated.View>
                <View style={styles.mechanicalSlotLeftIndicator} />
                <View style={styles.mechanicalSlotRightIndicator} />
                <Text style={styles.forgeLockBtnTextDisabled}>
                  DRAG OR TAP COIN TO UNLOCK
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      {/* Cosmic Obsidian Void Background Grid and Mesh */}
      <GridBackground />
      <RotatingMesh />

      {/* Dynamic atmospheric light flows */}
      <Animated.View style={[styles.floatingGlow, styles.glowLeft, glowLeftStyle]} />
      <Animated.View style={[styles.floatingGlow, styles.glowRight, glowRightStyle]} />

      <AppHeader />

      <View style={{ flex: 1, paddingTop: insets.top + BASE_HEADER_HEIGHT, paddingBottom: insets.bottom + 120 }}>
        {renderStepIndicator()}
        
        <Animated.ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          scrollEnabled={!isAnyCoinDragging}
          showsHorizontalScrollIndicator={false}
          onScroll={scrollHandler}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          scrollEventThrottle={16}
          style={styles.scrollViewStyle}
          contentContainerStyle={{ width: width * 3 }}
        >
          <View style={{ width }}>{renderMetricGrid()}</View>
          <View style={{ width }}>{renderGoalConfig()}</View>
          <View style={{ width }}>{renderForge()}</View>
        </Animated.ScrollView>
      </View>

      {/* Authorization sheet */}
      <Modal 
        visible={isPaymentSheetVisible} 
        transparent={true} 
        animationType="slide"
        onRequestClose={() => {
          if (paymentStep !== 'processing') {
            setIsPaymentSheetVisible(false);
            if (needsPurchase) setStake(0);
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={StyleSheet.absoluteFill} 
            activeOpacity={1} 
            onPress={() => {
              if (paymentStep !== 'processing') {
                setIsPaymentSheetVisible(false);
                if (needsPurchase) setStake(0);
              }
            }} 
          />
          <BlurView tint="dark" intensity={120} style={styles.sheetContent}>
            {paymentStep === 'idle' ? (
              needsPurchase ? (
                // In-App Purchase buy flow
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
                          name={stake === 1.99 ? 'shield' : stake === 4.99 ? 'medal' : 'crown'} 
                          size={24} 
                          color={stake === 1.99 ? '#CD7F32' : stake === 4.99 ? '#BDC3C7' : '#FBBF24'} 
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.iapProductName}>CommitLock</Text>
                        <Text style={styles.iapProductSubtitle}>
                          {stake === 1.99 ? '1 Bronze Coin' : stake === 4.99 ? '1 Silver Coin' : '1 Gold Coin'}
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
                      <Text style={styles.iapPriceValue}>€{stake}</Text>
                    </View>

                    <View style={styles.iapDivider} />

                    <TouchableOpacity 
                      onPress={confirmPayment} 
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
                          name={stake === 1.99 ? 'shield' : stake === 4.99 ? 'medal' : 'crown'} 
                          size={24} 
                          color={stake === 1.99 ? '#CD7F32' : stake === 4.99 ? '#BDC3C7' : '#FBBF24'} 
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.iapProductName}>
                          {stake === 1.99 ? 'Bronze Coin' : stake === 4.99 ? 'Silver Coin' : 'Gold Coin'}
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
                      <Text style={styles.iapPriceValue}>€{stake}</Text>
                    </View>

                    <View style={styles.iapDivider} />

                    <TouchableOpacity 
                      onPress={confirmPayment} 
                      style={styles.iapGooglePayBtn} 
                      activeOpacity={0.9}
                    >
                      <Text style={styles.iapGooglePayBtnText}>1-TAP BUY</Text>
                    </TouchableOpacity>
                  </View>
                )
              ) : (
                // Standard authorization sheet
                <View style={styles.sheetBody}>
                  <View style={styles.sheetHeader}>
                    <View style={styles.sheetPullBar} />
                    <View style={styles.payLogoRow}>
                      <MaterialCommunityIcons name="shield-key-outline" size={24} color="#A855F7" />
                      <Text style={styles.payLogoText}>Authorize Commitment</Text>
                    </View>
                  </View>

                  <View style={styles.payRow}>
                    <Text style={styles.payRowLabel}>CONTRACT PROTOCOL</Text>
                    <Text style={styles.payRowValue}>{getMetricFullName(metric).toUpperCase()}</Text>
                  </View>
                  <View style={styles.payDivider} />
                  <View style={styles.payRow}>
                    <Text style={styles.payRowLabel}>DAILY OBJECTIVE</Text>
                    <Text style={styles.payRowValue}>{targetValue.toLocaleString()} {getMetricLabel()}</Text>
                  </View>
                  <View style={styles.payDivider} />
                  <View style={styles.payRow}>
                    <Text style={styles.payRowLabel}>CONTRACT DURATION</Text>
                    <Text style={styles.payRowValue}>{durationDays} Days ({startDateChoice.toUpperCase()})</Text>
                  </View>
                  <View style={styles.payDivider} />
                  <View style={styles.payRow}>
                    <Text style={styles.payRowLabel}>DEPOSIT COST</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <MaterialCommunityIcons 
                        name={stake === 1.99 ? 'shield' : stake === 4.99 ? 'medal' : stake === 9.99 ? 'crown' : 'ticket-confirmation-outline'} 
                        size={16} 
                        color={stake === 1.99 ? '#CD7F32' : stake === 4.99 ? '#BDC3C7' : stake === 9.99 ? '#FBBF24' : '#A855F7'} 
                      />
                      <Text style={[styles.payTotalValue, { color: stake === 1.99 ? '#CD7F32' : stake === 4.99 ? '#BDC3C7' : stake === 9.99 ? '#FBBF24' : '#A855F7' }]}>
                        {stake === 1.99 ? '1 Bronze Coin' : stake === 4.99 ? '1 Silver Coin' : stake === 9.99 ? '1 Gold Coin' : '1 Challenge Pass'}
                      </Text>
                    </View>
                  </View>
                  
                  <TouchableOpacity onPress={confirmPayment} style={styles.payButton} activeOpacity={0.9}>
                    <Text style={styles.payButtonText}>SIGN CONTRACT</Text>
                  </TouchableOpacity>
                </View>
              )
            ) : paymentStep === 'processing' ? (
              <View style={styles.sheetCenterBody}>
                <ActivityIndicator size="large" color="#A855F7" />
                <Text style={styles.processingText}>
                  {user && user.passes === 0 ? 'Processing App Store purchase...' : 'Forging immutable records...'}
                </Text>
              </View>
            ) : (
              <View style={styles.sheetCenterBody}>
                <View style={styles.successCircle}>
                  <MaterialCommunityIcons name="check" size={32} color="#FFFFFF" />
                </View>
                <Text style={styles.successText}>
                  {user && user.passes === 0 ? 'Purchase Completed' : 'Protocol Locked'}
                </Text>
              </View>
            )}
          </BlurView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#030205',
  },
  gridContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gridLineVertical: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(168, 85, 247, 0.04)',
  },
  gridLineHorizontal: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(56, 189, 248, 0.04)',
  },
  rotatingMeshContainer: {
    position: 'absolute',
    top: height / 2 - 150,
    left: width / 2 - 150,
    width: 300,
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.12,
  },
  meshRing1: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    borderWidth: 1,
    borderColor: '#A855F7',
    borderStyle: 'dashed',
  },
  meshRing2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: '#38BDF8',
    borderStyle: 'dotted',
  },
  meshRing3: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  meshLine1: {
    position: 'absolute',
    width: 300,
    height: 1,
    backgroundColor: 'rgba(168, 85, 247, 0.25)',
  },
  meshLine2: {
    position: 'absolute',
    height: 300,
    width: 1,
    backgroundColor: 'rgba(56, 189, 248, 0.25)',
  },
  floatingGlow: {
    position: 'absolute',
    borderRadius: 150,
    width: 300,
    height: 300,
    opacity: 0.35,
  },
  glowLeft: {
    top: 100,
    left: -100,
  },
  glowRight: {
    bottom: 100,
    right: -100,
  },
  modernIndicatorWrapper: {
    paddingHorizontal: 24,
    marginVertical: 12,
  },
  indicatorTextContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  indicatorStepCapsule: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  modernIndicatorText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: '#64748B',
  },
  progressBarBackground: {
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 1,
    overflow: 'hidden',
    marginTop: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#A855F7',
    borderRadius: 1,
  },
  fixedHeaderContainer: {
    paddingHorizontal: 24,
    marginTop: 16,
    marginBottom: 20,
    height: 70, 
  },
  fixedStepTitle: {
    fontSize: 30,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1,
    marginBottom: 4,
  },
  fixedStepSubtitle: {
    fontSize: 13.5,
    fontWeight: '500',
    color: '#94A3B8',
    lineHeight: 18,
  },
  scrollViewStyle: {
    flex: 1,
  },
  stepContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    width: width,
  },
  summaryBannerWrapper: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 0,
    marginBottom: 16,
  },
  summaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    gap: 6,
  },
  summaryBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  badgeSeparator: {
    width: 1,
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 2,
  },
  metricGrid: {
    gap: 12,
  },
  holographicShardBorder: {
    borderRadius: 20,
    padding: 1.5,
    overflow: 'hidden',
    marginBottom: 4,
  },
  metricCardPremium: {
    backgroundColor: '#090710',
    borderRadius: 19,
    padding: 22,
    overflow: 'hidden',
    position: 'relative',
  },
  metricCardPremiumSelected: {
    backgroundColor: '#120E22',
  },
  unselectedCardRuneSlot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumMetricGlow: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    opacity: 0.55,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricIconBoxPremium: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  metricCardTextPremium: {
    fontSize: 16,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.8,
    flex: 1,
  },
  premiumBadgeSelect: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricCardDesc: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    paddingLeft: 52,
  },
  consolePanel: {
    backgroundColor: 'rgba(255,255,255,0.015)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  consoleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  consolePulseRing: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  configLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 12,
  },
  premiumStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  glassmorphicBtn: {
    width: 52,
    height: 52,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: Platform.OS === 'android' ? 0 : 4,
  },
  glassmorphicBtnInner: {
    ...StyleSheet.absoluteFill,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: 1.5,
    borderTopColor: 'rgba(255, 255, 255, 0.12)',
    borderBottomWidth: 1.5,
    borderBottomColor: 'rgba(0, 0, 0, 0.45)',
  },
  digitalLensContainer: {
    backgroundColor: 'rgba(168, 85, 247, 0.05)',
    borderWidth: 1.5,
    borderColor: 'rgba(168, 85, 247, 0.28)',
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 28,
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: Platform.OS === 'android' ? 0 : 4,
    alignItems: 'center',
    minWidth: 130,
  },
  premiumTargetNumber: {
    fontSize: 30,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },
  premiumTargetUnit: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginTop: -2,
  },
  durationPillContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  durationPill: {
    flex: 1,
    height: 48,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
  },
  durationPillActive: {
    backgroundColor: 'rgba(168,85,247,0.1)',
    borderColor: '#A855F7',
  },
  durationPillText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '700',
  },
  durationPillTextActive: {
    color: '#FFF',
    fontWeight: '800',
  },
  durationCustomBlock: {
    flex: 1,
    height: 48,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
  },
  miniBtn: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationCustomNumber: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
  },
  dateToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
  },
  dateBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
  },
  dateBtnActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  dateBtnText: {
    color: '#64748B',
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  dateBtnTextActive: {
    color: '#FFF',
    fontWeight: '800',
  },
  forgeArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 0,
  },
  socketWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    width: 170, 
    height: 170,
    position: 'relative',
  },
  socketGlowBg: {
    ...StyleSheet.absoluteFill,
    borderRadius: 85,
  },
  portalRingOuter: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 1.5,
    borderColor: 'rgba(168, 85, 247, 0.15)',
    borderStyle: 'dashed',
  },
  portalRingMid: {
    position: 'absolute',
    width: 146,
    height: 146,
    borderRadius: 73,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    borderStyle: 'dotted',
  },
  portalRingInnerRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: 'rgba(236, 72, 153, 0.18)',
    borderStyle: 'dashed',
  },
  socketHoloRingOuter: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.08)',
    borderStyle: 'solid',
  },
  socketHoloRingInner: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.12)',
    borderStyle: 'dashed',
  },
  socketLockedSpinRingOuter: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 6,
  },
  socketLockedSpinRingInner: {
    position: 'absolute',
    width: 144,
    height: 144,
    borderRadius: 72,
    borderWidth: 1,
    borderStyle: 'dotted',
    opacity: 0.8,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },
  premiumShockwaveRing: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 2,
  },
  socketInner: {
    width: 130, 
    height: 130,
    borderRadius: 65,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 12,
  },
  socketPlaceholder: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  socketPlaceholderText: {
    fontSize: 7,
    fontWeight: '900',
    color: 'rgba(168,85,247,0.4)',
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  lockedCoinFrame: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedCoinTouchable: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  lockedCoinRotatedWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    width: 114,
    height: 114,
  },
  lockedCoinBaseMidRim: {
    position: 'absolute',
    width: 114, 
    height: 114,
    borderRadius: 57,
    backgroundColor: '#1E152A',
    opacity: 0.9,
    zIndex: 1,
  },
  lockedCoinBase: {
    width: 114, 
    height: 114,
    borderRadius: 57,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 2, 
  },
  lockedCoinGradient: {
    width: 114, 
    height: 114,
    borderRadius: 57,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#A855F7',
    position: 'relative',
    overflow: 'hidden',
  },
  lockedCoinValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: -0.5,
  },
  ejectPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 6,
    backgroundColor: 'rgba(168,85,247,0.1)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 0.8,
    borderColor: 'rgba(168,85,247,0.2)',
  },
  ejectPillText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#A855F7',
    letterSpacing: 0.8,
  },
  commitmentStatementContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    marginBottom: 20,
    width: '100%',
  },
  commitmentStatementText: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 6,
    fontStyle: 'italic',
  },
  passesRow: {
    flexDirection: 'row',
    gap: 20,
    justifyContent: 'center',
    zIndex: 100,
    marginBottom: 10,
  },
  coinGridSlot: {
    alignItems: 'center',
  },
  lockedCoinContainer: {
    position: 'relative',
    width: 68,
    height: 68,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockedAura: {
    position: 'absolute',
    width: 76,
    height: 76,
    borderRadius: 38,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 2,
  },
  auraGradient: {
    flex: 1,
    borderRadius: 38,
  },
  coinBaseLocked: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  coinGradientLocked: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  lockedCoinIcon: {
    marginBottom: 0,
  },
  touchableCoin: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  coinBaseShadow: {
    position: 'absolute',
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#000000',
    top: 3.5,
    opacity: 0.8,
  },
  coinBaseMidRim: {
    position: 'absolute',
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#1E152A',
    top: 2,
    opacity: 0.9,
  },
  coinBase: {
    width: 68,
    height: 68,
    borderRadius: 34,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  coinGlossyGlassOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 34,
    borderWidth: 2,
    overflow: 'hidden',
  },
  coinLockOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    borderRadius: 34,
  },
  coinGradient: {
    width: 68, 
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  coinGlossyOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  coinShineStripe: {
    position: 'absolute',
    width: 25,
    height: 120,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    transform: [{ rotate: '25deg' }],
  },
  coinInnerRing: {
    position: 'absolute',
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 1,
  },
  coinIcon: {
    marginBottom: 0,
  },
  coinValueText: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  coinTitleText: {
    fontSize: 8.5,
    fontWeight: '900',
    color: '#64748B',
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  coinTitleTextDisabled: {
    fontSize: 8.5,
    fontWeight: '900',
    color: '#334155',
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  bottomNavigationWrapper: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 24,
    backgroundColor: '#030406',
    alignItems: 'center',
  },
  navButtonRowCentered: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  navButtonCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonPrimaryPill: {
    width: 220,
    borderRadius: 23,
    overflow: 'hidden',
  },
  navButtonDisabledPill: {
    width: 220,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonPrimaryCentered: {
    width: 220,
    borderRadius: 23,
    overflow: 'hidden',
  },
  navButtonGradientCentered: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
    gap: 8,
  },
  navButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  navButtonTextSecondary: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  navButtonTextDisabled: {
    color: '#475569',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  sheetContent: {
    backgroundColor: '#07080B',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 48,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  sheetHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  sheetPullBar: {
    width: 40,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginBottom: 16,
  },
  payLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  payLogoText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  sheetBody: {},
  payRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  payRowLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  payRowValue: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
  },
  payDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    marginVertical: 2,
  },
  payTotalValue: {
    color: '#A855F7',
    fontSize: 14,
    fontWeight: '900',
  },
  payButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 28,
  },
  payButtonText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
  sheetCenterBody: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  processingText: {
    color: '#A855F7',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 18,
  },
  successCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  successText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  progressContainer: {
    paddingHorizontal: 24,
    marginVertical: 14,
    position: 'relative',
    height: 36,
    justifyContent: 'center',
  },
  trackWrapper: {
    position: 'absolute',
    left: 56,
    right: 56,
    height: 3,
    overflow: 'hidden',
    borderRadius: 1.5,
  },
  progressTrackBg: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  progressTrackFill: {
    height: '100%',
  },
  trackPulseSweep: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 40,
  },
  progressNodesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  progressNodeTouchable: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressNodeCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 0 },
  },

  durationPresetsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 14,
    width: '100%',
  },
  presetPill: {
    flex: 1,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  presetPillActive: {
    borderColor: '#A855F7',
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  presetPillText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: Fonts.sans,
    zIndex: 1,
  },
  presetPillTextActive: {
    color: '#FFFFFF',
  },
  durationCirclePill: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationCirclePillActive: {
    backgroundColor: 'rgba(168,85,247,0.15)',
    borderColor: '#A855F7',
    transform: [{ scale: 1.1 }],
  },
  durationCirclePillText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '700',
  },
  durationCirclePillTextActive: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  subConfigLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  activationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  activationToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
    width: 170,
  },
  activationBtn: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 8,
  },
  activationBtnActive: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  activationBtnText: {
    color: '#64748B',
    fontWeight: '700',
    fontSize: 12,
  },
  activationBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  timelineDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginVertical: 12,
  },
  timelineContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  timelinePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timelineTextCol: {
    flexDirection: 'column',
  },
  timelineLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
  },
  timelineValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 1,
  },
  timelineConnector: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  timelineLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderStyle: 'dashed',
  },
  timelineDurationBadge: {
    backgroundColor: 'rgba(168,85,247,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  timelineDurationText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#A855F7',
  },
  inlineContinueBtn: {
    marginTop: 16,
    height: 48,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
  },
  inlineBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    gap: 8,
  },
  inlineBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },
  buttonSheenLayer: {
    ...StyleSheet.absoluteFill,
    opacity: 0.6,
  },
  mechanicalSlotTrack: {
    height: 48,
    borderRadius: 16,
    backgroundColor: '#090710',
    borderWidth: 1.5,
    borderColor: 'rgba(168, 85, 247, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
  },
  mechanicalSlotSweep: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 120,
  },
  mechanicalSlotLeftIndicator: {
    position: 'absolute',
    left: 12,
    width: 4,
    height: 16,
    borderRadius: 2,
    backgroundColor: 'rgba(168, 85, 247, 0.4)',
  },
  mechanicalSlotRightIndicator: {
    position: 'absolute',
    right: 12,
    width: 4,
    height: 16,
    borderRadius: 2,
    backgroundColor: 'rgba(168, 85, 247, 0.4)',
  },
  forgeActionContainer: {
    width: '100%',
    paddingHorizontal: 4,
    marginTop: 12,
    marginBottom: 24,
  },
  forgeLockBtn: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  forgeLockBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    gap: 8,
  },
  forgeLockBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  forgeLockBtnDisabled: {
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  forgeLockBtnTextDisabled: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  lockedPlaceholderCoin: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.01)',
  },
  lockedPlaceholderCoinText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#64748B',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  buyPassesContainer: {
    width: '100%',
    padding: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 24,
  },
  buyPassesTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  buyPassesSubtitle: {
    fontSize: 11.5,
    fontWeight: '500',
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  buyPassesBtn: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
  },
  buyPassesBtnGradient: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyPassesBtnText: {
    color: '#030406',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
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
});
