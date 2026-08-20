import { SplashScreen } from '@capacitor/splash-screen';

let splashDismissed = false;

/**
 * Gracefully transitions out the Deck Salone splash screen
 * across APK (Capacitor native) and Mobile Web / PWA.
 * 
 * @param delayMs Brief delay before initiating the smooth fade (default 250ms)
 */
export async function hideSplashScreen(delayMs: number = 250): Promise<void> {
  if (splashDismissed) return;
  splashDismissed = true;

  // 1. Dismiss HTML/PWA splash screen with smooth 400ms CSS fade
  const splashEl = document.getElementById('deck-salone-splash');
  if (splashEl) {
    setTimeout(() => {
      splashEl.style.opacity = '0';
      splashEl.style.pointerEvents = 'none';
      setTimeout(() => {
        try {
          splashEl.remove();
        } catch {
          // ignore
        }
      }, 450);
    }, delayMs);
  }

  // 2. Dismiss native Capacitor splash screen with 400ms fade
  const isNative = typeof window !== 'undefined' && Boolean((window as any).Capacitor?.isNativePlatform?.());
  if (isNative) {
    setTimeout(async () => {
      try {
        await SplashScreen.hide({
          fadeOutDuration: 400,
        });
      } catch (err) {
        console.debug('Native splash dismiss exception:', err);
      }
    }, delayMs);
  }
}
