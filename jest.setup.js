// jest.setup.js — Global test setup for Expo + React Native project
// NOTE: @testing-library/jest-native/extend-expect 在 setupFiles 中无法访问 expect
// 导入会在每个需要 toHaveTextContent 等的测试文件中单独完成

// --- Mock native modules that don't work in Jest ---

// Mock react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => {
  const View = require('react-native').View;

  // Helper: 创建一个链式调用的 gesture mock（所有方法返回自身）
  function createChainableGesture() {
    const chain = {
      enabled: () => chain,
      manualActivation: () => chain,
      maxPointers: () => chain,
      minPointers: () => chain,
      minDistance: () => chain,
      maxDistance: () => chain,
      onTouchesMove: () => chain,
      onStart: () => chain,
      onUpdate: () => chain,
      onEnd: () => chain,
      onFinalize: () => chain,
      onBegin: () => chain,
      onTouchesDown: () => chain,
      onTouchesUp: () => chain,
      simultaneousWithExternalGesture: () => chain,
      requireExternalGestureToFail: () => chain,
      shouldCancelWhenOutside: () => chain,
      activeOffsetX: () => chain,
      activeOffsetY: () => chain,
      failOffsetX: () => chain,
      failOffsetY: () => chain,
      hitSlop: () => chain,
      activateAfterLongPress: () => chain,
      numberOfTaps: () => chain,
    };
    return chain;
  }

  return {
    Gesture: {
      Pan: () => createChainableGesture(),
      Tap: () => createChainableGesture(),
      Pinch: () => createChainableGesture(),
      Rotation: () => createChainableGesture(),
      Fling: () => createChainableGesture(),
      LongPress: () => createChainableGesture(),
      ForceTouch: () => createChainableGesture(),
      Native: () => createChainableGesture(),
      Manual: () => createChainableGesture(),
      Race: () => createChainableGesture(),
      Simultaneous: () => createChainableGesture(),
      Exclusive: () => createChainableGesture(),
    },
    GestureDetector: View,
    GestureHandlerRootView: View,
    PanGestureHandler: View,
    State: { ACTIVE: 4, END: 5, BEGAN: 2, CANCELLED: 3, FAILED: 1, UNDETERMINED: 0 },
  };
});

// Mock react-native-worklets (dependency of reanimated)
jest.mock('react-native-worklets', () => ({
  makeShareableCloneRecursive: () => {},
  useSharedValue: (val) => ({ value: val }),
  isConfigured: () => true,
  configureProps: () => {},
}));

// Mock react-native-reanimated (v4 compatible, no native Worklets dependency)
jest.mock('react-native-reanimated', () => {
  const View = require('react-native').View;
  const Animated = new Proxy(
    { View, Text: require('react-native').Text, ScrollView: require('react-native').ScrollView },
    {
      get(target, key) {
        if (key in target) return target[key];
        // For animated.X components (Animated.View, etc.)
        return View;
      },
    }
  );
  // 所有 hooks 和 API 必须同时暴露为命名导出和 default 下的属性
  const hooks = {
    call: () => {},
    createAnimatedComponent: (comp) => comp,
    useSharedValue: (val) => ({ value: val }),
    useDerivedValue: (fn) => ({ value: fn() }),
    useAnimatedStyle: () => ({}),
    useAnimatedProps: () => ({}),
    useAnimatedScrollHandler: () => {},
    useAnimatedGestureHandler: () => {},
    useAnimatedRef: () => ({ current: null }),
    useAnimatedReaction: () => {},
    useAnimatedSensor: () => ({ sensor: {} }),
    useWorkletCallback: (fn) => fn,
    withTiming: (val) => val,
    withSpring: (val) => val,
    withDelay: (_, val) => val,
    withRepeat: (val) => val,
    withSequence: (...vals) => vals[vals.length - 1],
    runOnJS: (fn) => fn,
    runOnUI: (fn) => fn,
    interpolate: () => 0,
    interpolateColor: () => '#000',
    Extrapolation: { CLAMP: 'clamp' },
    Easing: { linear: () => 0, ease: () => 0 },
    FadeIn: { duration: () => ({}) },
    FadeOut: { duration: () => ({}) },
    SlideInRight: { duration: () => ({}) },
    SlideOutLeft: { duration: () => ({}) },
    ZoomIn: { duration: () => ({}) },
    ZoomOut: { duration: () => ({}) },
    Layout: { duration: () => ({}) },
    BounceIn: { duration: () => ({}) },
    makeMutable: (val) => ({ value: val, addListener: () => {} }),
    cancelAnimation: () => {},
    measure: () => ({ x: 0, y: 0, width: 0, height: 0 }),
    scrollTo: () => {},
    getViewProp: () => Promise.resolve(0),
    isConfigured: () => true,
    configureProps: () => {},
  };

  return {
    __esModule: true,
    ...hooks,
    ...Animated,
    default: {
      ...hooks,
      ...Animated,
    },
  };
});

// Mock expo-sqlite（同步 + 异步 API 均提供，lib/database 走 async 模式）
jest.mock('expo-sqlite', () => ({
  openDatabaseSync: jest.fn(() => ({
    execSync: jest.fn(),
    runSync: jest.fn(),
    getAllSync: jest.fn(() => []),
    getFirstSync: jest.fn(() => null),
    closeSync: jest.fn(),
  })),
  openDatabaseAsync: jest.fn(() =>
    Promise.resolve({
      execAsync: jest.fn(async () => {}),
      runAsync: jest.fn(async () => {}),
      getAllAsync: jest.fn(async () => []),
      getFirstAsync: jest.fn(async () => null),
      closeAsync: jest.fn(async () => {}),
    })
  ),
}));

// Mock expo-router
jest.mock('expo-router', () => ({
  Link: 'Link',
  Stack: 'Stack',
  Tabs: 'Tabs',
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({}),
  useSegments: () => [],
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
}));

// Mock expo-font
jest.mock('expo-font', () => ({
  isLoaded: jest.fn(() => true),
  loadAsync: jest.fn(),
  useFonts: jest.fn(() => [true, null]),
}));

// Mock expo-asset
jest.mock('expo-asset', () => ({
  Asset: { fromModule: (mod) => mod },
}));

// Mock expo-constants
jest.mock('expo-constants', () => ({
  default: {
    expoConfig: { name: 'test', slug: 'test' },
    statusBarHeight: 0,
  },
}));

// Mock expo-linking
jest.mock('expo-linking', () => ({
  createURL: jest.fn(path => path),
}));

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => {
  const View = require('react-native').View;
  return {
    SafeAreaProvider: ({ children }) => children,
    SafeAreaView: View,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

// Mock react-native-screens
jest.mock('react-native-screens', () => {
  const View = require('react-native').View;
  return {
    Screen: View,
    ScreenContainer: View,
    NativeScreen: View,
    NativeScreenContainer: View,
    enableScreens: jest.fn(),
  };
});

// Mock clsx for nativewind
jest.mock('nativewind', () => ({
  withExpoSnack: false,
}));

// Mock @sentry/react-native
jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  setUser: jest.fn(),
  ReactNativeTracing: jest.fn(),
}));

// Suppress specific console errors during testing
const originalError = console.error;
console.error = (...args) => {
  const msg = args[0]?.toString?.() || '';
  if (
    msg.includes('act(...)') ||
    msg.includes('Warning: ReactDOM.render') ||
    msg.includes('Each child in a list should have a unique "key" prop')
  ) {
    return;
  }
  originalError.call(console, ...args);
};
