import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface Gig {
  id: string;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  eventType: string;
  eventDate: string;
  startTime?: string;
  durationHours?: number;
  location: string;
  city?: string;
  budgetMin?: number;
  budgetMax?: number;
  musicStyles: string[];
  equipmentNeeded: string[];
  notes?: string;
  status: 'OPEN' | 'MATCHED' | 'ASSIGNED' | 'CLOSED' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
  applications?: GigApplication[];
  _count?: { applications: number };
}

export interface GigApplication {
  id: string;
  gigId: string;
  djId: string;
  proposedPrice?: number;
  message?: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'WITHDRAWN';
  createdAt: string;
  dj?: {
    id: string;
    stageName: string;
    avatar?: string;
    city?: string;
    isPro: boolean;
  };
}

export interface GigFilters {
  status?: string;
  city?: string;
  eventType?: string;
  sortBy?: 'newest' | 'budget' | 'closing';
  page?: number;
  limit?: number;
}

export interface CreateGigData {
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  eventType: string;
  eventDate: string;
  startTime?: string;
  durationHours?: number;
  location: string;
  city?: string;
  budgetMin?: number;
  budgetMax?: number;
  musicStyles: string[];
  equipmentNeeded: string[];
  notes?: string;
}

export interface ApplyToGigData {
  proposedPrice?: number;
  message?: string;
}

export function useGigs(filters: GigFilters = {}) {
  const { status, city, eventType, sortBy, page = 1, limit = 20 } = filters;
  return useQuery<{ data: Gig[]; meta: { total: number; page: number; limit: number; totalPages: number } }>({
    queryKey: ['gigs', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (status) params.set('status', status);
      if (city) params.set('city', city);
      if (eventType) params.set('eventType', eventType);
      if (sortBy) params.set('sortBy', sortBy);
      const res = await api.get(`/gigs?${params.toString()}`);
      return res.data;
    },
  });
}

export function useGig(id: string | undefined) {
  return useQuery<{ data: Gig }>({
    queryKey: ['gig', id],
    queryFn: async () => {
      const res = await api.get(`/gigs/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useCreateGig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateGigData) => {
      const res = await api.post('/gigs', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gigs'] });
    },
  });
}

export function useGigMatches(id: string | undefined) {
  return useQuery<{ data: Array<{ id: string; stageName: string; avatar?: string; city?: string; isPro: boolean; score: number; reasons: string[] }> }>({
    queryKey: ['gigMatches', id],
    queryFn: async () => {
      const res = await api.get(`/gigs/${id}/matches`);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useApplyToGig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ApplyToGigData }) => {
      const res = await api.post(`/gigs/${id}/apply`, data);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['gigs'] });
      queryClient.invalidateQueries({ queryKey: ['gig', variables.id] });
    },
  });
}

export function useUpdateGigApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ gigId, applicationId, status }: { gigId: string; applicationId: string; status: string }) => {
      const res = await api.patch(`/gigs/${gigId}/applications/${applicationId}/status`, { status });
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['gigs'] });
      queryClient.invalidateQueries({ queryKey: ['gig', variables.gigId] });
    },
  });
}
