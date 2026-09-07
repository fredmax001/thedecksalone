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

interface OptimisticBattleEntry {
  id: string;
  votes?: number;
  voteCount?: number;
  votesCast?: { id: string }[];
}

interface OptimisticBattle {
  id: string;
  entries: OptimisticBattleEntry[];
}

export function useVoteBattle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ battleId, entryId }: { battleId: string; entryId: string }) => {
      const res = await api.post(`/battles/${battleId}/vote`, { entryId });
      return res.data;
    },
    onMutate: async ({ entryId }) => {
      await queryClient.cancelQueries({ queryKey: ['currentBattle'] });
      await queryClient.cancelQueries({ queryKey: ['battles'] });

      const previousCurrentBattle = queryClient.getQueryData<OptimisticBattle>(['currentBattle']);
      const previousBattles = queryClient.getQueriesData<{ data?: OptimisticBattle[] }>({ queryKey: ['battles'] });

      const bumpEntry = (entry: OptimisticBattleEntry) => {
        if (entry.id !== entryId) return entry;
        const next = (entry.voteCount ?? entry.votes ?? entry.votesCast?.length ?? 0) + 1;
        return { ...entry, votes: next, voteCount: next };
      };

      queryClient.setQueryData<OptimisticBattle | null>(['currentBattle'], (old) =>
        old ? { ...old, entries: old.entries.map(bumpEntry) } : old
      );
      queryClient.setQueriesData<{ data?: OptimisticBattle[] }>({ queryKey: ['battles'] }, (old) =>
        old?.data
          ? { ...old, data: old.data.map((battle) => ({ ...battle, entries: battle.entries.map(bumpEntry) })) }
          : old
      );

      return { previousCurrentBattle, previousBattles };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousCurrentBattle !== undefined) {
        queryClient.setQueryData(['currentBattle'], context.previousCurrentBattle);
      }
      context?.previousBattles.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentBattle'] });
      queryClient.invalidateQueries({ queryKey: ['battles'] });
    },
  });
}
