import axios from 'axios';
import { Capacitor } from '@capacitor/core';

const getApiUrl = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (Capacitor.isNativePlatform()) {
    return 'https://decksalone.com/api';
  }
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

// Attach JWT token to every request if available
api.interceptors.request.use((config) => {
  const currentBaseUrl = getApiUrl();
  config.baseURL = currentBaseUrl;

  let token = null;
  const authData = localStorage.getItem('decksalone-auth') || localStorage.getItem('soundit-auth');
  if (authData) {
    try {
      token = JSON.parse(authData).state?.token;
    } catch (e) {}
  }
  token = token || localStorage.getItem('token');

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
  directAudioUrl: string | null | undefined,
  filename: string
) {
  const siteOrigin = typeof window !== 'undefined' ? window.location.origin : '';

  // External URLs (e.g. Hearthis.at, SoundCloud direct links) cannot be fetched
  // with auth headers across origins, so fall back to a plain anchor download.
  const isExternal =
    directAudioUrl &&
    /^https?:\/\//i.test(directAudioUrl) &&
    (() => {
      try {
        return new URL(directAudioUrl).origin !== siteOrigin;
      } catch {
        return false;
      }
    })();

  if (isExternal) {
    const link = document.createElement('a');
    link.href = directAudioUrl as string;
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
