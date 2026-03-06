/* global jest */

import 'react-native-gesture-handler/jestSetup';

jest.mock('react-native-reanimated', () => {
  return {
    __esModule: true,
    default: {
      View: 'AnimatedView',
      Image: 'AnimatedImage',
      createAnimatedComponent: component => component,
    },
    Easing: {
      linear: jest.fn(),
      out: jest.fn(value => value),
      cubic: jest.fn(),
    },
    Extrapolate: { CLAMP: 'clamp' },
    interpolate: jest.fn(() => 0),
    runOnJS: fn => fn,
    useAnimatedScrollHandler: jest.fn(() => jest.fn()),
    useAnimatedStyle: jest.fn(factory => factory()),
    useDerivedValue: jest.fn(factory => ({ value: factory() })),
    useSharedValue: jest.fn(initial => ({ value: initial })),
    withTiming: jest.fn(value => value),
  };
});

jest.mock('react-native-vector-icons/Feather', () => 'Feather');
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'MaterialCommunityIcons');
jest.mock('react-native-url-polyfill/auto', () => ({}));
jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  wrap: component => component,
  withProfiler: component => component,
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  setUser: jest.fn(),
  reactNavigationIntegration: jest.fn(() => ({})),
  reactNativeTracingIntegration: jest.fn(() => ({})),
  nativeCrash: jest.fn(),
}));
jest.mock('@react-native-firebase/crashlytics', () => {
  const api = {
    setCrashlyticsCollectionEnabled: jest.fn(() => Promise.resolve()),
    setAttributes: jest.fn(() => Promise.resolve()),
    setUserId: jest.fn(() => Promise.resolve()),
    log: jest.fn(() => Promise.resolve()),
    recordError: jest.fn(() => Promise.resolve()),
    crash: jest.fn(),
  };

  return () => api;
});
jest.mock('@react-native-firebase/app', () => ({
  __esModule: true,
  default: jest.fn(() => ({})),
}));
jest.mock('react-native-blob-util', () => ({
  fs: {
    readFile: jest.fn(() => Promise.resolve('')),
    writeFile: jest.fn(() => Promise.resolve(null)),
    unlink: jest.fn(() => Promise.resolve(null)),
  },
  fetch: jest.fn(),
}));
jest.mock('react-native-linear-gradient', () => 'LinearGradient');
jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: jest.fn(() => Promise.resolve({ didCancel: true })),
}));
jest.mock(
  '@react-native-async-storage/async-storage',
  () => ({
    setItem: jest.fn(() => Promise.resolve(null)),
    getItem: jest.fn(() => Promise.resolve(null)),
    removeItem: jest.fn(() => Promise.resolve(null)),
    clear: jest.fn(() => Promise.resolve(null)),
    getAllKeys: jest.fn(() => Promise.resolve([])),
    multiGet: jest.fn(() => Promise.resolve([])),
    multiSet: jest.fn(() => Promise.resolve(null)),
    multiRemove: jest.fn(() => Promise.resolve(null)),
  }),
);

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    NavigationContainer: ({ children }) => children,
    createNavigationContainerRef: () => ({
      current: null,
      isReady: () => true,
      navigate: jest.fn(),
      reset: jest.fn(),
    }),
  };
});
