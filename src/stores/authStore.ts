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

  djProfile?: {
    id: string;
    stageName: string;
    avatar?: string;
    verified?: boolean;
    isPro?: boolean;
    subscriptionTier?: string;
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

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,

      setAuth: (user, token) => {
        set({ user, token, isAuthenticated: true });
        usePlayerStore.getState().setCurrentUserId(user.id);
      },

      login: async (email, password) => {
        try {
          const res = await api.post('/auth/login', { email, password });
          if (res.data.success) {
            const { user, token } = res.data.data;
            set({ user, token, isAuthenticated: true });
            usePlayerStore.getState().setCurrentUserId(user.id);
            // Fetch full profile (including djProfile) immediately after login
            get().fetchMe();
            return { success: true };
          }
          return { success: false, error: 'Login failed' };
        } catch (error: any) {
          return { success: false, error: error.response?.data?.error || 'Invalid credentials' };
        }
      },

      register: async (email, password, role, phone, gender) => {
        try {
          const res = await api.post('/auth/register', { email, password, role, phone, gender });
          if (res.data.success) {
            const { user, token } = res.data.data;
            set({ user, token, isAuthenticated: true });
            usePlayerStore.getState().setCurrentUserId(user.id);
            return { success: true };
          }
          return { success: false, error: 'Registration failed' };
        } catch (error: any) {
          return { success: false, error: error.response?.data?.error || 'Could not create account' };
        }
      },

      logout: () => {
        usePlayerStore.getState().clearSession();
        set({ user: null, token: null, isAuthenticated: false });
      },

      fetchMe: async () => {
        const token = get().token;
        if (!token) {
          usePlayerStore.getState().clearSession();
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
          usePlayerStore.getState().clearSession();
          set({ user: null, token: null, isAuthenticated: false, isLoading: false });
        }
      },

      init: () => {
        const token = get().token;
        if (token) {
          set({ isAuthenticated: true });
          get().fetchMe();
        } else {
          usePlayerStore.getState().clearSession();
          set({ isLoading: false });
        }
      },
    }),

    {
      name: 'soundit-auth',
      partialize: (state) => ({ token: state.token }),
    }
  )
);
