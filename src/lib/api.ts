import axios from 'axios';
import { Capacitor } from '@capacitor/core';

export const isCapacitorNative = (): boolean => {
  if (typeof window === 'undefined') return false;
  const win = window as any;
  // Direct native bridges injected before scripts run
  if (win.androidBridge || win.webkit?.messageHandlers?.bridge) return true;
  if (win.Capacitor && typeof win.Capacitor.isNativePlatform === 'function') {
    try {
      if (win.Capacitor.isNativePlatform()) return true;
    } catch {}
  }
  // Capacitor library check
  try {
    if (Capacitor.isNativePlatform()) return true;
  } catch {}
  // WebView URL protocol and hostname indicators
  const proto = win.location?.protocol;
  const host = win.location?.hostname;
  if (proto === 'capacitor:' || proto === 'ionic:') return true;
  if ((host === 'localhost' || host === '127.0.0.1') && !import.meta.env.DEV) {
    return true;
  }
  return false;
};

const getApiUrl = () => {
  // Native apps must use the absolute API origin — a relative '/api' would
  // resolve against the WebView's capacitor://localhost origin and fail.
  if (isCapacitorNative()) {
    return 'https://decksalone.com/api';
  }
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  return '/api';
};

export const getMediaUrl = (path: string | null | undefined): string => {
  if (!path) return '';
  if (path.startsWith('data:') || path.startsWith('blob:')) return path;
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path.replace(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/, 'https://decksalone.com');
  }
  const baseUrl = 'https://decksalone.com';
  return path.startsWith('/') ? `${baseUrl}${path}` : `${baseUrl}/${path}`;
};

export const api = axios.create({
  baseURL: getApiUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Read the stored JWT (same sources the request interceptor uses).
export const getAuthToken = (): string | null => {
  let token = null;
  const authData = localStorage.getItem('decksalone-auth') || localStorage.getItem('soundit-auth');
  if (authData) {
    try {
      token = JSON.parse(authData).state?.token;
    } catch (e) {}
  }
  return token || localStorage.getItem('token');
};

// UPL-1/UPL-2: media URLs served by gated endpoints (/api/mixes/:id/audio and
// the auth-gated /uploads proof folders) cannot carry an Authorization header
// from <audio>/<img>/<a> elements, so append the JWT as a query param.
// UPL-9: the predicate is same-origin only (see ./shouldAttachToken) so the
// JWT is never leaked to arbitrary external hosts.
export { shouldAttachToken } from './shouldAttachToken';
import { shouldAttachToken } from './shouldAttachToken';

export const withAuthToken = (url: string | null | undefined): string => {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;
  if (!shouldAttachToken(url, window.location.origin)) return url;
  const token = getAuthToken();
  if (!token) return url;
  return `${url}${url.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`;
};

// Attach JWT token to every request if available
api.interceptors.request.use((config) => {
  const currentBaseUrl = getApiUrl();
  config.baseURL = currentBaseUrl;

  const token = getAuthToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Let the browser set multipart/form-data boundary for FormData
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
    delete config.headers['content-type'];
  }
  return config;
});

// Handle 401 globally — but don't redirect on auth validation calls
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const isAuthCheck = error.config?.url?.includes('/auth/me');
      try {
        localStorage.removeItem('decksalone-auth');
        localStorage.removeItem('soundit-auth');
        // Dynamic import to avoid circular dependencies
        const { queryClient } = await import('@/lib/queryClient');
        queryClient.clear();
        const { usePlayerStore } = await import('@/stores/playerStore');
        usePlayerStore.getState().setCurrentUserId(null);
      } catch (e) {}

      if (!isAuthCheck && typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);


export async function downloadMixFile(
  downloadUrl: string,
  // UPL-8: the mix's own audioUrl from its detail/list payload — used only to
  // detect external URLs. The server no longer returns directAudioUrl.
  mixAudioUrl: string | null | undefined,
  filename: string
) {
  const siteOrigin = typeof window !== 'undefined' ? window.location.origin : '';

  // External URLs (e.g. Hearthis.at, SoundCloud direct links) cannot be fetched
  // with auth headers across origins, so fall back to a plain anchor download.
  const isExternal =
    mixAudioUrl &&
    /^https?:\/\//i.test(mixAudioUrl) &&
    (() => {
      try {
        return new URL(mixAudioUrl).origin !== siteOrigin;
      } catch {
        return false;
      }
    })();

  if (isExternal) {
    const link = document.createElement('a');
    link.href = mixAudioUrl as string;
    link.setAttribute('download', filename);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return;
  }

  // Local/private files must be fetched with the Authorization header so the
  // backend can enforce download gates. A plain <a> click would be unauthenticated.
  // The backend returns an absolute API path (/api/mixes/...), so strip the /api
  // prefix because the axios instance already has baseURL=/api.
  const apiPath = downloadUrl.startsWith('/api/') ? downloadUrl.slice(4) : downloadUrl;
  const res = await api.get(apiPath, { responseType: 'blob' });
  const blobUrl = URL.createObjectURL(res.data);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.setAttribute('download', filename);
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(blobUrl);
}

export default api;
