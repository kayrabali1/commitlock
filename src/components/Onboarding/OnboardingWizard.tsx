import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInRight, SlideOutLeft, Easing } from 'react-native-reanimated';
import Screen1Splash from './Screen1Splash';
import Screen2Pref1 from './Screen2Pref1';
import Screen3Pref2 from './Screen3Pref2';
import Screen4Value from './Screen4Value';
import AuthScreen from '../AuthScreen';

interface Props {
  onComplete: () => void;
}

export default function OnboardingWizard({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [preferences, setPreferences] = useState({
    goal: '',
    frequency: '',
  });

  const nextStep = () => {
    setStep((prev) => Math.min(prev + 1, 4));
  };

  const updatePreference = (key: string, value: string) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return <Screen1Splash onNext={nextStep} key="step0" />;
      case 1:
        return (
          <Screen2Pref1
            onNext={(value: string) => {
              updatePreference('goal', value);
              nextStep();
            }}
            key="step1"
          />
        );
      case 2:
        return (
          <Screen3Pref2
            onNext={(value: string) => {
              updatePreference('frequency', value);
              nextStep();
            }}
            key="step2"
          />
        );
      case 3:
        return <Screen4Value onNext={nextStep} key="step3" />;
      case 4:
        // We reuse the existing AuthScreen here but it handles the actual login.
        // Once login is successful, `useAuth` user state will update, triggering `_layout.tsx` to unmount this wizard!
        // To be safe, we also provide a way to just "complete" it if needed.
        return <AuthScreen />;
      default:
        return null;
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Animated.View
        key={step}
        entering={FadeIn.duration(400).easing(Easing.out(Easing.exp))}
        exiting={FadeOut.duration(300)}
        style={styles.stepContainer}
      >
        {renderStep()}
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#06070B',
  },
  stepContainer: {
    flex: 1,
  },
});
