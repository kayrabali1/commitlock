import React, { useState, useRef, useEffect } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Modal,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Animated, { 
  FadeInDown, 
  FadeOutUp, 
  LinearTransition, 
  ZoomIn, 
  ZoomOut,
  FadeInRight,
  FadeOutRight
} from 'react-native-reanimated';

import { useTranslation } from 'react-i18next';
import { Spacing } from '@/constants/theme';
import { HealthDataService, MetricType } from '@/services/health';
import { VerificationGuideModal } from '@/components/VerificationGuideModal';
import AppHeader, { BASE_HEADER_HEIGHT } from '@/components/AppHeader';

const { width } = Dimensions.get('window');

export default function CommitScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  
  const { rolloverFrom, rolloverStake, debug_auto_commit, debug_targetScope, debug_targetValue, debug_metricType } = useLocalSearchParams<{
    rolloverFrom?: string;
    rolloverStake?: string;
    debug_auto_commit?: string;
    debug_targetScope?: string;
    debug_targetValue?: string;
    debug_metricType?: string;
  }>();
  
  useEffect(() => {
    if (debug_auto_commit === 'true') {
      console.log('[Commit] Debug auto-commit triggered with targetScope:', debug_targetScope, 'targetValue:', debug_targetValue, 'metricType:', debug_metricType);
      if (debug_targetScope) {
        setTargetScope(debug_targetScope as any);
      }
      if (debug_targetValue) {
        setTargetValue(Number(debug_targetValue));
      }
      if (debug_metricType) {
        setMetric(debug_metricType as any);
      }
      setIsMetricSelected(true);
      setIsTargetSelected(true);
      setIsDurationSelected(true);
      setIsStakeSelected(true);
      
      const timer = setTimeout(() => {
        confirmPayment({
          targetScope: debug_targetScope as any,
          targetValue: debug_targetValue ? Number(debug_targetValue) : undefined,
          metricType: debug_metricType as any,
        });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [debug_auto_commit, debug_targetScope, debug_targetValue, debug_metricType]);
  
  // Accordion Step State
  const [activeStep, setActiveStep] = useState<number>(0);

  // Scroll & Layout Tracking for Auto-Scroll
  const scrollViewRef = useRef<ScrollView>(null);
  const stepLayouts = useRef<{ [key: number]: number }>({});

  const handleStepLayout = (stepNumber: number, y: number) => {
    stepLayouts.current[stepNumber] = y;
  };

  useEffect(() => {
    if (activeStep > 0 && stepLayouts.current[activeStep] !== undefined) {
      const timer = setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          y: Math.max(0, stepLayouts.current[activeStep] - 16),
          animated: true,
        });
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [activeStep]);

  // Selection Interaction States
  const [isMetricSelected, setIsMetricSelected] = useState<boolean>(false);
  const [isTargetSelected, setIsTargetSelected] = useState<boolean>(false);
  const [isDurationSelected, setIsDurationSelected] = useState<boolean>(false);
  const [isStakeSelected, setIsStakeSelected] = useState<boolean>(!!rolloverStake);

  const allStepsReady = isMetricSelected && isTargetSelected && isDurationSelected && isStakeSelected;
  
  // Selection States
  const [metric, setMetric] = useState<MetricType>('steps');
  const [targetScope, setTargetScope] = useState<'daily' | 'weekly'>('daily');
  const [targetValue, setTargetValue] = useState<number>(10000);
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const [startDateChoice, setStartDateChoice] = useState<'today' | 'tomorrow' | 'custom'>('today');
  const [customStartDate, setCustomStartDate] = useState<Date>(() => {
    const today = new Date();
    // Default custom date to 2 days from now
    return new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2, 12, 0, 0);
  });
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [stake, setStake] = useState<number>(() => rolloverStake ? Number(rolloverStake) : 10); // Default €10
  const [customStake, setCustomStake] = useState<string>('');

  const getStartDateOptions = () => {
    const today = new Date();
    
    // Today
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0);
    
    // Tomorrow
    const tomorrowDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 12, 0, 0);
    
    const formatDateLabel = (d: Date) => {
      return d.toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' });
    };

    const formatISOString = (d: Date) => {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    return [
      { id: 'today' as const, label: t('commit.startToday'), dateLabel: formatDateLabel(todayDate), date: todayDate, dateStr: formatISOString(todayDate) },
      { id: 'tomorrow' as const, label: t('commit.startTomorrow'), dateLabel: formatDateLabel(tomorrowDate), date: tomorrowDate, dateStr: formatISOString(tomorrowDate) },
      { id: 'custom' as const, label: t('commit.startCustom'), dateLabel: formatDateLabel(customStartDate), date: customStartDate, dateStr: formatISOString(customStartDate) },
    ];
  };

  const getCommitmentDates = (choice: 'today' | 'tomorrow' | 'custom', per: 'week' | 'month') => {
    const options = getStartDateOptions();
    const selectedOpt = options.find(o => o.id === choice) || options[0];
    const baseStartDate = selectedOpt.date;
    
    let startDate: Date;
    let endDate: Date;
    
    if (per === 'month') {
      // Starts on the selected start date
      startDate = new Date(baseStartDate);
      // Ends 1 month later (inclusive, minus 1 day)
      endDate = new Date(startDate);
      endDate.setMonth(startDate.getMonth() + 1);
      endDate.setDate(endDate.getDate() - 1);
    } else {
      // Starts on the selected start date
      startDate = new Date(baseStartDate);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
    }
    
    return { startDate, endDate };
  };

  const formatDisplayDate = (d: Date) => {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const minimumDatePickerDate = new Date();
  const maximumDatePickerDate = (() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth() + 2, 0, 23, 59, 59);
  })();

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      // Validate date range to end of next month
      const today = new Date();
      const minDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
      const maxDate = new Date(today.getFullYear(), today.getMonth() + 2, 0, 23, 59, 59);
      
      let validatedDate = selectedDate;
      if (selectedDate < minDate) {
        validatedDate = minDate;
      } else if (selectedDate > maxDate) {
        validatedDate = maxDate;
      }

      if (Platform.OS === 'android') {
        setIsDatePickerVisible(false);
        if (event.type === 'set') {
          setCustomStartDate(validatedDate);
          setStartDateChoice('custom');
          setIsDurationSelected(true);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } else {
        // iOS / Web inline selection
        setCustomStartDate(validatedDate);
        setStartDateChoice('custom');
      }
    }
  };
  
  // Custom Stake Sheet States & Ref
  const [isCustomSheetVisible, setIsCustomSheetVisible] = useState(false);
  const [tempStake, setTempStake] = useState<number>(30);
  const pickerScrollRef = useRef<ScrollView>(null);
  
  // Custom Stake options
  const customStakeOptions = [30, 40, 50, 100, 250];

  const toggleStep = (stepNumber: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveStep(prev => prev === stepNumber ? 0 : stepNumber);
  };

  const handleOpenCustomSheet = () => {
    const activeVal = customStakeOptions.includes(stake) ? stake : customStakeOptions[0];
    setTempStake(activeVal);
    setIsCustomSheetVisible(true);
    
    // Scroll to the active item after modal transitions in
    setTimeout(() => {
      const index = customStakeOptions.indexOf(activeVal);
      if (index !== -1 && pickerScrollRef.current) {
        pickerScrollRef.current.scrollTo({
          y: index * 48,
          animated: false,
        });
      }
    }, 120);
  };

  const handlePickerScroll = (event: any) => {
    const yOffset = event.nativeEvent.contentOffset.y;
    const index = Math.round(yOffset / 48);
    const value = customStakeOptions[index];
    if (value && value !== tempStake) {
      setTempStake(value);
      Haptics.selectionAsync();
    }
  };

  const handlePickerItemPress = (val: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTempStake(val);
    const index = customStakeOptions.indexOf(val);
    if (index !== -1 && pickerScrollRef.current) {
      pickerScrollRef.current.scrollTo({
        y: index * 48,
        animated: true,
      });
    }
  };
  
  // Payment Sheets States
  const [isPaymentSheetVisible, setIsPaymentSheetVisible] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'idle' | 'processing' | 'success'>('idle');
  const [isDisclaimerVisible, setIsDisclaimerVisible] = useState(false);
  const [hasAcceptedDisclaimer, setHasAcceptedDisclaimer] = useState(false);
  const [isVerificationGuideVisible, setIsVerificationGuideVisible] = useState(false);

  // Default values when metric changes
  const handleMetricChange = (selected: MetricType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMetric(selected);
    setIsMetricSelected(true);
    const multiplier = targetScope === 'weekly' ? 7 : 1;
    if (selected === 'steps') setTargetValue(10000 * multiplier);
    else if (selected === 'run') setTargetValue(5 * multiplier);
    else if (selected === 'mindfulness') setTargetValue(15 * multiplier);
    else if (selected === 'cycle') setTargetValue(15 * multiplier);
    else if (selected === 'calories') setTargetValue(500 * multiplier);
    else if (selected === 'activeTime') setTargetValue(30 * multiplier);

    // Auto advance to step 2!
    setTimeout(() => {
      setActiveStep(2);
    }, 200);
  };

  const getStepSize = () => {
    const isWeekly = targetScope === 'weekly';
    switch (metric) {
      case 'steps': return isWeekly ? 5000 : 1000;
      case 'run': return isWeekly ? 5 : 1;
      case 'mindfulness': return isWeekly ? 30 : 5;
      case 'cycle': return isWeekly ? 10 : 2;
      case 'calories': return isWeekly ? 250 : 50;
      case 'activeTime': return isWeekly ? 30 : 5;
      default: return isWeekly ? 5 : 1;
    }
  };

  const incrementTarget = (amount: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTargetValue((prev) => Math.max(1, prev + amount));
    setIsTargetSelected(true);
  };

  const decrementTarget = (amount: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    let minVal = 1;
    const isWeekly = targetScope === 'weekly';
    if (metric === 'steps') minVal = isWeekly ? 7000 : 1000;
    else if (metric === 'run') minVal = isWeekly ? 7 : 1;
    else if (metric === 'mindfulness') minVal = isWeekly ? 35 : 5;
    else if (metric === 'cycle') minVal = isWeekly ? 14 : 2;
    else if (metric === 'calories') minVal = isWeekly ? 700 : 100;
    else if (metric === 'activeTime') minVal = isWeekly ? 35 : 5;
    setTargetValue((prev) => Math.max(minVal, prev - amount));
    setIsTargetSelected(true);
  };

  const handleTargetScopeChange = (scope: 'daily' | 'weekly') => {
    if (scope === targetScope) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTargetScope(scope);
    setIsTargetSelected(true);
    if (scope === 'weekly') {
      // Multiply current daily target by 7 to yield weekly target, rounded cleanly
      setTargetValue((prev) => {
        const multiplied = prev * 7;
        if (metric === 'steps') return Math.round(multiplied / 5000) * 5000 || 70000;
        if (metric === 'run') return Math.round(multiplied / 5) * 5 || 35;
        if (metric === 'mindfulness') return Math.round(multiplied / 30) * 30 || 105;
        if (metric === 'cycle') return Math.round(multiplied / 10) * 10 || 105;
        if (metric === 'calories') return Math.round(multiplied / 250) * 250 || 3500;
        if (metric === 'activeTime') return Math.round(multiplied / 30) * 30 || 210;
        return multiplied;
      });
    } else {
      // Divide current weekly target by 7 to yield daily target, rounded cleanly
      setTargetValue((prev) => {
        const divided = prev / 7;
        if (metric === 'steps') return Math.round(divided / 1000) * 1000 || 10000;
        if (metric === 'run') return Math.round(divided / 1) * 1 || 5;
        if (metric === 'mindfulness') return Math.round(divided / 5) * 5 || 15;
        if (metric === 'cycle') return Math.round(divided / 1) * 1 || 15;
        if (metric === 'calories') return Math.round(divided / 50) * 50 || 500;
        if (metric === 'activeTime') return Math.round(divided / 5) * 5 || 30;
        return Math.round(divided) || 10;
      });
    }
  };

  const handleStakeChange = (value: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStake(value);
    setCustomStake('');
    setIsStakeSelected(true);
    
    // Collapse accordion as all steps are completed!
    setTimeout(() => {
      setActiveStep(0);
    }, 200);
  };

  const triggerPaymentSheet = async () => {
    if (!allStepsReady || stake <= 0) return;
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setHasAcceptedDisclaimer(false);
    setIsDisclaimerVisible(true);
  };

  const handleAcceptDisclaimer = () => {
    if (!hasAcceptedDisclaimer) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsDisclaimerVisible(false);
    setIsPaymentSheetVisible(true);
    setPaymentStep('idle');
  };

  const resetForm = () => {
    setActiveStep(0);
    setIsMetricSelected(false);
    setIsTargetSelected(false);
    setIsDurationSelected(false);
    setIsStakeSelected(false);
    setMetric('steps');
    setTargetScope('daily');
    setTargetValue(10000);
    setPeriod('week');
    setStartDateChoice('today');
    const today = new Date();
    setCustomStartDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2, 12, 0, 0));
    setIsDatePickerVisible(false);
    setStake(10);
    setCustomStake('');
    setIsCustomSheetVisible(false);
    setTempStake(30);
    setPaymentStep('idle');
    setHasAcceptedDisclaimer(false);
    setIsVerificationGuideVisible(false);
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
  };

  async function confirmPayment(overrides?: { targetScope?: 'daily' | 'weekly'; targetValue?: number; metricType?: MetricType }) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPaymentStep('processing');

    // Simulate standard In-App Purchase network verification delay
    setTimeout(async () => {
      try {
        // Calculate dates based on selected start date choice and period
        const { startDate, endDate } = getCommitmentDates(startDateChoice, period);

        const formatLocalDate = (d: Date) => {
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        };

        const finalTargetScope = overrides?.targetScope ?? targetScope;
        const finalTargetValue = overrides?.targetValue ?? targetValue;
        const finalMetric = overrides?.metricType ?? metric;

        const newCommitment = {
          id: Math.random().toString(36).substr(2, 9),
          metricType: finalMetric,
          targetValue: finalTargetValue,
          period,
          stakeAmount: stake,
          startDate: formatLocalDate(startDate),
          endDate: formatLocalDate(endDate),
          status: 'active' as const,
          createdAt: new Date().toISOString(),
          targetScope: finalTargetScope,
        };

        // If rollover from completed commitment
        if (rolloverFrom) {
          try {
            const oldCommitment = await HealthDataService.getActiveCommitment(rolloverFrom);
            if (oldCommitment) {
              const oldWeeklyData = await HealthDataService.fetchWeeklyData(oldCommitment.metricType, oldCommitment);
              const resolvedOldCommitment = {
                ...oldCommitment,
                status: 'success' as const,
                performanceData: oldWeeklyData,
              };
              await HealthDataService.addHistoryEntry(resolvedOldCommitment);
              await HealthDataService.clearActiveCommitment(oldCommitment.id);
            }
          } catch (e) {
            console.error('Error resolving old commitment in rollover flow:', e);
          }
        }

        // Save to active commitment storage
        await HealthDataService.saveActiveCommitment(newCommitment);

        // Reset health data storage overrides back to defaults to ensure a fresh track session
        await HealthDataService.resetSimulatedData();

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setPaymentStep('success');

        // Redirect to active tracker dashboard after celebration checkmark fades
        setTimeout(() => {
          setIsPaymentSheetVisible(false);
          router.replace('/');
          
          // Reset form fields after redirect completes to avoid visual glitching on close animation
          setTimeout(() => {
            resetForm();
          }, 300);
        }, 1500);

      } catch (error: any) {
        console.error(error);
        setPaymentStep('idle');
        Alert.alert(
          'Pledge Failed',
          error.message || 'An error occurred while locking your commitment. Please try again.'
        );
      }
    }, 2000);
  };

  const getMetricFullName = (type: MetricType) => {
    switch (type) {
      case 'steps': return t('metrics.steps');
      case 'run': return t('metrics.run');
      case 'mindfulness': return t('metrics.mindfulness');
      case 'cycle': return t('metrics.cycle');
      case 'calories': return t('metrics.calories');
      case 'activeTime': return t('metrics.activeTime');
    }
  };

  const getMetricLabel = () => {
    const suffix = targetScope === 'weekly' ? t('metrics.per_week') : t('metrics.per_day');
    switch (metric) {
      case 'steps': return `${t('metrics.steps_unit')}${suffix}`;
      case 'run': return `${t('metrics.run_unit')}${suffix}`;
      case 'mindfulness': return `${t('metrics.mindfulness_unit')}${suffix}`;
      case 'cycle': return `${t('metrics.cycle_unit')}${suffix}`;
      case 'calories': return `${t('metrics.calories_unit')}${suffix}`;
      case 'activeTime': return `${t('metrics.activeTime_unit')}${suffix}`;
    }
  };

  const getCommitmentStatement = () => {
    const formattedValue = metric === 'steps' || metric === 'calories' ? targetValue.toLocaleString() : targetValue;
    const periodLabel = period === 'week' ? t('commit.period_week') : t('commit.period_month');
    const isWeekly = targetScope === 'weekly';

    const key = `commit.statement_${isWeekly ? 'weekly' : 'daily'}_${metric}`;
    return t(key, { value: formattedValue, period: periodLabel });
  };

  const getMetricIcon = (type: MetricType) => {
    switch (type) {
      case 'steps': return 'walk';
      case 'run': return 'run';
      case 'mindfulness': return 'spa';
      case 'cycle': return 'bicycle';
      case 'calories': return 'fire';
      case 'activeTime': return 'clock-outline';
    }
  };

  const getMetricColor = (type: MetricType): [string, string] => {
    switch (type) {
      case 'steps': return ['#7C3AED', '#4F46E5'];
      case 'run': return ['#FF4A85', '#E12D61'];
      case 'mindfulness': return ['#A78BFA', '#7C3AED'];
      case 'cycle': return ['#00B4DB', '#0083B0'];
      case 'calories': return ['#FF7B00', '#FF3700'];
      case 'activeTime': return ['#05D38E', '#00A676'];
    }
  };

  return (
    <View style={styles.container}>
      <View style={{ flex: 1 }}>
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: BASE_HEADER_HEIGHT + insets.top + Spacing.three }
          ]}
          showsVerticalScrollIndicator={false}
        >
        
        {/* Rollover Active Banner */}
        {rolloverFrom && rolloverStake && (
          <LinearGradient
            colors={['rgba(124, 58, 237, 0.15)', 'rgba(79, 70, 229, 0.05)']}
            style={styles.rolloverBanner}
          >
            <MaterialCommunityIcons name="swap-horizontal" size={18} color="#7C3AED" />
            <Text style={styles.rolloverBannerText}>
              {t('commit.rolloverActive', { stake: rolloverStake })}
            </Text>
          </LinearGradient>
        )}

        {/* Header (Compact) */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('commit.headerTitle')}</Text>
        </View>

        {/* 1. Select Activity */}
        <Animated.View 
          layout={LinearTransition.springify().damping(28).stiffness(220)}
          onLayout={(e) => handleStepLayout(1, e.nativeEvent.layout.y)}
          style={[styles.accordionItem, activeStep === 1 && styles.accordionItemActive]}
        >
          <TouchableOpacity
            style={styles.accordionHeader}
            onPress={() => toggleStep(1)}
            activeOpacity={0.7}
          >
            <View style={styles.accordionHeaderLeft}>
              <View style={[
                styles.stepBadge,
                activeStep === 1 && styles.stepBadgeActive,
                (activeStep !== 1 && isMetricSelected) && styles.stepBadgeCompleted
              ]}>
                {(activeStep !== 1 && isMetricSelected) ? (
                  <Animated.View entering={ZoomIn.duration(200)} exiting={ZoomOut.duration(200)}>
                    <MaterialCommunityIcons name="check" size={12} color="#FFFFFF" />
                  </Animated.View>
                ) : (
                  <Text style={[styles.stepNumberText, activeStep === 1 && styles.stepNumberTextActive]}>01</Text>
                )}
              </View>
              <Text style={styles.accordionTitle}>{t('commit.step1Title')}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {activeStep !== 1 && isMetricSelected && (
                <Animated.View entering={FadeInRight.duration(220)} exiting={FadeOutRight.duration(150)} style={styles.accordionSummary}>
                  <MaterialCommunityIcons name={getMetricIcon(metric)} size={12} color={getMetricColor(metric)[0]} />
                  <Text style={styles.accordionSummaryText}>{getMetricFullName(metric)}</Text>
                </Animated.View>
              )}
              <MaterialCommunityIcons
                name={activeStep === 1 ? "chevron-up" : "chevron-down"}
                size={18}
                color={activeStep === 1 ? '#7C3AED' : '#64748B'}
                style={styles.chevronIcon}
              />
            </View>
          </TouchableOpacity>

          {activeStep === 1 && (
            <Animated.View entering={FadeInDown.duration(220).springify().damping(22).stiffness(180)} exiting={FadeOutUp.duration(150)} style={styles.accordionContent}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.metricScrollContent}
              >
                {(['steps', 'run', 'mindfulness', 'cycle', 'calories', 'activeTime'] as MetricType[]).map((type) => {
                  const isActive = isMetricSelected && metric === type;
                  const gradient = getMetricColor(type);
                  
                  const CardContent = (
                    <View style={[styles.metricCardInner, !isActive && styles.metricCardInactive]}>
                      <MaterialCommunityIcons
                        name={getMetricIcon(type)}
                        size={18}
                        color={isActive ? '#FFFFFF' : '#94A3B8'}
                      />
                      <Text
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.7}
                        style={[styles.metricCardLabel, isActive ? styles.textActive : styles.textInactive]}
                      >
                        {getMetricFullName(type)}
                      </Text>
                    </View>
                  );

                  return (
                    <TouchableOpacity
                      key={type}
                      onPress={() => handleMetricChange(type)}
                      style={styles.metricCardHorizontal}
                      activeOpacity={0.8}
                    >
                      {isActive ? (
                        <LinearGradient colors={gradient} style={styles.gradientFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                          {CardContent}
                        </LinearGradient>
                      ) : (
                        CardContent
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </Animated.View>
          )}
        </Animated.View>

        {/* 2. Select Target */}
        <Animated.View 
          layout={LinearTransition.springify().damping(28).stiffness(220)}
          onLayout={(e) => handleStepLayout(2, e.nativeEvent.layout.y)}
          style={[styles.accordionItem, activeStep === 2 && styles.accordionItemActive]}
        >
          <TouchableOpacity
            style={styles.accordionHeader}
            onPress={() => toggleStep(2)}
            activeOpacity={0.7}
          >
            <View style={styles.accordionHeaderLeft}>
              <View style={[
                styles.stepBadge,
                activeStep === 2 && styles.stepBadgeActive,
                (activeStep !== 2 && isTargetSelected) && styles.stepBadgeCompleted
              ]}>
                {(activeStep !== 2 && isTargetSelected) ? (
                  <Animated.View entering={ZoomIn.duration(200)} exiting={ZoomOut.duration(200)}>
                    <MaterialCommunityIcons name="check" size={12} color="#FFFFFF" />
                  </Animated.View>
                ) : (
                  <Text style={[styles.stepNumberText, activeStep === 2 && styles.stepNumberTextActive]}>02</Text>
                )}
              </View>
              <Text style={styles.accordionTitle}>{t('commit.step2Title')}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {activeStep !== 2 && isTargetSelected && (
                <Animated.View entering={FadeInRight.duration(220)} exiting={FadeOutRight.duration(150)} style={styles.accordionSummary}>
                  <Text style={styles.accordionSummaryText}>
                    {metric === 'steps' || metric === 'calories' ? targetValue.toLocaleString() : targetValue}{' '}
                    {getMetricLabel().split('/')[0]} / {targetScope === 'daily' ? 'day' : 'week'}
                  </Text>
                </Animated.View>
              )}
              <MaterialCommunityIcons
                name={activeStep === 2 ? "chevron-up" : "chevron-down"}
                size={18}
                color={activeStep === 2 ? '#7C3AED' : '#64748B'}
                style={styles.chevronIcon}
              />
            </View>
          </TouchableOpacity>

          {activeStep === 2 && (
            <Animated.View entering={FadeInDown.duration(220).springify().damping(22).stiffness(180)} exiting={FadeOutUp.duration(150)} style={styles.accordionContent}>
              <View style={styles.targetCardHeader}>
                <Text style={styles.targetCardTitle}>{t('commit.targetGoalLabel')}</Text>
                
                <View style={styles.scopeToggleContainer}>
                  <TouchableOpacity
                    onPress={() => handleTargetScopeChange('daily')}
                    style={[styles.scopeToggleButton, targetScope === 'daily' && styles.scopeToggleButtonActive]}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.scopeToggleText, targetScope === 'daily' && styles.scopeToggleTextActive]}>
                      {t('commit.dailyTarget')}
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    onPress={() => handleTargetScopeChange('weekly')}
                    style={[styles.scopeToggleButton, targetScope === 'weekly' && styles.scopeToggleButtonActive]}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.scopeToggleText, targetScope === 'weekly' && styles.scopeToggleTextActive]}>
                      {t('commit.weeklyAccumulator')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.targetStepperRow}>
                <TouchableOpacity
                  onPress={() => decrementTarget(getStepSize())}
                  style={styles.stepperButton}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons name="minus" size={20} color="#FFFFFF" />
                </TouchableOpacity>

                <View style={styles.targetValueWrapper}>
                  <Text style={styles.targetValueText}>
                    {metric === 'steps' || metric === 'calories' ? targetValue.toLocaleString() : targetValue}
                  </Text>
                  <Text style={styles.targetValueLabel}>{getMetricLabel()}</Text>
                </View>

                <TouchableOpacity
                  onPress={() => incrementTarget(getStepSize())}
                  style={styles.stepperButton}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons name="plus" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <View style={styles.syncNoticeRow}>
                <MaterialCommunityIcons 
                  name="checkbox-marked-circle-outline" 
                  size={12} 
                  color="#05D38E" 
                />
                <Text style={[styles.syncNoticeText, { flexShrink: 1, color: '#94A3B8' }]}>
                  {getCommitmentStatement()}
                </Text>
              </View>

              <View style={styles.targetDivider} />
              <TouchableOpacity
                style={styles.stepContinueButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setIsTargetSelected(true);
                  setActiveStep(3);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.stepContinueButtonText}>{t('commit.continueToStartDuration')}</Text>
                <MaterialCommunityIcons name="arrow-right" size={14} color="#FFFFFF" />
              </TouchableOpacity>
            </Animated.View>
          )}
        </Animated.View>

        {/* 3. Start and duration */}
        <Animated.View 
          layout={LinearTransition.springify().damping(28).stiffness(220)}
          onLayout={(e) => handleStepLayout(3, e.nativeEvent.layout.y)}
          style={[styles.accordionItem, activeStep === 3 && styles.accordionItemActive]}
        >
          <TouchableOpacity
            style={styles.accordionHeader}
            onPress={() => toggleStep(3)}
            activeOpacity={0.7}
          >
            <View style={styles.accordionHeaderLeft}>
              <View style={[
                styles.stepBadge,
                activeStep === 3 && styles.stepBadgeActive,
                (activeStep !== 3 && isDurationSelected) && styles.stepBadgeCompleted
              ]}>
                {(activeStep !== 3 && isDurationSelected) ? (
                  <Animated.View entering={ZoomIn.duration(200)} exiting={ZoomOut.duration(200)}>
                    <MaterialCommunityIcons name="check" size={12} color="#FFFFFF" />
                  </Animated.View>
                ) : (
                  <Text style={[styles.stepNumberText, activeStep === 3 && styles.stepNumberTextActive]}>03</Text>
                )}
              </View>
              <Text style={styles.accordionTitle}>{t('commit.step3Title')}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {activeStep !== 3 && isDurationSelected && (
                <Animated.View entering={FadeInRight.duration(220)} exiting={FadeOutRight.duration(150)} style={styles.accordionSummary}>
                  <Text style={styles.accordionSummaryText}>
                    {(() => {
                      const dates = getCommitmentDates(startDateChoice, period);
                      const startLabel = dates.startDate.toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' });
                      const durationLabel = period === 'week' ? t('commit.duration1WkCompact', '1 Wk') : t('commit.duration1MoCompact', '1 Mo');
                      return `${startLabel} • ${durationLabel}`;
                    })()}
                  </Text>
                </Animated.View>
              )}
              <MaterialCommunityIcons
                name={activeStep === 3 ? "chevron-up" : "chevron-down"}
                size={18}
                color={activeStep === 3 ? '#7C3AED' : '#64748B'}
                style={styles.chevronIcon}
              />
            </View>
          </TouchableOpacity>

          {activeStep === 3 && (
            <Animated.View entering={FadeInDown.duration(220).springify().damping(22).stiffness(180)} exiting={FadeOutUp.duration(150)} style={styles.accordionContent}>
              {/* Duration Row */}
              <View style={styles.periodRowCompact}>
                <View style={styles.periodLeftColCompact}>
                  <Text style={styles.periodTitleCompact}>{t('commit.durationLabel')}</Text>
                  <Text style={styles.periodDescCompact}>
                    {period === 'week' ? t('commit.duration1WeekDesc', '1 Week commitment') : t('commit.duration1MonthDesc', '1 Month commitment')}
                  </Text>
                </View>
                <View style={styles.periodPillContainerCompact}>
                  <TouchableOpacity
                    onPress={() => { 
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); 
                      setPeriod('week'); 
                      setIsDurationSelected(true);
                    }}
                    style={[styles.periodPillCompact, period === 'week' && styles.periodPillActiveCompact]}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.periodPillTextCompact, period === 'week' && styles.periodPillTextActiveCompact]}>{t('commit.duration1Week')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => { 
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); 
                      setPeriod('month'); 
                      setIsDurationSelected(true);
                    }}
                    style={[styles.periodPillCompact, period === 'month' && styles.periodPillActiveCompact]}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.periodPillTextCompact, period === 'month' && styles.periodPillTextActiveCompact]}>{t('commit.duration1Month')}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.targetDivider} />

              {/* Start Date Row */}
              <View style={styles.periodRowCompact}>
                <View style={styles.periodLeftColCompact}>
                  <Text style={styles.periodTitleCompact}>{t('commit.startDateLabel')}</Text>
                  <Text style={styles.periodDescCompact}>
                    {(() => {
                      const dates = getCommitmentDates(startDateChoice, period);
                      return `${formatDisplayDate(dates.startDate)} - ${formatDisplayDate(dates.endDate)}`;
                    })()}
                  </Text>
                </View>
                <View style={styles.datePillContainer}>
                  {getStartDateOptions().map((opt) => {
                    const isSelected = startDateChoice === opt.id;
                    const isCustom = opt.id === 'custom';
                    
                    return (
                      <TouchableOpacity
                        key={opt.id}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          if (isCustom) {
                            setIsDatePickerVisible(true);
                          } else {
                            setStartDateChoice(opt.id);
                            setIsDurationSelected(true);
                          }
                        }}
                        style={[
                          styles.datePillCompact,
                          isSelected && styles.datePillActiveCompact,
                          isCustom && { 
                            flexDirection: 'row', 
                            alignItems: 'center', 
                            gap: isSelected ? 4 : 0,
                            paddingHorizontal: isSelected ? 8 : 10
                          }
                        ]}
                        activeOpacity={0.8}
                      >
                        {isCustom ? (
                          <>
                            <MaterialCommunityIcons 
                              name="calendar-month" 
                              size={14} 
                              color={isSelected ? '#7C3AED' : '#94A3B8'} 
                            />
                            {isSelected && (
                              <Text style={[
                                styles.datePillTextCompact,
                                styles.datePillTextActiveCompact
                              ]}>
                                {opt.dateLabel}
                              </Text>
                            )}
                          </>
                        ) : (
                          <Text style={[
                            styles.datePillTextCompact,
                            isSelected && styles.datePillTextActiveCompact
                          ]}>
                            {opt.label}
                          </Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.targetDivider} />
              <TouchableOpacity
                style={styles.stepContinueButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setIsDurationSelected(true);
                  setActiveStep(4);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.stepContinueButtonText}>Continue to Pledge</Text>
                <MaterialCommunityIcons name="arrow-right" size={14} color="#FFFFFF" />
              </TouchableOpacity>
            </Animated.View>
          )}
        </Animated.View>

        {/* 4. Pledge Stake */}
        <Animated.View 
          layout={LinearTransition.springify().damping(28).stiffness(220)}
          onLayout={(e) => handleStepLayout(4, e.nativeEvent.layout.y)}
          style={[styles.accordionItem, activeStep === 4 && styles.accordionItemActive]}
        >
          <TouchableOpacity
            style={styles.accordionHeader}
            onPress={() => toggleStep(4)}
            activeOpacity={0.7}
          >
            <View style={styles.accordionHeaderLeft}>
              <View style={[
                styles.stepBadge,
                activeStep === 4 && styles.stepBadgeActive,
                (activeStep !== 4 && isStakeSelected) && styles.stepBadgeCompleted
              ]}>
                {(activeStep !== 4 && isStakeSelected) ? (
                  <Animated.View entering={ZoomIn.duration(200)} exiting={ZoomOut.duration(200)}>
                    <MaterialCommunityIcons name="check" size={12} color="#FFFFFF" />
                  </Animated.View>
                ) : (
                  <Text style={[styles.stepNumberText, activeStep === 4 && styles.stepNumberTextActive]}>04</Text>
                )}
              </View>
              <Text style={styles.accordionTitle}>Pledge Stake</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {activeStep !== 4 && isStakeSelected && (
                <Animated.View entering={FadeInRight.duration(220)} exiting={FadeOutRight.duration(150)} style={styles.accordionSummary}>
                  <Text style={styles.accordionSummaryText}>€{stake}.00</Text>
                </Animated.View>
              )}
              <MaterialCommunityIcons
                name={activeStep === 4 ? "chevron-up" : "chevron-down"}
                size={18}
                color={activeStep === 4 ? '#7C3AED' : '#64748B'}
                style={styles.chevronIcon}
              />
            </View>
          </TouchableOpacity>

          {activeStep === 4 && (
            <Animated.View entering={FadeInDown.duration(220).springify().damping(22).stiffness(180)} exiting={FadeOutUp.duration(150)} style={styles.accordionContent}>
              <View style={styles.pledgeHeaderRow}>
                <View style={styles.parameterLeftCol}>
                  <Text style={styles.parameterTitle}>{t('commit.pledgeAmountLabel')}</Text>
                  <Text style={styles.parameterDesc}>{t('commit.pledgeAmountDesc')}</Text>
                </View>
                <View style={styles.pledgeStatusBadge}>
                  <MaterialCommunityIcons name="lock-outline" size={12} color="#7C3AED" />
                  <Text style={styles.pledgeStatusText}>{t('commit.securedLabel')}</Text>
                </View>
              </View>

              <View style={styles.largePledgeDisplay}>
                <Text style={styles.largePledgeSymbol}>€</Text>
                <Text style={styles.largePledgeAmount}>{stake}</Text>
                <Text style={styles.largePledgeCents}>.00</Text>
              </View>

              <View style={styles.stakePillRow}>
                {[5, 10, 20].map((amt) => {
                  const isSelected = stake === amt && !customStake;
                  return (
                    <TouchableOpacity
                      key={amt}
                      onPress={() => handleStakeChange(amt)}
                      style={[styles.stakePillExpanded, isSelected && styles.stakePillActive]}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.stakePillTextExpanded, isSelected && styles.stakePillTextActive]}>
                        €{amt}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                
                <TouchableOpacity
                  onPress={handleOpenCustomSheet}
                  style={[styles.stakePillExpanded, !!customStake && styles.stakePillActive]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.stakePillTextExpanded, !!customStake && styles.stakePillTextActive]}>
                    {customStake ? `€${customStake}` : t('commit.startCustom')}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.targetDivider} />
              <TouchableOpacity
                style={styles.stepContinueButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setIsStakeSelected(true);
                  setActiveStep(0);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.stepContinueButtonText}>{t('commit.readyToLock')}</Text>
                <MaterialCommunityIcons name="check-bold" size={14} color="#FFFFFF" />
              </TouchableOpacity>
            </Animated.View>
          )}
        </Animated.View>

        </ScrollView>
        <AppHeader />
      </View>

      {/* Date Picker Modal (iOS / Web) / Dialog (Android) */}
      {isDatePickerVisible && Platform.OS === 'android' && (
        <DateTimePicker
          value={customStartDate}
          mode="date"
          display="default"
          minimumDate={minimumDatePickerDate}
          maximumDate={maximumDatePickerDate}
          onChange={handleDateChange}
        />
      )}

      {isDatePickerVisible && Platform.OS !== 'android' && (
        <Modal
          visible={isDatePickerVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setIsDatePickerVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity 
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={() => setIsDatePickerVisible(false)}
            />

            <BlurView tint="dark" intensity={95} style={styles.modalContent}>
              <View style={styles.sheetHeader}>
                <View style={styles.sheetPullBar} />
                <Text style={styles.customSheetTitle}>{t('commit.selectStartDateTitle')}</Text>
                <Text style={styles.customSheetSubtitle}>{t('commit.selectStartDateDesc')}</Text>
              </View>

              <View style={styles.datePickerContainer}>
                <DateTimePicker
                  value={customStartDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  themeVariant="dark"
                  minimumDate={minimumDatePickerDate}
                  maximumDate={maximumDatePickerDate}
                  onChange={handleDateChange}
                  textColor="#FFFFFF"
                  accentColor="#7C3AED"
                />
              </View>

              <TouchableOpacity
                onPress={() => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  setStartDateChoice('custom');
                  setIsDatePickerVisible(false);
                  setIsDurationSelected(true);
                }}
                style={styles.confirmCustomButton}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmCustomButtonText}>{t('commit.confirmStartDate')}</Text>
              </TouchableOpacity>
            </BlurView>
          </View>
        </Modal>
      )}

      {/* Custom Stake Selector Bottom Sheet */}
      <Modal
        visible={isCustomSheetVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsCustomSheetVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setIsCustomSheetVisible(false)}
          />

          <BlurView tint="dark" intensity={95} style={styles.modalContent}>
            <View style={styles.sheetHeader}>
              <View style={styles.sheetPullBar} />
              <Text style={styles.customSheetTitle}>{t('commit.selectCustomPledgeTitle')}</Text>
              <Text style={styles.customSheetSubtitle}>{t('commit.selectCustomPledgeDesc')}</Text>
            </View>

            <View style={styles.customPickerContainer}>
              {/* Highlight selection frame indicator */}
              <View style={styles.pickerHighlight} />
              
              <ScrollView
                ref={pickerScrollRef}
                style={styles.customPickerScrollView}
                contentContainerStyle={styles.customPickerScrollContent}
                showsVerticalScrollIndicator={false}
                snapToInterval={48}
                decelerationRate="fast"
                scrollEventThrottle={16}
                onScroll={handlePickerScroll}
              >
                {customStakeOptions.map((val) => {
                  const isSelected = tempStake === val;
                  return (
                    <TouchableOpacity
                      key={val}
                      onPress={() => handlePickerItemPress(val)}
                      style={[
                        styles.pickerItem,
                        isSelected && styles.pickerItemActive
                      ]}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.pickerItemText,
                        isSelected && styles.pickerItemTextActive
                      ]}>
                        €{val}.00
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            <TouchableOpacity
              onPress={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setStake(tempStake);
                setCustomStake(tempStake.toString());
                setIsCustomSheetVisible(false);
                setIsStakeSelected(true);
                
                // Collapse accordion as all steps are completed!
                setTimeout(() => {
                  setActiveStep(0);
                }, 200);
              }}
              style={styles.confirmCustomButton}
              activeOpacity={0.8}
            >
              <Text style={styles.confirmCustomButtonText}>{t('commit.confirmCustomPledge', { stake: tempStake })}</Text>
            </TouchableOpacity>
          </BlurView>
        </View>
      </Modal>



      {/* Ready Indicator (Above the footer line) */}
      {activeStep === 0 && allStepsReady && (
        <View style={styles.readyIndicatorAbove}>
          <MaterialCommunityIcons name={"check-circle" as any} size={14} color="#05D38E" />
          <Text style={styles.readyIndicatorText}>{t('commit.allStepsReady')}</Text>
          <MaterialCommunityIcons name={"arrow-down" as any} size={14} color="#05D38E" />
        </View>
      )}

      {/* Fixed Bottom Action Bar */}
      <View style={styles.fixedBottomContainer}>
        {/* Lock Commitment Button */}
        <TouchableOpacity
          onPress={allStepsReady ? triggerPaymentSheet : undefined}
          style={[styles.submitButton, !allStepsReady && { opacity: 0.5 }]}
          activeOpacity={allStepsReady ? 0.9 : 1}
        >
          <LinearGradient colors={['#7C3AED', '#4F46E5']} style={styles.submitGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <MaterialCommunityIcons name="lock" size={18} color="#FFFFFF" />
            <Text style={styles.submitText}>{t('commit.pledgeAndLock', { stake })}</Text>
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.disclaimerText}>
          {t('commit.disclaimerText')}
        </Text>
      </View>

      {/* Native Tracking Disclaimer Modal */}
      <Modal
        visible={isDisclaimerVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsDisclaimerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setIsDisclaimerVisible(false)}
          />

          <BlurView tint="dark" intensity={95} style={styles.modalContent}>
            <View style={styles.sheetHeader}>
              <View style={styles.sheetPullBar} />
              <View style={styles.disclaimerHeaderRow}>
                <View style={styles.disclaimerIconContainer}>
                  <MaterialCommunityIcons name="shield-alert" size={24} color="#FF4A85" />
                </View>
                <Text style={styles.disclaimerTitle}>{t('commit.verificationNoticeTitle')}</Text>
              </View>
            </View>

            <View style={styles.sheetBody}>
              <View style={styles.disclaimerBox}>
                <MaterialCommunityIcons name="radar" size={32} color="#7C3AED" style={styles.disclaimerBoxIcon} />
                <Text style={styles.disclaimerHeading}>{t('commit.hardwareTrackingTitle')}</Text>
                <Text style={styles.disclaimerDescription}>
                  {t('commit.hardwareTrackingDesc')}
                </Text>
              </View>

              <View style={styles.noticeList}>
                <View style={styles.noticeItem}>
                  <MaterialCommunityIcons name="close-circle-outline" size={18} color="#FF4A85" />
                  <Text style={styles.noticeText}>
                    {t('commit.noticeManual')}
                  </Text>
                </View>
                <View style={styles.noticeItem}>
                  <MaterialCommunityIcons name="check-circle-outline" size={18} color="#05D38E" />
                  <Text style={styles.noticeText}>
                    {t('commit.noticeHardware')}
                  </Text>
                </View>
              </View>

              {/* Official Verification Guide Link */}
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setIsVerificationGuideVisible(true);
                }}
                style={styles.learnMoreLink}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="shield-check-outline" size={16} color="#8B5CF6" />
                <Text style={styles.learnMoreText}>{t('commit.readOfficialGuide')}</Text>
              </TouchableOpacity>

              {/* Checkbox for Consent */}
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setHasAcceptedDisclaimer(!hasAcceptedDisclaimer);
                }}
                style={styles.checkboxRow}
                activeOpacity={0.8}
              >
                <View style={[styles.checkbox, hasAcceptedDisclaimer && styles.checkboxChecked]}>
                  {hasAcceptedDisclaimer && (
                    <MaterialCommunityIcons name="check" size={14} color="#FFFFFF" />
                  )}
                </View>
                <Text style={styles.checkboxLabel}>
                  {t('commit.acceptConsentLabel')}
                </Text>
              </TouchableOpacity>

              {/* Action Buttons */}
              <View style={styles.disclaimerButtonRow}>
                <TouchableOpacity
                  onPress={() => setIsDisclaimerVisible(false)}
                  style={styles.cancelDisclaimerButton}
                  activeOpacity={0.8}
                >
                  <Text style={styles.cancelDisclaimerButtonText}>{t('commit.cancelLabel')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleAcceptDisclaimer}
                  disabled={!hasAcceptedDisclaimer}
                  style={[
                    styles.acceptDisclaimerButton,
                    !hasAcceptedDisclaimer && styles.acceptDisclaimerButtonDisabled
                  ]}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={hasAcceptedDisclaimer ? ['#7C3AED', '#4F46E5'] : ['#1C1F30', '#1C1F30']}
                    style={styles.acceptDisclaimerGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={[
                      styles.acceptDisclaimerButtonText,
                      !hasAcceptedDisclaimer && styles.acceptDisclaimerButtonTextDisabled
                    ]}>
                      {t('commit.acceptContinue')}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </BlurView>
        </View>
      </Modal>

      {/* Simulated Apple Pay / Google Pay Bottom Sheet */}
      <Modal
        visible={isPaymentSheetVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsPaymentSheetVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => paymentStep !== 'processing' && setIsPaymentSheetVisible(false)}
          />

          <BlurView tint="dark" intensity={95} style={styles.modalContent}>
            
            {/* Native Apple/Google Pay Header Mock */}
            <View style={styles.sheetHeader}>
              <View style={styles.sheetPullBar} />
              <View style={styles.payLogoRow}>
                <MaterialCommunityIcons 
                  name={Platform.OS === 'ios' ? 'apple' : 'google'} 
                  size={24} 
                  color="#FFFFFF" 
                />
                <Text style={styles.payLogoText}>Pay</Text>
              </View>
            </View>

            {paymentStep === 'idle' && (
              <View style={styles.sheetBody}>
                {/* Card and Transaction Details */}
                <View style={styles.payRow}>
                  <Text style={styles.payRowLabel}>{t('commit.payCard')}</Text>
                  <Text style={styles.payRowValue}>•••• 4890</Text>
                </View>

                <View style={styles.payDivider} />

                <View style={styles.payRow}>
                  <Text style={styles.payRowLabel}>{t('commit.payMerchant')}</Text>
                  <Text style={styles.payRowValue}>HabitContract Platform GmbH</Text>
                </View>

                <View style={styles.payDivider} />

                <View style={styles.payRow}>
                  <Text style={styles.payRowLabel}>{t('commit.payCommitment')}</Text>
                  <Text style={styles.payRowValue}>
                    {getMetricFullName(metric).toUpperCase()}: {targetValue.toLocaleString()} {getMetricLabel()}
                  </Text>
                </View>

                <View style={styles.payDivider} />

                <View style={styles.payRow}>
                  <Text style={styles.payRowLabel}>{t('commit.payTotal')}</Text>
                  <Text style={styles.payTotalValue}>€{stake}.00</Text>
                </View>

                {/* Double click side button prompt for iOS feel */}
                {Platform.OS === 'ios' ? (
                  <View style={styles.doubleClickWrapper}>
                    <MaterialCommunityIcons name="gesture-double-tap" size={24} color="#7C3AED" />
                    <Text style={styles.doubleClickText}>
                      {t('commit.payDoubleClick')}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.fingerprintPrompt}>
                    {t('commit.payFingerprint')}
                  </Text>
                )}

                <TouchableOpacity 
                  onPress={() => confirmPayment()} 
                  style={styles.payButton}
                  activeOpacity={0.8}
                >
                  <Text style={styles.payButtonText}>
                    {t('commit.payConfirm', { stake })}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {paymentStep === 'processing' && (
              <View style={styles.sheetCenterBody}>
                <ActivityIndicator size="large" color="#7C3AED" />
                <Text style={styles.processingText}>{t('commit.payVerifying')}</Text>
                <Text style={styles.processingSubtext}>{t('commit.paySecuring')}</Text>
              </View>
            )}

            {paymentStep === 'success' && (
              <View style={styles.sheetCenterBody}>
                <View style={styles.successCircle}>
                  <MaterialCommunityIcons name="check" size={48} color="#FFFFFF" />
                </View>
                <Text style={styles.successText}>{t('commit.paySuccess')}</Text>
                <Text style={styles.successSubtext}>{t('commit.paySuccessDesc', { stake })}</Text>
              </View>
            )}

          </BlurView>
        </View>
      </Modal>



      {/* Verification Guide Modal */}
      <VerificationGuideModal
        visible={isVerificationGuideVisible}
        onClose={() => setIsVerificationGuideVisible(false)}
      />

    </View>
  );
}

