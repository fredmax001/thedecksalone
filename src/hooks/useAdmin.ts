import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// ─── Interfaces ───────────────────────────────────────────────────

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

export interface AdminAnalytics {
  month: string;
  users: number;
  djs: number;
  mixes: number;
  bookings: number;
  revenue: number;
}

export interface AdminDj {
  id: string;
  stageName: string;
  email: string;
  verified: boolean;
  suspended: boolean;
  genres: string[];
  city: string;
  followers: number;
  totalStreams: number;
  rating: number;
  createdAt: string;
  avatar?: string;
}

export interface DjProfile {
  id: string;
  stageName: string;
  email: string;
  realName: string;
  bio: string;
  genres: string[];
  city: string;
  phone: string;
  equipment: string[];
  socialLinks: Record<string, string>;
  documents: string[];
  submittedAt: string;
  userId: string;
  avatar?: string;
}

export interface RankingDj {
  id: string;
  stageName: string;
  rank: number;
  score: number;
  totalStreams: number;
  totalBookings: number;
  totalEvents: number;
  rating: number;
  followers: number;
  city: string;
  avatar?: string;
}

export interface Mix {
  id: string;
  title: string;
  djId: string;
  djName: string;
  genre: string;
  duration: number;
  streams: number;
  likes: number;
  featured: boolean;
  coverArt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Booking {
  id: string;
  clientId: string;
  clientEmail: string;
  clientName: string;
  djId: string;
  djName: string;
  eventType: string;
  eventDate: string;
  eventCity: string;
  status: string;
  amount: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  organizerId: string;
  organizerName: string;
  city: string;
  venue: string;
  startDate: string;
  endDate: string;
  status: string;
  capacity: number;
  attendees: number;
  coverImage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  username: string;
  role: string;
  verified: boolean;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
  avatar?: string;
}

export interface Payment {
  id: string;
  amount: number;
  currency: string;
  type: string;
  status: string;
  provider?: string;
  createdAt: string;
  booking: { id: string; eventType: string };
  client: { id: string; email: string };
}

export interface MessageThread {
  pair: string;
  sender: string;
  receiver: string;
  latestMessage: string;
  latestAt: string;
  unread: number;
  count: number;
}

export interface Staff {
  id: string;
  email: string;
  username: string;
  role: string;
  createdAt: string;
}

export interface Platform {
  name: string;
  followers: number;
  streams: number;
  uploads: number;
  djs: number;
}

export interface SystemHealth {
  dbStatus: string;
  uptime: number;
  counts: {
    users: number;
    djs: number;
    mixes: number;
    bookings: number;
    events: number;
    reviews: number;
  };
  memory: Record<string, number>;
}

export interface AdminNotification {
  id: string;
  type: 'user' | 'verification' | 'booking' | 'mix' | 'event' | 'system';
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
}

export interface SecurityLog {
  id: string;
  event: string;
  user: string;
  details: string;
  severity: 'info' | 'warning' | 'critical';
  createdAt: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  users: number;
  features: string[];
}

export interface SubscriptionOverview {
  plans: SubscriptionPlan[];
  totalRevenue: number;
  activeBookings: number;
  mrr: number;
  arr: number;
}

export interface AdCampaign {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'draft';
  impressions: number;
  clicks: number;
  ctr: string;
  budget: number;
  spent: number;
}

export interface AdsOverview {
  campaigns: AdCampaign[];
  totalBudget: number;
  totalSpent: number;
}

export interface PaginatedMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginatedMeta;
}

// ─── Query Hooks ────────────────────────────────────────────────────

export function useAdminStats() {
  return useQuery<AdminStats>({
    queryKey: ['adminStats'],
    queryFn: async () => {
      const res = await api.get('/api/admin/stats');
      return res.data.data;
    },
  });
}

export function useAdminAnalytics() {
  return useQuery<AdminAnalytics[]>({
    queryKey: ['adminAnalytics'],
    queryFn: async () => {
      const res = await api.get('/api/admin/analytics');
      return res.data.data;
    },
  });
}

export function useAdminDjs(
  filters?: { search?: string; verified?: boolean | string; page?: number; limit?: number }
) {
  return useQuery<PaginatedResponse<AdminDj>>({
    queryKey: ['adminDjs', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.search) params.set('search', filters.search);
      if (filters?.verified !== undefined && filters.verified !== '') {
        params.set('verified', String(filters.verified));
      }
      if (filters?.page) params.set('page', String(filters.page));
      if (filters?.limit) params.set('limit', String(filters.limit));
      const query = params.toString();
      const res = await api.get(`/api/admin/djs${query ? `?${query}` : ''}`);
      return res.data;
    },
  });
}

export function useAdminRankings() {
  return useQuery<RankingDj[]>({
    queryKey: ['adminRankings'],
    queryFn: async () => {
      const res = await api.get('/api/admin/rankings');
      return res.data.data;
    },
  });
}

export function useAdminMixes(
  filters?: { featured?: boolean | string; search?: string; page?: number; limit?: number }
) {
  return useQuery<PaginatedResponse<Mix>>({
    queryKey: ['adminMixes', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.featured !== undefined && filters.featured !== '') {
        params.set('featured', String(filters.featured));
      }
      if (filters?.search) params.set('search', filters.search);
      if (filters?.page) params.set('page', String(filters.page));
      if (filters?.limit) params.set('limit', String(filters.limit));
      const query = params.toString();
      const res = await api.get(`/api/admin/mixes${query ? `?${query}` : ''}`);
      return res.data;
    },
  });
}

