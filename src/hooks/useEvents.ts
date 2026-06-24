import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface EventFilters {
  city?: string;
  type?: string;
  status?: string;
  isOpenSlot?: boolean;
  page?: number;
  limit?: number;
}

export function useEvents(filters: EventFilters = {}) {
  const { city, type, status, isOpenSlot, page = 1, limit = 12 } = filters;

  return useQuery({
    queryKey: ['events', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (city) params.set('city', city);
      if (type) params.set('type', type);
      if (status) params.set('status', status);
      if (isOpenSlot !== undefined) params.set('isOpenSlot', String(isOpenSlot));

      const res = await api.get(`/events?${params.toString()}`);
      return res.data;
    },
  });
}

export function useEventTypes() {
  return useQuery({
    queryKey: ['eventTypes'],
    queryFn: async () => {
      const res = await api.get('/events/types');
      return res.data.data || [];
    },
  });
}

export function useEvent(id: string | undefined) {
  return useQuery({
    queryKey: ['event', id],
    queryFn: async () => {
      if (!id) return null;
      const res = await api.get(`/events/${id}`);
      return res.data.data;
    },
    enabled: !!id,
  });
}
