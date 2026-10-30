import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import Card from './Card';
import PrimaryButton from './PrimaryButton';

interface Props {
  onNext: (value: string) => void;
}

export default function Screen3Pref2({ onNext }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  const options = [
    { id: 'daily', title: 'Daily', icon: 'calendar-today' as const },
    { id: 'weekly', title: 'Weekly', icon: 'calendar-week' as const },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Animated.Text entering={FadeInUp.duration(600).delay(100)} style={styles.title}>
          How do you work best?
        </Animated.Text>
        <Animated.Text entering={FadeInUp.duration(600).delay(200)} style={styles.subtitle}>
          Choose your preferred commitment frequency.
        </Animated.Text>

        <Animated.View entering={FadeInUp.duration(600).delay(300)} style={styles.grid}>
          {options.map((opt) => (
            <View key={opt.id} style={styles.cardWrapper}>
              <Card
                title={opt.title}
                icon={opt.icon}
                selected={selected === opt.id}
                onSelect={() => setSelected(opt.id)}
              />
            </View>
          ))}
        </Animated.View>
      </View>

      {selected && (
        <Animated.View entering={FadeInUp.duration(400)} style={styles.footer}>
          <PrimaryButton title="Continue" onPress={() => onNext(selected)} />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#94A3B8',
    marginBottom: 40,
    lineHeight: 24,
  },
  grid: {
    flexDirection: 'row',
    marginHorizontal: -8,
  },
  cardWrapper: {
    flex: 1,
    padding: 8,
  },
  footer: {
    width: '100%',
    paddingBottom: 20,
  },
});
