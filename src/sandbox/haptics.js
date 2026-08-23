// Haptic feedback. The prototype's gesture set uses these: `tap` on
// ordinary actions, `bump` the moment a long-press fires (CHECKLIST
// 4.4 asks you to feel it), `good`/`nope` on verdicts.
//
// expo-haptics runs in Expo Go — no development build needed. The
// calls are wrapped because haptics are absent on web and on some
// Android hardware, where they should be a silent no-op.

import * as Haptics from 'expo-haptics';

export const tap = () => {
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch (e) {}
};
export const bump = () => {
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch (e) {}
};
export const good = () => {
  try {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch (e) {}
};
export const nope = () => {
  try {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  } catch (e) {}
};

// ── Celebration ──────────────────────────────────────────────
// One thump per firework, fired from the same schedule that drives the
// animation so the phone and the screen agree about when a burst happened.
//
// Deliberately built from short impacts rather than a long buzz: a sustained
// vibration on a results screen reads as an alarm, and on Android it is also
// the pattern used for errors.
export const burstTap = () => {
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch (e) {}
};

export const celebrate = (perfect = false) => {
  try {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (perfect) {
      // A perfect lesson gets a second, heavier beat a moment later. It is
      // the only place in the app that does, which is what makes it read as
      // an award rather than as confirmation.
      setTimeout(() => {
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        } catch (e) {}
      }, 190);
    }
  } catch (e) {}
};
