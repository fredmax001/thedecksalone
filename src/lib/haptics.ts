import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

/**
 * Checks if running inside native Capacitor environment
 */
const isNativePlatform = () => {
  return typeof window !== 'undefined' && Boolean((window as any).Capacitor?.isNativePlatform?.());
};

/**
 * Triggers light/medium/heavy haptic impact feedback
 */
export async function triggerHaptic(style: ImpactStyle = ImpactStyle.Light): Promise<void> {
  if (!isNativePlatform()) {
    // Fallback to web vibration if supported
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(style === ImpactStyle.Heavy ? 25 : style === ImpactStyle.Medium ? 15 : 8);
      } catch {
        // Ignore vibration errors
      }
    }
    return;
  }

  try {
    await Haptics.impact({ style });
  } catch (error) {
    console.debug('Haptics impact error:', error);
  }
}

/**
 * Triggers notification haptics (success, warning, error)
 */
export async function triggerNotificationHaptic(type: NotificationType = NotificationType.Success): Promise<void> {
  if (!isNativePlatform()) {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(type === NotificationType.Error ? [20, 50, 20] : 15);
      } catch {
        // Ignore
      }
    }
    return;
  }

  try {
    await Haptics.notification({ type });
  } catch (error) {
    console.debug('Haptics notification error:', error);
  }
}

/**
 * Triggers selection change haptic (picker wheels, scrubbers)
 */
export async function triggerSelectionHaptic(): Promise<void> {
  if (!isNativePlatform()) return;
  try {
    await Haptics.selectionChanged();
  } catch (error) {
    console.debug('Haptics selection error:', error);
  }
}
