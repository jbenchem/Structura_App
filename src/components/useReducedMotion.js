// ─────────────────────────────────────────────────────────────
// One answer to "may this move?" for the whole app.
//
// The mascot honoured reduced motion from the start; the streak pill, the
// milestone burst, the verdict rise and the fireworks did not — each had
// its own Animated call with no gate. Every decorative animation now asks
// this hook. When motion is reduced the value resolves to its end state
// immediately, so the information still arrives; only the movement is
// dropped. Semantic content never depends on the animation.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated } from 'react-native';

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => alive && setReduced(!!v))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener
      ? AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => setReduced(!!v))
      : null;
    return () => {
      alive = false;
      if (sub && sub.remove) sub.remove();
    };
  }, []);
  return reduced;
}

// Run an animation, or jump straight to its end when motion is reduced.
// Returns whatever was started, so callers can stop it on unmount.
export function runOrSettle(reduced, value, toValue, animation) {
  if (reduced) {
    value.setValue(toValue);
    return null;
  }
  animation.start();
  return animation;
}
