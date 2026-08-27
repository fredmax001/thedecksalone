import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace('/api', '') || 'https://decksalone.com';

const DEVICE_ID_KEY = 'deck-salone-device-id';

function getOrCreateDeviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch (e) {
    // Fallback if localStorage is unavailable
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

export const openGoogleAuth = async () => {
  if (Capacitor.isNativePlatform()) {
    // Open the mobile OAuth flow in the system browser (Chrome Custom Tab / Safari View Controller).
    // Google explicitly blocks OAuth sign-in inside embedded WebViews, so this is required for native apps.
    // We pass a device_id so the backend can verify the OAuth state without relying on cookies
    // (Chrome Custom Tabs do not always reliably send the state cookie back to the callback).
    const deviceId = getOrCreateDeviceId();
    const url = `${API_BASE}/api/v1/auth/google/mobile?device_id=${encodeURIComponent(deviceId)}`;
    console.log('[Google Auth] Opening mobile OAuth:', url);
    await Browser.open({ url });
  } else {
    // Web: keep the existing same-origin redirect behavior.
    window.location.href = '/api/v1/auth/google';
  }
};
