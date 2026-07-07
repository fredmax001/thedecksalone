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

  return useQuery({
    queryKey: ['mixes', filters],
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
  });
}

export function useTrendingMixes(limit = 6) {
  return useQuery({
    queryKey: ['trendingMixes', limit],
    queryFn: async () => {
      const res = await api.get(`/mixes/trending?limit=${limit}`);
      return res.data.data || [];
    },
  });
}

export function useMixCategories() {
  return useQuery({
    queryKey: ['mixCategories'],
    queryFn: async () => {
      const res = await api.get('/mixes/categories');
      return res.data.data || [];
    },
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
  });
}

