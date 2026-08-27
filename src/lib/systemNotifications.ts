import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import api from '@/lib/api';

const CHANNEL_ID = 'deck_salone_notifications';
const SHOWN_NOTIFICATIONS_KEY = 'deck_salone_shown_notifications_v1';

export interface SystemNotificationOptions {
  id?: number;
  title: string;
  body: string;
  actionUrl?: string;
  extra?: Record<string, any>;
}

// Memory / Storage tracker for already shown notification IDs to prevent duplicate alerts
function getShownNotificationIds(): Set<string> {
  try {
    const raw = localStorage.getItem(SHOWN_NOTIFICATIONS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function markNotificationAsShown(id: string) {
  try {
    const set = getShownNotificationIds();
    set.add(id);
    // Keep max 200 IDs in storage
    const array = Array.from(set).slice(-200);
    localStorage.setItem(SHOWN_NOTIFICATIONS_KEY, JSON.stringify(array));
  } catch {}
}

/**
 * Initialize Android notification channels and tap handlers
 */
export async function initSystemNotifications(navigate?: (path: string) => void) {
  if (!Capacitor.isNativePlatform()) return;

  try {
    // 1. Create Android Notification Channel (Required for Android 8.0+)
    await LocalNotifications.createChannel({
      id: CHANNEL_ID,
      name: 'Deck Salone Updates',
      description: 'Activity alerts, messages, bookings, comments, and mix updates',
      importance: 4, // HIGH priority
      visibility: 1, // PUBLIC
      vibration: true,
      lights: true,
      lightColor: '#F4E059',
      sound: 'default',
    }).catch((err) => console.warn('[System Notifications] Channel creation warning:', err));

    // 2. Register notification action tap listener
    await LocalNotifications.addListener('localNotificationActionPerformed', (notificationAction) => {
      console.log('[System Notifications] Action performed:', notificationAction);
      const actionUrl = notificationAction.notification.extra?.actionUrl;
      if (actionUrl) {
        if (navigate) {
          navigate(actionUrl);
        } else if (typeof window !== 'undefined') {
          window.location.href = actionUrl;
        }
      }
    });

    // 3. Request permissions on startup
    await requestNotificationPermission();
  } catch (err) {
    console.error('[System Notifications] Initialization failed:', err);
  }
}

/**
 * Request notification permission (Android 13+ POST_NOTIFICATIONS)
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return true;

  try {
    const status = await LocalNotifications.checkPermissions();
    if (status.display === 'granted') {
      return true;
    }
    const req = await LocalNotifications.requestPermissions();
    return req.display === 'granted';
  } catch (err) {
    console.warn('[System Notifications] Permission request error:', err);
    return false;
  }
}

/**
 * Display a native system notification immediately in Android status bar / shade
 */
export async function showSystemNotification(options: SystemNotificationOptions): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) return;

    const notifId = options.id || Math.floor(Math.random() * 1000000) + 1;

    await LocalNotifications.schedule({
      notifications: [
        {
          id: notifId,
          title: options.title || 'Deck Salone',
          body: options.body,
          channelId: CHANNEL_ID,
          smallIcon: 'ic_stat_decksalone',
          iconColor: '#F4E059',
          sound: 'default',
          extra: {
            actionUrl: options.actionUrl || '/discover',
            ...options.extra,
          },
          actionTypeId: 'OPEN_DECK_SALONE',
        },
      ],
    });
  } catch (err) {
    console.error('[System Notifications] Failed to schedule notification:', err);
  }
}

/**
 * Sync unread notifications from backend and trigger Android system notifications
 */
export async function syncUnreadSystemNotifications(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const res = await api.get('/notifications?limit=5&unreadOnly=true');
    if (!res.data?.success || !Array.isArray(res.data.data)) return;

    const notifications = res.data.data;
    const shownIds = getShownNotificationIds();

    for (const notif of notifications) {
      if (!notif.id || shownIds.has(notif.id) || notif.read) continue;

      // Mark shown immediately
      markNotificationAsShown(notif.id);

      // Generate numeric ID from string ID hash
      let hash = 0;
      for (let i = 0; i < notif.id.length; i++) {
        hash = (hash << 5) - hash + notif.id.charCodeAt(i);
        hash |= 0;
      }
      const safeId = Math.abs(hash) % 2147483647;

      await showSystemNotification({
        id: safeId,
        title: notif.title || 'Deck Salone Update',
        body: notif.body || notif.message || 'You have a new update on Deck Salone',
        actionUrl: notif.actionUrl || '/notifications',
        extra: { notifId: notif.id, ...notif.metadata },
      });
    }
  } catch (e) {
    // Ignore network / offline errors
  }
}
