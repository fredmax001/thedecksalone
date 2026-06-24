import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface RankingFilters {
  city?: string;
  genre?: string;
  limit?: number;
}

export function useRankings(filters: RankingFilters = {}) {
  const { city, genre, limit = 50 } = filters;

  return useQuery({
    queryKey: ['rankings', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('limit', String(limit));
      if (city) params.set('city', city);
      if (genre) params.set('genre', genre);

      const res = await api.get(`/rankings?${params.toString()}`);
      return res.data.data || [];
    },
  });
}

export function useRankingOverview() {
  return useQuery({
    queryKey: ['rankingsOverview'],
    queryFn: async () => {
      const res = await api.get('/rankings/overview');
      return res.data.data;
    },
  });
}

export function useRankingHistory(djId: string | undefined) {
  return useQuery({
    queryKey: ['rankingHistory', djId],
    queryFn: async () => {
      if (!djId) return [];
      const res = await api.get(`/rankings/${djId}/history`);
      return res.data.data || [];
    },
    enabled: !!djId,
  });
}
