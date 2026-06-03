// Local notifications via expo-notifications.
//
// Scope: local-only (no push, no APNs/FCM). When a team submits a
// score, we fire a notification so it appears in the iOS notification
// centre / Android shade — kids can swipe down later and see what
// they did. Setting the foreground handler means the banner also
// drops down while the app is active.

import * as Notifications from 'expo-notifications';

// Foreground handler — runs once at module load. Without this, iOS
// suppresses notifications while the app is in the foreground.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

let permissionChecked = false;

/**
 * Request notification permission on the first call; remember the
 * answer for subsequent calls. Returns whether notifications are
 * allowed.
 */
export async function ensureNotificationPermission(): Promise<boolean> {
  try {
    if (permissionChecked) {
      const existing = await Notifications.getPermissionsAsync();
      return existing.status === 'granted';
    }
    permissionChecked = true;
    const result = await Notifications.requestPermissionsAsync();
    return result.status === 'granted';
  } catch (e) {
    console.warn('Notification permission check failed:', e);
    return false;
  }
}

/**
 * Fire a local notification announcing a team's new score. Silently
 * no-ops on permission denial or scheduling failure — notifications
 * are nice-to-have, not required.
 */
export async function notifyActivityScored(
  teamName: string,
  activityLabel: string,
  score: number
): Promise<void> {
  try {
    const granted = await ensureNotificationPermission();
    if (!granted) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🎉 Score saved',
        body: `${teamName} scored ${score} on ${activityLabel}`,
      },
      trigger: null, // fire immediately
    });
  } catch (e) {
    console.warn('Failed to schedule notification:', e);
  }
}
