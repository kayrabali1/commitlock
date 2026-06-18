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
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Spacing, BottomTabInset } from '@/constants/theme';
import { HealthDataService } from '@/services/health';
import { useAuth, API_URL } from '@/services/auth';
import { VerificationGuideModal } from '@/components/VerificationGuideModal';
import { SyncVerificationModal } from '@/components/SyncVerificationModal';
import AppHeader, { BASE_HEADER_HEIGHT } from '@/components/AppHeader';

type NotificationKeys = 'dailyReminder' | 'statusUpdates' | 'stakeAlerts' | 'weeklyReport' | 'gracePeriodSync';

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, signOut, updateAvatar, refreshUser } = useAuth();
  const { width: screenWidth } = useWindowDimensions();

  // State controls
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncMetrics, setSyncMetrics] = useState({ steps: 0, calories: 0, mindfulness: 0, distance: 0 });
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDepositing, setIsDepositing] = useState(false);
  const [activePane, setActivePane] = useState<'main' | 'notifications'>('main');

  // Notification toggles
  const [notifications, setNotifications] = useState({
    dailyReminder: true,
    statusUpdates: true,
    stakeAlerts: true,
    weeklyReport: false,
    gracePeriodSync: true,
  });

  // Animated sliding positions (start off-screen to the right)
  const [notificationsTranslateX] = useState(() => new Animated.Value(screenWidth));

  // Sync offscreen coordinates if dimensions change
  useEffect(() => {
    if (activePane === 'main') {
      notificationsTranslateX.setValue(screenWidth);
    }
  }, [screenWidth, activePane, notificationsTranslateX]);

  // Load notification settings on mount
  useEffect(() => {
    const loadNotificationSettings = async () => {
      try {
        const token = await AsyncStorage.getItem('@commitlock_jwt_token');
        if (token) {
          const response = await fetch(`${API_URL}/api/user/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (response.ok) {
            const data = await response.json();
            if (data.notificationSettings) {
              setNotifications(data.notificationSettings);
              await AsyncStorage.setItem('user_notification_settings', JSON.stringify(data.notificationSettings));
              return;
            }
          }
        }

        const stored = await AsyncStorage.getItem('user_notification_settings');
        if (stored) {
          setNotifications(JSON.parse(stored));
        }
      } catch (error) {
        console.error('Failed to load notification settings:', error);
      }
    };
    loadNotificationSettings();
  }, []);

  const navigateToPane = useCallback((pane: 'main' | 'notifications') => {
    if (pane === 'notifications') {
      setActivePane('notifications');
      Animated.timing(notificationsTranslateX, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(notificationsTranslateX, {
        toValue: screenWidth,
        duration: 220,
        useNativeDriver: true,
      }).start(() => {
        setActivePane('main');
      });
    }
  }, [screenWidth, notificationsTranslateX]);

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
      const token = await AsyncStorage.getItem('@commitlock_jwt_token');
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

  const handleMockDeposit = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsDepositing(true);
    try {
      await HealthDataService.updateWalletBalance(50.0);
      await refreshUser();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (Platform.OS === 'web') {
        alert('Mock deposit of €50.00 successful!');
      } else {
        Alert.alert('Deposit Successful', 'Your testing wallet has been topped up with €50.00.');
      }
    } catch (e) {
      console.error('Failed to deposit funds', e);
      if (Platform.OS === 'web') {
        alert('Could not top up wallet balance.');
      } else {
        Alert.alert('Deposit Failed', 'Could not top up wallet balance.');
      }
    } finally {
      setIsDepositing(false);
    }
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
            <Text style={styles.headerTitle}>Settings</Text>
            <Text style={styles.headerSubtitle}>PREFERENCES & CONTROLS</Text>
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
                <Text style={styles.profileWallet}>Mock Balance: €{user?.walletBalance !== undefined ? Number(user.walletBalance).toFixed(2) : '0.00'}</Text>
                <TouchableOpacity
                  onPress={handleAvatarPress}
                  activeOpacity={0.7}
                  style={styles.editProfileButton}
                >
                  <Text style={styles.editProfileText}>Change photo</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Section: Preferences */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Preferences</Text>
            <View style={styles.cardList}>
              <TouchableOpacity 
                onPress={handleMockDeposit} 
                style={styles.settingItemClickable}
                disabled={isDepositing}
                activeOpacity={0.6}
              >
                <View style={styles.settingItemLeft}>
                  <View style={[styles.iconBg, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                    <MaterialCommunityIcons name="wallet-plus-outline" size={20} color="#10B981" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle}>Deposit Mock Funds</Text>
                    <Text style={styles.itemSubtitle}>Top up your testing wallet with €50.00</Text>
                  </View>
                </View>
                {isDepositing ? (
                  <ActivityIndicator size="small" color="#10B981" style={{ marginRight: 4 }} />
                ) : (
                  <MaterialCommunityIcons name="plus" size={20} color="#10B981" style={{ marginRight: 2 }} />
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={() => navigateToPane('notifications')} 
                style={[styles.settingItemClickable, { borderBottomWidth: 0 }]}
                activeOpacity={0.6}
              >
                <View style={styles.settingItemLeft}>
                  <View style={[styles.iconBg, { backgroundColor: 'rgba(124, 58, 237, 0.1)' }]}>
                    <MaterialCommunityIcons name="bell-outline" size={20} color="#8B5CF6" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle}>Notifications</Text>
                    <Text style={styles.itemSubtitle}>Alerts, daily reminders & stake warnings</Text>
                  </View>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#576880" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Section: Health & Verification */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Services & Sync</Text>
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
                      {Platform.OS === 'ios' ? 'Apple HealthKit' : 'Google Health Connect'}
                    </Text>
                    <Text style={styles.itemSubtitle}>Connected • Tap to verify sensor sync</Text>
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
                    <Text style={styles.itemTitle}>How Verification Works</Text>
                    <Text style={styles.itemSubtitle}>Learn how we keep goals secure and honest</Text>
                  </View>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#576880" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Section: System */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>System</Text>
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
                    <Text style={[styles.itemTitle, { color: '#EF4444' }]}>Reset Sandbox Pledges & Logs</Text>
                    <Text style={styles.itemSubtitle}>Clear active pledges, histories, and simulated values</Text>
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
                    <Text style={styles.itemTitle}>Sign Out</Text>
                    <Text style={styles.itemSubtitle}>End active session and clear local cache</Text>
                  </View>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#576880" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Version Details */}
          <Text style={styles.versionText}>CommitLock Mobile Client • v1.0.0 (SDK 54 Sandbox)</Text>
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
          <Text style={styles.subPaneTitle}>Notifications</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView 
          contentContainerStyle={styles.subPaneContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.subPaneIntro}>
            Customize your check-in triggers and warning alerts to support your routine and safeguard your stakes.
          </Text>

          <View style={styles.cardList}>
            <View style={styles.settingItemSwitch}>
              <View style={styles.settingItemLeft}>
                <View style={[styles.iconBg, { backgroundColor: 'rgba(124, 58, 237, 0.1)' }]}>
                  <MaterialCommunityIcons name="alarm" size={20} color="#8B5CF6" />
                </View>
                <View style={{ flex: 1, paddingRight: Spacing.two }}>
                  <Text style={styles.itemTitle}>Daily Reminders</Text>
                  <Text style={styles.itemSubtitle}>Get reminded to complete active commitments.</Text>
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
                <View style={[styles.iconBg, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                  <MaterialCommunityIcons name="bell-badge-outline" size={20} color="#3B82F6" />
                </View>
                <View style={{ flex: 1, paddingRight: Spacing.two }}>
                  <Text style={styles.itemTitle}>Commitment Updates</Text>
                  <Text style={styles.itemSubtitle}>Alerts when commitments change status (locked, active, completed).</Text>
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
                  <Text style={styles.itemTitle}>Stake Alerts</Text>
                  <Text style={styles.itemSubtitle}>Crucial warnings before your stake is at risk of forfeit.</Text>
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
                  <Text style={styles.itemTitle}>Grace Period Reminders</Text>
                  <Text style={styles.itemSubtitle}>Daily alerts on the last day and during the 48h grace period if you haven't synced yet.</Text>
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
                  <Text style={styles.itemTitle}>Weekly Progress Report</Text>
                  <Text style={styles.itemSubtitle}>Receive a weekly summary of your discipline rate and stakes.</Text>
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
            <Text style={styles.modalTitle}>Profile Picture</Text>

            <View style={styles.modalBody}>
              <TouchableOpacity 
                style={styles.modalOption} 
                onPress={handleLibraryLaunch}
                activeOpacity={0.7}
              >
                <View style={[styles.modalOptionIconBg, { backgroundColor: 'rgba(139, 92, 246, 0.12)' }]}>
                  <MaterialCommunityIcons name="image-multiple" size={20} color="#8B5CF6" />
                </View>
                <Text style={styles.modalOptionText}>Choose from Library</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.modalOption} 
                onPress={handleCameraLaunch}
                activeOpacity={0.7}
              >
                <View style={[styles.modalOptionIconBg, { backgroundColor: 'rgba(139, 92, 246, 0.12)' }]}>
                  <MaterialCommunityIcons name="camera" size={20} color="#8B5CF6" />
                </View>
                <Text style={styles.modalOptionText}>Take Photo</Text>
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
                  <Text style={[styles.modalOptionText, { color: '#EF4444' }]}>Remove Photo</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity 
                style={styles.modalCancelButton} 
                onPress={() => setShowPhotoModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
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
  profileWallet: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
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
});
