import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  useColorScheme,
} from 'react-native';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Fonts, Spacing } from '@/constants/theme';
import { useAuth } from '@/services/auth';

interface AppHeaderProps {
  showProfile?: boolean;
}

export const BASE_HEADER_HEIGHT = 56;

export default function AppHeader({ showProfile = true }: AppHeaderProps) {
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme === 'light' ? 'light' : 'dark'];

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

      {/* User profile avatar / fallback */}
      {showProfile && (
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
      )}
    </View>
  );

  const bottomBorderColor = colorScheme === 'light' 
    ? 'rgba(0, 0, 0, 0.05)' 
    : 'rgba(255, 255, 255, 0.06)';

  if (Platform.OS === 'ios') {
    return (
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
    );
  }

  // Android & Web fallback: solid dark/light backdrop with low opacity background
  const translucentBg = colorScheme === 'light' 
    ? 'rgba(248, 250, 252, 0.94)' 
    : 'rgba(6, 7, 11, 0.94)';

  return (
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
});