// Custom Fonts Fallback Helper for React Native Stylesheet compilation
const Fonts = {
  sans: Platform.select({ ios: 'System', android: 'sans-serif' }),
  mono: Platform.select({ ios: 'Courier', android: 'monospace' }),
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#06070B',
  },
  rolloverBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.25)',
    padding: Spacing.three,
    marginBottom: Spacing.three,
    marginTop: 10,
  },
  rolloverBannerText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.two,
  },
  fixedBottomContainer: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: (Platform.OS === 'ios' ? 88 : 64) + Spacing.three,
    backgroundColor: '#06070B',
    borderTopWidth: 1,
    borderTopColor: '#181B28',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontFamily: Fonts.sans,
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(5, 211, 142, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(5, 211, 142, 0.2)',
  },
  headerBadgeText: {
    fontFamily: Fonts.mono,
    color: '#05D38E',
    fontSize: 9,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  stepNumberText: {
    fontFamily: Fonts.mono,
    color: '#7C3AED',
    fontSize: 12,
    fontWeight: 'bold',
  },
  stepTitleLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#181B28',
    marginLeft: 8,
  },
  sectionTitle: {
    fontFamily: Fonts.sans,
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  metricScrollContent: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 4,
  },
  metricCardHorizontal: {
    height: 44,
    borderRadius: 14,
    overflow: 'hidden',
  },
  gradientFill: {
    height: '100%',
    justifyContent: 'center',
  },
  metricCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
    height: '100%',
  },
  metricCardInactive: {
    backgroundColor: '#11131E',
    borderWidth: 1,
    borderColor: '#181B28',
    borderRadius: 14,
  },
  metricCardLabel: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  textActive: {
    color: '#FFFFFF',
  },
  textInactive: {
    color: '#94A3B8',
  },
  targetCard: {
    backgroundColor: '#11131E',
    borderWidth: 1,
    borderColor: '#181B28',
    borderRadius: 20,
    padding: 12,
  },
  targetCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  targetCardTitle: {
    fontFamily: Fonts.sans,
    color: '#576880',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  scopeToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#1C1F30',
    borderRadius: 10,
    padding: 2,
    borderWidth: 1,
    borderColor: '#181B28',
  },
  scopeToggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignItems: 'center',
    borderRadius: 8,
  },
  scopeToggleButtonActive: {
    backgroundColor: '#11131E',
    borderWidth: 0.5,
    borderColor: '#181B28',
  },
  scopeToggleText: {
    fontFamily: Fonts.sans,
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  scopeToggleTextActive: {
    color: '#7C3AED',
  },
  targetStepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: Spacing.two,
  },
  stepperButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1C1F30',
    borderWidth: 1,
    borderColor: '#181B28',
    justifyContent: 'center',
    alignItems: 'center',
  },
  targetValueWrapper: {
    alignItems: 'center',
  },
  targetValueText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
  },
  targetValueLabel: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 1,
  },
  syncNoticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 2,
  },
  syncNoticeText: {
    fontSize: 10,
    color: '#576880',
  },
  targetDivider: {
    height: 1,
    backgroundColor: '#181B28',
    marginVertical: 10,
  },
  periodRowCompact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.one,
  },
  periodLeftColCompact: {
    flex: 1,
  },
  periodTitleCompact: {
    fontFamily: Fonts.sans,
    color: '#576880',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  periodDescCompact: {
    color: '#94A3B8',
    fontSize: 11,
  },
  periodPillContainerCompact: {
    flexDirection: 'row',
    gap: 6,
  },
  periodPillCompact: {
    backgroundColor: '#1C1F30',
    borderWidth: 1,
    borderColor: '#181B28',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  periodPillActiveCompact: {
    borderColor: '#7C3AED',
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
  },
  periodPillTextCompact: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: 'bold',
  },
  periodPillTextActiveCompact: {
    color: '#7C3AED',
  },
  parametersCard: {
    backgroundColor: '#11131E',
    borderWidth: 1,
    borderColor: '#181B28',
    borderRadius: 20,
    padding: 12,
  },
  parameterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  parameterLeftCol: {
    flex: 1,
  },
  parameterTitle: {
    fontFamily: Fonts.sans,
    color: '#576880',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  parameterDesc: {
    color: '#94A3B8',
    fontSize: 11,
  },
  pledgeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.two,
  },
  pledgeStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.15)',
  },
  pledgeStatusText: {
    fontFamily: Fonts.mono,
    color: '#7C3AED',
    fontSize: 9,
    fontWeight: 'bold',
  },
  largePledgeDisplay: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'baseline',
    marginVertical: Spacing.two,
  },
  largePledgeSymbol: {
    fontSize: 22,
    color: '#7C3AED',
    fontWeight: '600',
    marginRight: 2,
  },
  largePledgeAmount: {
    fontSize: 36,
    color: '#FFFFFF',
    fontWeight: 'bold',
    letterSpacing: -1,
  },
  largePledgeCents: {
    fontSize: 18,
    color: '#94A3B8',
    fontWeight: '600',
  },
  stakePillRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: Spacing.one,
  },
  stakePillExpanded: {
    flex: 1,
    backgroundColor: '#1C1F30',
    borderWidth: 1,
    borderColor: '#181B28',
    borderRadius: 14,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stakePillTextExpanded: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: 'bold',
  },
  stakePillActive: {
    borderColor: '#7C3AED',
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
  },
  stakePillTextActive: {
    color: '#7C3AED',
  },
  customSheetTitle: {
    fontFamily: Fonts.sans,
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 8,
  },
  customSheetSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  customPickerContainer: {
    height: 160,
    marginVertical: Spacing.three,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  customPickerScrollView: {
    width: '100%',
    height: '100%',
  },
  customPickerScrollContent: {
    paddingVertical: 56, // Allows items to scroll and snap to center (160 height - 48 item height) / 2 = 56
  },
  pickerItem: {
    height: 48,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    opacity: 0.4,
  },
  pickerItemActive: {
    opacity: 1,
  },
  pickerItemText: {
    fontFamily: Fonts.sans,
    color: '#94A3B8',
    fontSize: 18,
    fontWeight: '600',
  },
  pickerItemTextActive: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
  },
  pickerHighlight: {
    position: 'absolute',
    height: 48,
    left: Spacing.four,
    right: Spacing.four,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#7C3AED',
    backgroundColor: 'rgba(124, 58, 237, 0.05)',
  },
  confirmCustomButton: {
    backgroundColor: '#7C3AED',
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: Spacing.four,
    marginBottom: Spacing.two,
  },
  confirmCustomButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  submitButton: {
    marginTop: Spacing.one,
    borderRadius: 16,
    overflow: 'hidden',
  },
  submitGradient: {
    height: 48,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.two,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  disclaimerText: {
    color: '#576880',
    fontSize: 9,
    textAlign: 'center',
    marginTop: Spacing.two,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: Spacing.four,
    borderTopRightRadius: Spacing.four,
    overflow: 'hidden',
    paddingBottom: Platform.OS === 'ios' ? Spacing.five : Spacing.four,
  },
  sheetHeader: {
    alignItems: 'center',
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
  },
  sheetPullBar: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#1C1F30',
    marginBottom: Spacing.two,
  },
  payLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  payLogoText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '500',
  },
  sheetBody: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.two,
  },
  payRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.two,
  },
  payRowLabel: {
    color: '#576880',
    fontSize: 12,
    fontWeight: 'bold',
  },
  payRowValue: {
    color: '#FFFFFF',
    fontSize: 13,
    maxWidth: width * 0.65,
    textAlign: 'right',
  },
  payTotalValue: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  payDivider: {
    height: 1,
    backgroundColor: '#181B28',
  },
  iapNoticeBox: {
    backgroundColor: 'rgba(124, 58, 237, 0.06)',
    borderRadius: Spacing.two,
    padding: Spacing.two,
    marginTop: Spacing.two,
    marginBottom: Spacing.four,
  },
  iapNoticeText: {
    color: '#7C3AED',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 15,
  },
  doubleClickWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    marginTop: Spacing.three,
    marginBottom: Spacing.three,
  },
  doubleClickText: {
    color: '#7C3AED',
    fontSize: 14,
    fontWeight: 'bold',
  },
  fingerprintPrompt: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
    marginTop: Spacing.three,
    marginBottom: Spacing.three,
  },
  payButton: {
    backgroundColor: '#FFFFFF',
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  payButtonText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: 'bold',
  },
  sheetCenterBody: {
    height: 350,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  processingText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: Spacing.two,
  },
  processingSubtext: {
    color: '#576880',
    fontSize: 12,
  },
  successCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#05D38E',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  successText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
  },
  successSubtext: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
  },
  disclaimerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  disclaimerIconContainer: {
    backgroundColor: 'rgba(255, 74, 133, 0.1)',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disclaimerTitle: {
    fontFamily: Fonts.sans,
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  disclaimerBox: {
    backgroundColor: 'rgba(124, 58, 237, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.15)',
    borderRadius: 16,
    padding: Spacing.three,
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  disclaimerBoxIcon: {
    marginBottom: Spacing.two,
  },
  disclaimerHeading: {
    fontFamily: Fonts.mono,
    color: '#7C3AED',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: Spacing.one,
  },
  disclaimerDescription: {
    fontFamily: Fonts.sans,
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  noticeList: {
    gap: Spacing.two,
    marginBottom: Spacing.four,
  },
  learnMoreLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingVertical: 12,
    marginBottom: Spacing.four,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    borderRadius: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
  },
  learnMoreText: {
    fontFamily: Fonts.sans,
    color: '#8B5CF6',
    fontSize: 12,
    fontWeight: 'bold',
  },
  noticeItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    backgroundColor: '#0F111A',
    borderRadius: 12,
    padding: Spacing.two,
  },
  noticeText: {
    fontFamily: Fonts.sans,
    color: '#E2E8F0',
    fontSize: 12,
    flex: 1,
    lineHeight: 17,
  },
  boldText: {
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: 'rgba(124, 58, 237, 0.05)',
    borderColor: 'rgba(124, 58, 237, 0.2)',
    borderWidth: 1,
    borderRadius: 12,
    padding: Spacing.three,
    marginBottom: Spacing.four,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#7C3AED',
  },
  checkboxLabel: {
    fontFamily: Fonts.sans,
    color: '#FFFFFF',
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
    fontWeight: '500',
  },
  disclaimerButtonRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  cancelDisclaimerButton: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelDisclaimerButtonText: {
    fontFamily: Fonts.sans,
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: 'bold',
  },
  acceptDisclaimerButton: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
  acceptDisclaimerButtonDisabled: {
    opacity: 0.6,
  },
  acceptDisclaimerGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptDisclaimerButtonText: {
    fontFamily: Fonts.sans,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  acceptDisclaimerButtonTextDisabled: {
    color: '#475569',
  },

  payButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  payButtonTextDisabled: {
    color: '#64748B',
  },
  accordionItem: {
    backgroundColor: '#11131E',
    borderWidth: 1,
    borderColor: '#181B28',
    borderRadius: 20,
    marginBottom: 12,
    overflow: 'hidden',
  },
  accordionItemActive: {
    borderColor: '#7C3AED',
    backgroundColor: '#11131E',
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  accordionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1C1F30',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#181B28',
  },
  stepBadgeActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  stepBadgeCompleted: {
    backgroundColor: '#05D38E',
    borderColor: '#05D38E',
  },
  stepNumberTextActive: {
    color: '#FFFFFF',
  },
  accordionTitle: {
    fontFamily: Fonts.sans,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  accordionSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1F30',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: '#181B28',
    marginRight: 6,
  },
  accordionSummaryText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  chevronIcon: {
    marginLeft: 2,
  },
  accordionContent: {
    paddingHorizontal: 12,
    paddingBottom: 16,
  },
  stepContinueButton: {
    flexDirection: 'row',
    backgroundColor: '#7C3AED',
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  stepContinueButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  readyIndicatorAbove: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(5, 211, 142, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(5, 211, 142, 0.25)',
    borderRadius: 12,
    paddingVertical: 8,
    marginHorizontal: Spacing.four,
    marginBottom: 12,
  },
  readyIndicatorText: {
    fontFamily: Fonts.sans,
    color: '#05D38E',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  datePillContainer: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 6,
    justifyContent: 'flex-end',
    flex: 1.5,
  },
  datePillCompact: {
    backgroundColor: '#1C1F30',
    borderWidth: 1,
    borderColor: '#181B28',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  datePillActiveCompact: {
    borderColor: '#7C3AED',
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
  },
  datePillTextCompact: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: 'bold',
  },
  datePillTextActiveCompact: {
    color: '#7C3AED',
  },
  datePickerContainer: {
    marginVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    backgroundColor: 'transparent',
  },
});
