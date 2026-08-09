import axios from 'axios';
import { Capacitor } from '@capacitor/core';

const getApiUrl = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (Capacitor.isNativePlatform()) {
    return 'https://app.decksalone.com/api';
  }
  return '/api';
};

export const getMediaUrl = (path: string | null | undefined): string => {
  if (!path) return '';
  if (path.startsWith('data:') || path.startsWith('blob:')) return path;
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path.replace(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/, 'https://app.decksalone.com');
  }
  const baseUrl = 'https://app.decksalone.com';
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
  const authData = localStorage.getItem('soundit-auth');
  if (authData) {
    try {
      token = JSON.parse(authData).state?.token;
    } catch (e) {}
  }

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
  (error) => {
    if (error.response?.status === 401) {
      const isAuthCheck = error.config?.url?.includes('/auth/me');
      localStorage.removeItem('soundit-auth');
      if (!isAuthCheck) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
