import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface CountMeta {
  meta?: { total?: number };
}

export function usePublicStats() {
  const djsQuery = useQuery<CountMeta>({
    queryKey: ['publicStats', 'djs'],
    queryFn: async () => {
      const res = await api.get('/djs?page=1&limit=1');
      return res.data;
    },
  });

  const mixesQuery = useQuery<CountMeta>({
    queryKey: ['publicStats', 'mixes'],
    queryFn: async () => {
      const res = await api.get('/mixes?page=1&limit=1');
      return res.data;
    },
  });

  const eventsQuery = useQuery<CountMeta>({
    queryKey: ['publicStats', 'events'],
    queryFn: async () => {
      const res = await api.get('/events?page=1&limit=1');
      return res.data;
    },
  });

  const citiesQuery = useQuery<string[]>({
    queryKey: ['publicStats', 'cities'],
    queryFn: async () => {
      const res = await api.get('/djs/cities');
      return res.data.data || [];
    },
  });

  const isLoading =
    djsQuery.isLoading ||
    mixesQuery.isLoading ||
    eventsQuery.isLoading ||
    citiesQuery.isLoading;

  return {
    isLoading,
    totalDjs: djsQuery.data?.meta?.total ?? 0,
    totalMixes: mixesQuery.data?.meta?.total ?? 0,
    totalEvents: eventsQuery.data?.meta?.total ?? 0,
    cityCount: citiesQuery.data?.length ?? 0,
  };
}
