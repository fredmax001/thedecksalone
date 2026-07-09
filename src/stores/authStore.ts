import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '@/lib/api';

export type UserRole = 'USER' | 'DJ' | 'ADMIN' | 'MODERATOR';

export interface User {
  id: string;
  email: string;
  username: string;
  name?: string;
  avatar?: string;
  role: UserRole;
  phone?: string;
  phoneVerified?: boolean;
  djProfile?: {
    id: string;
    stageName: string;
    avatar?: string;
    verified?: boolean;
    isPro?: boolean;
    subscriptionTier?: string;
  } | null;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: User, token: string) => void;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, role: UserRole, phone?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  fetchMe: () => Promise<void>;
  init: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,

      setAuth: (user, token) => {
        set({ user, token, isAuthenticated: true });
      },

      login: async (email, password) => {
        try {
          const res = await api.post('/auth/login', { email, password });
          if (res.data.success) {
            const { user, token } = res.data.data;
            set({ user, token, isAuthenticated: true });
            // Fetch full profile (including djProfile) immediately after login
            get().fetchMe();
            return { success: true };
          }
          return { success: false, error: 'Login failed' };
        } catch (error: any) {
          return { success: false, error: error.response?.data?.error || 'Invalid credentials' };
        }
      },

      register: async (email, password, role, phone) => {
        try {
          const res = await api.post('/auth/register', { email, password, role, phone });
          if (res.data.success) {
            const { user, token } = res.data.data;
            set({ user, token, isAuthenticated: true });
            return { success: true };
          }
          return { success: false, error: 'Registration failed' };
        } catch (error: any) {
          return { success: false, error: error.response?.data?.error || 'Could not create account' };
        }
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false });
      },

      fetchMe: async () => {
        const token = get().token;
        if (!token) {
          set({ isLoading: false });
          return;
        }
        try {
          set({ isLoading: true });
          const res = await api.get('/auth/me');
          if (res.data.success) {
            set({ user: res.data.data, token, isAuthenticated: true, isLoading: false });
          }
        } catch {
          set({ user: null, token: null, isAuthenticated: false, isLoading: false });
        }
      },

      init: () => {
        const token = get().token;
        if (token) {
          set({ isAuthenticated: true });
          get().fetchMe();
        } else {
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
