// Tiny wrapper around expo-haptics so callers don't have to remember
// which API is which, and so failures (e.g. simulators or web targets
// without a taptic engine) are silently swallowed — haptics are nice
// to have, not required.
import * as Haptics from 'expo-haptics';

const safe = (fn: () => Promise<unknown>): void => {
  fn().catch(() => {
    /* haptics unavailable — ignore */
  });
};

export const haptic = {
  light: () =>
    safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  medium: () =>
    safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  heavy: () =>
    safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),
  success: () =>
    safe(() =>
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    ),
  error: () =>
    safe(() =>
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    ),
  warning: () =>
    safe(() =>
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
    ),
  selection: () => safe(() => Haptics.selectionAsync()),
};
