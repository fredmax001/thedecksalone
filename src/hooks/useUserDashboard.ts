import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { buildQueryString } from '@/lib/url';
import { getApiErrorMessage } from '@/lib/apiErrors';

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
      const qs = buildQueryString(status && status !== 'ALL' ? { status } : {});
      const res = await api.get(`/bookings${qs}`);
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
  type: 'LIKE_MIX' | 'REPOST_MIX' | 'RATE_DJ' | 'BATTLE_VOTE' | 'SAVE_EVENT' | 'FOLLOW_DJ' | 'BOOKING_CREATED';
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

/* ─── Notifications (delegated to dedicated notification API) ─── */
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
      const res = await api.get('/notifications');
      return (res.data.data || []) as NotificationItem[];
    },
  });
}

interface DashboardNotificationsPage {
  items: NotificationItem[];
  meta: { unreadCount: number };
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.patch(`/notifications/${id}/read`);
      return res.data;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['user-notifications'] });
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      await queryClient.cancelQueries({ queryKey: ['notifications-unread-count'] });
      const previousLists = queryClient.getQueriesData<NotificationItem[]>({ queryKey: ['user-notifications'] });
      const previousPages = queryClient.getQueriesData<DashboardNotificationsPage>({ queryKey: ['notifications'] });
      const previousCount = queryClient.getQueryData<number>(['notifications-unread-count']);
      queryClient.setQueriesData<NotificationItem[]>({ queryKey: ['user-notifications'] }, (old) =>
        old?.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      queryClient.setQueriesData<DashboardNotificationsPage>({ queryKey: ['notifications'] }, (old) => {
        if (!old) return old;
        const wasUnread = old.items.some((n) => n.id === id && !n.read);
        return {
          ...old,
          items: old.items.map((n) => (n.id === id ? { ...n, read: true } : n)),
          meta: wasUnread
            ? { ...old.meta, unreadCount: Math.max(0, old.meta.unreadCount - 1) }
            : old.meta,
        };
      });
      if (typeof previousCount === 'number' &&
          previousLists.some(([, list]) => list?.some((n) => n.id === id && !n.read))) {
        queryClient.setQueryData<number>(['notifications-unread-count'], Math.max(0, previousCount - 1));
      }
      return { previousLists, previousPages, previousCount };
    },
    onError: (error, _id, context) => {
      context?.previousLists?.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      context?.previousPages?.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      if (context?.previousCount !== undefined) {
        queryClient.setQueryData(['notifications-unread-count'], context.previousCount);
      }
      toast.error('Could not mark notification read: ' + getApiErrorMessage(error, 'Unknown error'));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['user-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await api.patch('/notifications/read-all');
      return res.data;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['user-notifications'] });
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      await queryClient.cancelQueries({ queryKey: ['notifications-unread-count'] });
      const previousLists = queryClient.getQueriesData<NotificationItem[]>({ queryKey: ['user-notifications'] });
      const previousPages = queryClient.getQueriesData<DashboardNotificationsPage>({ queryKey: ['notifications'] });
      const previousCount = queryClient.getQueryData<number>(['notifications-unread-count']);
      queryClient.setQueriesData<NotificationItem[]>({ queryKey: ['user-notifications'] }, (old) =>
        old?.map((n) => ({ ...n, read: true }))
      );
      queryClient.setQueriesData<DashboardNotificationsPage>({ queryKey: ['notifications'] }, (old) =>
        old
          ? {
              ...old,
              items: old.items.map((n) => ({ ...n, read: true })),
              meta: { ...old.meta, unreadCount: 0 },
            }
          : old
      );
      queryClient.setQueryData<number>(['notifications-unread-count'], 0);
      return { previousLists, previousPages, previousCount };
    },
    onError: (error, _vars, context) => {
      context?.previousLists?.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      context?.previousPages?.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      if (context?.previousCount !== undefined) {
        queryClient.setQueryData(['notifications-unread-count'], context.previousCount);
      }
      toast.error('Could not mark notification read: ' + getApiErrorMessage(error, 'Unknown error'));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['user-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
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
