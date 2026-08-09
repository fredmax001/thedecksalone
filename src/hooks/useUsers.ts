import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface UserFilters {
  search?: string;
  page?: number;
  limit?: number;
}

export interface DiscoveredUser {
  id: string;
  name: string | null;
  username: string;
  avatar: string | null;
  location: string | null;
  bio: string | null;
  favoriteGenres: string[];
  createdAt: string;
  displayName: string;
}

export function useUsers(filters: UserFilters = {}) {
  const { search, page = 1, limit = 20 } = filters;

  return useQuery({
    queryKey: ['discover-users', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (search) params.set('search', search);

      const res = await api.get(`/discover/users?${params.toString()}`);
      const response = res.data;

      if (response && typeof response === 'object' && response.success === false) {
        throw new Error(response.error || 'Failed to fetch users');
      }

      if (response && typeof response === 'object' && Array.isArray(response.data)) {
        return {
          data: response.data as DiscoveredUser[],
          meta: response.meta || { total: response.data.length, page, limit, totalPages: 1 },
        };
      }

      throw new Error('Unexpected response format from users endpoint');
    },
    retry: 2,
    staleTime: 1000 * 60 * 5,
  });
}
