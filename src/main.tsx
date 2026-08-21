import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import './index.css';
import App from './App.tsx';
import { queryClient } from '@/lib/queryClient';
import { useAuthStore } from '@/stores/authStore';
import { ErrorBoundary } from 'react-error-boundary';
import { GlobalErrorFallback } from '@/components/GlobalErrorFallback';

// Only register PWA service worker on web/browser — NOT inside native Capacitor app
const isNativeApp = !!(window as any).Capacitor?.isNativePlatform?.();

if (!isNativeApp) {
  import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({
      immediate: true,
      onNeedRefresh() {
        // Prepare SW in background without disrupting current audio/session
      },
      onOfflineReady() {},
    });
  }).catch(() => {});
}

useAuthStore.getState().init();

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary FallbackComponent={GlobalErrorFallback} onReset={() => window.location.href = '/'}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </ErrorBoundary>
);
