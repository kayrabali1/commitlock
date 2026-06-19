import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Share,
  Animated,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { Spacing } from '@/constants/theme';
import { Commitment } from '@/services/health';

// 1. Discipline Score & Rank Calculator
export function calculateDisciplineScore(
  commitment: Commitment,
  activeStreak: number
): { score: number; rank: string; grade: string; description: string } {
  // Base score for successfully completing the commitment week
  let score = 80;

  // Active streak adds points: 3 points per week of streak, max 15 points
  const streakBonus = Math.min(15, activeStreak * 3);
  score += streakBonus;

  // Performance bonus: if they exceeded the target, add up to 5 points
  let performanceBonus = 0;
  if (commitment.performanceData && commitment.performanceData.length > 0) {
    const totalAchieved = commitment.performanceData.reduce((acc, d) => acc + d.value, 0);
    const targetVal = commitment.targetValue;
    const totalTarget = commitment.targetScope === 'weekly' ? targetVal : targetVal * 7;

    if (totalAchieved > totalTarget) {
      const pctOver = (totalAchieved - totalTarget) / totalTarget;
      performanceBonus = Math.min(5, Math.round(pctOver * 25)); // 20% over -> full 5 points
    }
  }
  score += performanceBonus;

  // Capped at 100
  score = Math.min(100, score);

  let rank = 'CONSISTENT';
  let grade = 'B';
  let description = 'Consistent effort. Keep pushing your limits!';

  if (score >= 98) {
    rank = 'UNSTOPPABLE';
    grade = 'S';
    description = 'Flawless execution. A true master of self-control!';
  } else if (score >= 93) {
    rank = 'TITAN';
    grade = 'A+';
    description = 'Dominant performance. Mentally unbreakable!';
  } else if (score >= 88) {
    rank = 'WARRIOR';
    grade = 'A';
    description = 'Exceptional discipline. High consistency!';
  } else if (score >= 84) {
    rank = 'DISCIPLINED';
    grade = 'B+';
    description = 'Great execution. Solid habit formation!';
  }

  return { score, rank, grade, description };
}

// 2. Themes Definition
interface CardTheme {
  id: string;
  name: string;
  background: [string, string, ...string[]];
  cardBackground: [string, string, ...string[]];
  borderColor: string;
  textColor: string;
  accentColor: string;
  secondaryAccent: string;
  glowColor: string;
  badgeBg: string;
  badgeTextColor: string;
}

const CARD_THEMES: Record<string, CardTheme> = {
  cyberpunk: {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    background: ['#1e0b36', '#090312'],
    cardBackground: ['#2e1152', '#140626'],
    borderColor: '#EC4899', // Hot Pink
    textColor: '#FFFFFF',
    accentColor: '#EC4899',
    secondaryAccent: '#06B6D4', // Cyan
    glowColor: 'rgba(236, 72, 153, 0.35)',
    badgeBg: '#EC4899',
    badgeTextColor: '#FFFFFF',
  },
  gold: {
    id: 'gold',
    name: 'Golden Aura',
    background: ['#22180c', '#080603'],
    cardBackground: ['#382914', '#171108'],
    borderColor: '#F59E0B', // Gold
    textColor: '#FFFFFF',
    accentColor: '#F59E0B',
    secondaryAccent: '#FBBF24',
    glowColor: 'rgba(245, 158, 11, 0.35)',
    badgeBg: '#F59E0B',
    badgeTextColor: '#000000',
  },
  emerald: {
    id: 'emerald',
    name: 'Emerald Beast',
    background: ['#051f15', '#020b08'],
    cardBackground: ['#0a3a27', '#03170f'],
    borderColor: '#05D38E', // Emerald
    textColor: '#FFFFFF',
    accentColor: '#05D38E',
    secondaryAccent: '#34D399',
    glowColor: 'rgba(5, 211, 142, 0.35)',
    badgeBg: '#05D38E',
    badgeTextColor: '#FFFFFF',
  },
  carbon: {
    id: 'carbon',
    name: 'Carbon',
    background: ['#15161a', '#08080a'],
    cardBackground: ['#22242a', '#0f1013'],
    borderColor: '#94A3B8', // Slate Grey
    textColor: '#FFFFFF',
    accentColor: '#F1F5F9',
    secondaryAccent: '#94A3B8',
    glowColor: 'rgba(241, 245, 249, 0.15)',
    badgeBg: '#334155',
    badgeTextColor: '#FFFFFF',
  },
};

