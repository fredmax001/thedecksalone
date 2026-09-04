import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useEventAvailability(eventId?: string) {
  return useQuery({
    queryKey: ['event-availability', eventId],
    queryFn: async () => {
      const res = await api.get(`/events/${eventId}/ticketing/availability`);
      return res.data.data;
    },
    enabled: !!eventId,
  });
}

export function useEventDashboard(eventId?: string) {
  return useQuery({
    queryKey: ['event-dashboard', eventId],
    queryFn: async () => {
      const res = await api.get(`/events/${eventId}/ticketing/dashboard`);
      return res.data.data;
    },
    enabled: !!eventId,
  });
}

export function useEventTickets(eventId?: string, params?: { status?: string; search?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['event-tickets', eventId, params],
    queryFn: async () => {
      const query = new URLSearchParams();
      if (params?.status) query.set('status', params.status);
      if (params?.search) query.set('search', params.search);
      if (params?.page) query.set('page', String(params.page));
      if (params?.limit) query.set('limit', String(params.limit));
      const res = await api.get(`/events/${eventId}/ticketing/tickets?${query.toString()}`);
      return res.data;
    },
    enabled: !!eventId,
  });
}

export function useEventCustomers(eventId?: string, params?: { status?: string; search?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['event-customers', eventId, params],
    queryFn: async () => {
      const query = new URLSearchParams();
      if (params?.status) query.set('status', params.status);
      if (params?.search) query.set('search', params.search);
      if (params?.page) query.set('page', String(params.page));
      if (params?.limit) query.set('limit', String(params.limit));
      const res = await api.get(`/events/${eventId}/ticketing/customers?${query.toString()}`);
      return res.data;
    },
    enabled: !!eventId,
  });
}

export function useEventAnalytics(eventId?: string) {
  return useQuery({
    queryKey: ['event-analytics', eventId],
    queryFn: async () => {
      const res = await api.get(`/events/${eventId}/ticketing/analytics`);
      return res.data.data;
    },
    enabled: !!eventId,
  });
}

export function useMyTickets() {
  return useQuery({
    queryKey: ['my-tickets'],
    queryFn: async () => {
      const res = await api.get('/user/tickets');
      return res.data.data;
    },
  });
}

export function useMyTicket(ticketId?: string) {
  return useQuery({
    queryKey: ['my-ticket', ticketId],
    queryFn: async () => {
      const res = await api.get(`/user/tickets/${ticketId}`);
      return res.data.data;
    },
    enabled: !!ticketId,
  });
}

export function usePurchaseTicket(eventId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { ticketTypeId: string; quantity: number; buyerName?: string; buyerEmail?: string; buyerPhone?: string; notes?: string }) => {
      const res = await api.post(`/events/${eventId}/ticketing/purchase`, payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-availability', eventId] });
      queryClient.invalidateQueries({ queryKey: ['my-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['event-dashboard', eventId] });
      queryClient.invalidateQueries({ queryKey: ['event-tickets', eventId] });
    },
  });
}

export function useTicketAction(eventId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ ticketId, action, payload }: { ticketId: string; action: string; payload?: any }) => {
      const res = await api.post(`/events/${eventId}/ticketing/tickets/${ticketId}/${action}`, payload || {});
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-tickets', eventId] });
      queryClient.invalidateQueries({ queryKey: ['event-customers', eventId] });
      queryClient.invalidateQueries({ queryKey: ['event-dashboard', eventId] });
      queryClient.invalidateQueries({ queryKey: ['event-analytics', eventId] });
      queryClient.invalidateQueries({ queryKey: ['my-tickets'] });
    },
  });
}

export function useBulkTicketAction(eventId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (action: 'approve-all') => {
      const res = await api.post(`/events/${eventId}/ticketing/tickets/${action}`);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-tickets', eventId] });
      queryClient.invalidateQueries({ queryKey: ['event-dashboard', eventId] });
      queryClient.invalidateQueries({ queryKey: ['event-analytics', eventId] });
      queryClient.invalidateQueries({ queryKey: ['my-tickets'] });
    },
  });
}

