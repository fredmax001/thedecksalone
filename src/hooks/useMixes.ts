import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface MixFilters {
  category?: string;
  genre?: string;
  search?: string;
  sortBy?: string;
  djId?: string;
  page?: number;
  limit?: number;
}

export function useMixes(filters: MixFilters = {}) {
  const { category, genre, search, sortBy, djId, page = 1, limit = 12 } = filters;

  // Build a clean query key that only includes defined values — avoids
  // undefined-key comparison issues and makes the cache key stable
  const queryKey: (string | number)[] = ['mixes', page, limit];
  if (genre) queryKey.push('genre', genre);
  if (category) queryKey.push('category', category);
  if (search) queryKey.push('search', search);
  if (sortBy) queryKey.push('sortBy', sortBy);
  if (djId) queryKey.push('djId', djId);

  return useQuery({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (category) params.set('category', category);
      if (genre) params.set('genre', genre);
      if (search) params.set('search', search);
      if (sortBy) params.set('sortBy', sortBy);
      if (djId) params.set('djId', djId);

      const res = await api.get(`/mixes?${params.toString()}`);
      return res.data;
    },
    staleTime: 0,           // Always consider data stale — refetch on mount/key change
    refetchOnMount: true,   // Ensure fresh data when component mounts
    gcTime: 1000 * 60 * 2,  // Keep in garbage cache for 2 minutes
  });
}

export function useTrendingMixes(limit = 6, genre?: string) {
  const queryKey: (string | number)[] = ['trendingMixes', limit];
  if (genre) queryKey.push('genre', genre);

  return useQuery({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('limit', String(limit));
      if (genre) params.set('genre', genre);
      const res = await api.get(`/mixes/trending?${params.toString()}`);
      return res.data.data || [];
    },
    staleTime: 1000 * 60 * 2, // 2 minutes — trending data can be slightly stale
  });
}

export function useMixCategories() {
  return useQuery({
    queryKey: ['mixCategories'],
    queryFn: async () => {
      const res = await api.get('/mixes/categories');
      return res.data.data || [];
    },
    staleTime: 1000 * 60 * 10, // Categories change rarely
  });
}

export function useMixGenres() {
  return useQuery({
    queryKey: ['mixGenres'],
    queryFn: async () => {
      const res = await api.get('/mixes/genres');
      return res.data.data || [];
    },
    staleTime: 1000 * 60 * 5, // Genres change when new mixes are uploaded
  });
}

export function useMix(id: string | undefined) {
  return useQuery({
    queryKey: ['mix', id],
    queryFn: async () => {
      if (!id) return null;
      const res = await api.get(`/mixes/${id}`);
      return res.data.data;
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
}

export function useLikeMix() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (mixId: string) => {
      const res = await api.post(`/mixes/${mixId}/like`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mixes'] });
      queryClient.invalidateQueries({ queryKey: ['trendingMixes'] });
      queryClient.invalidateQueries({ queryKey: ['mix'] });
      queryClient.invalidateQueries({ queryKey: ['hallOfFameMixes'] });
    },
  });
}

export function useHallOfFameMixes(limit = 6) {
  return useQuery({
    queryKey: ['hallOfFameMixes', limit],
    queryFn: async () => {
      const res = await api.get(`/mixes/hall-of-fame?limit=${limit}`);
      return res.data.data || [];
    },
    staleTime: 1000 * 60 * 10,
  });
}

export function useImportHearthis() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { urls: string; defaultGenre?: string; defaultCategory?: string; isPublic?: boolean }) => {
      const res = await api.post('/mixes/import-hearthis', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mixes'] });
      queryClient.invalidateQueries({ queryKey: ['trendingMixes'] });
      queryClient.invalidateQueries({ queryKey: ['mixGenres'] });
      queryClient.invalidateQueries({ queryKey: ['mixCategories'] });
    },
  });
}
