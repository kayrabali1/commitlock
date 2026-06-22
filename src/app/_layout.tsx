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
import { addUserInteractionListener } from 'expo-widgets';
import { HealthDataService } from '@/services/health';
import { useTranslation } from 'react-i18next';
import '@/i18n/i18n';

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

function TabLayoutContent() {
  const { t } = useTranslation();
  const { user, isLoading } = useAuth();
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme === 'light' ? 'light' : 'dark'];

  useEffect(() => {
    // Listen for widget page cycles (interactive chevron/arrow taps)
    const sub = addUserInteractionListener(async (event) => {
      if (event.source === 'CommitmentsProgressWidget' && event.target === 'next') {
        try {
          const commitments = await HealthDataService.getActiveCommitments();
          if (commitments.length > 1) {
            const currentIdx = await HealthDataService.getWidgetSelectedIndex();
            const nextIdx = (currentIdx + 1) % commitments.length;
            await HealthDataService.setWidgetSelectedIndex(nextIdx);
            
            // Sync widgets so the new timeline with the new selectedIndex is sent to iOS!
            await HealthDataService.syncWidgets();
          }
        } catch (err) {
          console.error('[Layout] Failed to cycle widget commitment:', err);
        }
      }
    });

    if (user) {
      const initNotifications = async () => {
        const granted = await NotificationService.requestPermissions();
        if (granted) {
          await NotificationService.scheduleAllNotifications();
        }
      };
      initNotifications();
    }

    return () => {
      sub.remove();
    };
  }, [user]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: Platform.OS === 'ios' ? 'transparent' : colors.backgroundElement,
          borderTopColor: colors.border,
          elevation: 0,
          shadowOpacity: 0,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 30 : 12,
          paddingTop: 12,
        },
        tabBarBackground: Platform.OS === 'ios' 
          ? () => <BlurView tint="dark" intensity={90} style={StyleSheet.absoluteFill} /> 
          : undefined,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
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
              color={color} 
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
              size={22} 
              color={color} 
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
              color={color} 
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
              color={color} 
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
