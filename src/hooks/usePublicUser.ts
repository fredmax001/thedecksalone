import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export interface PublicUserProfile {
  id: string;
  username: string;
  name: string | null;
  bio: string | null;
  location: string | null;
  avatar: string | null;
  favoriteGenres: string[];
  role: string;
  createdAt: string;
  djProfile: {
    id: string;
    stageName: string;
    bio: string | null;
    avatar: string | null;
    city: string | null;
    community: string | null;
    country: string | null;
    isPublic: boolean;
    subscriptionTier: string | null;
    verified: boolean;
    user?: { username: string };
  } | null;
}

export function usePublicUser(username: string | undefined) {
  return useQuery({
    queryKey: ['public-user', username?.toLowerCase()],
    queryFn: async () => {
      const res = await api.get(`/users/public/${username}`);
      return res.data.data as PublicUserProfile;
    },
    enabled: !!username,
    staleTime: 1000 * 60 * 5,
  });
}
