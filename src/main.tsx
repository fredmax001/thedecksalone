import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import './index.css';
import App from './App.tsx';
import { queryClient } from '@/lib/queryClient';
import { useAuthStore } from '@/stores/authStore';
import { ErrorBoundary } from 'react-error-boundary';
import { GlobalErrorFallback } from '@/components/GlobalErrorFallback';
import { registerSW } from 'virtual:pwa-register';

// Auto-update PWA service worker and reload for fresh deployments
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    updateSW(true);
  },
  onOfflineReady() {},
});

// Check for new deployments every 60 seconds
setInterval(() => {
  updateSW(true);
}, 60 * 1000);

useAuthStore.getState().init();

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary FallbackComponent={GlobalErrorFallback} onReset={() => window.location.href = '/'}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </ErrorBoundary>
);
