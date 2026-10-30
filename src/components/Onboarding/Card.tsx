import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring,
  interpolateColor
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface Props {
  title: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  selected: boolean;
  onSelect: () => void;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export default function Card({ title, icon, selected, onSelect }: Props) {
  const scale = useSharedValue(1);
  const selectionProgress = useSharedValue(selected ? 1 : 0);

  // Animate border color and background based on selection state
  React.useEffect(() => {
    selectionProgress.value = withSpring(selected ? 1 : 0, {
      damping: 15,
      stiffness: 150,
    });
  }, [selected, selectionProgress]);

  const animatedStyle = useAnimatedStyle(() => {
    const borderColor = interpolateColor(
      selectionProgress.value,
      [0, 1],
      ['rgba(255, 255, 255, 0.08)', '#7C3AED']
    );
    const backgroundColor = interpolateColor(
      selectionProgress.value,
      [0, 1],
      ['rgba(17, 19, 30, 0.75)', 'rgba(124, 58, 237, 0.1)']
    );
    return {
      transform: [{ scale: scale.value }],
      borderColor,
      backgroundColor,
    };
  });

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 10, stiffness: 200 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 10, stiffness: 200 });
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect();
  };

  return (
    <AnimatedTouchable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      activeOpacity={1}
      style={[styles.container, animatedStyle]}
    >
      <View style={styles.iconContainer}>
        <MaterialCommunityIcons 
          name={icon} 
          size={32} 
          color={selected ? '#C084FC' : '#576880'} 
        />
      </View>
      <Text style={[styles.title, selected && styles.titleSelected]}>
        {title}
      </Text>
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 120,
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  iconContainer: {
    marginBottom: 12,
  },
  title: {
    color: '#94A3B8',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  titleSelected: {
    color: '#FFFFFF',
  },
});
