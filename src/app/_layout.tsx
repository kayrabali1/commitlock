import { Tabs } from 'expo-router';
import { useColorScheme, StyleSheet, Platform, View, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { Colors } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/services/auth';
import AuthScreen from '@/components/AuthScreen';

function TabLayoutContent() {
  const { user, isLoading } = useAuth();
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme === 'light' ? 'light' : 'dark'];

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
          title: 'Active',
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
          title: 'Create',
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
          title: 'History',
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
          title: 'Settings',
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
