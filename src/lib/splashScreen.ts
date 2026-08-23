import { SplashScreen } from '@capacitor/splash-screen';

let splashDismissed = false;
let splashHidden = false;

/**
 * Gracefully transitions out the Deck Salone splash screen
 * across APK (Capacitor native) and Mobile Web / PWA.
 *
 * @param delayMs Brief delay before initiating the smooth fade (default 250ms)
 */
export async function hideSplashScreen(delayMs: number = 250): Promise<void> {
  if (splashDismissed) return;
  splashDismissed = true;

  // Safety net: force dismiss after a maximum wait so the app never hangs on splash
  const FORCE_HIDE_TIMEOUT = 5000;
  const isNative = typeof window !== 'undefined' && Boolean((window as any).Capacitor?.isNativePlatform?.());

  const doHide = async () => {
    if (splashHidden) return;
    splashHidden = true;

    // 1. Dismiss HTML/PWA splash screen with smooth 400ms CSS fade
    const splashEl = document.getElementById('deck-salone-splash');
    if (splashEl) {
      splashEl.style.opacity = '0';
      splashEl.style.pointerEvents = 'none';
      setTimeout(() => {
        try {
          splashEl.remove();
        } catch {
          // ignore
        }
      }, 450);
    }

    // 2. Dismiss native Capacitor splash screen with 400ms fade
    if (isNative) {
      try {
        await SplashScreen.hide({ fadeOutDuration: 400 });
      } catch (err) {
        console.debug('Native splash dismiss exception:', err);
      }
    }
  };

  setTimeout(doHide, delayMs);

  // Force hide even if the initial call is delayed or missed
  setTimeout(() => {
    doHide();
  }, FORCE_HIDE_TIMEOUT);
}