interface DisciplineCardProps {
  commitment: Commitment;
  activeStreak: number;
  onClaim?: () => void;
  claimLabel?: string;
  isModalContext?: boolean;
}

export function DisciplineCard({
  commitment,
  activeStreak,
  onClaim,
  claimLabel = 'Claim Refund',
  isModalContext = false,
}: DisciplineCardProps) {
  const [activeThemeId, setActiveThemeId] = useState<string>('cyberpunk');
  const [shareStatus, setShareStatus] = useState<'idle' | 'preparing' | 'shared'>('idle');
  const [glowAnim] = useState(new Animated.Value(0.7));

  const theme = CARD_THEMES[activeThemeId] || CARD_THEMES.cyberpunk;

  // Calculate stats
  const performance = commitment.performanceData || [];
  const totalAchieved = performance.reduce((acc, d) => acc + d.value, 0);
  const targetVal = commitment.targetValue;
  const totalTarget = commitment.targetScope === 'weekly' ? targetVal : targetVal * 7;
  const pctCompleted = totalTarget > 0 ? Math.round((totalAchieved / totalTarget) * 100) : 100;
  
  const { score, rank, grade, description } = calculateDisciplineScore(commitment, activeStreak);

  // Soft pulsing glow animation
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1.1,
          duration: 2500,
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.7,
          duration: 2500,
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, [glowAnim]);

  const handleThemeChange = (themeId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveThemeId(themeId);
  };

  const handleShare = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShareStatus('preparing');

    // Simulate drawing card snapshot / prepping image
    setTimeout(async () => {
      setShareStatus('shared');
      
      const shareMessage = `🔥 HABITCONTRACT DISCIPLINE CARD\n\n` +
        `Discipline Score: ${score}/100 (${rank} Rank, Grade ${grade})\n` +
        `Active Streak: ${activeStreak} Weeks\n` +
        `Goal: ${commitment.targetValue.toLocaleString()} ${getMetricUnit(commitment.metricType)}${commitment.targetScope === 'weekly' ? '/wk' : '/day'} (${pctCompleted}% achieved!)\n` +
        `Stake Saved: €${commitment.stakeAmount}.00\n\n` +
        `Reframing fitness. Pledging money to lock habits. Join the elite at habitcontract.app`;

      try {
        await Share.share({
          message: shareMessage,
          title: `HabitContract Discipline Card - Score: ${score}`,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }

      // Keep success state for 2 seconds
      setTimeout(() => {
        setShareStatus('idle');
      }, 2000);
    }, 1200);
  };

  const getMetricIcon = (type: string) => {
    switch (type) {
      case 'steps': return 'walk';
      case 'run': return 'run';
      case 'cycle': return 'bicycle';
      case 'calories': return 'fire';
      case 'activeTime': return 'clock-outline';
      case 'mindfulness': return 'spa';
      default: return 'trophy-outline';
    }
  };

  const getMetricUnit = (type: string) => {
    switch (type) {
      case 'steps': return 'steps';
      case 'calories': return 'kcal';
      case 'activeTime': return 'mins';
      case 'mindfulness': return 'mins';
      default: return 'km';
    }
  };

  const formatShortValue = (val: number, type: string) => {
    if (type === 'steps') {
      return val >= 1000 ? `${(val / 1000).toFixed(1)}k` : `${Math.round(val)}`;
    }
    if (type === 'calories') {
      return `${Math.round(val)}`;
    }
    return `${val.toFixed(1)}`;
  };

  return (
    <View style={styles.container}>
      {/* Theme Picker Row */}
      <View style={styles.themeSelector}>
        <Text style={styles.themeLabel}>CARD STYLE</Text>
        <View style={styles.themeDots}>
          {Object.keys(CARD_THEMES).map((key) => {
            const t = CARD_THEMES[key];
            const isActive = activeThemeId === key;
            return (
              <TouchableOpacity
                key={key}
                onPress={() => handleThemeChange(key)}
                style={[
                  styles.themeDot,
                  { backgroundColor: t.borderColor },
                  isActive && styles.themeDotActive,
                ]}
                activeOpacity={0.8}
              >
                {isActive && (
                  <View style={styles.themeDotInner} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* DISCIPLINE CARD CONTAINER */}
      <Animated.View
        style={[
          styles.cardOuterBorder,
          {
            borderColor: theme.borderColor,
            shadowColor: theme.borderColor,
            shadowOpacity: glowAnim,
            shadowRadius: 15,
          },
        ]}
      >
        <LinearGradient
          colors={theme.cardBackground}
          style={styles.cardGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Card Header */}
          <View style={styles.cardHeader}>
            <View style={styles.headerLeft}>
              <MaterialCommunityIcons name="shield-lock" size={16} color={theme.accentColor} />
              <Text style={[styles.headerLogo, { color: theme.accentColor }]}>
                HABITCONTRACT // POW
              </Text>
            </View>
            <View style={[styles.gradeBadge, { backgroundColor: theme.badgeBg }]}>
              <Text style={[styles.gradeText, { color: theme.badgeTextColor }]}>{grade}</Text>
            </View>
          </View>

          {/* Central Score Circle & Rank */}
          <View style={styles.scoreContainer}>
            <View style={[styles.scoreCircle, { borderColor: `${theme.accentColor}30` }]}>
              <View style={[styles.scoreInnerGlow, { borderColor: theme.accentColor }]} />
              <Text style={[styles.scoreLabel, { color: theme.secondaryAccent }]}>DISCIPLINE</Text>
              <Text style={[styles.scoreVal, { color: theme.textColor }]}>{score}</Text>
              <Text style={[styles.scoreMax, { color: theme.secondaryAccent }]}>/ 100</Text>
            </View>

            <View style={[styles.rankBadge, { backgroundColor: `${theme.accentColor}15`, borderColor: theme.borderColor }]}>
              <MaterialCommunityIcons name="star-four-points" size={12} color={theme.accentColor} style={{ marginRight: 4 }} />
              <Text style={[styles.rankText, { color: theme.accentColor }]}>{rank} RANK</Text>
            </View>

            <Text style={[styles.descText, { color: theme.secondaryAccent }]}>
              {`"${description}"`}
            </Text>
          </View>

          {/* Divider line */}
          <View style={[styles.divider, { backgroundColor: `${theme.borderColor}20` }]} />

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statCell}>
              <View style={styles.statTitleRow}>
                <MaterialCommunityIcons name="shield-check" size={14} color={theme.accentColor} />
                <Text style={[styles.statLabelText, { color: theme.secondaryAccent }]}>PLEDGE STATUS</Text>
              </View>
              <Text style={[styles.statValText, { color: theme.textColor }]}>
                €{commitment.stakeAmount}.00 SAVED
              </Text>

            </View>

            <View style={styles.statCell}>
              <View style={styles.statTitleRow}>
                <MaterialCommunityIcons name="fire" size={14} color={theme.accentColor} />
                <Text style={[styles.statLabelText, { color: theme.secondaryAccent }]}>ACTIVE STREAK</Text>
              </View>
              <Text style={[styles.statValText, { color: theme.textColor }]}>
                {activeStreak} WEEKS
              </Text>
            </View>

            <View style={styles.statCell}>
              <View style={styles.statTitleRow}>
                <MaterialCommunityIcons name={getMetricIcon(commitment.metricType)} size={14} color={theme.accentColor} />
                <Text style={[styles.statLabelText, { color: theme.secondaryAccent }]}>
                  {commitment.metricType === 'calories' ? 'ACTIVE CALS' : commitment.metricType.toUpperCase()}
                </Text>
              </View>
              <Text style={[styles.statValText, { color: theme.textColor }]}>
                {formatShortValue(totalAchieved, commitment.metricType)} achieved
              </Text>
            </View>

            <View style={styles.statCell}>
              <View style={styles.statTitleRow}>
                <MaterialCommunityIcons name="calendar-check" size={14} color={theme.accentColor} />
                <Text style={[styles.statLabelText, { color: theme.secondaryAccent }]}>COMPLETION</Text>
              </View>
              <Text style={[styles.statValText, { color: theme.textColor }]}>
                {pctCompleted}% of Target
              </Text>
            </View>
          </View>

          {/* Verification stamp */}
          <View style={styles.footerVerification}>
            <MaterialCommunityIcons name="check-decagram" size={10} color={theme.accentColor} />
            <Text style={[styles.verificationText, { color: theme.secondaryAccent }]}>
              VERIFIED SECURE VIA {Platform.OS === 'ios' ? 'APPLE HEALTH' : 'GOOGLE HEALTH CONNECT'}
            </Text>
          </View>
        </LinearGradient>

        {/* Dynamic Overlay for sharing / processing */}
        {shareStatus !== 'idle' && (
          <View style={styles.shareOverlay}>
            {shareStatus === 'preparing' ? (
              <View style={styles.overlayInner}>
                <ActivityIndicator size="large" color={theme.borderColor} />
                <Text style={[styles.overlayText, { color: theme.textColor }]}>
                  Generating Shareable Snapshot...
                </Text>
              </View>
            ) : (
              <View style={styles.overlayInner}>
                <View style={[styles.overlayIconCircle, { backgroundColor: theme.borderColor }]}>
                  <MaterialCommunityIcons name="send" size={24} color="#000000" />
                </View>
                <Text style={[styles.overlayText, { color: theme.textColor, fontWeight: 'bold' }]}>
                  Card Generated! 🚀
                </Text>
                <Text style={[styles.overlaySubtext, { color: theme.secondaryAccent }]}>
                  Shared proof of discipline
                </Text>
              </View>
            )}
          </View>
        )}
      </Animated.View>

      {/* Sharing buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          onPress={handleShare}
          style={[styles.shareButton, { borderColor: theme.borderColor }]}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="instagram" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.shareButtonText}>Share Discipline Card</Text>
        </TouchableOpacity>

        {onClaim && (
          <TouchableOpacity
            onPress={onClaim}
            style={styles.claimButton}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#05D38E', '#00A676']}
              style={styles.claimGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.claimButtonText}>{claimLabel}</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    gap: Spacing.three,
  },
  themeSelector: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#11131E',
    borderWidth: 1,
    borderColor: '#181B28',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
  },
  themeLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: Platform.select({ ios: 'Courier', android: 'monospace' }),
    letterSpacing: 1.5,
  },
  themeDots: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'center',
  },
  themeDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  themeDotActive: {
    borderColor: '#FFFFFF',
  },
  themeDotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  cardOuterBorder: {
    width: '100%',
    borderRadius: Spacing.three,
    borderWidth: 1.5,
    overflow: 'hidden',
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 4 },
      },
      android: {
        elevation: 8,
      },
    }),
  },
  cardGradient: {
    padding: Spacing.four,
    alignItems: 'center',
    gap: Spacing.four,
  },
  cardHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  headerLogo: {
    fontSize: 9,
    fontWeight: 'bold',
    fontFamily: Platform.select({ ios: 'Courier', android: 'monospace' }),
    letterSpacing: 1.5,
  },
  gradeBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradeText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  scoreContainer: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  scoreCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    position: 'relative',
  },
  scoreInnerGlow: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 4,
    bottom: 4,
    borderRadius: 56,
    borderWidth: 1,
    borderStyle: 'dashed',
    opacity: 0.5,
  },
  scoreLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    fontFamily: Platform.select({ ios: 'Courier', android: 'monospace' }),
    letterSpacing: 1,
  },
  scoreVal: {
    fontSize: 42,
    fontWeight: 'bold',
    lineHeight: 46,
  },
  scoreMax: {
    fontSize: 9,
    fontWeight: '600',
  },
  rankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  rankText: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  descText: {
    fontSize: 11,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingHorizontal: Spacing.two,
  },
  divider: {
    width: '100%',
    height: 1,
  },
  statsGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: Spacing.three,
  },
  statCell: {
    width: '50%',
    gap: 4,
  },
  statTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statLabelText: {
    fontSize: 9,
    fontWeight: 'bold',
    fontFamily: Platform.select({ ios: 'Courier', android: 'monospace' }),
    letterSpacing: 0.5,
  },
  statValText: {
    fontSize: 13,
    fontWeight: '700',
  },
  footerVerification: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.one,
  },
  verificationText: {
    fontSize: 8,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  shareOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  overlayInner: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.two,
  },
  overlayText: {
    fontSize: 15,
    marginTop: Spacing.one,
  },
  overlaySubtext: {
    fontSize: 11,
  },
  overlayIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.one,
  },
  actionButtons: {
    width: '100%',
    gap: Spacing.two,
  },
  shareButton: {
    width: '100%',
    height: 50,
    borderRadius: Spacing.three,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  shareButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  claimButton: {
    width: '100%',
    height: 50,
    borderRadius: Spacing.three,
    overflow: 'hidden',
  },
  claimGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  claimButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
