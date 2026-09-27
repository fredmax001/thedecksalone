import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import api from '@/lib/api';

/**
 * Firebase Cloud Messaging (FCM) push notifications — native Android app only.
 *
 * NOTE: Until real Firebase keys (google-services.json) are configured,
 * FCM registration must NOT be called, because FirebaseMessaging.getInstance()
 * throws an unhandled IllegalStateException on Android when FirebaseApp is not
 * initialized, which fatal-crashes the app process on login.
 */

// Keep disabled until google-services.json is added to app/android/app/
const FCM_ENABLED = false;

let listenersRegistered = false;

export async function initPushNotifications(
  navigate: (path: string) => void
): Promise<void> {
  if (!Capacitor.isNativePlatform() || !FCM_ENABLED) return;

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
