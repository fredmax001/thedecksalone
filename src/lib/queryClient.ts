import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes cache TTL
      gcTime: 1000 * 60 * 15,   // 15 minutes garbage collection
      refetchOnWindowFocus: false, // Prevent refetch storm on tab switch
      refetchOnMount: false,
      refetchOnReconnect: true,
      retry: 1,
    },
  },
});
