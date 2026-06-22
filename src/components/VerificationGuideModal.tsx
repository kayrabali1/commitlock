import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Pressable,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { useTranslation } from 'react-i18next';
import { Spacing } from '@/constants/theme';

interface VerificationGuideModalProps {
  visible: boolean;
  onClose: () => void;
}

export function VerificationGuideModal({ visible, onClose }: VerificationGuideModalProps) {
  const { t } = useTranslation();

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  const steps = [
    {
      icon: 'heart-pulse',
      iconColor: '#10B981',
      bgColor: 'rgba(16, 185, 129, 0.1)',
      title: t('modals.step1Title'),
      desc: t('modals.step1Desc', { source: Platform.OS === 'ios' ? 'Apple Health' : 'Google Health Connect' }),
    },
    {
      icon: 'watch-variant',
      iconColor: '#8B5CF6',
      bgColor: 'rgba(139, 92, 246, 0.1)',
      title: t('modals.step2Title'),
      desc: t('modals.step2Desc'),
    },
    {
      icon: 'pencil-off',
      iconColor: '#EF4444',
      bgColor: 'rgba(239, 68, 68, 0.1)',
      title: t('modals.step3Title'),
      desc: t('modals.step3Desc'),
    },
    {
      icon: 'sync',
      iconColor: '#3B82F6',
      bgColor: 'rgba(59, 130, 246, 0.1)',
      title: t('modals.step4Title'),
      desc: t('modals.step4Desc'),
    },
    {
      icon: 'scale-balance',
      iconColor: '#F59E0B',
      bgColor: 'rgba(245, 158, 11, 0.1)',
      title: t('modals.step5Title'),
      desc: t('modals.step5Desc'),
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable 
          style={StyleSheet.absoluteFill}
          onPress={handleClose}
        />
        <BlurView tint="dark" intensity={95} style={styles.modalContent}>
          <View style={styles.sheetHeader}>
            <View style={styles.sheetPullBar} />
            <View style={styles.headerRow}>
              <View style={styles.headerIconContainer}>
                <MaterialCommunityIcons name="shield-check" size={24} color="#8B5CF6" />
              </View>
              <Text style={styles.modalTitle}>{t('modals.verificationTitle')}</Text>
            </View>
          </View>

          <ScrollView 
            style={styles.scrollContainer}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.introText}>
              {t('modals.verificationIntro')}
            </Text>

            <View style={styles.stepsContainer}>
              {steps.map((step, idx) => (
                <View key={idx} style={styles.stepCard}>
                  <View style={[styles.iconContainer, { backgroundColor: step.bgColor }]}>
                    <MaterialCommunityIcons name={step.icon as any} size={22} color={step.iconColor} />
                  </View>
                  <View style={styles.stepTextContainer}>
                    <Text style={styles.stepTitle}>{step.title}</Text>
                    <Text style={styles.stepDesc}>{step.desc}</Text>
                  </View>
                </View>
              ))}
            </View>

            <TouchableOpacity
              onPress={handleClose}
              style={styles.closeButton}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#7C3AED', '#4F46E5']}
                style={styles.closeButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.closeButtonText}>{t('modals.gotIt')}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </BlurView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 6, 10, 0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: '#1E293B',
    borderBottomWidth: 0,
    maxHeight: '85%',
    backgroundColor: '#11131E',
  },
  sheetHeader: {
    alignItems: 'center',
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  sheetPullBar: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#374151',
    marginBottom: Spacing.three,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    width: '100%',
  },
  headerIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  scrollContainer: {
    paddingHorizontal: Spacing.four,
  },
  scrollContent: {
    paddingTop: Spacing.three,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  introText: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: Spacing.four,
  },
  stepsContainer: {
    gap: Spacing.three,
    marginBottom: Spacing.four,
  },
  stepCard: {
    flexDirection: 'row',
    gap: Spacing.three,
    backgroundColor: '#1C1F30',
    borderRadius: Spacing.three,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: '#2D314E',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  stepTextContainer: {
    flex: 1,
  },
  stepTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  stepDesc: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 18,
  },
  closeButton: {
    marginTop: Spacing.two,
    borderRadius: Spacing.two,
    overflow: 'hidden',
  },
  closeButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
