import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useRepostStatus(mixId: string | undefined) {
  return useQuery({
    queryKey: ['repost-status', mixId],
    queryFn: async () => {
      if (!mixId) return { reposted: false, count: 0 };
      const res = await api.get(`/mixes/${mixId}/repost-status`);
      return res.data.data || { reposted: false, count: 0 };
    },
    enabled: !!mixId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useRepostMix() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (mixId: string) => {
      const res = await api.post(`/mixes/${mixId}/repost`);
      if (res.data?.success === false) {
        throw new Error(res.data.error || 'Failed to repost mix');
      }
      return res.data.data;
    },
    onSuccess: (_data, mixId) => {
      queryClient.invalidateQueries({ queryKey: ['repost-status', mixId] });
      queryClient.invalidateQueries({ queryKey: ['user-activity'] });
    },
  });
}

export function useUnrepostMix() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (mixId: string) => {
      const res = await api.delete(`/mixes/${mixId}/repost`);
      if (res.data?.success === false) {
        throw new Error(res.data.error || 'Failed to remove repost');
      }
      return res.data.data;
    },
    onSuccess: (_data, mixId) => {
      queryClient.invalidateQueries({ queryKey: ['repost-status', mixId] });
      queryClient.invalidateQueries({ queryKey: ['user-activity'] });
    },
  });
}
