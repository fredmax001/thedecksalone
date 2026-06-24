import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useHomeData() {
  const featuredDJs = useQuery({
    queryKey: ['featuredDJs'],
    queryFn: async () => {
      const res = await api.get('/djs?limit=6&sortBy=ranking');
      return res.data.data || [];
    },
  });

  const rankings = useQuery({
    queryKey: ['rankings', 'home'],
    queryFn: async () => {
      const res = await api.get('/rankings?limit=10');
      return res.data.data || [];
    },
  });

  const mixCategories = useQuery({
    queryKey: ['mixCategories'],
    queryFn: async () => {
      const res = await api.get('/mixes/categories');
      return res.data.data || [];
    },
  });

  const events = useQuery({
    queryKey: ['events', 'home'],
    queryFn: async () => {
      const res = await api.get('/events?limit=3&status=upcoming');
      return res.data.data || [];
    },
  });

  const currentBattle = useQuery({
    queryKey: ['currentBattle'],
    queryFn: async () => {
      const res = await api.get('/battles/current');
      return res.data.data || null;
    },
  });

  return {
    featuredDJs,
    rankings,
    mixCategories,
    events,
    currentBattle,
    isLoading:
      featuredDJs.isLoading ||
      rankings.isLoading ||
      mixCategories.isLoading ||
      events.isLoading ||
      currentBattle.isLoading,
  };
}
