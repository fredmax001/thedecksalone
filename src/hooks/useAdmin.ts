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
  userId: string;
  email: string;
  stageName: string;
  city: string;
  verified: boolean;
  isPublic: boolean;
  hallOfFame?: boolean;
  rankingPosition: number;
  rankingScore: number;
  totalStreams: number;
  totalFollowers: number;
  totalMixes: number;
  totalBookings: number;
  completedBookings: number;
  avatar?: string;
  genres: string[];
  createdAt: string;
}

export interface DjProfile {
  id: string;
  stageName: string;
  user: { email: string; createdAt: string };
  fullName: string;
  bio: string;
  genres: string[];
  city: string;
  equipment: string[];
  socialLinks: Record<string, string> | null;
  streamingLinks: Record<string, string> | null;
  streamingPlatforms?: { platform: string; url: string; followers: number; streams: number; uploads: number }[];
  yearsActive: number | null;
  verified: boolean;
  isPublic: boolean;
  totalFollowers: number;
  totalStreams: number;
  totalMixes: number;
  totalBookings: number;
  averageRating: number;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RankingDj {
  id: string;
  stageName: string;
  rankingPosition: number;
  rankingScore: number;
  totalStreams: number;
  totalBookings: number;
  totalEvents: number;
  averageRating: number;
  totalFollowers: number;
  city: string;
  avatar?: string;
  digitalScore: number;
  industryScore: number;
  communityScore: number;
  verified: boolean;
}

export interface Mix {
  id: string;
  title: string;
  djId: string;
  dj: { id: string; stageName: string };
  genre: string;
  duration: number | null;
  plays: number;
  likes: number;
  featured: boolean;
  hallOfFame?: boolean;
  coverImage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Booking {
  id: string;
  clientId: string;
  client: { id: string; email: string };
  djId: string;
  dj: { id: string; stageName: string; avatar?: string };
  eventType: string;
  eventDate: string;
  eventLocation: string;
  status: string;
  finalPrice: number | null;
  budget: number;
  deposit: number | null;
  currency: string;
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  djId: string | null;
  city: string;
  venue: string | null;
  date: string;
  status: string;
  slots: number;
  filledSlots: number;
  image?: string;
  type: string;
  location: string;
  createdAt: string;
  updatedAt: string;
  dj?: { id: string; stageName: string } | null;
}

export interface User {
  id: string;
  email: string;
  username?: string;
  role: string;
  verified: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  avatar?: string;
  phone?: string;
  phoneVerified?: boolean;
  djProfile?: { id: string; stageName: string; verified: boolean } | null;
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
  status: 'pending_payment' | 'active' | 'paused' | 'rejected' | 'completed' | 'draft';
  targetType: 'profile' | 'mix' | 'battle';
  targetId?: string | null;
  impressions: number;
  clicks: number;
  ctr: number | string;
  reachScore: number;
  budget: number;
  spent: number;
  currency: string;
  creativeImageUrl?: string | null;
  ctaUrl?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  createdAt: string;
  advertiser?: { id: string; stageName: string; avatar?: string } | null;
}

export interface AdsOverview {
  campaigns: AdCampaign[];
  totalBudget: number;
  totalSpent: number;
}

export interface CreateAdInput {
  name: string;
  status?: 'active' | 'paused' | 'draft';
  budget?: number;
  startDate?: string;
  endDate?: string;
}

export interface UpdateCampaignStatusInput {
  id: string;
  status: 'pending_payment' | 'active' | 'paused' | 'rejected' | 'completed';
  notes?: string;
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
      const res = await api.get('/admin/stats');
      return res.data.data;
    },
  });
}

export function useAdminAnalytics() {
  return useQuery<AdminAnalytics[]>({
    queryKey: ['adminAnalytics'],
    queryFn: async () => {
      const res = await api.get('/admin/analytics');
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
      const res = await api.get(`/admin/djs${query ? `?${query}` : ''}`);
      return res.data;
    },
  });
}

export function useAdminRankings() {
  return useQuery<RankingDj[]>({
    queryKey: ['adminRankings'],
    queryFn: async () => {
      const res = await api.get('/admin/rankings');
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
      const res = await api.get(`/admin/mixes${query ? `?${query}` : ''}`);
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
      const res = await api.get(`/admin/bookings${query ? `?${query}` : ''}`);
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
      const res = await api.get(`/admin/events${query ? `?${query}` : ''}`);
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
      const res = await api.get(`/admin/users${query ? `?${query}` : ''}`);
      return res.data;
    },
  });
}

export function useAdminPendingDjs() {
  return useQuery<DjProfile[]>({
    queryKey: ['adminPendingDJs'],
    queryFn: async () => {
      const res = await api.get('/admin/djs/pending');
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
      const res = await api.get(`/admin/payments${query ? `?${query}` : ''}`);
      return res.data;
    },
  });
}

export function useAdminMessages() {
  return useQuery<MessageThread[]>({
    queryKey: ['adminMessages'],
    queryFn: async () => {
      const res = await api.get('/admin/messages');
      return res.data.data;
    },
  });
}

