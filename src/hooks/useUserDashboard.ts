import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

/* ─── Bookings ─── */
export interface UserBooking {
  id: string;
  eventType: string;
  eventDate: string;
  eventLocation: string;
  duration: number;
  budget: number;
  finalPrice?: number;
  deposit?: number;
  status: string;
  notes?: string;
  requirements?: string;
  dj?: { id: string; stageName: string; avatar: string };
  createdAt: string;
  rating?: number;
  review?: string;
}

export function useUserBookings(status?: string) {
  return useQuery({
    queryKey: ['user-bookings', status],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status && status !== 'ALL') params.set('status', status);
      const res = await api.get(`/bookings?${params.toString()}`);
      return (res.data.data || []) as UserBooking[];
    },
  });
}

export function useRespondToCounterOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ bookingId, accept, finalPrice }: { bookingId: string; accept: boolean; finalPrice?: number }) => {
      const res = await api.put(`/bookings/${bookingId}/status`, {
        status: accept ? 'CONFIRMED' : 'CANCELLED',
        finalPrice,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-bookings'] });
    },
  });
}

/* ─── Following ─── */
export interface FollowingDJ {
  id: string;
  stageName: string;
  avatar?: string;
  city?: string;
  genre?: string[];
  followerCount: number;
  latestMix?: {
    id: string;
    title: string;
    coverArt?: string;
    createdAt: string;
  };
  latestEvent?: {
    id: string;
    title: string;
    eventDate: string;
    city: string;
  };
}

export function useFollowing() {
  return useQuery({
    queryKey: ['following'],
    queryFn: async () => {
      const res = await api.get('/users/following');
      return (res.data.data || []) as FollowingDJ[];
    },
  });
}

/* ─── Activity ─── */
export interface ActivityItem {
  id: string;
  type: 'LIKE_MIX' | 'RATE_DJ' | 'BATTLE_VOTE' | 'SAVE_EVENT' | 'FOLLOW_DJ' | 'BOOKING_CREATED';
  title: string;
  subtitle?: string;
  thumbnail?: string;
  createdAt: string;
  meta?: Record<string, any>;
}

export function useUserActivity() {
  return useQuery({
    queryKey: ['user-activity'],
    queryFn: async () => {
      const res = await api.get('/users/activity');
      return (res.data.data || []) as ActivityItem[];
    },
  });
}

/* ─── Notifications ─── */
export interface NotificationItem {
  id: string;
  type: 'BOOKING_UPDATE' | 'COUNTER_OFFER' | 'DJ_MESSAGE' | 'NEW_MIX' | 'EVENT_REMINDER' | 'SYSTEM';
  title: string;
  body: string;
  read: boolean;
  actionUrl?: string;
  createdAt: string;
}

export function useUserNotifications() {
  return useQuery({
    queryKey: ['user-notifications'],
    queryFn: async () => {
      const res = await api.get('/users/notifications');
      return (res.data.data || []) as NotificationItem[];
    },
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.patch(`/users/notifications/${id}/read`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-notifications'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await api.patch('/users/notifications/read-all');
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-notifications'] });
    },
  });
}

/* ─── Profile ─── */
export interface UserProfileData {
  username: string;
  email: string;
  name?: string;
  bio?: string;
  location?: string;
  avatar?: string;
  favoriteGenres?: string[];
  social?: {
    instagram?: string;
    twitter?: string;
    facebook?: string;
  };
}

export function useUpdateUserProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<UserProfileData>) => {
      const res = await api.put('/users/profile', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
    },
  });
}

/* ─── Settings ─── */
export function useUpdateUserPassword() {
  return useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const res = await api.put('/users/password', data);
      return res.data;
    },
  });
}
