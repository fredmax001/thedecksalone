import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { buildQueryString } from '@/lib/url';
import { getApiErrorMessage } from '@/lib/apiErrors';

interface NotificationsPage {
  items: NotificationItem[];
  meta: NotificationMeta;
}

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
      const qs = buildQueryString({ page, limit, ...(unreadOnly ? { unreadOnly: 'true' } : {}) });
      const res = await api.get(`/notifications${qs}`);
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
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      await queryClient.cancelQueries({ queryKey: ['notifications-unread-count'] });
      const previousPages = queryClient.getQueriesData<NotificationsPage>({ queryKey: ['notifications'] });
      const previousCount = queryClient.getQueryData<number>(['notifications-unread-count']);
      queryClient.setQueriesData<NotificationsPage>({ queryKey: ['notifications'] }, (old) => {
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
          previousPages.some(([, page]) => page?.items.some((n) => n.id === id && !n.read))) {
        queryClient.setQueryData<number>(['notifications-unread-count'], Math.max(0, previousCount - 1));
      }
      return { previousPages, previousCount };
    },
    onError: (error, _id, context) => {
      context?.previousPages?.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      if (context?.previousCount !== undefined) {
        queryClient.setQueryData(['notifications-unread-count'], context.previousCount);
      }
      toast.error('Could not mark notification read: ' + getApiErrorMessage(error, 'Unknown error'));
    },
    onSettled: () => {
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
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      await queryClient.cancelQueries({ queryKey: ['notifications-unread-count'] });
      const previousPages = queryClient.getQueriesData<NotificationsPage>({ queryKey: ['notifications'] });
      const previousCount = queryClient.getQueryData<number>(['notifications-unread-count']);
      queryClient.setQueriesData<NotificationsPage>({ queryKey: ['notifications'] }, (old) =>
        old
          ? {
              ...old,
              items: old.items.map((n) => ({ ...n, read: true })),
              meta: { ...old.meta, unreadCount: 0 },
            }
          : old
      );
      queryClient.setQueryData<number>(['notifications-unread-count'], 0);
      return { previousPages, previousCount };
    },
    onError: (error, _vars, context) => {
      context?.previousPages?.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      if (context?.previousCount !== undefined) {
        queryClient.setQueryData(['notifications-unread-count'], context.previousCount);
      }
      toast.error('Could not mark notification read: ' + getApiErrorMessage(error, 'Unknown error'));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });
}

/* ─── Clear all notifications ─── */
export function useClearAllNotifications() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await api.delete('/notifications/clear-all');
      return res.data;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      await queryClient.cancelQueries({ queryKey: ['notifications-unread-count'] });
      const previousPages = queryClient.getQueriesData<NotificationsPage>({ queryKey: ['notifications'] });
      const previousCount = queryClient.getQueryData<number>(['notifications-unread-count']);
      queryClient.setQueriesData<NotificationsPage>({ queryKey: ['notifications'] }, (old) =>
        old
          ? { ...old, items: [], meta: { ...old.meta, total: 0, unreadCount: 0 } }
          : old
      );
      queryClient.setQueryData<number>(['notifications-unread-count'], 0);
      return { previousPages, previousCount };
    },
    onError: (error, _vars, context) => {
      context?.previousPages?.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      if (context?.previousCount !== undefined) {
        queryClient.setQueryData(['notifications-unread-count'], context.previousCount);
      }
      toast.error('Could not clear notifications: ' + getApiErrorMessage(error, 'Unknown error'));
    },
    onSettled: () => {
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
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      await queryClient.cancelQueries({ queryKey: ['notifications-unread-count'] });
      await queryClient.cancelQueries({ queryKey: ['user-notifications'] });
      const previousPages = queryClient.getQueriesData<NotificationsPage>({ queryKey: ['notifications'] });
      const previousCount = queryClient.getQueryData<number>(['notifications-unread-count']);
      const previousLists = queryClient.getQueriesData<NotificationItem[]>({ queryKey: ['user-notifications'] });
      const wasUnread =
        previousPages.some(([, page]) => page?.items.some((n) => n.id === id && !n.read)) ||
        previousLists.some(([, list]) => list?.some((n) => n.id === id && !n.read));
      queryClient.setQueriesData<NotificationsPage>({ queryKey: ['notifications'] }, (old) =>
        old
          ? {
              ...old,
              items: old.items.filter((n) => n.id !== id),
              meta: {
                ...old.meta,
                total: Math.max(0, old.meta.total - 1),
                unreadCount: wasUnread ? Math.max(0, old.meta.unreadCount - 1) : old.meta.unreadCount,
              },
            }
          : old
      );
      queryClient.setQueriesData<NotificationItem[]>({ queryKey: ['user-notifications'] }, (old) =>
        old ? old.filter((n) => n.id !== id) : old
      );
      if (typeof previousCount === 'number' && wasUnread) {
        queryClient.setQueryData<number>(['notifications-unread-count'], Math.max(0, previousCount - 1));
      }
      return { previousPages, previousCount, previousLists };
    },
    onError: (error, _id, context) => {
      context?.previousPages?.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      context?.previousLists?.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      if (context?.previousCount !== undefined) {
        queryClient.setQueryData(['notifications-unread-count'], context.previousCount);
      }
      toast.error('Could not clear notifications: ' + getApiErrorMessage(error, 'Unknown error'));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['user-notifications'] });
    },
  });
}