export function useAdminStaff() {
  return useQuery<Staff[]>({
    queryKey: ['adminStaff'],
    queryFn: async () => {
      const res = await api.get('/admin/staff');
      return res.data.data;
    },
  });
}

export function useAdminPlatforms() {
  return useQuery<Platform[]>({
    queryKey: ['adminPlatforms'],
    queryFn: async () => {
      const res = await api.get('/admin/platforms');
      return res.data.data;
    },
  });
}

export function useAdminSystem() {
  return useQuery<SystemHealth>({
    queryKey: ['adminSystem'],
    queryFn: async () => {
      const res = await api.get('/admin/system');
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
      const res = await api.get(`/admin/notifications${query ? `?${query}` : ''}`);
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
      const res = await api.get(`/admin/security-logs${query ? `?${query}` : ''}`);
      return res.data.data;
    },
  });
}

export function useAdminSubscriptions() {
  return useQuery<SubscriptionOverview>({
    queryKey: ['adminSubscriptions'],
    queryFn: async () => {
      const res = await api.get('/admin/subscriptions');
      return res.data.data;
    },
  });
}

export function useAdminAds() {
  return useQuery<AdsOverview>({
    queryKey: ['adminAds'],
    queryFn: async () => {
      const res = await api.get('/admin/ads');
      return res.data.data;
    },
  });
}

export function useCreateAd() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateAdInput) => {
      const res = await api.post('/admin/ads', payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminAds'] });
    },
  });
}

export function useAdminVerificationRequests() {
  return useQuery<DjProfile[]>({
    queryKey: ['adminVerificationRequests'],
    queryFn: async () => {
      const res = await api.get('/admin/djs/verification-requests');
      return res.data.data;
    },
  });
}

export function useUpdateCampaignStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpdateCampaignStatusInput) => {
      const res = await api.put(`/admin/campaigns/${payload.id}/status`, {
        status: payload.status,
        notes: payload.notes,
      });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminAds'] });
    },
  });
}

// ─── Mutation Hooks ───────────────────────────────────────────────

export function useVerifyDj() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const res = await api.put(`/admin/djs/${id}/verify`, { notes });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminDjs'] });
      queryClient.invalidateQueries({ queryKey: ['adminPendingDJs'] });
      queryClient.invalidateQueries({ queryKey: ['adminVerificationRequests'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
    },
  });
}

export function useRejectDjVerification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await api.put(`/admin/djs/${id}/reject`, { reason });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminVerificationRequests'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
    },
  });
}

export function useRequestDjInfo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const res = await api.put(`/admin/djs/${id}/request-info`, { notes });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminVerificationRequests'] });
    },
  });
}

export function useToggleDjSuspend() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.put(`/admin/djs/${id}/suspend`);
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
      const res = await api.delete(`/admin/djs/${id}`);
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
      const res = await api.put(`/admin/mixes/${id}/feature`, { featured });
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
      const res = await api.put(`/admin/bookings/${id}/status`, { status });
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
      const res = await api.put(`/admin/users/${id}/role`, { role });
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
      const res = await api.post('/admin/notifications', payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminNotifications'] });
    },
  });
}

// Battle hooks
export function useAdminBattles(filters?: { status?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['adminBattles', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.status) params.set('status', filters.status);
      if (filters?.page) params.set('page', String(filters.page));
      if (filters?.limit) params.set('limit', String(filters.limit));
      const query = params.toString();
      const res = await api.get(`/battles${query ? `?${query}` : ''}`);
      return res.data || { data: [], meta: {} };
    },
  });
}

export function useCreateBattle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { title: string; weekStart: string; weekEnd: string; theme?: string; metricType?: string }) => {
      const res = await api.post('/battles', payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminBattles'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
    },
  });
}

export function useCloseBattle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/battles/${id}/close`);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminBattles'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
    },
  });
}

export function useDeleteMix() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/admin/mixes/${id}`);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminMixes'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
    },
  });
}

export function useUpdateRanking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; rankingScore?: number; rankingPosition?: number; digitalScore?: number; industryScore?: number; communityScore?: number }) => {
      const res = await api.put(`/admin/djs/${id}/ranking`, data);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminRankings'] });
      queryClient.invalidateQueries({ queryKey: ['adminDjs'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
    },
  });
}

export function useToggleDjHallOfFame() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.put(`/admin/djs/${id}/hall-of-fame`);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminDjs'] });
      queryClient.invalidateQueries({ queryKey: ['hallOfFameDJs'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
    },
  });
}

export function useToggleMixHallOfFame() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.put(`/admin/mixes/${id}/hall-of-fame`);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminMixes'] });
      queryClient.invalidateQueries({ queryKey: ['hallOfFameMixes'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
    },
  });
}

export function useRecalculateRankings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await api.post('/admin/rankings/recalculate');
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminRankings'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
    },
  });
}
