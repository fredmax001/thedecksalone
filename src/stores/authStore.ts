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
  subscriptionExpiresAt?: string | Date | null;

  djProfile?: {
    id: string;
    stageName: string;
    avatar?: string;
    verified?: boolean;
    isPro?: boolean;
    isPublic?: boolean;
    subscriptionTier?: string;
    subscriptionExpiresAt?: string | Date | null;
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
    subscriptionEnd?: string | null;
    status: string;
  };
}

export interface SavedAccount {
  id: string;
  email: string;
  username: string;
  name?: string;
  avatar?: string;
  role: UserRole;
  token: string;
  djProfile?: {
    id?: string;
    stageName: string;
    avatar?: string;
    verified?: boolean;
    isPro?: boolean;
    subscriptionTier?: string;
  } | null;
  lastActiveAt: number;
}

function upsertSavedAccount(
  accounts: SavedAccount[] = [],
  user: User,
  token: string
): SavedAccount[] {
  if (!user || !user.id || !token) return accounts;
  const existingIdx = accounts.findIndex((a) => a.id === user.id || (user.email && a.email === user.email));
  const newAccount: SavedAccount = {
    id: user.id,
    email: user.email,
    username: user.username,
    name: user.name,
    avatar: user.avatar,
    role: user.role,
    token,
    djProfile: user.djProfile
      ? {
          id: user.djProfile.id,
          stageName: user.djProfile.stageName,
          avatar: user.djProfile.avatar,
          verified: user.djProfile.verified,
          isPro: user.djProfile.isPro,
          subscriptionTier: user.djProfile.subscriptionTier,
        }
      : null,
    lastActiveAt: Date.now(),
  };

  if (existingIdx >= 0) {
    const updated = [...accounts];
    updated[existingIdx] = { ...updated[existingIdx], ...newAccount };
    // Move most recently active to top
    const [item] = updated.splice(existingIdx, 1);
    return [item, ...updated];
  }

  return [newAccount, ...accounts];
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  savedAccounts: SavedAccount[];
  setAuth: (user: User, token: string) => void;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, role: UserRole, phone?: string, gender?: string, country?: string) => Promise<{ success: boolean; error?: string }>;
  switchAccount: (accountId: string) => Promise<boolean>;
  removeSavedAccount: (accountId: string) => void;
  logout: (all?: boolean) => void;
  fetchMe: () => Promise<void>;
  init: () => void;
}

import { usePlayerStore } from '@/stores/playerStore';
import { queryClient } from '@/lib/queryClient';
import { clearPersistedQueryCache } from '@/lib/queryPersistence';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { unregisterPushTokens } from '@/lib/pushNotifications';

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,
      savedAccounts: [],

      setAuth: (user, token) => {
        // Clear stale query cache (memory + disk) before establishing new user session
        queryClient.clear();
        clearPersistedQueryCache();
        const nextAccounts = user.id ? upsertSavedAccount(get().savedAccounts, user, token) : get().savedAccounts;
        set({ user, token, isAuthenticated: true, savedAccounts: nextAccounts });
        if (user.id) {
          usePlayerStore.getState().setCurrentUserId(user.id);
        }
      },

      login: async (email, password) => {
        try {
          const res = await api.post('/auth/login', { email, password });
          if (res.data.success) {
            const { user, token } = res.data.data;
            // Purge any guest or prior user query cache (memory + disk)
            queryClient.clear();
            clearPersistedQueryCache();
            const nextAccounts = upsertSavedAccount(get().savedAccounts, user, token);
            set({ user, token, isAuthenticated: true, savedAccounts: nextAccounts });
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

      register: async (email, password, role, phone, gender, country, turnstileToken, utmParams) => {
        try {
          const res = await api.post('/auth/register', {
            email,
            password,
            role,
            phone,
            gender,
            country,
            turnstileToken,
            ...(utmParams || {}),
          });
          if (res.data.success) {
            const { user, token } = res.data.data;
            queryClient.clear();
            clearPersistedQueryCache();
            const nextAccounts = upsertSavedAccount(get().savedAccounts, user, token);
            set({ user, token, isAuthenticated: true, savedAccounts: nextAccounts });
            usePlayerStore.getState().setCurrentUserId(user.id);
            return { success: true };
          }
          return { success: false, error: 'Registration failed' };
        } catch (error: any) {
          return { success: false, error: getApiErrorMessage(error, 'Could not create account') };
        }
      },

      switchAccount: async (accountId: string) => {
        const accounts = get().savedAccounts;
        const target = accounts.find((a) => a.id === accountId);
        if (!target) return false;

        // Reset player & clear previous account caches
        usePlayerStore.getState().setCurrentUserId(null);
        queryClient.clear();
        clearPersistedQueryCache();

        // Update last active
        const updatedAccounts = accounts.map((a) =>
          a.id === accountId ? { ...a, lastActiveAt: Date.now() } : a
        );

        set({
          user: {
            id: target.id,
            email: target.email,
            username: target.username,
            name: target.name,
            avatar: target.avatar,
            role: target.role,
            djProfile: target.djProfile
              ? {
                  id: target.djProfile.id || target.id,
                  stageName: target.djProfile.stageName,
                  avatar: target.djProfile.avatar,
                  verified: target.djProfile.verified,
                  isPro: target.djProfile.isPro,
                  subscriptionTier: target.djProfile.subscriptionTier,
                }
              : null,
          } as User,
          token: target.token,
          isAuthenticated: true,
          savedAccounts: updatedAccounts,
        });

        usePlayerStore.getState().setCurrentUserId(target.id);

        // Refresh user profile from backend to ensure freshest data
        try {
          await get().fetchMe();
        } catch {}

        return true;
      },

      removeSavedAccount: (accountId: string) => {
        const accounts = get().savedAccounts;
        const remaining = accounts.filter((a) => a.id !== accountId);
        const isCurrent = get().user?.id === accountId;

        if (isCurrent) {
          if (remaining.length > 0) {
            set({ savedAccounts: remaining });
            get().switchAccount(remaining[0].id);
          } else {
            get().logout(true);
          }
        } else {
          set({ savedAccounts: remaining });
        }
      },

      logout: (all = false) => {
        // 0. Remove FCM push tokens for this account (best-effort)
        unregisterPushTokens().catch(() => {});

        // 1. Reset player state and detach user
        usePlayerStore.getState().setCurrentUserId(null);

        // 2. Clear all cached API queries (memory + disk persister) to prevent
        //    data leakage to the next account on this device
        queryClient.clear();
        clearPersistedQueryCache();

        const currentUserId = get().user?.id;
        const accounts = get().savedAccounts;
        const remaining = accounts.filter((a) => a.id !== currentUserId);

        if (all || remaining.length === 0) {
          // Clear all auth tokens & saved accounts
          try {
            localStorage.removeItem('decksalone-auth');
            localStorage.removeItem('soundit-auth');
            localStorage.removeItem('token');
          } catch (e) {}

          set({ user: null, token: null, isAuthenticated: false, savedAccounts: [] });
        } else {
          // Switch to next available saved account
          set({ savedAccounts: remaining });
          get().switchAccount(remaining[0].id);
        }
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
            const nextAccounts = upsertSavedAccount(get().savedAccounts, userData, token);
            set({ user: userData, token, isAuthenticated: true, isLoading: false, savedAccounts: nextAccounts });
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
      partialize: (state) => ({ token: state.token, savedAccounts: state.savedAccounts }),
    }
  )
);

