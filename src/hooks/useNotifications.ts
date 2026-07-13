import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  actionUrl?: string;
  entityId?: string;
  entityType?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationMeta {
  total: number;
  unreadCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

/* ─── Fetch notifications ─── */
export function useNotifications(options?: { page?: number; limit?: number; unreadOnly?: boolean }) {
  const { page = 1, limit = 20, unreadOnly = false } = options || {};
  return useQuery({
    queryKey: ['notifications', page, limit, unreadOnly],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (unreadOnly) params.set('unreadOnly', 'true');
      const res = await api.get(`/notifications?${params.toString()}`);
      return {
        items: (res.data.data || []) as NotificationItem[],
        meta: res.data.meta as NotificationMeta,
      };
    },
  });
}

/* ─── Fetch unread count only ─── */
export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: async () => {
      const res = await api.get('/notifications/unread-count');
      return (res.data.data?.count || 0) as number;
    },
    refetchInterval: 30000, // Poll every 30 seconds
  });
}

/* ─── Mark single notification as read ─── */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.patch(`/notifications/${id}/read`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });
}

/* ─── Mark all notifications as read ─── */
export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await api.patch('/notifications/read-all');
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });
}

/* ─── Delete notification ─── */
export function useDeleteNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/notifications/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });
}
