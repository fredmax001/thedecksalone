import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '@/lib/api';

export type UserRole = 'USER' | 'DJ' | 'ADMIN' | 'MODERATOR';

export interface User {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  phone?: string;
  phoneVerified?: boolean;
  djProfile?: {
    id: string;
    stageName: string;
    avatar?: string;
    verified?: boolean;
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
        localStorage.setItem('soundit_token', token);
        set({ user, token, isAuthenticated: true });
      },

      login: async (email, password) => {
        try {
          const res = await api.post('/auth/login', { email, password });
          if (res.data.success) {
            const { user, token } = res.data.data;
            localStorage.setItem('soundit_token', token);
            set({ user, token, isAuthenticated: true });
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
            localStorage.setItem('soundit_token', token);
            set({ user, token, isAuthenticated: true });
            return { success: true };
          }
          return { success: false, error: 'Registration failed' };
        } catch (error: any) {
          return { success: false, error: error.response?.data?.error || 'Could not create account' };
        }
      },

      logout: () => {
        localStorage.removeItem('soundit_token');
        set({ user: null, token: null, isAuthenticated: false });
      },

      fetchMe: async () => {
        const token = localStorage.getItem('soundit_token');
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
          localStorage.removeItem('soundit_token');
          set({ user: null, token: null, isAuthenticated: false, isLoading: false });
        }
      },

      init: () => {
        const token = localStorage.getItem('soundit_token');
        if (token) {
          set({ token, isAuthenticated: true });
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
