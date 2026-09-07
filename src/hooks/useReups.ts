import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/apiErrors';

interface ReupStatus {
  reupped: boolean;
  count: number;
}

const REUP_STATUS_FALLBACK = 'Request failed';

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
    onMutate: async (mixId) => {
      await queryClient.cancelQueries({ queryKey: ['reup-status', mixId] });
      const previousStatus = queryClient.getQueryData<ReupStatus>(['reup-status', mixId]);
      queryClient.setQueryData<ReupStatus>(['reup-status', mixId], {
        reupped: true,
        count: (previousStatus?.count || 0) + 1,
      });
      return { previousStatus };
    },
    onError: (error, mixId, context) => {
      if (context?.previousStatus) {
        queryClient.setQueryData(['reup-status', mixId], context.previousStatus);
      }
      toast.error('Could not re-up: ' + getApiErrorMessage(error, REUP_STATUS_FALLBACK));
    },
    onSettled: (_data, _error, mixId) => {
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
    onMutate: async (mixId) => {
      await queryClient.cancelQueries({ queryKey: ['reup-status', mixId] });
      const previousStatus = queryClient.getQueryData<ReupStatus>(['reup-status', mixId]);
      queryClient.setQueryData<ReupStatus>(['reup-status', mixId], {
        reupped: false,
        count: Math.max(0, (previousStatus?.count || 1) - 1),
      });
      return { previousStatus };
    },
    onError: (error, mixId, context) => {
      if (context?.previousStatus) {
        queryClient.setQueryData(['reup-status', mixId], context.previousStatus);
      }
      toast.error('Could not remove re-up: ' + getApiErrorMessage(error, REUP_STATUS_FALLBACK));
    },
    onSettled: (_data, _error, mixId) => {
      queryClient.invalidateQueries({ queryKey: ['reup-status', mixId] });
      queryClient.invalidateQueries({ queryKey: ['dj'] });
      queryClient.invalidateQueries({ queryKey: ['my-highlights'] });
      queryClient.invalidateQueries({ queryKey: ['my-sets'] });
    },
  });
}
