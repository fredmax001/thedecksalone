import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/apiErrors';

// ─── Interfaces ───────────────────────────────────────────────────

export type SupportTicketStatus = 'open' | 'pending' | 'resolved' | 'closed';
export type SupportPriority = 'low' | 'medium' | 'high';

export interface SupportTicketUser {
  id: string;
  username: string;
  email: string;
  avatar?: string | null;
}

export interface SupportTicketSummary {
  id: string;
  subject: string;
  status: SupportTicketStatus;
  priority: SupportPriority;
  createdAt: string;
  replyCount: number;
}

export interface SupportTicket extends SupportTicketSummary {
  message?: string;
  updatedAt?: string;
  user?: SupportTicketUser;
}

export interface SupportTicketListItem extends SupportTicket {
  user: SupportTicketUser;
}

export interface SupportTicketReply {
  id: string;
  message: string;
  isStaff: boolean;
  createdAt: string;
  author: { username: string };
}

export interface SupportTicketDetail {
  ticket: SupportTicket;
  replies: SupportTicketReply[];
}

export interface SupportTicketCounts {
  open: number;
  pending: number;
  resolved: number;
  closed: number;
  total: number;
}

export interface SupportTicketsMeta {
  total: number;
  page: number;
  limit: number;
}

export interface SupportTicketsResponse {
  tickets: SupportTicketListItem[];
  meta: SupportTicketsMeta;
}

// ─── Query Hooks ────────────────────────────────────────────────────

export function useSupportTicketCounts() {
  return useQuery<SupportTicketCounts>({
    queryKey: ['support', 'counts'],
    staleTime: 0,
    refetchInterval: 15000,
    queryFn: async () => {
      const res = await api.get('/support/tickets/meta/counts');
      return res.data.data;
    },
  });
}

export function useSupportTickets(filters?: { status?: string; page?: number; limit?: number }) {
  return useQuery<SupportTicketsResponse>({
    queryKey: ['support', 'tickets', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.status) params.set('status', filters.status);
      if (filters?.page) params.set('page', String(filters.page));
      if (filters?.limit) params.set('limit', String(filters.limit));
      const query = params.toString();
      const res = await api.get(`/support/tickets${query ? `?${query}` : ''}`);
      return res.data.data;
    },
  });
}

export function useSupportTicket(id: string | null) {
  return useQuery<SupportTicketDetail>({
    queryKey: ['support', 'ticket', id],
    enabled: !!id,
    queryFn: async () => {
      const res = await api.get(`/support/tickets/${id}`);
      return res.data.data;
    },
  });
}

// ─── Mutation Hooks ───────────────────────────────────────────────

export function useCreateSupportTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { subject: string; message: string; priority?: SupportPriority }) => {
      const res = await api.post('/support/tickets', payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support'] });
      toast.success('Support request sent! We\'ll get back to you soon.');
    },
    onError: (err: any) => {
      toast.error(getApiErrorMessage(err, 'Failed to send support request'));
    },
  });
}

export function useReplySupportTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, message }: { id: string; message: string }) => {
      const res = await api.post(`/support/tickets/${id}/reply`, { message });
      return res.data.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['support', 'ticket', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['support', 'tickets'] });
      queryClient.invalidateQueries({ queryKey: ['support', 'counts'] });
      toast.success('Reply sent');
    },
    onError: (err: any) => {
      toast.error(getApiErrorMessage(err, 'Failed to send reply'));
    },
  });
}

export function useUpdateSupportTicketStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: {
      id: string;
      status?: SupportTicketStatus;
      priority?: SupportPriority;
      note?: string;
    }) => {
      const res = await api.put(`/support/tickets/${id}/status`, payload);
      return res.data.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['support', 'ticket', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['support', 'tickets'] });
      queryClient.invalidateQueries({ queryKey: ['support', 'counts'] });
    },
    onError: (err: any) => {
      toast.error(getApiErrorMessage(err, 'Failed to update ticket'));
    },
  });
}
