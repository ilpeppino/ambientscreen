import React from "react";
import { vi } from "vitest";

// React 19 requires test renders to run under act() for tree access.
// Centralize that behavior here so existing tests keep working.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function host(name: string) {
  return (props: Record<string, unknown>) =>
    React.createElement(name, props, props.children as React.ReactNode);
}

vi.mock("react-test-renderer", async () => {
  const actual = await vi.importActual<typeof import("react-test-renderer")>("react-test-renderer");

  const create = (
    element: React.ReactElement,
    options?: Parameters<typeof actual.default.create>[1],
  ) => {
    let renderer: ReturnType<typeof actual.default.create> | undefined;

    actual.act(() => {
      renderer = actual.default.create(element, options);
    });

    if (!renderer) {
      throw new Error("react-test-renderer create() did not return a renderer");
    }

    return renderer;
  };

  return {
    ...actual,
    default: {
      ...actual.default,
      create,
    },
  };
});

vi.mock("react-native", () => ({
  View: host("view"),
  Text: host("text"),
  Pressable: host("pressable"),
  ScrollView: host("scroll-view"),
  Modal: host("modal"),
  Switch: host("switch"),
  TextInput: host("text-input"),
  KeyboardAvoidingView: host("keyboard-avoiding-view"),
  ActivityIndicator: host("activity-indicator"),
  StyleSheet: {
    create: <T extends Record<string, unknown>>(styles: T) => styles,
    flatten: (style: unknown) => style,
    absoluteFillObject: {
      position: "absolute",
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
    },
  },
  Platform: {
    OS: "web",
    select: <T>(value: { ios?: T; android?: T; web?: T; default?: T }) =>
      value.web ?? value.default,
  },
  NativeModules: {},
  AppState: {
    currentState: "active",
    addEventListener: () => ({ remove: () => undefined }),
  },
  BackHandler: {
    addEventListener: () => ({ remove: () => undefined }),
  },
  Linking: {
    getInitialURL: vi.fn(async () => null),
    addEventListener: vi.fn(() => ({ remove: () => undefined })),
  },
  Dimensions: {
    get: () => ({ width: 1280, height: 720, scale: 1, fontScale: 1 }),
  },
  useWindowDimensions: () => ({ width: 1280, height: 720, scale: 1, fontScale: 1 }),
}));

vi.mock("react-native-reanimated", () => {
  const AnimatedView = host("animated-view");
  const easingFn = () => 0;
  const easing = {
    bezier: () => easingFn,
    out: () => easingFn,
    in: () => easingFn,
    inOut: () => easingFn,
    cubic: easingFn,
    quad: easingFn,
  };

  return {
    default: {
      View: AnimatedView,
    },
    Easing: easing,
    useSharedValue: <T>(value: T) => ({ value }),
    useDerivedValue: <T>(resolver: () => T) => ({ value: resolver() }),
    useAnimatedStyle: <T>(resolver: () => T) => resolver(),
    useAnimatedReaction: () => undefined,
    withTiming: <T>(value: T) => value,
    cancelAnimation: () => undefined,
    runOnJS: <T extends (...args: any[]) => any>(fn: T) => fn,
  };
});

vi.mock("react-native-gesture-handler", () => {
  const chain = {
    enabled: () => chain,
    onBegin: () => chain,
    onUpdate: () => chain,
    onEnd: () => chain,
    onFinalize: () => chain,
  };

  return {
    GestureDetector: host("gesture-detector"),
    Gesture: {
      Pan: () => chain,
    },
  };
});

vi.mock("react-native-safe-area-context", () => ({
  SafeAreaView: host("safe-area-view"),
  SafeAreaProvider: host("safe-area-provider"),
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));
