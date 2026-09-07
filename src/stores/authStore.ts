import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '@/lib/api';

export type UserRole = 'USER' | 'DJ' | 'ADMIN' | 'MODERATOR' | 'FINANCE_ADMIN' | 'SUPPORT_ADMIN' | 'VERIFICATION_ADMIN' | 'SUPER_ADMIN';

export interface User {
  id: string;
  email: string;
  username: string;
  name?: string;
  avatar?: string;
  role: UserRole;
  phone?: string;
  phoneVerified?: boolean;
  gender?: string | null;
  dateOfBirth?: string | Date | null;
  referralCode?: string | null;
  referredBy?: string | null;
  subscriptionTier?: string;
  subscriptionActivatedAt?: string | Date | null;

  djProfile?: {
    id: string;
    stageName: string;
    avatar?: string;
    verified?: boolean;
    isPro?: boolean;
    isPublic?: boolean;
    subscriptionTier?: string;
    verificationStatus?: string | null;
    verificationBadgeType?: string | null;
    verificationReason?: string | null;
    verificationNotes?: string | null;
    idDocumentType?: string | null;
    idDocumentUrl?: string | null;
    nationality?: string | null;
    legalName?: string | null;
    socialProof?: string | null;
    verifiedAt?: string | Date | null;
    updatedAt?: string | Date;
  } | null;
  trialStatus?: {
    isSubscribed: boolean;
    isTrialActive: boolean;
    hasFeatureAccess: boolean;
    daysLeft: number;
    trialEnd?: string;
    status: string;
  };
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: User, token: string) => void;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, role: UserRole, phone?: string, gender?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  fetchMe: () => Promise<void>;
  init: () => void;
}

import { usePlayerStore } from '@/stores/playerStore';
import { queryClient } from '@/lib/queryClient';
import { clearPersistedQueryCache } from '@/lib/queryPersistence';
import { getApiErrorMessage } from '@/lib/apiErrors';

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,

      setAuth: (user, token) => {
        // Clear stale query cache (memory + disk) before establishing new user session
        queryClient.clear();
        clearPersistedQueryCache();
        set({ user, token, isAuthenticated: true });
        usePlayerStore.getState().setCurrentUserId(user.id);
      },

      login: async (email, password) => {
        try {
          const res = await api.post('/auth/login', { email, password });
          if (res.data.success) {
            const { user, token } = res.data.data;
            // Purge any guest or prior user query cache (memory + disk)
            queryClient.clear();
            clearPersistedQueryCache();
            set({ user, token, isAuthenticated: true });
            usePlayerStore.getState().setCurrentUserId(user.id);
            // Fetch full profile (including djProfile) immediately after login
            get().fetchMe();
            return { success: true };
          }
          return { success: false, error: 'Login failed' };
        } catch (error: any) {
          return { success: false, error: getApiErrorMessage(error, 'Invalid credentials') };
        }
      },

      register: async (email, password, role, phone, gender) => {
        try {
          const res = await api.post('/auth/register', { email, password, role, phone, gender });
          if (res.data.success) {
            const { user, token } = res.data.data;
            queryClient.clear();
            clearPersistedQueryCache();
            set({ user, token, isAuthenticated: true });
            usePlayerStore.getState().setCurrentUserId(user.id);
            return { success: true };
          }
          return { success: false, error: 'Registration failed' };
        } catch (error: any) {
          return { success: false, error: getApiErrorMessage(error, 'Could not create account') };
        }
      },

      logout: () => {
        // 1. Reset player state and detach user
        usePlayerStore.getState().setCurrentUserId(null);

        // 2. Clear all cached API queries (memory + disk persister) to prevent
        //    data leakage to the next account on this device
        queryClient.clear();
        clearPersistedQueryCache();

        // 3. Clear auth tokens
        try {
          localStorage.removeItem('decksalone-auth');
          localStorage.removeItem('soundit-auth');
          localStorage.removeItem('token');
        } catch (e) {}

        // 4. Reset auth store state
        set({ user: null, token: null, isAuthenticated: false });
      },

      fetchMe: async () => {
        const token = get().token;
        if (!token) {
          usePlayerStore.getState().setCurrentUserId(null);
          queryClient.clear();
          clearPersistedQueryCache();
          set({ isLoading: false });
          return;
        }
        try {
          set({ isLoading: true });
          const res = await api.get('/auth/me');
          if (res.data.success) {
            const userData = res.data.data;
            set({ user: userData, token, isAuthenticated: true, isLoading: false });
            usePlayerStore.getState().setCurrentUserId(userData.id);
          }
        } catch {
          usePlayerStore.getState().setCurrentUserId(null);
          queryClient.clear();
          clearPersistedQueryCache();
          set({ user: null, token: null, isAuthenticated: false, isLoading: false });
        }
      },

      init: () => {
        // Migrate legacy soundit-auth token if needed
        try {
          const legacy = localStorage.getItem('soundit-auth');
          const current = localStorage.getItem('decksalone-auth');
          if (legacy && !current) {
            localStorage.setItem('decksalone-auth', legacy);
            localStorage.removeItem('soundit-auth');
          }
        } catch (e) {}

        const token = get().token;
        if (token) {
          set({ isAuthenticated: true });
          get().fetchMe();
        } else {
          usePlayerStore.getState().setCurrentUserId(null);
          queryClient.clear();
          clearPersistedQueryCache();
          set({ isLoading: false });
        }
      },
    }),

    {
      name: 'decksalone-auth',
      partialize: (state) => ({ token: state.token }),
    }
  )
);

