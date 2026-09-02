import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { buildQueryString } from '@/lib/url';

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
      const qs = buildQueryString({ page, limit, city, type, status, isOpenSlot });
      const res = await api.get(`/events${qs}`);
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
