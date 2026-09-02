import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { buildQueryString } from '@/lib/url';

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
      const qs = buildQueryString({ limit, city, genre });
      const res = await api.get(`/rankings${qs}`);
      const response = res.data;

      if (response && typeof response === 'object' && response.success === false) {
        throw new Error(response.error || 'Failed to fetch rankings');
      }

      if (response && typeof response === 'object' && Array.isArray(response.data)) {
        return response.data;
      }

      throw new Error('Unexpected response format from rankings endpoint');
    },
  });
}

export function useRankingOverview() {
  return useQuery({
    queryKey: ['rankingsOverview'],
    queryFn: async () => {
      const res = await api.get('/rankings/overview');
      const response = res.data;

      if (response && typeof response === 'object' && response.success === false) {
        throw new Error(response.error || 'Failed to fetch rankings overview');
      }

      if (response && typeof response === 'object' && response.data) {
        return response.data;
      }

      throw new Error('Unexpected response format from rankings overview endpoint');
    },
  });
}

export function useRankingHistory(djId: string | undefined) {
  return useQuery({
    queryKey: ['rankingHistory', djId],
    queryFn: async () => {
      if (!djId) return [];
      const res = await api.get(`/rankings/${djId}/history`);
      const response = res.data;

      if (response && typeof response === 'object' && response.success === false) {
        throw new Error(response.error || 'Failed to fetch ranking history');
      }

      if (response && typeof response === 'object' && Array.isArray(response.data)) {
        return response.data;
      }

      throw new Error('Unexpected response format from ranking history endpoint');
    },
    enabled: !!djId,
  });
}
