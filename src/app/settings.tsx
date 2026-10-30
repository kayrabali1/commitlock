import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
  Modal,
  Pressable,
  Switch,
  Animated,
  useWindowDimensions,
  BackHandler,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Spacing, BottomTabInset } from '@/constants/theme';
import { HealthDataService } from '@/services/health';
import { useAuth, API_URL } from '@/services/auth';
import { VerificationGuideModal } from '@/components/VerificationGuideModal';
import { SyncVerificationModal } from '@/components/SyncVerificationModal';
import AppHeader, { BASE_HEADER_HEIGHT } from '@/components/AppHeader';
import { NotificationService } from '@/services/notifications';
import { useTranslation } from 'react-i18next';

type NotificationKeys = 'dailyReminder' | 'statusUpdates' | 'stakeAlerts' | 'weeklyReport' | 'gracePeriodSync' | 'achievementAlerts';

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, signOut, updateAvatar } = useAuth();
  const { t, i18n } = useTranslation();
  const { width: screenWidth } = useWindowDimensions();
  const { debug_auto_reset } = useLocalSearchParams<{ debug_auto_reset?: string }>();

  // Dev auto-reset handler
  useEffect(() => {
    if (debug_auto_reset === 'true' && __DEV__) {
      console.log('[Settings] Debug auto-reset triggered');
      const performReset = async () => {
        try {
          await HealthDataService.resetAllData();
          console.log('[Settings] Sandbox database reset successfully.');
          router.replace('/');
        } catch (error) {
          console.error('Failed to reset sandbox', error);
        }
      };
      performReset();
    }
  }, [debug_auto_reset]);

  // State controls
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncMetrics, setSyncMetrics] = useState<{
    steps: { value: number; status: 'granted' | 'denied' | 'unsupported' };
    mindfulness: { value: number; status: 'granted' | 'denied' | 'unsupported' };
    distance: { value: number; status: 'granted' | 'denied' | 'unsupported' };
  }>({
    steps: { value: 0, status: 'unsupported' },
    mindfulness: { value: 0, status: 'unsupported' },
    distance: { value: 0, status: 'unsupported' },
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [activePane, setActivePane] = useState<'main' | 'notifications' | 'coins'>('main');

  // Notification toggles
  const [notifications, setNotifications] = useState({
    dailyReminder: true,
    statusUpdates: true,
    stakeAlerts: true,
    weeklyReport: false,
    gracePeriodSync: true,
    achievementAlerts: true,
  });

  // Animated sliding positions (start off-screen to the right)
  const [notificationsTranslateX] = useState(() => new Animated.Value(screenWidth));
  const [coinsTranslateX] = useState(() => new Animated.Value(screenWidth));

  // Sync offscreen coordinates if dimensions change
  useEffect(() => {
    if (activePane === 'main') {
      notificationsTranslateX.setValue(screenWidth);
      coinsTranslateX.setValue(screenWidth);
    }
  }, [screenWidth, activePane, notificationsTranslateX, coinsTranslateX]);

  // Load notification settings on mount
  useEffect(() => {
    const loadNotificationSettings = async () => {
      try {
        const token = await AsyncStorage.getItem('@habitcontract_jwt_token');
        if (token) {
          const response = await fetch(`${API_URL}/api/user/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (response.ok) {
            const data = await response.json();
            if (data.notificationSettings) {
              const merged = {
                dailyReminder: true,
                statusUpdates: true,
                stakeAlerts: true,
                weeklyReport: false,
                gracePeriodSync: true,
                achievementAlerts: true,
                ...data.notificationSettings
              };
              setNotifications(merged);
              await AsyncStorage.setItem('user_notification_settings', JSON.stringify(merged));
              return;
            }
          }
        }

        const stored = await AsyncStorage.getItem('user_notification_settings');
        if (stored) {
          const merged = {
            dailyReminder: true,
            statusUpdates: true,
            stakeAlerts: true,
            weeklyReport: false,
            gracePeriodSync: true,
            achievementAlerts: true,
            ...JSON.parse(stored)
          };
          setNotifications(merged);
        }
      } catch (error) {
        console.error('Failed to load notification settings:', error);
      }
    };
    loadNotificationSettings();

  }, []);

  const navigateToPane = useCallback((pane: 'main' | 'notifications' | 'coins') => {
    if (pane === 'notifications') {
      setActivePane('notifications');
      Animated.timing(notificationsTranslateX, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    } else if (pane === 'coins') {
      setActivePane('coins');
      Animated.timing(coinsTranslateX, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    } else {
      if (activePane === 'notifications') {
        Animated.timing(notificationsTranslateX, {
          toValue: screenWidth,
          duration: 220,
          useNativeDriver: true,
        }).start(() => {
          setActivePane('main');
        });
      } else if (activePane === 'coins') {
        Animated.timing(coinsTranslateX, {
          toValue: screenWidth,
          duration: 220,
          useNativeDriver: true,
        }).start(() => {
          setActivePane('main');
        });
      }
    }
  }, [screenWidth, notificationsTranslateX, coinsTranslateX, activePane]);

  // Handle hardware back button on Android
  useEffect(() => {
    const onBackPress = () => {
      if (activePane !== 'main') {
        navigateToPane('main');
        return true;
      }
      return false;
    };

    if (Platform.OS !== 'web') {
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }
  }, [activePane, navigateToPane]);

  const toggleNotification = async (key: NotificationKeys) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updated = { ...notifications, [key]: !notifications[key] };
    setNotifications(updated);
    try {
      await AsyncStorage.setItem('user_notification_settings', JSON.stringify(updated));
      const token = await AsyncStorage.getItem('@habitcontract_jwt_token');
      if (token) {
        await fetch(`${API_URL}/api/user/profile`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ notificationSettings: updated }),
        });
      }
      
      // Update the scheduled notifications based on the new settings
      await NotificationService.scheduleAllNotifications();
    } catch (error) {
      console.error('Failed to save notification settings:', error);
    }
  };


  const handleAvatarPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowPhotoModal(true);
  };

  const handleCameraLaunch = async () => {
    setShowPhotoModal(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        if (Platform.OS === 'web') {
          alert('Camera permissions are required to take a photo.');
        } else {
          Alert.alert('Permission Denied', 'Camera permissions are required to take a photo.');
        }
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        await updateAvatar(result.assets[0].uri);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Error launching camera:', error);
      if (Platform.OS === 'web') {
        alert('An error occurred while opening the camera.');
      } else {
        Alert.alert('Error', 'An error occurred while opening the camera.');
      }
    }
  };

  const handleLibraryLaunch = async () => {
    setShowPhotoModal(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        if (Platform.OS === 'web') {
          alert('Photo library permissions are required to choose a picture.');
        } else {
          Alert.alert('Permission Denied', 'Photo library permissions are required to choose a picture.');
        }
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        await updateAvatar(result.assets[0].uri);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Error launching library:', error);
      if (Platform.OS === 'web') {
        alert('An error occurred while selecting the picture.');
      } else {
        Alert.alert('Error', 'An error occurred while selecting the picture.');
      }
    }
  };

  const handleRemovePhoto = async () => {
    setShowPhotoModal(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await updateAvatar(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error removing photo:', error);
    }
  };

  const isDefaultAvatar = !user?.avatar || user.avatar.includes('ui-avatars.com');

  const handleSignOut = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    const performSignOut = async () => {
      try {
        await signOut();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (error) {
        console.error('Failed to sign out', error);
      }
    };

    if (Platform.OS === 'web') {
      if (confirm('Are you sure you want to sign out?')) {
        performSignOut();
      }
    } else {
      Alert.alert(
        'Sign Out',
        'Are you sure you want to end your active session?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign Out', style: 'destructive', onPress: performSignOut },
        ]
      );
    }
  };

  const handleResetSandbox = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    const performReset = async () => {
      try {
        await HealthDataService.resetAllData();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        if (Platform.OS === 'web') {
          alert('Sandbox database reset successfully.');
        } else {
          Alert.alert('Sandbox Reset', 'All commitments, history, and simulator logs have been cleared.');
        }
        
        await signOut();
        router.replace('/');
      } catch (error) {
        console.error('Failed to reset sandbox', error);
      }
    };

    if (Platform.OS === 'web') {
      if (confirm('Are you sure you want to reset all commitment data and history logs?')) {
        performReset();
      }
    } else {
      Alert.alert(
        'Reset Developer Sandbox',
        'Are you sure you want to clear all active commitments, performance history, and simulated sensor values?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Reset Everything', style: 'destructive', onPress: performReset },
        ]
      );
    }
  };

  const handleRequestPermissions = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSyncing(true);
    const success = await HealthDataService.requestPermissions();
    if (success) {
      const todayMetrics = await HealthDataService.queryTodayMetrics();
      setSyncMetrics(todayMetrics);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowSyncModal(true);
    } else {
      Alert.alert('Sync Failed', 'Could not request or verify health sensor access. Please verify settings.');
    }
    setIsSyncing(false);
  };


  return (
    <View style={styles.container}>
      {/* Main settings content */}
      <View style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: BASE_HEADER_HEIGHT + insets.top + Spacing.three }
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{t('settings.headerTitle')}</Text>
          </View>

          {/* Premium Account Profile Card */}
          <View style={styles.profileCard}>
            <View style={styles.avatarRow}>
              <TouchableOpacity
                onPress={handleAvatarPress}
                activeOpacity={0.85}
                style={styles.avatarContainer}
              >
                <LinearGradient
                  colors={['#7C3AED', '#4F46E5']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.avatarGradientRing}
                >
                  <View style={styles.avatarInnerContainer}>
                    {user?.avatar ? (
                      <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
                    ) : (
                      <View style={styles.avatarFallback}>
                        <MaterialCommunityIcons name="account" size={30} color="#7C3AED" />
                      </View>
                    )}
                  </View>
                </LinearGradient>
                <View style={styles.editIconBadge}>
                  <MaterialCommunityIcons name="camera" size={11} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
              
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{user?.name || 'Kayra Bali'}</Text>
                <Text style={styles.profileEmail}>{user?.email || 'demo@commitlock.com'}</Text>
                <TouchableOpacity
                  onPress={handleAvatarPress}
                  activeOpacity={0.7}
                  style={styles.editProfileButton}
                >
                  <Text style={styles.editProfileText}>{t('settings.changePhoto')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Section: Preferences */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('settings.sectionPreferences')}</Text>
            <View style={styles.cardList}>
              <TouchableOpacity 
                onPress={() => navigateToPane('notifications')} 
                style={styles.settingItemClickable}
                activeOpacity={0.6}
              >
                <View style={styles.settingItemLeft}>
                  <View style={[styles.iconBg, { backgroundColor: 'rgba(124, 58, 237, 0.1)' }]}>
                    <MaterialCommunityIcons name="bell-outline" size={20} color="#8B5CF6" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle}>{t('settings.notifications')}</Text>
                    <Text style={styles.itemSubtitle}>{t('settings.notificationsSubtitle')}</Text>
                  </View>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#576880" />
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={() => navigateToPane('coins')} 
                style={styles.settingItemClickable}
                activeOpacity={0.6}
              >
                <View style={styles.settingItemLeft}>
                  <View style={[styles.iconBg, { backgroundColor: 'rgba(251, 191, 36, 0.1)' }]}>
                    <MaterialCommunityIcons name="star-circle-outline" size={20} color="#FBBF24" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle}>My Challenge Coins</Text>
                    <Text style={styles.itemSubtitle}>View your available coins and values</Text>
                  </View>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#576880" />
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={() => setShowLanguageModal(true)} 
                style={[styles.settingItemClickable, { borderBottomWidth: 0 }]}
                activeOpacity={0.6}
              >
                <View style={styles.settingItemLeft}>
                  <View style={[styles.iconBg, { backgroundColor: 'rgba(236, 72, 153, 0.1)' }]}>
                    <MaterialCommunityIcons name="translate" size={20} color="#EC4899" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle}>{t('settings.language')}</Text>
                    <Text style={styles.itemSubtitle}>{t('settings.languageSubtitle')}</Text>
                  </View>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#576880" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Section: Health & Verification */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('settings.sectionServices')}</Text>
            <View style={styles.cardList}>
              <TouchableOpacity 
                onPress={handleRequestPermissions} 
                style={styles.settingItemClickable}
                activeOpacity={0.6}
              >
                <View style={styles.settingItemLeft}>
                  <View style={[styles.iconBg, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                    <MaterialCommunityIcons name="heart-pulse" size={20} color="#10B981" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle}>
                      {t('settings.testHealthConnection')}
                    </Text>
                    <Text style={styles.itemSubtitle}>{t('settings.healthConnectConnected')}</Text>
                  </View>
                </View>
                {isSyncing ? (
                  <ActivityIndicator size="small" color="#10B981" style={{ marginRight: 4 }} />
                ) : (
                  <MaterialCommunityIcons name="check-circle" size={18} color="#10B981" style={{ marginRight: 2 }} />
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowVerificationModal(true);
                }} 
                style={[styles.settingItemClickable, { borderBottomWidth: 0 }]}
                activeOpacity={0.6}
              >
                <View style={styles.settingItemLeft}>
                  <View style={[styles.iconBg, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                    <MaterialCommunityIcons name="shield-check-outline" size={20} color="#3B82F6" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle}>{t('settings.howVerificationWorks')}</Text>
                    <Text style={styles.itemSubtitle}>{t('settings.howVerificationWorksSubtitle')}</Text>
                  </View>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#576880" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Section: System */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('settings.sectionSystem')}</Text>
            <View style={styles.cardList}>
              <TouchableOpacity 
                onPress={handleResetSandbox} 
                style={styles.settingItemClickable}
                activeOpacity={0.6}
              >
                <View style={styles.settingItemLeft}>
                  <View style={[styles.iconBg, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                    <MaterialCommunityIcons name="alert-octagon-outline" size={20} color="#EF4444" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemTitle, { color: '#EF4444' }]}>{t('settings.resetSandbox')}</Text>
                    <Text style={styles.itemSubtitle}>{t('settings.resetSandboxSubtitle')}</Text>
                  </View>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#EF4444" />
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={handleSignOut} 
                style={[styles.settingItemClickable, { borderBottomWidth: 0 }]}
                activeOpacity={0.6}
              >
                <View style={styles.settingItemLeft}>
                  <View style={[styles.iconBg, { backgroundColor: 'rgba(255, 255, 255, 0.05)' }]}>
                    <MaterialCommunityIcons name="logout" size={20} color="#94A3B8" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle}>{t('settings.signOut')}</Text>
                    <Text style={styles.itemSubtitle}>{t('settings.signOutSubtitle')}</Text>
                  </View>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#576880" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Version Details */}
          <Text style={styles.versionText}>{t('settings.versionPrefix')}</Text>
        </ScrollView>
        <AppHeader showProfile={false} />
      </View>

      {/* Slide-in Pane: Notifications */}
      <Animated.View 
        style={[
          styles.subPane, 
          { 
            transform: [{ translateX: notificationsTranslateX }],
          }
        ]}
      >
        <View style={{ height: insets.top, backgroundColor: '#06070B' }} />
        <View style={styles.subPaneHeader}>
          <TouchableOpacity 
            onPress={() => navigateToPane('main')} 
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="chevron-left" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.subPaneTitle}>{t('settings.notificationsPaneTitle')}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView 
          contentContainerStyle={styles.subPaneContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.subPaneIntro}>
            {t('settings.notificationsIntro')}
          </Text>

          <View style={styles.cardList}>
            <View style={styles.settingItemSwitch}>
              <View style={styles.settingItemLeft}>
                <View style={[styles.iconBg, { backgroundColor: 'rgba(124, 58, 237, 0.1)' }]}>
                  <MaterialCommunityIcons name="alarm" size={20} color="#8B5CF6" />
                </View>
                <View style={{ flex: 1, paddingRight: Spacing.two }}>
                  <Text style={styles.itemTitle}>{t('settings.dailyReminders')}</Text>
                  <Text style={styles.itemSubtitle}>{t('settings.dailyRemindersSub')}</Text>
                </View>
              </View>
              <Switch
                value={notifications.dailyReminder}
                onValueChange={() => toggleNotification('dailyReminder')}
                trackColor={{ false: 'rgba(255, 255, 255, 0.08)', true: '#7C3AED' }}
                thumbColor={Platform.OS === 'ios' ? undefined : '#FFFFFF'}
                ios_backgroundColor="rgba(255, 255, 255, 0.08)"
              />
            </View>

            <View style={styles.settingItemSwitch}>
              <View style={styles.settingItemLeft}>
                <View style={[styles.iconBg, { backgroundColor: 'rgba(5, 211, 142, 0.1)' }]}>
                  <MaterialCommunityIcons name="check-decagram-outline" size={20} color="#05D38E" />
                </View>
                <View style={{ flex: 1, paddingRight: Spacing.two }}>
                  <Text style={styles.itemTitle}>{t('settings.goalAchievements')}</Text>
                  <Text style={styles.itemSubtitle}>{t('settings.goalAchievementsSub')}</Text>
                </View>
              </View>
              <Switch
                value={notifications.achievementAlerts}
                onValueChange={() => toggleNotification('achievementAlerts')}
                trackColor={{ false: 'rgba(255, 255, 255, 0.08)', true: '#7C3AED' }}
                thumbColor={Platform.OS === 'ios' ? undefined : '#FFFFFF'}
                ios_backgroundColor="rgba(255, 255, 255, 0.08)"
              />
            </View>

            <View style={styles.settingItemSwitch}>
              <View style={styles.settingItemLeft}>
                <View style={[styles.iconBg, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                  <MaterialCommunityIcons name="bell-badge-outline" size={20} color="#3B82F6" />
                </View>
                <View style={{ flex: 1, paddingRight: Spacing.two }}>
                  <Text style={styles.itemTitle}>{t('settings.commitmentUpdates')}</Text>
                  <Text style={styles.itemSubtitle}>{t('settings.commitmentUpdatesSub')}</Text>
                </View>
              </View>
              <Switch
                value={notifications.statusUpdates}
                onValueChange={() => toggleNotification('statusUpdates')}
                trackColor={{ false: 'rgba(255, 255, 255, 0.08)', true: '#7C3AED' }}
                thumbColor={Platform.OS === 'ios' ? undefined : '#FFFFFF'}
                ios_backgroundColor="rgba(255, 255, 255, 0.08)"
              />
            </View>

            <View style={styles.settingItemSwitch}>
              <View style={styles.settingItemLeft}>
                <View style={[styles.iconBg, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                  <MaterialCommunityIcons name="alert-decagram-outline" size={20} color="#EF4444" />
                </View>
                <View style={{ flex: 1, paddingRight: Spacing.two }}>
                  <Text style={styles.itemTitle}>{t('settings.stakeAlerts')}</Text>
                  <Text style={styles.itemSubtitle}>{t('settings.stakeAlertsSub')}</Text>
                </View>
              </View>
              <Switch
                value={notifications.stakeAlerts}
                onValueChange={() => toggleNotification('stakeAlerts')}
                trackColor={{ false: 'rgba(255, 255, 255, 0.08)', true: '#7C3AED' }}
                thumbColor={Platform.OS === 'ios' ? undefined : '#FFFFFF'}
                ios_backgroundColor="rgba(255, 255, 255, 0.08)"
              />
            </View>

            <View style={styles.settingItemSwitch}>
              <View style={styles.settingItemLeft}>
                <View style={[styles.iconBg, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                  <MaterialCommunityIcons name="clock-alert-outline" size={20} color="#3B82F6" />
                </View>
                <View style={{ flex: 1, paddingRight: Spacing.two }}>
                  <Text style={styles.itemTitle}>{t('settings.gracePeriod')}</Text>
                  <Text style={styles.itemSubtitle}>{t('settings.gracePeriodSub')}</Text>
                </View>
              </View>
              <Switch
                value={notifications.gracePeriodSync}
                onValueChange={() => toggleNotification('gracePeriodSync')}
                trackColor={{ false: 'rgba(255, 255, 255, 0.08)', true: '#7C3AED' }}
                thumbColor={Platform.OS === 'ios' ? undefined : '#FFFFFF'}
                ios_backgroundColor="rgba(255, 255, 255, 0.08)"
              />
            </View>

            <View style={[styles.settingItemSwitch, { borderBottomWidth: 0 }]}>
              <View style={styles.settingItemLeft}>
                <View style={[styles.iconBg, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                  <MaterialCommunityIcons name="chart-bar" size={20} color="#10B981" />
                </View>
                <View style={{ flex: 1, paddingRight: Spacing.two }}>
                  <Text style={styles.itemTitle}>{t('settings.weeklyReport')}</Text>
                  <Text style={styles.itemSubtitle}>{t('settings.weeklyReportSub')}</Text>
                </View>
              </View>
              <Switch
                value={notifications.weeklyReport}
                onValueChange={() => toggleNotification('weeklyReport')}
                trackColor={{ false: 'rgba(255, 255, 255, 0.08)', true: '#7C3AED' }}
                thumbColor={Platform.OS === 'ios' ? undefined : '#FFFFFF'}
                ios_backgroundColor="rgba(255, 255, 255, 0.08)"
              />
            </View>
          </View>
        </ScrollView>
      </Animated.View>

      {/* Slide-in Pane: Coins */}
      <Animated.View 
        style={[
          styles.subPane, 
          { 
            transform: [{ translateX: coinsTranslateX }],
          }
        ]}
      >
        <View style={{ height: insets.top, backgroundColor: '#06070B' }} />
        <View style={styles.subPaneHeader}>
          <TouchableOpacity 
            onPress={() => navigateToPane('main')} 
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="chevron-left" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.subPaneTitle}>My Coins</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView 
          contentContainerStyle={styles.subPaneContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Passes Balance Banner */}
          <LinearGradient
            colors={['#1E1E30', '#111122']}
            style={styles.coinsBalanceCard}
          >
            <View style={styles.coinsBalanceRow}>
              <View style={styles.coinsBalanceTextCol}>
                <Text style={styles.coinsBalanceLabel}>Available Passes</Text>
                <Text style={styles.coinsBalanceValue}>
                  {user?.passes ?? 0} {user?.passes === 1 ? 'Pass' : 'Passes'}
                </Text>
              </View>
              <LinearGradient
                colors={['#A855F7', '#7C3AED']}
                style={styles.passesIconBadge}
              >
                <MaterialCommunityIcons name="ticket-confirmation" size={26} color="#FFFFFF" />
              </LinearGradient>
            </View>
            <Text style={styles.coinsBalanceDescription}>
              Challenge passes are consumed when you lock commitments in the Forge, transforming into Bronze (€1.99), Silver (€4.99), or Gold (€9.99) coins.
            </Text>
          </LinearGradient>

          {/* Section Title */}
          <Text style={styles.coinsSectionTitle}>Forgeable Coins</Text>

          {/* Coin List */}
          <View style={styles.coinShowcaseList}>
            {/* Bronze Coin */}
            <View style={styles.coinShowcaseCard}>
              <View style={[styles.coinShowcaseBase, { borderColor: '#CD7F32', shadowColor: '#CD7F32' }]}>
                <LinearGradient
                  colors={['#4A2E1B', '#2A170C']}
                  style={styles.coinShowcaseGradient}
                  start={{ x: 0.1, y: 0.1 }}
                  end={{ x: 0.9, y: 0.9 }}
                >
                  <View style={styles.coinGlossyOverlay} />
                  <MaterialCommunityIcons name="shield" size={24} color="#CD7F32" />
                </LinearGradient>
              </View>
              <View style={styles.coinShowcaseDetails}>
                <View style={styles.coinShowcaseHeader}>
                  <Text style={styles.coinShowcaseName}>Bronze Coin</Text>
                  <Text style={[styles.coinShowcasePrice, { color: '#CD7F32' }]}>€1.99</Text>
                </View>
                <Text style={styles.coinShowcaseDesc}>
                  Designed for starting new disciplines and establishing baseline consistency.
                </Text>
              </View>
            </View>

            {/* Silver Coin */}
            <View style={styles.coinShowcaseCard}>
              <View style={[styles.coinShowcaseBase, { borderColor: '#BDC3C7', shadowColor: '#BDC3C7' }]}>
                <LinearGradient
                  colors={['#2D3748', '#1A202C']}
                  style={styles.coinShowcaseGradient}
                  start={{ x: 0.1, y: 0.1 }}
                  end={{ x: 0.9, y: 0.9 }}
                >
                  <View style={styles.coinGlossyOverlay} />
                  <MaterialCommunityIcons name="medal" size={24} color="#BDC3C7" />
                </LinearGradient>
              </View>
              <View style={styles.coinShowcaseDetails}>
                <View style={styles.coinShowcaseHeader}>
                  <Text style={styles.coinShowcaseName}>Silver Coin</Text>
                  <Text style={[styles.coinShowcasePrice, { color: '#BDC3C7' }]}>€4.99</Text>
                </View>
                <Text style={styles.coinShowcaseDesc}>
                  Engineered for elevating streaks and medium stake consistency challenges.
                </Text>
              </View>
            </View>

            {/* Gold Coin */}
            <View style={styles.coinShowcaseCard}>
              <View style={[styles.coinShowcaseBase, { borderColor: '#FBBF24', shadowColor: '#FBBF24' }]}>
                <LinearGradient
                  colors={['#3B2C1A', '#1F150C']}
                  style={styles.coinShowcaseGradient}
                  start={{ x: 0.1, y: 0.1 }}
                  end={{ x: 0.9, y: 0.9 }}
                >
                  <View style={styles.coinGlossyOverlay} />
                  <MaterialCommunityIcons name="crown" size={24} color="#FBBF24" />
                </LinearGradient>
              </View>
              <View style={styles.coinShowcaseDetails}>
                <View style={styles.coinShowcaseHeader}>
                  <Text style={styles.coinShowcaseName}>Gold Coin</Text>
                  <Text style={[styles.coinShowcasePrice, { color: '#FBBF24' }]}>€9.99</Text>
                </View>
                <Text style={styles.coinShowcaseDesc}>
                  Reserved for elite level commitments. Lock in high stakes habit consistency.
                </Text>
              </View>
            </View>
          </View>

          {/* Quick Info Box */}
          <View style={styles.coinRulesBox}>
            <MaterialCommunityIcons name="information-outline" size={18} color="#94A3B8" style={{ marginRight: 8, marginTop: 2 }} />
            <Text style={styles.coinRulesText}>
              Stakes are locked safely for the duration of the challenge. There are no refunds, but you will get your coin back in full once you successfully complete your commitment. Failed streaks forfeit stakes to the Habit Treasury.
            </Text>
          </View>
        </ScrollView>
      </Animated.View>

      {/* Profile Picture Action Sheet Modal */}
      <Modal
        visible={showPhotoModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPhotoModal(false)}
      >
        <Pressable 
          style={styles.modalBackdrop} 
          onPress={() => setShowPhotoModal(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalDragIndicator} />
            <Text style={styles.modalTitle}>{t('settings.profilePicture')}</Text>

            <View style={styles.modalBody}>
              <TouchableOpacity 
                style={styles.modalOption} 
                onPress={handleLibraryLaunch}
                activeOpacity={0.7}
              >
                <View style={[styles.modalOptionIconBg, { backgroundColor: 'rgba(139, 92, 246, 0.12)' }]}>
                  <MaterialCommunityIcons name="image-multiple" size={20} color="#8B5CF6" />
                </View>
                <Text style={styles.modalOptionText}>{t('settings.chooseFromLibrary')}</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.modalOption} 
                onPress={handleCameraLaunch}
                activeOpacity={0.7}
              >
                <View style={[styles.modalOptionIconBg, { backgroundColor: 'rgba(139, 92, 246, 0.12)' }]}>
                  <MaterialCommunityIcons name="camera" size={20} color="#8B5CF6" />
                </View>
                <Text style={styles.modalOptionText}>{t('settings.takePhoto')}</Text>
              </TouchableOpacity>

              {!isDefaultAvatar && (
                <TouchableOpacity 
                  style={styles.modalOption} 
                  onPress={handleRemovePhoto}
                  activeOpacity={0.7}
                >
                  <View style={[styles.modalOptionIconBg, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
                    <MaterialCommunityIcons name="delete-outline" size={20} color="#EF4444" />
                  </View>
                  <Text style={[styles.modalOptionText, { color: '#EF4444' }]}>{t('settings.removePhoto')}</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity 
                style={styles.modalCancelButton} 
                onPress={() => setShowPhotoModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelText}>{t('settings.cancel')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* Language Selection Modal */}
      <Modal
        visible={showLanguageModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <Pressable 
          style={styles.modalBackdrop} 
          onPress={() => setShowLanguageModal(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalDragIndicator} />
            <Text style={styles.modalTitle}>{t('settings.language')}</Text>

            <View style={styles.modalBody}>
              <TouchableOpacity 
                style={styles.modalOption} 
                onPress={() => {
                  i18n.changeLanguage('en');
                  setShowLanguageModal(false);
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.modalOptionIconBg, { backgroundColor: 'rgba(139, 92, 246, 0.12)' }]}>
                  <Text style={{color: '#8B5CF6', fontWeight: 'bold'}}>EN</Text>
                </View>
                <Text style={styles.modalOptionText}>English</Text>
                {i18n.language.startsWith('en') && <MaterialCommunityIcons name="check" size={20} color="#8B5CF6" style={{marginLeft: 'auto'}} />}
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.modalOption} 
                onPress={() => {
                  i18n.changeLanguage('de');
                  setShowLanguageModal(false);
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.modalOptionIconBg, { backgroundColor: 'rgba(139, 92, 246, 0.12)' }]}>
                  <Text style={{color: '#8B5CF6', fontWeight: 'bold'}}>DE</Text>
                </View>
                <Text style={styles.modalOptionText}>Deutsch</Text>
                {i18n.language.startsWith('de') && <MaterialCommunityIcons name="check" size={20} color="#8B5CF6" style={{marginLeft: 'auto'}} />}
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.modalOption} 
                onPress={() => {
                  i18n.changeLanguage('tr');
                  setShowLanguageModal(false);
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.modalOptionIconBg, { backgroundColor: 'rgba(139, 92, 246, 0.12)' }]}>
                  <Text style={{color: '#8B5CF6', fontWeight: 'bold'}}>TR</Text>
                </View>
                <Text style={styles.modalOptionText}>Türkçe</Text>
                {i18n.language.startsWith('tr') && <MaterialCommunityIcons name="check" size={20} color="#8B5CF6" style={{marginLeft: 'auto'}} />}
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.modalCancelButton} 
                onPress={() => setShowLanguageModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelText}>{t('settings.cancel')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* Verification Guide Modal */}
      <VerificationGuideModal
        visible={showVerificationModal}
        onClose={() => setShowVerificationModal(false)}
      />

      {/* Sync Verification Modal */}
      <SyncVerificationModal
        visible={showSyncModal}
        onClose={() => setShowSyncModal(false)}
        metrics={syncMetrics}
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
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.six,
  },
  header: {
    marginBottom: Spacing.four,
  },
  headerTitle: {
    fontFamily: Fonts.sans,
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontFamily: Fonts.mono,
    color: '#8B5CF6',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    marginTop: Spacing.one,
    textTransform: 'uppercase',
  },
  profileCard: {
    backgroundColor: '#11131E',
    borderRadius: 20,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    marginBottom: Spacing.five,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarGradientRing: {
    width: 62,
    height: 62,
    borderRadius: 31,
    padding: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInnerContainer: {
    width: 59,
    height: 59,
    borderRadius: 29.5,
    backgroundColor: '#06070B',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#11131E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editIconBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#7C3AED',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#11131E',
  },
  profileInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  profileName: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  profileEmail: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  editProfileButton: {
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  editProfileText: {
    color: '#8B5CF6',
    fontSize: 11,
    fontWeight: '600',
  },
  section: {
    marginBottom: Spacing.four,
  },
  sectionTitle: {
    fontFamily: Fonts.sans,
    color: '#576880',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: Spacing.two,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  cardList: {
    backgroundColor: '#11131E',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.03)',
  },
  settingItemClickable: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.03)',
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    flex: 1,
  },
  iconBg: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  itemSubtitle: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  versionText: {
    color: '#475569',
    fontSize: 11,
    textAlign: 'center',
    marginTop: Spacing.three,
    marginBottom: Spacing.two,
    fontFamily: Fonts.mono,
  },
  // Sub-pane Styles
  subPane: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#06070B',
    zIndex: 1000,
  },
  subPaneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    paddingHorizontal: Spacing.four,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  subPaneTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  subPaneContent: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.six,
  },
  subPaneIntro: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: Spacing.four,
  },
  settingItemSwitch: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.03)',
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 6, 10, 0.85)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#11131E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: '#1F2937',
    borderBottomWidth: 0,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 450 : '100%',
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    paddingHorizontal: Spacing.four,
  },
  modalDragIndicator: {
    width: 36,
    height: 4,
    backgroundColor: '#374151',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: Spacing.three,
  },
  modalBody: {
    gap: Spacing.two,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    backgroundColor: '#1C1F30',
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: '#2D314E',
  },
  modalOptionIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOptionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  modalCancelButton: {
    padding: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.two,
    backgroundColor: '#141722',
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  modalCancelText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: 'bold',
  },
  coinsBalanceCard: {
    padding: Spacing.four,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#1E293B',
    marginBottom: Spacing.four,
  },
  coinsBalanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  coinsBalanceTextCol: {
    flex: 1,
  },
  coinsBalanceLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  coinsBalanceValue: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: 'bold',
    marginTop: 2,
  },
  passesIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coinsBalanceDescription: {
    color: '#94A3B8',
    fontSize: 12.5,
    lineHeight: 18,
  },
  coinsSectionTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: Spacing.three,
    marginTop: Spacing.two,
  },
  coinShowcaseList: {
    gap: Spacing.three,
  },
  coinShowcaseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F111A',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#181B28',
    padding: Spacing.three,
    gap: Spacing.three,
  },
  coinShowcaseBase: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1.5,
    backgroundColor: '#0F111A',
    justifyContent: 'center',
    alignItems: 'center',
    // Glow effect
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 5,
    elevation: 3,
  },
  coinShowcaseGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  coinShowcaseDetails: {
    flex: 1,
    gap: 2,
  },
  coinShowcaseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  coinShowcaseName: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: 'bold',
  },
  coinShowcasePrice: {
    fontSize: 14.5,
    fontWeight: 'bold',
  },
  coinShowcaseDesc: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 16.5,
  },
  coinRulesBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(30, 41, 59, 0.3)',
    borderRadius: 10,
    padding: Spacing.three,
    marginTop: Spacing.four,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.03)',
  },
  coinRulesText: {
    flex: 1,
    color: '#94A3B8',
    fontSize: 11.5,
    lineHeight: 16,
  },
});