export function useAdminBookings(
  filters?: { status?: string; page?: number; limit?: number }
) {
  return useQuery<PaginatedResponse<Booking>>({
    queryKey: ['adminBookings', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.status) params.set('status', filters.status);
      if (filters?.page) params.set('page', String(filters.page));
      if (filters?.limit) params.set('limit', String(filters.limit));
      const query = params.toString();
      const res = await api.get(`/api/admin/bookings${query ? `?${query}` : ''}`);
      return res.data;
    },
  });
}

export function useAdminEvents(
  filters?: { status?: string; city?: string; page?: number; limit?: number }
) {
  return useQuery<PaginatedResponse<Event>>({
    queryKey: ['adminEvents', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.status) params.set('status', filters.status);
      if (filters?.city) params.set('city', filters.city);
      if (filters?.page) params.set('page', String(filters.page));
      if (filters?.limit) params.set('limit', String(filters.limit));
      const query = params.toString();
      const res = await api.get(`/api/admin/events${query ? `?${query}` : ''}`);
      return res.data;
    },
  });
}

export function useAdminUsers(
  filters?: { role?: string; search?: string; page?: number; limit?: number }
) {
  return useQuery<PaginatedResponse<User>>({
    queryKey: ['adminUsers', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.role) params.set('role', filters.role);
      if (filters?.search) params.set('search', filters.search);
      if (filters?.page) params.set('page', String(filters.page));
      if (filters?.limit) params.set('limit', String(filters.limit));
      const query = params.toString();
      const res = await api.get(`/api/admin/users${query ? `?${query}` : ''}`);
      return res.data;
    },
  });
}

export function useAdminPendingDjs() {
  return useQuery<DjProfile[]>({
    queryKey: ['adminPendingDJs'],
    queryFn: async () => {
      const res = await api.get('/api/admin/djs/pending');
      return res.data.data;
    },
  });
}

export function useAdminPayments(filters?: { page?: number; limit?: number }) {
  return useQuery<PaginatedResponse<Payment>>({
    queryKey: ['adminPayments', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.page) params.set('page', String(filters.page));
      if (filters?.limit) params.set('limit', String(filters.limit));
      const query = params.toString();
      const res = await api.get(`/api/admin/payments${query ? `?${query}` : ''}`);
      return res.data;
    },
  });
}

export function useAdminMessages() {
  return useQuery<MessageThread[]>({
    queryKey: ['adminMessages'],
    queryFn: async () => {
      const res = await api.get('/api/admin/messages');
      return res.data.data;
    },
  });
}

export function useAdminStaff() {
  return useQuery<Staff[]>({
    queryKey: ['adminStaff'],
    queryFn: async () => {
      const res = await api.get('/api/admin/staff');
      return res.data.data;
    },
  });
}

export function useAdminPlatforms() {
  return useQuery<Platform[]>({
    queryKey: ['adminPlatforms'],
    queryFn: async () => {
      const res = await api.get('/api/admin/platforms');
      return res.data.data;
    },
  });
}

export function useAdminSystem() {
  return useQuery<SystemHealth>({
    queryKey: ['adminSystem'],
    queryFn: async () => {
      const res = await api.get('/api/admin/system');
      return res.data.data;
    },
  });
}

export function useAdminNotifications(filters?: { limit?: number }) {
  return useQuery<AdminNotification[]>({
    queryKey: ['adminNotifications', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.limit) params.set('limit', String(filters.limit));
      const query = params.toString();
      const res = await api.get(`/api/admin/notifications${query ? `?${query}` : ''}`);
      return res.data.data;
    },
  });
}

export function useAdminSecurityLogs(filters?: { limit?: number }) {
  return useQuery<SecurityLog[]>({
    queryKey: ['adminSecurityLogs', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.limit) params.set('limit', String(filters.limit));
      const query = params.toString();
      const res = await api.get(`/api/admin/security-logs${query ? `?${query}` : ''}`);
      return res.data.data;
    },
  });
}

export function useAdminSubscriptions() {
  return useQuery<SubscriptionOverview>({
    queryKey: ['adminSubscriptions'],
    queryFn: async () => {
      const res = await api.get('/api/admin/subscriptions');
      return res.data.data;
    },
  });
}

export function useAdminAds() {
  return useQuery<AdsOverview>({
    queryKey: ['adminAds'],
    queryFn: async () => {
      const res = await api.get('/api/admin/ads');
      return res.data.data;
    },
  });
}

// ─── Mutation Hooks ───────────────────────────────────────────────

export function useVerifyDj() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.put(`/api/admin/djs/${id}/verify`);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminDjs'] });
      queryClient.invalidateQueries({ queryKey: ['adminPendingDJs'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
    },
  });
}

export function useToggleDjSuspend() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.put(`/api/admin/djs/${id}/suspend`);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminDjs'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
    },
  });
}

export function useDeleteDj() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/api/admin/djs/${id}`);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminDjs'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
    },
  });
}

export function useToggleMixFeature() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, featured }: { id: string; featured: boolean }) => {
      const res = await api.put(`/api/admin/mixes/${id}/feature`, { featured });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminMixes'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
    },
  });
}

export function useUpdateBookingStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await api.put(`/api/admin/bookings/${id}/status`, { status });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminBookings'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
    },
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      const res = await api.put(`/api/admin/users/${id}/role`, { role });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      queryClient.invalidateQueries({ queryKey: ['adminStaff'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
    },
  });
}

export function useSendNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { type: string; target: string; title: string; message: string; scheduled?: string }) => {
      const res = await api.post('/api/admin/notifications', payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminNotifications'] });
    },
  });
}

export function useRecalculateRankings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await api.post('/api/admin/rankings/recalculate');
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminRankings'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
    },
  });
}
