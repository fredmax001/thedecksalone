import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/apiErrors';

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
      const res = await api.get(`/sets/dj/${djId}`);
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
      const res = await api.get('/sets/mine');
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
    onMutate: async (variables) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: ['set', variables.id] }),
        queryClient.cancelQueries({ queryKey: ['my-sets'] }),
        queryClient.cancelQueries({ queryKey: ['dj-sets'] }),
      ]);
      const previousSet = queryClient.getQueryData<SetDetail>(['set', variables.id]);
      const previousMySets = queryClient.getQueryData<SetSummary[]>(['my-sets']);
      const previousDjSets = queryClient.getQueryData<SetSummary[]>(['dj-sets']);
      queryClient.setQueryData<SetDetail>(['set', variables.id], (old) =>
        old ? { ...old, ...variables.payload } : old
      );
      queryClient.setQueryData<SetSummary[]>(['my-sets'], (old) =>
        old?.map((s) => (s.id === variables.id ? { ...s, ...variables.payload } : s))
      );
      queryClient.setQueryData<SetSummary[]>(['dj-sets'], (old) =>
        old?.map((s) => (s.id === variables.id ? { ...s, ...variables.payload } : s))
      );
      return { previousSet, previousMySets, previousDjSets };
    },
    onError: (error, variables, context) => {
      if (context?.previousSet) {
        queryClient.setQueryData(['set', variables.id], context.previousSet);
      }
      if (context?.previousMySets) {
        queryClient.setQueryData(['my-sets'], context.previousMySets);
      }
      if (context?.previousDjSets) {
        queryClient.setQueryData(['dj-sets'], context.previousDjSets);
      }
      toast.error('Could not update set: ' + getApiErrorMessage(error, 'Failed to update set'));
    },
    onSettled: (_data, _error, variables) => {
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
    onMutate: async (id) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: ['my-sets'] }),
        queryClient.cancelQueries({ queryKey: ['dj-sets'] }),
      ]);
      const previousMySets = queryClient.getQueryData<SetSummary[]>(['my-sets']);
      const previousDjSets = queryClient.getQueryData<SetSummary[]>(['dj-sets']);
      queryClient.setQueryData<SetSummary[]>(['my-sets'], (old) =>
        old?.filter((s) => s.id !== id)
      );
      queryClient.setQueryData<SetSummary[]>(['dj-sets'], (old) =>
        old?.filter((s) => s.id !== id)
      );
      return { previousMySets, previousDjSets };
    },
    onError: (error, _id, context) => {
      if (context?.previousMySets) {
        queryClient.setQueryData(['my-sets'], context.previousMySets);
      }
      if (context?.previousDjSets) {
        queryClient.setQueryData(['dj-sets'], context.previousDjSets);
      }
      toast.error('Could not remove: ' + getApiErrorMessage(error, 'Failed to delete set'));
    },
    onSettled: (_data, _error, id) => {
      queryClient.invalidateQueries({ queryKey: ['my-sets'] });
      queryClient.invalidateQueries({ queryKey: ['dj-sets'] });
      queryClient.invalidateQueries({ queryKey: ['set', id] });
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
      mix?: SetItem['mix'];
    }) => {
      const res = await api.post(`/sets/${setId}/mixes`, { mixId, sortOrder });
      if (res.data?.success === false) {
        throw new Error(res.data.error || 'Failed to add mix to set');
      }
      return res.data.data;
    },
    onMutate: async (variables) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: ['set', variables.setId] }),
        queryClient.cancelQueries({ queryKey: ['my-sets'] }),
      ]);
      const previousSet = queryClient.getQueryData<SetDetail>(['set', variables.setId]);
      const previousMySets = queryClient.getQueryData<SetSummary[]>(['my-sets']);
      if (variables.mix) {
        const newItem: SetItem = {
          id: `temp-${variables.mixId}`,
          setId: variables.setId,
          mixId: variables.mixId,
          sortOrder: variables.sortOrder ?? previousSet?.items?.length ?? 0,
          createdAt: new Date().toISOString(),
          mix: variables.mix,
        };
        queryClient.setQueryData<SetDetail>(['set', variables.setId], (old) =>
          old
            ? { ...old, mixCount: (old.mixCount || 0) + 1, items: [...(old.items || []), newItem] }
            : old
        );
        queryClient.setQueryData<SetSummary[]>(['my-sets'], (old) =>
          old?.map((s) =>
            s.id === variables.setId ? { ...s, mixCount: (s.mixCount || 0) + 1 } : s
          )
        );
      }
      return { previousSet, previousMySets };
    },
    onError: (error, variables, context) => {
      if (context?.previousSet) {
        queryClient.setQueryData(['set', variables.setId], context.previousSet);
      }
      if (context?.previousMySets) {
        queryClient.setQueryData(['my-sets'], context.previousMySets);
      }
      toast.error('Could not add mix to set: ' + getApiErrorMessage(error, 'Failed to add mix to set'));
    },
    onSettled: (_data, _error, variables) => {
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
    onMutate: async (variables) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: ['set', variables.setId] }),
        queryClient.cancelQueries({ queryKey: ['my-sets'] }),
      ]);
      const previousSet = queryClient.getQueryData<SetDetail>(['set', variables.setId]);
      const previousMySets = queryClient.getQueryData<SetSummary[]>(['my-sets']);
      queryClient.setQueryData<SetDetail>(['set', variables.setId], (old) =>
        old
          ? {
              ...old,
              mixCount: Math.max(0, (old.mixCount || 0) - 1),
              items: (old.items || []).filter((item) => item.mixId !== variables.mixId),
            }
          : old
      );
      queryClient.setQueryData<SetSummary[]>(['my-sets'], (old) =>
        old?.map((s) =>
          s.id === variables.setId
            ? { ...s, mixCount: Math.max(0, (s.mixCount || 0) - 1) }
            : s
        )
      );
      return { previousSet, previousMySets };
    },
    onError: (error, variables, context) => {
      if (context?.previousSet) {
        queryClient.setQueryData(['set', variables.setId], context.previousSet);
      }
      if (context?.previousMySets) {
        queryClient.setQueryData(['my-sets'], context.previousMySets);
      }
      toast.error('Could not remove: ' + getApiErrorMessage(error, 'Failed to remove mix from set'));
    },
    onSettled: (_data, _error, variables) => {
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
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ['set', variables.setId] });
      const previousSet = queryClient.getQueryData<SetDetail>(['set', variables.setId]);
      const orderByMixId = new Map(variables.items.map((i) => [i.mixId, i.sortOrder]));
      queryClient.setQueryData<SetDetail>(['set', variables.setId], (old) =>
        old
          ? {
              ...old,
              items: (old.items || [])
                .map((item) =>
                  orderByMixId.has(item.mixId)
                    ? { ...item, sortOrder: orderByMixId.get(item.mixId)! }
                    : item
                )
                .sort((a, b) => a.sortOrder - b.sortOrder),
            }
          : old
      );
      return { previousSet };
    },
    onError: (error, variables, context) => {
      if (context?.previousSet) {
        queryClient.setQueryData(['set', variables.setId], context.previousSet);
      }
      toast.error('Could not reorder: ' + getApiErrorMessage(error, 'Failed to reorder set items'));
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: ['set', variables.setId] });
      queryClient.invalidateQueries({ queryKey: ['my-sets'] });
      queryClient.invalidateQueries({ queryKey: ['dj-sets'] });
    },
  });
}
