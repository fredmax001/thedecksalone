import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/apiErrors';

interface RepostStatus {
  reposted: boolean;
  count: number;
}

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
    onMutate: async (mixId) => {
      await queryClient.cancelQueries({ queryKey: ['repost-status', mixId] });
      const previousStatus = queryClient.getQueryData<RepostStatus>(['repost-status', mixId]);
      queryClient.setQueryData<RepostStatus>(['repost-status', mixId], (old) => ({
        reposted: true,
        count: (old?.count ?? 0) + 1,
      }));
      return { previousStatus };
    },
    onError: (error, mixId, context) => {
      if (context?.previousStatus !== undefined) {
        queryClient.setQueryData(['repost-status', mixId], context.previousStatus);
      }
      toast.error('Could not repost: ' + getApiErrorMessage(error, 'Unknown error'));
    },
    onSettled: (_data, _error, mixId) => {
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
    onMutate: async (mixId) => {
      await queryClient.cancelQueries({ queryKey: ['repost-status', mixId] });
      const previousStatus = queryClient.getQueryData<RepostStatus>(['repost-status', mixId]);
      queryClient.setQueryData<RepostStatus>(['repost-status', mixId], (old) => ({
        reposted: false,
        count: Math.max(0, (old?.count ?? 0) - 1),
      }));
      return { previousStatus };
    },
    onError: (error, mixId, context) => {
      if (context?.previousStatus !== undefined) {
        queryClient.setQueryData(['repost-status', mixId], context.previousStatus);
      }
      toast.error('Could not remove repost: ' + getApiErrorMessage(error, 'Unknown error'));
    },
    onSettled: (_data, _error, mixId) => {
      queryClient.invalidateQueries({ queryKey: ['repost-status', mixId] });
      queryClient.invalidateQueries({ queryKey: ['user-activity'] });
    },
  });
}
