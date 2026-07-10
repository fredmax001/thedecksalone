import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface HighlightItem {
  id: string;
  djId: string;
  mixId: string;
  sortOrder: number;
  createdAt: string;
  mix: {
    id: string;
    title: string;
    coverImage?: string;
    audioUrl?: string;
    duration?: number;
    genre: string;
    plays: number;
    likes: number;
    dj: {
      id: string;
      stageName: string;
      avatar?: string;
      city?: string;
    };
  };
}

export function useDJHighlights(djId: string | undefined) {
  return useQuery({
    queryKey: ['dj-highlights', djId],
    queryFn: async () => {
      if (!djId) return [];
      const res = await api.get(`/djs/${djId}/highlights`);
      return (res.data.data || []) as HighlightItem[];
    },
    enabled: !!djId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useMyHighlights() {
  return useQuery({
    queryKey: ['my-highlights'],
    queryFn: async () => {
      const res = await api.get('/djs/me/highlights');
      return (res.data.data || []) as HighlightItem[];
    },
    staleTime: 1000 * 60 * 2,
  });
}

export function useAddHighlight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { mixId: string; sortOrder?: number }) => {
      const res = await api.post('/djs/me/highlights', payload);
      if (res.data?.success === false) {
        throw new Error(res.data.error || 'Failed to add highlight');
      }
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-highlights'] });
      queryClient.invalidateQueries({ queryKey: ['dj'] });
      queryClient.invalidateQueries({ queryKey: ['dj-highlights'] });
    },
  });
}

export function useRemoveHighlight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (mixId: string) => {
      const res = await api.delete(`/djs/me/highlights/${mixId}`);
      if (res.data?.success === false) {
        throw new Error(res.data.error || 'Failed to remove highlight');
      }
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-highlights'] });
      queryClient.invalidateQueries({ queryKey: ['dj'] });
      queryClient.invalidateQueries({ queryKey: ['dj-highlights'] });
    },
  });
}

export function useReorderHighlights() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { items: { mixId: string; sortOrder: number }[] }) => {
      const res = await api.put('/djs/me/highlights/reorder', payload);
      if (res.data?.success === false) {
        throw new Error(res.data.error || 'Failed to reorder highlights');
      }
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-highlights'] });
      queryClient.invalidateQueries({ queryKey: ['dj'] });
      queryClient.invalidateQueries({ queryKey: ['dj-highlights'] });
    },
  });
}
