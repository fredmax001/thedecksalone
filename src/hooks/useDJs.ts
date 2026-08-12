import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface DJFilters {
  search?: string;
  city?: string;
  genre?: string;
  sortBy?: string;
  minFee?: number;
  maxFee?: number;
  page?: number;
  limit?: number;
}

export function useDJs(filters: DJFilters = {}) {
  const { search, city, genre, sortBy, minFee, maxFee, page = 1, limit = 12 } = filters;

  return useQuery({
    queryKey: ['djs', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (search) params.set('search', search);
      if (city) params.set('city', city);
      if (genre) params.set('genre', genre);
      if (sortBy) params.set('sortBy', sortBy);
      if (minFee) params.set('minFee', String(minFee));
      if (maxFee) params.set('maxFee', String(maxFee));

      const res = await api.get(`/djs?${params.toString()}`);
      return res.data;
    },
  });
}

export function useDJ(identifier: string | undefined) {
  return useQuery({
    queryKey: ['dj', identifier],
    queryFn: async () => {
      if (!identifier) return null;
      const res = await api.get(`/djs/${identifier}`);
      return res.data.data;
    },
    enabled: !!identifier,
  });
}

export function useDJCities() {
  return useQuery({
    queryKey: ['djCities'],
    queryFn: async () => {
      const res = await api.get('/djs/cities');
      return res.data.data || [];
    },
  });
}

export function useDJGenres() {
  return useQuery({
    queryKey: ['djGenres'],
    queryFn: async () => {
      const res = await api.get('/djs/genres');
      return res.data.data || [];
    },
  });
}

export function useLegacyDJs(limit = 8) {
  return useQuery({
    queryKey: ['legacyDJs', limit],
    queryFn: async () => {
      const res = await api.get(`/djs/legacies?limit=${limit}`);
      return res.data.data;
    },
  });
}

// Verification Hooks
export function useVerificationStatus(djId: string | undefined) {
  return useQuery({
    queryKey: ['verificationStatus', djId],
    queryFn: async () => {
      if (!djId) return null;
      const res = await api.get(`/djs/${djId}/verify-request`);
      return res.data.data;
    },
    enabled: !!djId,
  });
}

export function useApplyVerification() {
  return {
    mutateAsync: async ({ djId, notes }: { djId: string; notes: string }) => {
      const res = await api.post(`/djs/${djId}/verify-request`, { notes });
      return res.data.data;
    }
  };
}

// Admin Verification Hooks
export function useAdminVerifications(status = 'ALL') {
  return useQuery({
    queryKey: ['adminVerifications', status],
    queryFn: async () => {
      const res = await api.get(`/admin/verifications?status=${status}`);
      return res.data.data;
    },
  });
}

export function useApproveVerification() {
  return {
    mutateAsync: async (requestId: string) => {
      const res = await api.put(`/admin/verifications/${requestId}/approve`);
      return res.data.data;
    }
  };
}

export function useRejectVerification() {
  return {
    mutateAsync: async (requestId: string) => {
      const res = await api.put(`/admin/verifications/${requestId}/reject`);
      return res.data.data;
    }
  };
}
