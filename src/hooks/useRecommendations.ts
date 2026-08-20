import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { getLastFeedVisit, markFeedAsSeenNow } from '@/lib/recommendations';

export interface RecommendedDJ {
  id: string;
  stageName: string;
  slug?: string;
  avatar?: string;
  city?: string;
  verified?: boolean;
  genres?: string[];
  subscriptionTier?: string;
  totalMixes?: number;
  totalFollowers?: number;
  totalPlays?: number;
  rating?: number;
  recommendationReason?: string;
  user?: { username?: string };
}

export interface ForYouPlaylist {
  id: string;
  slug: string;
  title: string;
  description: string;
  coverImage: string;
  category: string;
  badge: string;
  trackCount: number;
  items: any[];
}

export interface FeedStats {
  since: string;
  newMixesCount: number;
  newEventsCount: number;
  totalNewDrops: number;
  totalMixes: number;
  totalDjs: number;
}

export function useRecommendedDjs(limit = 8) {
  return useQuery<RecommendedDJ[]>({
    queryKey: ['recommended-djs', limit],
    queryFn: async () => {
      const res = await api.get(`/discover/djs/recommended?limit=${limit}`);
      return res.data?.data || [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useForYouPlaylists() {
  return useQuery<ForYouPlaylist[]>({
    queryKey: ['for-you-playlists'],
    queryFn: async () => {
      const res = await api.get('/discover/playlists/for-you');
      return res.data?.data || [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useFeedStats() {
  const queryClient = useQueryClient();
  const lastVisit = getLastFeedVisit();

  const query = useQuery<FeedStats>({
    queryKey: ['feed-stats', lastVisit],
    queryFn: async () => {
      const res = await api.get(`/discover/feed/stats?since=${encodeURIComponent(lastVisit)}`);
      return res.data?.data || {
        since: lastVisit,
        newMixesCount: 0,
        newEventsCount: 0,
        totalNewDrops: 0,
        totalMixes: 0,
        totalDjs: 0,
      };
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  const markSeenMutation = useMutation({
    mutationFn: async () => {
      const newTimestamp = markFeedAsSeenNow();
      return newTimestamp;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed-stats'] });
    },
  });

  return {
    ...query,
    markFeedAsSeen: markSeenMutation.mutate,
    isMarkingSeen: markSeenMutation.isPending,
  };
}
