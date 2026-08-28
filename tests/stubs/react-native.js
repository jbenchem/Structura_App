// Minimal React Native stub so components can be invoked in Node.
export const View = 'View';
export const Text = 'Text';
export const Pressable = 'Pressable';
export const ScrollView = 'ScrollView';
export const TextInput = 'TextInput';
export const Modal = 'Modal';
export const Switch = 'Switch';
export const SafeAreaView = 'SafeAreaView';
export const ActivityIndicator = 'ActivityIndicator';
export const StyleSheet = { create: (o) => o, absoluteFill: {}, flatten: (o) => o };
export const PanResponder = { create: (cfg) => ({ panHandlers: {}, _cfg: cfg }) };
export const Platform = { OS: 'ios', select: (o) => o.ios ?? o.default };
export const StatusBar = { currentHeight: 24 };
export const Alert = { alert: () => {} };
export const useWindowDimensions = () =>
  globalThis.__viewport || { width: 390, height: 844 };
export const Dimensions = { get: () => ({ width: 390, height: 844 }) };

// Animated / Easing: enough for components that build interpolations and
// start timings during render or effects to execute headlessly.
const animValue = (v) => ({
  _value: v,
  setValue(n) { this._value = n; },
  interpolate: () => ({ __interpolated: true }),
});
export const Easing = {
  linear: (t) => t,
  in: (f) => f,
  out: (f) => f,
  inOut: (f) => f,
  quad: (t) => t * t,
  cubic: (t) => t * t * t,
};
const timing = () => ({ start: (cb) => cb && cb({ finished: true }), stop: () => {} });
const composite = () => ({ start: (cb) => cb && cb({ finished: true }), stop: () => {} });
export const Animated = {
  Value: function AnimatedValue(v) { return animValue(v); },
  timing,
  spring: timing,
  decay: timing,
  sequence: composite,
  parallel: composite,
  stagger: composite,
  delay: composite,
  loop: () => ({ start: () => {}, stop: () => {} }),
  createAnimatedComponent: (c) => c,
  View: 'Animated.View',
  Text: 'Animated.Text',
  ScrollView: 'Animated.ScrollView',
};

// Used by the celebration to fall back where haptics are unavailable.
export const Vibration = { vibrate: () => {}, cancel: () => {} };
export const KeyboardAvoidingView = 'KeyboardAvoidingView';
export const Keyboard = { dismiss: () => {}, addListener: () => ({ remove: () => {} }) };

export const Linking = { openURL: () => Promise.resolve(), canOpenURL: () => Promise.resolve(true) };

// AccessibilityInfo: the Mascot asks about reduce-motion; tests always
// answer "no preference" so the entrance path runs.
export const AccessibilityInfo = { isReduceMotionEnabled: async () => false };
