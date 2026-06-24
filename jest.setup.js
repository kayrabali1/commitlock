const React = require('react');

jest.mock('react-native-reanimated', () => {
  const View = require('react-native').View;
  const Text = require('react-native').Text;
  const ScrollView = require('react-native').ScrollView;
  const Image = require('react-native').Image;

  return {
    default: {
      View,
      Text,
      ScrollView,
      Image,
      createAnimatedComponent: (Component) => Component,
    },
    View,
    Text,
    ScrollView,
    Image,
    createAnimatedComponent: (Component) => Component,
    useSharedValue: jest.fn(() => ({ value: 0 })),
    useAnimatedStyle: jest.fn(() => ({})),
    useAnimatedProps: jest.fn(() => ({})),
    useAnimatedScrollHandler: jest.fn(() => () => {}),
    withTiming: jest.fn((toValue) => toValue),
    withSpring: jest.fn((toValue) => toValue),
    withRepeat: jest.fn((toValue) => toValue),
    withSequence: jest.fn((toValue) => toValue),
    withDelay: jest.fn((_delay, toValue) => toValue),
    interpolate: jest.fn(),
    Extrapolate: { CLAMP: 'clamp' },
    runOnJS: jest.fn((fn) => fn),
    runOnUI: jest.fn((fn) => fn),
    FadeInDown: { duration: jest.fn().mockReturnThis(), delay: jest.fn().mockReturnThis(), springify: jest.fn().mockReturnThis() },
    FadeOutUp: { duration: jest.fn().mockReturnThis(), delay: jest.fn().mockReturnThis() },
    LinearTransition: { springify: jest.fn().mockReturnThis(), damping: jest.fn().mockReturnThis() },
    Layout: { springify: jest.fn().mockReturnThis(), damping: jest.fn().mockReturnThis() },
  };
});

jest.mock('react-native-worklets', () => {
  return {
    Worklets: {
      createRunInJsFn: jest.fn(),
      createRunOnUIFn: jest.fn(),
    },
    createSerializable: jest.fn((fn) => fn),
  };
});

jest.mock('react-native-safe-area-context', () => {
  return {
    useSafeAreaInsets: jest.fn().mockReturnValue({ top: 0, bottom: 0, left: 0, right: 0 }),
    SafeAreaProvider: ({ children }) => children,
    SafeAreaView: ({ children }) => children,
  };
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { changeLanguage: jest.fn() }
  })
}));
