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
