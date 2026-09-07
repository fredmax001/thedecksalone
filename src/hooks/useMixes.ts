import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { buildQueryString } from '@/lib/url';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/apiErrors';

export interface MixFilters {
  category?: string;
  genre?: string;
  search?: string;
  sortBy?: string;
  djId?: string;
  page?: number;
  limit?: number;
}

export function useMixes(filters: MixFilters = {}) {
  const { category, genre, search, sortBy, djId, page = 1, limit = 12 } = filters;

  // Build a clean query key that only includes defined values — avoids
  // undefined-key comparison issues and makes the cache key stable
  const queryKey: (string | number)[] = ['mixes', page, limit];
  if (genre) queryKey.push('genre', genre);
  if (category) queryKey.push('category', category);
  if (search) queryKey.push('search', search);
  if (sortBy) queryKey.push('sortBy', sortBy);
  if (djId) queryKey.push('djId', djId);

  return useQuery({
    queryKey,
    queryFn: async () => {
      const qs = buildQueryString({ page, limit, category, genre, search, sortBy, djId });
      const res = await api.get(`/mixes${qs}`);
      return res.data;
    },
    staleTime: 0,           // Always consider data stale — refetch on mount/key change
    refetchOnMount: true,   // Ensure fresh data when component mounts
    gcTime: 1000 * 60 * 2,  // Keep in garbage cache for 2 minutes
  });
}

export function useTrendingMixes(limit = 6, genre?: string) {
  const queryKey: (string | number)[] = ['trendingMixes', limit];
  if (genre) queryKey.push('genre', genre);

  return useQuery({
    queryKey,
    queryFn: async () => {
      const qs = buildQueryString({ limit, genre });
      const res = await api.get(`/mixes/trending${qs}`);
      return res.data.data || [];
    },
    staleTime: 1000 * 60 * 2, // 2 minutes — trending data can be slightly stale
  });
}

export function useMixCategories() {
  return useQuery({
    queryKey: ['mixCategories'],
    queryFn: async () => {
      const res = await api.get('/mixes/categories');
      return res.data.data || [];
    },
    staleTime: 1000 * 60 * 10, // Categories change rarely
  });
}

export interface GenreWithCount {
  name: string;
  count: number;
}

export function useMixGenres() {
  return useQuery({
    queryKey: ['mixGenres'],
    queryFn: async () => {
      const res = await api.get('/mixes/genres');
      return (res.data.data || []) as GenreWithCount[];
    },
    staleTime: 1000 * 60 * 5, // Genres change when new mixes are uploaded
  });
}

export function useMix(identifier: string | undefined, djIdentifier?: string) {
  return useQuery({
    queryKey: ['mix', identifier, djIdentifier],
    queryFn: async () => {
      if (!identifier) return null;
      if (djIdentifier) {
        const res = await api.get(`/mixes/by-slug/${encodeURIComponent(djIdentifier)}/${encodeURIComponent(identifier)}`);
        return res.data.data;
      }
      const res = await api.get(`/mixes/${encodeURIComponent(identifier)}`);
      return res.data.data;
    },
    enabled: !!identifier,
    staleTime: 1000 * 60 * 5,
  });
}

export interface MixLikeState {
  liked: boolean;
  likes: number;
}

// Reactive, cache-driven like state for a single mix. Shared across all
// surfaces (MixDetail, MixFeedRow, MixHub) so optimistic updates and
// rollbacks propagate everywhere. Seeded from the mix's `likes` count on
// first read; afterwards the cache value is the source of truth.
export function useMixLike(mixId: string | undefined, initialLikes = 0) {
  return useQuery<MixLikeState>({
    queryKey: ['mixLike', mixId],
    queryFn: () => ({ liked: false, likes: initialLikes }),
    enabled: !!mixId,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 30,
  });
}

export function useLikeMix() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (mixId: string) => {
      const res = await api.post(`/mixes/${mixId}/like`);
      return res.data;
    },
    onMutate: async (mixId) => {
      await queryClient.cancelQueries({ queryKey: ['mixLike', mixId] });
      const previous = queryClient.getQueryData<MixLikeState>(['mixLike', mixId]);
      const current: MixLikeState = previous ?? { liked: false, likes: 0 };
      // Compute the next state from the current cache value (not a prop
      // captured at click time) so rapid toggles from any surface stay in sync
      queryClient.setQueryData<MixLikeState>(['mixLike', mixId], {
        liked: !current.liked,
        likes: Math.max(0, current.likes + (current.liked ? -1 : 1)),
      });
      return { previous };
    },
    onError: (error, mixId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['mixLike', mixId], context.previous);
      } else {
        queryClient.removeQueries({ queryKey: ['mixLike', mixId] });
      }
      toast.error('Could not update like: ' + getApiErrorMessage(error, 'Please try again.'));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['mixes'] });
      queryClient.invalidateQueries({ queryKey: ['trendingMixes'] });
      queryClient.invalidateQueries({ queryKey: ['mix'] });
      queryClient.invalidateQueries({ queryKey: ['hallOfFameMixes'] });
    },
  });
}

export function useHallOfFameMixes(limit = 6) {
  return useQuery({
    queryKey: ['hallOfFameMixes', limit],
    queryFn: async () => {
      const res = await api.get(`/mixes/hall-of-fame?limit=${limit}`);
      return res.data.data || [];
    },
    staleTime: 1000 * 60 * 10,
  });
}

export function useImportHearthis() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { urls: string[] | string; defaultGenre?: string; defaultCategory?: string; isPublic?: boolean }) => {
      const urlsArray = Array.isArray(payload.urls)
        ? payload.urls
        : payload.urls.split(/[\n,]+/).map((u) => u.trim()).filter(Boolean);
      const res = await api.post('/mixes/import-hearthis', {
        ...payload,
        urls: urlsArray,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mixes'] });
      queryClient.invalidateQueries({ queryKey: ['trendingMixes'] });
      queryClient.invalidateQueries({ queryKey: ['mixGenres'] });
      queryClient.invalidateQueries({ queryKey: ['mixCategories'] });
    },
  });
}
