import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface DJFilters {
  search?: string;
  city?: string;
  genre?: string;
  sortBy?: string;
  minFee?: number;
  maxFee?: number;
  page?: number;
  limit?: number;
}

export function useDJs(filters: DJFilters = {}) {
  const { search, city, genre, sortBy, minFee, maxFee, page = 1, limit = 12 } = filters;

  return useQuery({
    queryKey: ['djs', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (search) params.set('search', search);
      if (city) params.set('city', city);
      if (genre) params.set('genre', genre);
      if (sortBy) params.set('sortBy', sortBy);
      if (minFee) params.set('minFee', String(minFee));
      if (maxFee) params.set('maxFee', String(maxFee));

      const res = await api.get(`/djs?${params.toString()}`);
      return res.data;
    },
  });
}

export function useDJ(id: string | undefined) {
  return useQuery({
    queryKey: ['dj', id],
    queryFn: async () => {
      if (!id) return null;
      const res = await api.get(`/djs/${id}`);
      return res.data.data;
    },
    enabled: !!id,
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