export function usePublishEvent(eventId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (publish: boolean) => {
      const res = await api.post(`/events/${eventId}/ticketing/${publish ? 'publish' : 'unpublish'}`);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      queryClient.invalidateQueries({ queryKey: ['event-dashboard', eventId] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

export function useTicketTypeMutations(eventId?: string) {
  const queryClient = useQueryClient();
  return {
    create: useMutation({
      mutationFn: async (payload: any) => {
        const res = await api.post(`/events/${eventId}/ticketing/ticket-types`, payload);
        return res.data.data;
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['event', eventId] }),
    }),
    update: useMutation({
      mutationFn: async ({ typeId, payload }: { typeId: string; payload: any }) => {
        const res = await api.put(`/events/${eventId}/ticketing/ticket-types/${typeId}`, payload);
        return res.data.data;
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['event', eventId] }),
    }),
    remove: useMutation({
      mutationFn: async (typeId: string) => {
        const res = await api.delete(`/events/${eventId}/ticketing/ticket-types/${typeId}`);
        return res.data.data;
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['event', eventId] }),
    }),
  };
}

/* ─── On-Site Staff Tools ─────────────────────────────────────────────────── */

function getOnsiteToken(eventId?: string): string | null {
  if (!eventId) return null;
  return sessionStorage.getItem(`onsite_token_${eventId}`);
}

export function useOnsiteAuth(eventId?: string) {
  return useMutation({
    mutationFn: async (password: string) => {
      const res = await api.post(`/events/${eventId}/ticketing/onsite/auth`, { password });
      if (res.data.success && res.data.data.token) {
        sessionStorage.setItem(`onsite_token_${eventId}`, res.data.data.token);
      }
      return res.data.data;
    },
  });
}

export function useOnsiteDashboard(eventId?: string) {
  return useQuery({
    queryKey: ['onsite-dashboard', eventId],
    queryFn: async () => {
      const token = getOnsiteToken(eventId);
      const res = await api.get(`/events/${eventId}/ticketing/onsite/dashboard`, {
        headers: token ? { 'X-Onsite-Token': token } : undefined,
      });
      return res.data.data;
    },
    enabled: !!eventId,
  });
}

export function useOnsiteGuests(
  eventId?: string,
  params?: { status?: string; search?: string; page?: number; limit?: number }
) {
  return useQuery({
    queryKey: ['onsite-guests', eventId, params],
    queryFn: async () => {
      const token = getOnsiteToken(eventId);
      const query = new URLSearchParams();
      if (params?.status) query.set('status', params.status);
      if (params?.search) query.set('search', params.search);
      if (params?.page) query.set('page', String(params.page));
      if (params?.limit) query.set('limit', String(params.limit));
      const res = await api.get(`/events/${eventId}/ticketing/onsite/guests?${query.toString()}`, {
        headers: token ? { 'X-Onsite-Token': token } : undefined,
      });
      return res.data;
    },
    enabled: !!eventId,
  });
}

export function useOnsiteCheckin(eventId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ ticketId, action }: { ticketId: string; action: 'checkin' | 'undo-checkin' }) => {
      const token = getOnsiteToken(eventId);
      const res = await api.post(`/events/${eventId}/ticketing/onsite/guests/${ticketId}/${action}`, {}, {
        headers: token ? { 'X-Onsite-Token': token } : undefined,
      });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onsite-guests', eventId] });
      queryClient.invalidateQueries({ queryKey: ['onsite-dashboard', eventId] });
      queryClient.invalidateQueries({ queryKey: ['event-dashboard', eventId] });
    },
  });
}

export function useOnsiteWalkin(eventId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      ticketTypeId: string;
      quantity: number;
      buyerName: string;
      buyerEmail?: string;
      buyerPhone?: string;
      paymentMethod: 'cash' | 'complimentary' | 'mobile_money';
      amount?: number;
      notes?: string;
    }) => {
      const token = getOnsiteToken(eventId);
      const res = await api.post(`/events/${eventId}/ticketing/onsite/walkin`, payload, {
        headers: token ? { 'X-Onsite-Token': token } : undefined,
      });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onsite-guests', eventId] });
      queryClient.invalidateQueries({ queryKey: ['onsite-dashboard', eventId] });
      queryClient.invalidateQueries({ queryKey: ['event-availability', eventId] });
      queryClient.invalidateQueries({ queryKey: ['event-dashboard', eventId] });
    },
  });
}

export function useUpdateTicketControls(eventId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      ticketSalesClosed?: boolean;
      showRemainingTickets?: boolean;
      onsiteUsername?: string;
      onsitePassword?: string;
    }) => {
      const res = await api.put(`/events/${eventId}`, payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      queryClient.invalidateQueries({ queryKey: ['event-dashboard', eventId] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}
