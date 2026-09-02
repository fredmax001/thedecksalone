import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { buildQueryString } from '@/lib/url';

interface BattleFilters {
  status?: string;
  page?: number;
  limit?: number;
}

export function useBattles(filters?: BattleFilters) {
  return useQuery({
    queryKey: ['battles', filters],
    queryFn: async () => {
      const qs = buildQueryString({ status: filters?.status, page: filters?.page, limit: filters?.limit });
      const res = await api.get(`/battles${qs}`);
      return res.data || { data: [], meta: {} };
    },
  });
}

export function useCurrentBattle() {
  return useQuery({
    queryKey: ['currentBattle'],
    queryFn: async () => {
      const res = await api.get('/battles/current');
      return res.data.data || null;
    },
  });
}

export function useBattle(id: string | undefined) {
  return useQuery({
    queryKey: ['battle', id],
    queryFn: async () => {
      if (!id) return null;
      const res = await api.get(`/battles/${id}`);
      return res.data.data;
    },
    enabled: !!id,
  });
}

export function useVoteBattle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ battleId, entryId }: { battleId: string; entryId: string }) => {
      const res = await api.post(`/battles/${battleId}/vote`, { entryId });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentBattle'] });
      queryClient.invalidateQueries({ queryKey: ['battles'] });
    },
  });
}
