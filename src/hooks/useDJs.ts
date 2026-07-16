import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface DJFilters {
  search?: string;
  city?: string;
  community?: string;
  genre?: string;
  sortBy?: string;
  minFee?: number;
  maxFee?: number;
  page?: number;
  limit?: number;
}

export function useDJs(filters: DJFilters = {}) {
  const { search, city, community, genre, sortBy, minFee, maxFee, page = 1, limit = 12 } = filters;

  return useQuery({
    queryKey: ['djs', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (search) params.set('search', search);
      if (city) params.set('city', city);
      if (community) params.set('community', community);
      if (genre) params.set('genre', genre);
      if (sortBy) params.set('sortBy', sortBy);
      if (minFee) params.set('minFee', String(minFee));
      if (maxFee) params.set('maxFee', String(maxFee));

      const res = await api.get(`/discover/djs?${params.toString()}`);
      const response = res.data;

      // Defensive: backend may return { success: false, error: '...' } on non-500 errors
      if (response && typeof response === 'object' && response.success === false) {
        throw new Error(response.error || 'Failed to fetch DJs');
      }

      // Normalize: backend returns { success: true, data: [...], meta: {...} }
      // We want to return { data: [...], meta: {...} }
      if (response && typeof response === 'object' && Array.isArray(response.data)) {
        return {
          data: response.data,
          meta: response.meta || { total: response.data.length, page, limit, totalPages: 1 },
        };
      }

      // If we got an unexpected shape, throw so error UI is shown
      throw new Error('Unexpected response format from DJ list endpoint');
    },
    retry: 2,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useDJ(identifier: string | undefined) {
  return useQuery({
    queryKey: ['dj', identifier],
    queryFn: async () => {
      if (!identifier) return null;
      const res = await api.get(`/djs/${identifier}`);
      return res.data.data;
    },
    enabled: !!identifier,
  });
}

export function useDJCities() {
  return useQuery({
    queryKey: ['djCities'],
    queryFn: async () => {
      const res = await api.get('/djs/cities');
      return res.data.data || [];
    },
  });
}

export function useDJGenres() {
  return useQuery({
    queryKey: ['djGenres'],
    queryFn: async () => {
      const res = await api.get('/djs/genres');
      return res.data.data || [];
    },
  });
}

export function useIsFollowingDj(djId: string | undefined) {
  return useQuery({
    queryKey: ['dj-follow-status', djId],
    queryFn: async () => {
      if (!djId) return { following: false };
      const res = await api.get(`/djs/${djId}/follow-status`);
      return res.data.data;
    },
    enabled: !!djId,
  });
}

export function useFollowDj(djId: string | undefined) {
  const queryClient = useQueryClient();

  const follow = useMutation({
    mutationFn: async () => {
      if (!djId) throw new Error('No DJ ID');
      const res = await api.post(`/djs/${djId}/follow`);
      if (res.data?.success === false) {
        throw new Error(res.data.error || 'Failed to follow DJ');
      }
      return res.data.data;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['dj-follow-status', djId] });
      const previousStatus = queryClient.getQueryData<{ following: boolean }>(['dj-follow-status', djId]);
      queryClient.setQueryData(['dj-follow-status', djId], { following: true });
      return { previousStatus };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousStatus) {
        queryClient.setQueryData(['dj-follow-status', djId], context.previousStatus);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['dj-follow-status', djId] });
      queryClient.invalidateQueries({ queryKey: ['dj', djId] });
    },
  });

  const unfollow = useMutation({
    mutationFn: async () => {
      if (!djId) throw new Error('No DJ ID');
      const res = await api.delete(`/djs/${djId}/follow`);
      if (res.data?.success === false) {
        throw new Error(res.data.error || 'Failed to unfollow DJ');
      }
      return res.data.data;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['dj-follow-status', djId] });
      const previousStatus = queryClient.getQueryData<{ following: boolean }>(['dj-follow-status', djId]);
      queryClient.setQueryData(['dj-follow-status', djId], { following: false });
      return { previousStatus };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousStatus) {
        queryClient.setQueryData(['dj-follow-status', djId], context.previousStatus);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['dj-follow-status', djId] });
      queryClient.invalidateQueries({ queryKey: ['dj', djId] });
    },
  });

  return { follow, unfollow };
}

export function useHallOfFameDJs(limit = 6) {
  return useQuery({
    queryKey: ['hallOfFameDJs', limit],
    queryFn: async () => {
      const res = await api.get(`/djs/hall-of-fame?limit=${limit}`);
      return res.data.data || [];
    },
  });
}
