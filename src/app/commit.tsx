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
import { useAuth } from '@/services/auth';

const { width } = Dimensions.get('window');

export default function CommitScreen() {
  const router = useRouter();
  const { user } = useAuth();
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
  const [durationDays, setDurationDays] = useState<number>(3);
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
    ];
  };

  const getCommitmentDates = (choice: 'today' | 'tomorrow' | 'custom', durationDays: number) => {
    const options = getStartDateOptions();
    const selectedOpt = options.find(o => o.id === choice) || options[0];
    const startDate = new Date(selectedOpt.date);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + durationDays - 1);
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

    // Removed auto advance to allow target configuration in same step
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
    setDurationDays(3);
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
    if (!user?.hasPaymentMethod) {
      Alert.alert(
        'Payment Method Required',
        'Apple does not allow us to process this payment in-app. Please visit our website to securely authorize your payment method with Stripe. You only need to do this once.',
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPaymentStep('processing');

    try {
      // Calculate dates based on selected start date choice and period
      const { startDate, endDate } = getCommitmentDates(startDateChoice, durationDays);

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
        durationDays,
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

      // Save to active commitment storage (this now triggers the backend Stripe charge)
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
    const suffix = targetScope === 'weekly' ? '' : t('metrics.per_day');
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
    const isWeekly = targetScope === 'weekly';
    const key = `commit.statement_${isWeekly ? 'weekly' : 'daily'}_${metric}`;
    return t(key, { value: formattedValue, period: '' });
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
      <AppHeader />
      
      <View style={{ flex: 1 }}>
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: BASE_HEADER_HEIGHT + insets.top + 8, paddingBottom: 100 }
          ]}
          showsVerticalScrollIndicator={false}
        >
        
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

        {/* 1. Activity Row */}
        <View style={styles.dashboardSection}>
          <Text style={styles.sectionLabel}>ACTIVITY</Text>
          <View style={styles.activityRow}>
            {(['steps', 'run', 'mindfulness'] as MetricType[]).map((type) => {
              const isActive = metric === type;
              const gradient = getMetricColor(type);
              const CardContent = (
                <View style={[styles.metricCardInner, !isActive && styles.metricCardInactive]}>
                  <MaterialCommunityIcons name={getMetricIcon(type)} size={18} color={isActive ? '#FFFFFF' : '#94A3B8'} />
                  <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.metricCardLabel, isActive ? styles.textActive : styles.textInactive]}>
                    {getMetricFullName(type)}
                  </Text>
                </View>
              );
              return (
                <TouchableOpacity key={type} onPress={() => handleMetricChange(type)} style={styles.metricCardHorizontal} activeOpacity={0.8}>
                  {isActive ? (
                    <LinearGradient colors={gradient} style={styles.gradientFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                      {CardContent}
                    </LinearGradient>
                  ) : CardContent}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 2. Target Row */}
        <View style={styles.dashboardSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>TARGET</Text>
            <View style={styles.scopeToggleContainerCompact}>
              <TouchableOpacity onPress={() => handleTargetScopeChange('daily')} style={[styles.scopePillCompact, targetScope === 'daily' && styles.scopePillActiveCompact]}>
                <Text style={[styles.scopePillTextCompact, targetScope === 'daily' && styles.scopeTextActive]}>Daily</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleTargetScopeChange('weekly')} style={[styles.scopePillCompact, targetScope === 'weekly' && styles.scopePillActiveCompact]}>
                <Text style={[styles.scopePillTextCompact, targetScope === 'weekly' && styles.scopeTextActive]}>Total</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.targetStepperRowCompact}>
            <TouchableOpacity onPress={() => decrementTarget(getStepSize())} style={styles.stepperButtonCompact} activeOpacity={0.7}>
              <MaterialCommunityIcons name="minus" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.targetValueWrapperCompact}>
              <Text style={styles.targetValueTextCompact}>
                {metric === 'steps' || metric === 'calories' ? targetValue.toLocaleString() : targetValue}
              </Text>
              <Text style={styles.targetValueLabelCompact}>{getMetricLabel()}</Text>
            </View>
            <TouchableOpacity onPress={() => incrementTarget(getStepSize())} style={styles.stepperButtonCompact} activeOpacity={0.7}>
              <MaterialCommunityIcons name="plus" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* 3. Duration Row */}
        <View style={styles.dashboardSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>DURATION</Text>
            <View style={styles.scopeToggleContainerCompact}>
              {getStartDateOptions().map((opt) => {
                const isSelected = startDateChoice === opt.id;
                return (
                  <TouchableOpacity key={opt.id} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setStartDateChoice(opt.id); }} style={[styles.scopePillCompact, isSelected && styles.scopePillActiveCompact]}>
                    <Text style={[styles.scopePillTextCompact, isSelected && styles.scopeTextActive]}>{opt.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.targetStepperRowCompact}>
            <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setDurationDays(v => Math.max(3, v - 1)); }} style={styles.stepperButtonCompact} activeOpacity={0.7}>
              <MaterialCommunityIcons name="minus" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.targetValueWrapperCompact}>
              <Text style={styles.targetValueTextCompact}>{durationDays}</Text>
              <Text style={styles.targetValueLabelCompact}>Days</Text>
            </View>
            <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setDurationDays(v => Math.min(10, v + 1)); }} style={styles.stepperButtonCompact} activeOpacity={0.7}>
              <MaterialCommunityIcons name="plus" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* 4. Stake Row */}
        <View style={styles.dashboardSection}>
          <Text style={styles.sectionLabel}>STAKE</Text>
          <View style={styles.stakeGrid}>
            {[5, 10, 20].map((amount) => {
              const isSelected = stake === amount;
              return (
                <TouchableOpacity key={amount} style={[styles.stakeCardCompact, isSelected && styles.stakeCardActive]} onPress={() => handleStakeChange(amount)} activeOpacity={0.8}>
                  <Text style={[styles.stakeAmountTextCompact, isSelected && styles.textActive]}>€{amount}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        </ScrollView>
      </View>

      <View style={[styles.fixedBottomContainer, { paddingBottom: Math.max(insets.bottom + 16, 24) }]}>
        <Text style={styles.summaryDateText}>
          {(() => {
            const dates = getCommitmentDates(startDateChoice, durationDays);
            return `${formatDisplayDate(dates.startDate)} — ${formatDisplayDate(dates.endDate)}`;
          })()}
        </Text>
        <TouchableOpacity onPress={triggerPaymentSheet} style={styles.submitButton} activeOpacity={0.9}>
          <LinearGradient colors={['#7C3AED', '#4F46E5']} style={styles.submitGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <MaterialCommunityIcons name="lock" size={18} color="#FFFFFF" />
            <Text style={styles.submitText}>{t('commit.pledgeAndLock', { stake })}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
      
      <Modal visible={isDisclaimerVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <MaterialCommunityIcons name="shield-check" size={24} color="#05D38E" />
              <Text style={styles.modalTitle}>{t('commit.healthAccessTitle')}</Text>
            </View>
            <Text style={styles.modalBody}>{t('commit.healthAccessDesc')}</Text>
            <TouchableOpacity style={styles.modalButton} onPress={() => setIsDisclaimerVisible(false)}>
              <Text style={styles.modalButtonText}>{t('commit.gotIt')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F111A',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 0,
  },
  rolloverBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.3)',
    padding: 16,
    marginBottom: 8,
    marginHorizontal: 16,
  },
  rolloverBannerText: {
    flex: 1,
    fontSize: 13,
    color: '#E2E8F0',
    fontWeight: '500',
    lineHeight: 18,
  },
  header: {
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  dashboardSection: {
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1.5,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  activityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  metricCardHorizontal: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    overflow: 'hidden',
  },
  metricCardInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  metricCardInactive: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  metricCardLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  textActive: {
    color: '#FFFFFF',
  },
  textInactive: {
    color: '#94A3B8',
  },
  gradientFill: {
    ...StyleSheet.absoluteFill,
  },
  scopeToggleContainerCompact: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 3,
  },
  scopePillCompact: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 7,
  },
  scopePillActiveCompact: {
    backgroundColor: '#7C3AED',
  },
  scopePillTextCompact: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  scopeTextActive: {
    color: '#FFFFFF',
  },
  targetStepperRowCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  stepperButtonCompact: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetValueWrapperCompact: {
    alignItems: 'center',
  },
  targetValueTextCompact: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  targetValueLabelCompact: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  stakeGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  stakeCardCompact: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  stakeCardActive: {
    borderColor: '#7C3AED',
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
  },
  stakeAmountTextCompact: {
    fontSize: 16,
    fontWeight: '800',
    color: '#94A3B8',
  },
  summaryDateText: {
    textAlign: 'center',
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  fixedBottomContainer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    backgroundColor: 'rgba(17, 19, 30, 0.8)',
  },
  submitButton: {
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  submitGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  modalBody: {
    fontSize: 16,
    color: '#94A3B8',
    lineHeight: 24,
    marginBottom: 24,
  },
  modalButton: {
    backgroundColor: '#7C3AED',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
