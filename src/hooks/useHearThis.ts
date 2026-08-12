import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface HearThisTrack {
  id: string;
  title: string;
  uri: string;
  permalink_url: string;
  artwork_url?: string;
  stream_url?: string;
  duration: number;
  playback_count: number;
  favoritings_count: number;
  comment_count: number;
  user: {
    username: string;
    avatar_url?: string;
  };
}

export interface PlatformMetrics {
  hearthis?: {
    platform: string;
    followers: number;
    plays: number;
    tracks: number;
    username: string;
  } | null;
  soundcloud?: {
    platform: string;
    title: string;
    thumbnail_url: string;
    author_name: string;
  } | null;
  mixcloud?: {
    platform: string;
    followers: number;
    plays: number;
    username: string;
  } | null;
  totalReach: number;
  totalPlays: number;
}

export function useHearThisMixes(username: string | undefined, page = 1, count = 20) {
  return useQuery({
    queryKey: ['hearthisMixes', username, page, count],
    queryFn: async () => {
      if (!username) return null;
      const res = await api.get(`/hearthis/${username}/mixes?page=${page}&count=${count}`);
      return res.data;
    },
    enabled: !!username,
  });
}

export function useHearThisSearch(query: string, count = 20, page = 1) {
  return useQuery({
    queryKey: ['hearthisSearch', query, count, page],
    queryFn: async () => {
      if (!query) return null;
      const res = await api.get(`/hearthis/search?q=${query}&count=${count}&page=${page}`);
      return res.data;
    },
    enabled: !!query,
  });
}

export function useHearThisStats(username: string | undefined) {
  return useQuery({
    queryKey: ['hearthisStats', username],
    queryFn: async () => {
      if (!username) return null;
      const res = await api.get(`/hearthis/${username}/stats`);
      return res.data;
    },
    enabled: !!username,
  });
}

export function useDJMetrics(djId: string | undefined) {
  return useQuery({
    queryKey: ['djMetrics', djId],
    queryFn: async () => {
      if (!djId) return null;
      const res = await api.get(`/djs/${djId}/metrics`);
      return res.data;
    },
    enabled: !!djId,
  });
}

export function useUpcomingDJs(limit = 8) {
  return useQuery({
    queryKey: ['upcomingDJs', limit],
    queryFn: async () => {
      const res = await api.get(`/djs/upcoming?limit=${limit}`);
      return res.data;
    },
  });
}
