/**
 * UTM Parameter Capture and Storage Utility
 * Persists utm_source, utm_medium, utm_campaign, utm_term, utm_content from URL query parameters.
 */

const UTM_STORAGE_KEY = 'decksalone_utm_params';

export interface UtmParameters {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  referrer?: string;
  capturedAt?: string;
}

export function captureUtmParameters(): UtmParameters {
  if (typeof window === 'undefined') return {};

  try {
    const urlParams = new URLSearchParams(window.location.search);
    const source = urlParams.get('utm_source');
    const medium = urlParams.get('utm_medium');
    const campaign = urlParams.get('utm_campaign');
    const term = urlParams.get('utm_term');
    const content = urlParams.get('utm_content');

    if (source || medium || campaign || term || content) {
      const utmObj: UtmParameters = {
        utm_source: source || undefined,
        utm_medium: medium || undefined,
        utm_campaign: campaign || undefined,
        utm_term: term || undefined,
        utm_content: content || undefined,
        referrer: document.referrer || undefined,
        capturedAt: new Date().toISOString(),
      };
      sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(utmObj));
      return utmObj;
    }

    const stored = sessionStorage.getItem(UTM_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (e) {
    return {};
  }
}

export function getStoredUtmParameters(): UtmParameters {
  if (typeof window === 'undefined') return {};
  try {
    const stored = sessionStorage.getItem(UTM_STORAGE_KEY);
    return stored ? JSON.parse(stored) : captureUtmParameters();
  } catch (e) {
    return {};
  }
}
