import React, { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { useColorScheme, StyleSheet, Platform, View, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router/react-navigation';
import * as Notifications from 'expo-notifications';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { Colors } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/services/auth';
import AuthScreen from '@/components/AuthScreen';
import { NotificationService } from '@/services/notifications';
import { HealthDataService } from '@/services/health';
import { useTranslation } from 'react-i18next';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import '@/i18n/i18n';
import { useOnboarding } from '@/hooks/useOnboarding';
import OnboardingWizard from '@/components/Onboarding/OnboardingWizard';

const BACKGROUND_FETCH_TASK = 'background-health-fetch';

// 1. Define the task at the highest possible scope
TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  try {
    const commitments = await HealthDataService.getActiveCommitments();
    if (commitments.length > 0) {
      console.log('[BackgroundFetch] Waking up to sync health data silently.');
      await HealthDataService.syncActiveCommitmentsWithHealthKit(commitments);
      return BackgroundFetch.BackgroundFetchResult.NewData;
    }
    return BackgroundFetch.BackgroundFetchResult.NoData;
  } catch (error) {
    console.error('[BackgroundFetch] Error syncing health data:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// Configure foreground notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});


const styles = StyleSheet.create({
  activeTabIconGlow: {
    textShadowColor: '#C084FC',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
});

function TabLayoutContent() {
  const { t } = useTranslation();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { isFirstLaunch, isLoading: isOnboardingLoading, completeOnboarding } = useOnboarding();
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme === 'light' ? 'light' : 'dark'];

  useEffect(() => {
    if (user) {
      const initNotificationsAndBackgroundTasks = async () => {
        // Notifications
        const granted = await NotificationService.requestPermissions();
        if (granted) {
          await NotificationService.scheduleAllNotifications();
        }

        // Register Background Fetch
        try {
          await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
            minimumInterval: 60 * 15, // 15 minutes
            stopOnTerminate: false, // Android only
            startOnBoot: true, // Android only
          });
          console.log('[BackgroundFetch] Task registered successfully.');
        } catch (err) {
          console.error('[BackgroundFetch] Task registration failed:', err);
        }
      };
      initNotificationsAndBackgroundTasks();
    }

    return () => {};
  }, [user]);

  // Mark onboarding as complete automatically if user logs in
  useEffect(() => {
    if (user && isFirstLaunch) {
      completeOnboarding();
    }
  }, [user, isFirstLaunch, completeOnboarding]);

  if (isAuthLoading || isOnboardingLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!user) {
    if (isFirstLaunch) {
      return <OnboardingWizard onComplete={completeOnboarding} />;
    }
    return <AuthScreen />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: Platform.OS === 'ios' ? 'transparent' : 'rgba(24, 26, 33, 0.88)',
          borderTopColor: 'rgba(255,255,255,0.06)',
          elevation: 0,
          shadowOpacity: 0,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 30 : 12,
          paddingTop: 12,
        },
        tabBarBackground: Platform.OS === 'ios' 
          ? () => <BlurView tint="dark" intensity={90} style={StyleSheet.absoluteFill} /> 
          : undefined,
        tabBarActiveTintColor: '#C084FC',
        tabBarInactiveTintColor: '#64748B',
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: 'bold',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.active'),
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons 
              name={focused ? "run-fast" : "run"} 
              size={24} 
              color={focused ? '#C084FC' : color} 
              style={focused ? styles.activeTabIconGlow : undefined}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="commit"
        options={{
          title: t('tabs.create'),
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons 
              name={focused ? "lock" : "lock-outline"} 
              size={24} 
              color={focused ? '#C084FC' : color} 
              style={focused ? styles.activeTabIconGlow : undefined}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: t('tabs.history'),
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons 
              name={focused ? "history" : "text-box-search-outline"} 
              size={24} 
              color={focused ? '#C084FC' : color} 
              style={focused ? styles.activeTabIconGlow : undefined}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tabs.settings'),
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons 
              name={focused ? "cog" : "cog-outline"} 
              size={24} 
              color={focused ? '#C084FC' : color} 
              style={focused ? styles.activeTabIconGlow : undefined}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="resolution"
        options={{
          href: null, // Hides this route from displaying in the tab bar
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme === 'light' ? 'light' : 'dark'];

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <AnimatedSplashOverlay />
          <TabLayoutContent />
        </View>
      </ThemeProvider>
    </AuthProvider>
  );
}
