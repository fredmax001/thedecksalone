import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface AdminStats {
  totalUsers: number;
  totalDjs: number;
  totalMixes: number;
  totalStreams: number;
  totalBookings: number;
  totalEvents: number;
  totalReviews: number;
  pendingBookings: number;
  pendingVerifications: number;
  estimatedRevenue: number;
  totalPayments: number;
  activeBattles: number;
}

export function useAdminStats() {
  return useQuery({
    queryKey: ['adminStats'],
    queryFn: async () => {
      const res = await api.get('/admin/stats');
      return res.data.data as AdminStats;
    },
  });
}

export function useAdminUsers(filters?: { role?: string; search?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['adminUsers', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.role) params.set('role', filters.role);
      if (filters?.search) params.set('search', filters.search);
      if (filters?.page) params.set('page', String(filters.page));
      if (filters?.limit) params.set('limit', String(filters.limit));
      const query = params.toString();
      const res = await api.get(`/admin/users${query ? `?${query}` : ''}`);
      return res.data;
    },
  });
}

export function useAdminPendingDJs() {
  return useQuery({
    queryKey: ['adminPendingDJs'],
    queryFn: async () => {
      const res = await api.get('/admin/djs/pending');
      return res.data.data || [];
    },
  });
}
