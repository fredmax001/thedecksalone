import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import api from '@/lib/api';

/**
 * Firebase Cloud Messaging (FCM) push notifications — native Android app only.
 *
 * - Registers listeners once, requests permission, and sends the FCM token
 *   to the backend (`POST /notifications/push-token`).
 * - Tapping a notification navigates to its `actionUrl` (in-app deep link).
 * - Until real Firebase keys are added (see PUSH_NOTIFICATIONS_SETUP.md),
 *   registration simply never fires and the existing local-notification
 *   poller keeps working as the fallback.
 */

let listenersRegistered = false;

export async function initPushNotifications(
  navigate: (path: string) => void
): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    if (!listenersRegistered) {
      await PushNotifications.addListener('registration', async (token) => {
        try {
          await api.post('/notifications/push-token', {
            token: token.value,
            platform: Capacitor.getPlatform(),
          });
        } catch (err) {
          console.warn('[Push] Failed to register push token:', err);
        }
      });

      await PushNotifications.addListener('registrationError', (err) => {
        console.warn('[Push] Registration error:', err.error);
      });

      await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        const actionUrl = action.notification.data?.actionUrl;
        if (typeof actionUrl === 'string' && actionUrl.startsWith('/')) {
          navigate(actionUrl);
        }
      });

      listenersRegistered = true;
    }

    const permission = await PushNotifications.requestPermissions();
    if (permission.receive === 'granted') {
      await PushNotifications.register();
    }
  } catch (err) {
    console.warn('[Push] initPushNotifications failed:', err);
  }
}

/** Remove the user's push tokens on logout (best-effort, fire-and-forget). */
export async function unregisterPushTokens(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await api.delete('/notifications/push-token');
  } catch {
    // best effort
  }
}
