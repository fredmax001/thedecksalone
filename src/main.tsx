import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import './index.css';
import App from './App.tsx';
import { queryClient } from '@/lib/queryClient';
import { setupQueryPersistence } from '@/lib/queryPersistence';
import { initOfflineQueue } from '@/lib/offline-queue';
import { useAuthStore } from '@/stores/authStore';
import { ErrorBoundary } from 'react-error-boundary';
import { GlobalErrorFallback } from '@/components/GlobalErrorFallback';

import { isCapacitorNative } from '@/lib/api';

// Only register PWA service worker on web/browser after initial load — NOT inside native Capacitor app
const isNativeApp = isCapacitorNative();

if (!isNativeApp && typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    import('virtual:pwa-register')
      .then(({ registerSW }) => {
        registerSW({
          immediate: false,
          onNeedRefresh() {
            // Prepare SW in background without disrupting current audio/session
          },
          onOfflineReady() {},
        });
      })
      .catch(() => {});
  });
}

// Restore the allowlisted public query cache from disk before first render,
// wrapped defensively so storage/privacy errors never prevent root mount.
try {
  setupQueryPersistence();
} catch (err) {
  console.warn('[main] setupQueryPersistence failed:', err);
}

try {
  initOfflineQueue();
} catch (err) {
  console.warn('[main] initOfflineQueue failed:', err);
}

try {
  useAuthStore.getState().init();
} catch (err) {
  console.warn('[main] authStore init failed:', err);
}

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(
    <ErrorBoundary FallbackComponent={GlobalErrorFallback} onReset={() => (window.location.href = '/')}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
