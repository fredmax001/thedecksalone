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

  const homeAdBoard = useQuery({
    queryKey: ['homeAdBoard'],
    queryFn: async () => {
      const res = await api.get('/campaigns/home-board');
      return res.data.data || { paidAds: [], events: [], djRankings: [], mixes: [] };
    },
    staleTime: 60_000, // refresh every minute
  });

  const platformStats = useQuery({
    queryKey: ['platformStats'],
    queryFn: async () => {
      const res = await api.get('/campaigns/stats');
      return res.data.data || { totalDjs: 0, verifiedDjs: 0, totalMixes: 0, totalEvents: 0, citiesCount: 0 };
    },
    staleTime: 60_000,
  });

  const officialPlaylists = useQuery({
    queryKey: ['officialPlaylists', 'home'],
    queryFn: async () => {
      const res = await api.get('/official-playlists?limit=8');
      return res.data.data || [];
    },
    staleTime: 1000 * 60 * 5,
  });

  return {
    featuredDJs,
    rankings,
    mixCategories,
    events,
    currentBattle,
    homeAdBoard,
    platformStats,
    officialPlaylists,
    isLoading:
      featuredDJs.isLoading ||
      rankings.isLoading ||
      mixCategories.isLoading ||
      events.isLoading ||
      currentBattle.isLoading ||
      homeAdBoard.isLoading ||
      officialPlaylists.isLoading,
  };
}
