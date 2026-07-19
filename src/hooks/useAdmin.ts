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
  totalVisitsToday: number;
  totalVisitsMonth: number;
  uniqueVisitorsToday: number;
}

export interface AdminAnalytics {
  month: string;
  users: number;
  djs: number;
  mixes: number;
  bookings: number;
  revenue: number;
  visits: number;
}

export interface GeographyPoint {
  name: string | null;
  visits: number;
}

export interface AdminGeography {
  countries: GeographyPoint[];
  cities: GeographyPoint[];
}

export interface AdminDj {
  id: string;
  userId: string;
  email: string;
  status: string;
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
  startYear: number | null;
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
  status: string;
  verified?: boolean;
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
  pendingRequests?: number;
}

export interface SubscriptionConfig {
  paymentMethod: string;
  paymentNumber: string;
  whatsappNumber: string;
  proPrice: number;
  legendPrice: number;
  currency: string;
  plans: Array<{ id: string; name: string; price: number }>;
}

export interface UpdateSubscriptionConfigInput {
  paymentNumber?: string;
  whatsappNumber?: string;
  proPrice?: number;
  legendPrice?: number;
  currency?: string;
}

export interface ProSubscriptionRequest {
  id: string;
  djId: string;
  plan: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  paymentNumber: string;
  proofUrl: string;
  note?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  adminNote?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  dj: {
    id: string;
    stageName: string;
    avatar?: string | null;
    isPro: boolean;
    subscriptionTier?: string;
    user: { id: string; email: string; phone?: string | null };
  };
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
    staleTime: 0,
    refetchInterval: 15000,
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

export function useAdminGeography() {
  return useQuery<AdminGeography>({
    queryKey: ['adminGeography'],
    queryFn: async () => {
      const res = await api.get('/admin/geography');
      return res.data.data;
    },
  });
}

export function useAdminDjs(
  filters?: { search?: string; verified?: boolean | string; status?: string; page?: number; limit?: number }
) {
  return useQuery<PaginatedResponse<AdminDj>>({
    queryKey: ['adminDjs', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.search) params.set('search', filters.search);
      if (filters?.verified !== undefined && filters.verified !== '') {
        params.set('verified', String(filters.verified));
      }
      if (filters?.status) params.set('status', filters.status);
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
    staleTime: 0,
    refetchInterval: 30000,
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
    staleTime: 0,
    refetchInterval: 30000,
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
    staleTime: 0,
    refetchInterval: 15000,
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
    staleTime: 0,
    refetchInterval: 10000,
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
    staleTime: 0,
    refetchInterval: 10000,
  });
}

export function useMarkAdminNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await api.post('/admin/notifications/mark-read');
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminNotifications'] });
    },
  });
}

export function useClearAdminNotifications() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await api.post('/admin/notifications/clear');
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminNotifications'] });
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

export function useAdminSubscriptionConfig() {
  return useQuery<SubscriptionConfig>({
    queryKey: ['adminSubscriptionConfig'],
    queryFn: async () => {
      const res = await api.get('/admin/subscription-config');
      return res.data.data;
    },
    staleTime: 0,
  });
}

export function useUpdateSubscriptionConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpdateSubscriptionConfigInput) => {
      const res = await api.put('/admin/subscription-config', payload);
      return res.data.data as SubscriptionConfig;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminSubscriptionConfig'] });
      queryClient.invalidateQueries({ queryKey: ['adminSubscriptions'] });
    },
  });
}

export function useAdminProSubscriptionRequests(status?: string) {
  return useQuery<ProSubscriptionRequest[]>({
    queryKey: ['adminProSubscriptionRequests', status || 'all'],
    staleTime: 0,
    refetchInterval: 15000,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status && status !== 'all') params.set('status', status);
      const query = params.toString();
      const res = await api.get(`/admin/pro-subscription-requests${query ? `?${query}` : ''}`);
      return res.data.data;
    },
  });
}

export function useApproveProSubscriptionRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, note }: { id: string; note?: string }) => {
      const res = await api.post(`/admin/pro-subscription-requests/${id}/approve`, { note });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminProSubscriptionRequests'] });
      queryClient.invalidateQueries({ queryKey: ['adminSubscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['adminDjs'] });
    },
  });
}

export function useRejectProSubscriptionRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, note }: { id: string; note?: string }) => {
      const res = await api.post(`/admin/pro-subscription-requests/${id}/reject`, { note });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminProSubscriptionRequests'] });
      queryClient.invalidateQueries({ queryKey: ['adminSubscriptions'] });
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
    staleTime: 0,
    refetchInterval: 15000,
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
    mutationFn: async ({ id, notes, badgeType }: { id: string; notes?: string; badgeType?: 'grey' | 'gold' }) => {
      const res = await api.put(`/admin/djs/${id}/verify`, { notes, badgeType });
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
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
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
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      queryClient.invalidateQueries({ queryKey: ['adminStaff'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
      if (variables.role === 'DJ') {
        queryClient.invalidateQueries({ queryKey: ['adminDjs'] });
        queryClient.invalidateQueries({ queryKey: ['adminPendingDJs'] });
        queryClient.invalidateQueries({ queryKey: ['adminVerificationRequests'] });
      }
    },
  });
}

export function useUpdateUserStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await api.put(`/admin/users/${id}/status`, { status });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      queryClient.invalidateQueries({ queryKey: ['adminDjs'] });
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
      const res = await api.get(`/admin/battles${query ? `?${query}` : ''}`);
      return res.data || { data: [], meta: {} };
    },
  });
}

export function useCreateBattle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { title: string; weekStart: string; weekEnd: string; theme?: string; metricType?: string }) => {
      const res = await api.post('/admin/battles', payload);
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
      const res = await api.post(`/admin/battles/${id}/close`);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminBattles'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
    },
  });
}

export function useUpdateBattle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: string; title?: string; weekStart?: string; weekEnd?: string; theme?: string; metricType?: string }) => {
      const { id, ...data } = payload;
      const res = await api.put(`/admin/battles/${id}`, data);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminBattles'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
    },
  });
}

export function useAddBattleEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { battleId: string; djId: string; mixId?: string }) => {
      const { battleId, ...data } = payload;
      const res = await api.post(`/admin/battles/${battleId}/entries`, data);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminBattles'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
    },
  });
}

export function useRemoveBattleEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { battleId: string; entryId: string }) => {
      const res = await api.delete(`/admin/battles/${payload.battleId}/entries/${payload.entryId}`);
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

export function useAdminOpportunities() {
  return useQuery({
    queryKey: ['admin-opportunities'],
    queryFn: async () => {
      const res = await api.get('/opportunities');
      return res.data.data;
    },
  });
}
