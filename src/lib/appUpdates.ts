import { create } from 'zustand';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import api from '@/lib/api';

export interface UpdateInfo {
  latestVersion: string;
  latestVersionCode: number;
  releaseNotes: string;
  playStoreUrl: string;
  apkUrl: string;
}

export interface InstalledVersionInfo {
  version: string;
  build: number;
}

export type UpdateStatus = 'idle' | 'checking' | 'up-to-date' | 'update-available' | 'error';

interface UpdateState {
  status: UpdateStatus;
  info: UpdateInfo | null;
  installed: InstalledVersionInfo | null;
  updateAvailable: boolean;
  lastChecked: number | null;
  setState: (partial: Partial<Omit<UpdateState, 'setState'>>) => void;
}

export const useUpdateStore = create<UpdateState>((set) => ({
  status: 'idle',
  info: null,
  installed: null,
  updateAvailable: false,
  lastChecked: null,
  setState: (partial) => set(partial),
}));

// Only auto-notify once per app session
let toastShownThisSession = false;
let checkInFlight: Promise<boolean> | null = null;

export function isUpdateCheckSupported(): boolean {
  return Capacitor.isNativePlatform();
}

export async function getInstalledVersionInfo(): Promise<InstalledVersionInfo> {
  if (Capacitor.isNativePlatform()) {
    try {
      const info = await CapacitorApp.getInfo();
      return { version: info.version, build: parseInt(info.build, 10) || 0 };
    } catch {
      // fall through to web fallback
    }
  }
  return { version: 'Web', build: 0 };
}

/**
 * Checks the server for the latest release and compares it against the
 * installed native build. Returns true when an update is available.
 */
export async function checkForUpdate(force = false): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;

  const store = useUpdateStore.getState();
  if (checkInFlight) return checkInFlight;
  if (!force && store.lastChecked && Date.now() - store.lastChecked < 60 * 60 * 1000) {
    return store.updateAvailable;
  }

  checkInFlight = (async () => {
    store.setState({ status: 'checking' });
    try {
      const installed = await getInstalledVersionInfo();
      const { data } = await api.get('/app/version');
      const info: UpdateInfo = data?.data ?? data;
      const updateAvailable =
        Number.isFinite(info.latestVersionCode) && installed.build > 0
          ? info.latestVersionCode > installed.build
          : false;

      useUpdateStore.getState().setState({
        status: updateAvailable ? 'update-available' : 'up-to-date',
        info,
        installed,
        updateAvailable,
        lastChecked: Date.now(),
      });
      return updateAvailable;
    } catch {
      useUpdateStore.getState().setState({ status: 'error' });
      return false;
    } finally {
      checkInFlight = null;
    }
  })();

  return checkInFlight;
}

/**
 * Opens the Google Play Store page for the app. Tries the native
 * `market://` deep link first and falls back to the https URL.
 */
export async function openUpdatePage(url?: string): Promise<void> {
  const target = url || useUpdateStore.getState().info?.playStoreUrl;
  if (!target) return;

  if (Capacitor.isNativePlatform()) {
    if (Capacitor.getPlatform() === 'android') {
      // Prefer the Play Store app via market:// deep link; fall back to https.
      window.open(`market://details?id=decksalone.com`, '_system');
      setTimeout(() => {
        Browser.open({ url: target }).catch(() => window.open(target, '_system'));
      }, 600);
      return;
    }
    await Browser.open({ url: target }).catch(() => window.open(target, '_system'));
    return;
  }

  window.open(target, '_blank', 'noopener,noreferrer');
}

/** Marks that the update-available toast was already shown this session. */
export function markUpdateToastShown(): void {
  toastShownThisSession = true;
}

export function wasUpdateToastShown(): boolean {
  return toastShownThisSession;
}
