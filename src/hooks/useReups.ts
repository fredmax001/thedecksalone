import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useReupStatus(mixId: string | undefined) {
  return useQuery({
    queryKey: ['reup-status', mixId],
    queryFn: async () => {
      if (!mixId) return { reupped: false, count: 0 };
      const res = await api.get(`/mixes/${mixId}/reup-status`);
      return res.data.data || { reupped: false, count: 0 };
    },
    enabled: !!mixId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useReupMix() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (mixId: string) => {
      const res = await api.post(`/mixes/${mixId}/reup`);
      if (res.data?.success === false) {
        throw new Error(res.data.error || 'Failed to re-up mix');
      }
      return res.data.data;
    },
    onSuccess: (_data, mixId) => {
      queryClient.invalidateQueries({ queryKey: ['reup-status', mixId] });
      queryClient.invalidateQueries({ queryKey: ['dj'] });
      queryClient.invalidateQueries({ queryKey: ['my-highlights'] });
      queryClient.invalidateQueries({ queryKey: ['my-sets'] });
    },
  });
}

export function useUnreupMix() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (mixId: string) => {
      const res = await api.delete(`/mixes/${mixId}/reup`);
      if (res.data?.success === false) {
        throw new Error(res.data.error || 'Failed to remove re-up');
      }
      return res.data.data;
    },
    onSuccess: (_data, mixId) => {
      queryClient.invalidateQueries({ queryKey: ['reup-status', mixId] });
      queryClient.invalidateQueries({ queryKey: ['dj'] });
      queryClient.invalidateQueries({ queryKey: ['my-highlights'] });
      queryClient.invalidateQueries({ queryKey: ['my-sets'] });
    },
  });
}
