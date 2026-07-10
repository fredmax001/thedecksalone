import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface SetSummary {
  id: string;
  djId: string;
  title: string;
  description?: string;
  coverImage?: string;
  genre?: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  mixCount: number;
}

export interface SetItem {
  id: string;
  setId: string;
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

export interface SetDetail extends SetSummary {
  items: SetItem[];
}

export function useDJSets(djId: string | undefined) {
  return useQuery({
    queryKey: ['dj-sets', djId],
    queryFn: async () => {
      if (!djId) return [];
      const res = await api.get(`/djs/${djId}/sets`);
      return (res.data.data || []) as SetSummary[];
    },
    enabled: !!djId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useMySets() {
  return useQuery({
    queryKey: ['my-sets'],
    queryFn: async () => {
      const res = await api.get('/djs/me/sets');
      return (res.data.data || []) as SetSummary[];
    },
    staleTime: 1000 * 60 * 2,
  });
}

export function useSet(id: string | undefined) {
  return useQuery({
    queryKey: ['set', id],
    queryFn: async () => {
      if (!id) return null;
      const res = await api.get(`/sets/${id}`);
      return (res.data.data || null) as SetDetail | null;
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreateSet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      title: string;
      description?: string;
      genre?: string;
      coverImage?: string;
      isPublic?: boolean;
    }) => {
      const res = await api.post('/sets', payload);
      if (res.data?.success === false) {
        throw new Error(res.data.error || 'Failed to create set');
      }
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-sets'] });
      queryClient.invalidateQueries({ queryKey: ['dj-sets'] });
      queryClient.invalidateQueries({ queryKey: ['dj'] });
    },
  });
}

export function useUpdateSet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: Partial<{
        title: string;
        description?: string;
        genre?: string;
        coverImage?: string;
        isPublic?: boolean;
      }>;
    }) => {
      const res = await api.put(`/sets/${id}`, payload);
      if (res.data?.success === false) {
        throw new Error(res.data.error || 'Failed to update set');
      }
      return res.data.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['my-sets'] });
      queryClient.invalidateQueries({ queryKey: ['dj-sets'] });
      queryClient.invalidateQueries({ queryKey: ['set', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['dj'] });
    },
  });
}

export function useDeleteSet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/sets/${id}`);
      if (res.data?.success === false) {
        throw new Error(res.data.error || 'Failed to delete set');
      }
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-sets'] });
      queryClient.invalidateQueries({ queryKey: ['dj-sets'] });
      queryClient.invalidateQueries({ queryKey: ['dj'] });
    },
  });
}

export function useAddMixToSet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      setId,
      mixId,
      sortOrder,
    }: {
      setId: string;
      mixId: string;
      sortOrder?: number;
    }) => {
      const res = await api.post(`/sets/${setId}/mixes`, { mixId, sortOrder });
      if (res.data?.success === false) {
        throw new Error(res.data.error || 'Failed to add mix to set');
      }
      return res.data.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['set', variables.setId] });
      queryClient.invalidateQueries({ queryKey: ['my-sets'] });
      queryClient.invalidateQueries({ queryKey: ['dj-sets'] });
      queryClient.invalidateQueries({ queryKey: ['dj'] });
    },
  });
}

export function useRemoveMixFromSet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ setId, mixId }: { setId: string; mixId: string }) => {
      const res = await api.delete(`/sets/${setId}/mixes/${mixId}`);
      if (res.data?.success === false) {
        throw new Error(res.data.error || 'Failed to remove mix from set');
      }
      return res.data.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['set', variables.setId] });
      queryClient.invalidateQueries({ queryKey: ['my-sets'] });
      queryClient.invalidateQueries({ queryKey: ['dj-sets'] });
      queryClient.invalidateQueries({ queryKey: ['dj'] });
    },
  });
}

export function useReorderSetItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      setId,
      items,
    }: {
      setId: string;
      items: { mixId: string; sortOrder: number }[];
    }) => {
      const res = await api.put(`/sets/${setId}/reorder`, { items });
      if (res.data?.success === false) {
        throw new Error(res.data.error || 'Failed to reorder set items');
      }
      return res.data.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['set', variables.setId] });
      queryClient.invalidateQueries({ queryKey: ['my-sets'] });
      queryClient.invalidateQueries({ queryKey: ['dj-sets'] });
    },
  });
}
