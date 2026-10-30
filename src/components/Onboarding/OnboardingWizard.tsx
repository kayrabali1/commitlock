import React from 'react';
import { View, StyleSheet } from 'react-native';
import Screen1Splash from './Screen1Splash';

interface Props {
  onComplete: () => void;
}

export default function OnboardingWizard({ onComplete }: Props) {
  return (
    <View style={styles.container}>
      <Screen1Splash onNext={onComplete} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#06070B',
  },
});
