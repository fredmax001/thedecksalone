import { create } from 'zustand';
import { recordMixPlaybackTaste } from '@/lib/recommendations';

export interface MixTrack {
  id: string;
  title: string;
  dj: string;
  duration: number;
  cover: string;
  genre: string;
  plays?: number;
  downloads?: number;
  likes?: number;
  reups?: number;
  audioUrl?: string;
  audioSource?: string;
  originalUrl?: string;
  djTier?: 'free' | 'pro' | 'legend' | string;
  djId?: string;
  djAvatar?: string;
  isExclusive?: boolean;
  promotedUntil?: string | null;
  subscriptionPrice?: number;
  createdAt?: string;
}

export interface SavedPosition {
  mixId: string;
  currentTime: number;
  duration: number;
  progress: number;
  timestamp: number;
  track: MixTrack;
}

const HISTORY_KEY_PREFIX = 'decksalone_playback_history';
const LAST_SESSION_PREFIX = 'decksalone_last_session';
const GUEST_PLAYBACK_KEY = 'decksalone_guest_playback';

function getKey(prefix: string, userId?: string | null): string {
  return userId ? `${prefix}_${userId}` : prefix;
}

function getStoredHistory(userId?: string | null): Record<string, SavedPosition> {
  if (!userId) return {};
  try {
    const raw = localStorage.getItem(getKey(HISTORY_KEY_PREFIX, userId));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function getStoredLastSession(userId?: string | null): SavedPosition | null {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(getKey(LAST_SESSION_PREFIX, userId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

interface PlayerState {
  currentUserId: string | null;
  currentTrack: MixTrack | null;
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  progress: number;
  currentTime: number;
  duration: number;
  queue: MixTrack[];
  currentIndex: number;
  history: Record<string, SavedPosition>;
  lastSession: SavedPosition | null;

  // Actions
  setCurrentUserId: (userId: string | null) => void;
  clearSession: () => void;
  resetPlayback: () => void;
  setTrack: (track: MixTrack, initialTime?: number) => void;
  play: (track?: MixTrack, initialTime?: number) => void;
  pause: () => void;
  togglePlay: () => void;
  next: () => void;
  prev: () => void;
  setVolume: (volume: number) => void;
  setMuted: (isMuted: boolean) => void;
  setProgress: (progress: number) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setQueue: (queue: MixTrack[]) => void;
  addToQueue: (track: MixTrack) => void;
  savePlaybackPosition: (mixId: string, currentTime: number, duration: number) => void;
  getPlaybackPosition: (mixId: string) => SavedPosition | null;
  close: () => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentUserId: null,
  currentTrack: null,
  isPlaying: false,
  volume: 0.8,
  isMuted: false,
  progress: 0,
  currentTime: 0,
  duration: 0,
  queue: [],
  currentIndex: -1,
  history: {},
  lastSession: null,

  setCurrentUserId: (newUserId: string | null) => {
    const previousUserId = get().currentUserId;
    if (newUserId === previousUserId) return;

    // Transition: Logging out (User -> null)
    if (!newUserId) {
      // Detach user, reset active playback state, and unload user's history from memory
      set({
        currentUserId: null,
        currentTrack: null,
        isPlaying: false,
        progress: 0,
        currentTime: 0,
        duration: 0,
        queue: [],
        currentIndex: -1,
        history: {},
        lastSession: null,
      });
      return;
    }

    // Transition: Account Switching (User A -> User B)
    if (previousUserId && previousUserId !== newUserId) {
      // Completely reset playback and queue from previous user before hydrating new user
      const newHistory = getStoredHistory(newUserId);
      const newLastSession = getStoredLastSession(newUserId);
      set({
        currentUserId: newUserId,
        currentTrack: null,
        isPlaying: false,
        progress: 0,
        currentTime: 0,
        duration: 0,
        queue: [],
        currentIndex: -1,
        history: newHistory,
        lastSession: newLastSession,
      });
      return;
    }

    // Transition: Guest -> Authenticated User (null -> User A)
    const userHistory = getStoredHistory(newUserId);
    const userLastSession = getStoredLastSession(newUserId);

    // Keep active playback running if user was listening to a public track as a guest,
    // but bind state strictly to newUserId and load user's private history.
    set({
      currentUserId: newUserId,
      history: userHistory,
      lastSession: userLastSession,
    });
  },

  // Reset active playback in memory
  resetPlayback: () => {
    set({
      currentTrack: null,
      isPlaying: false,
      progress: 0,
      currentTime: 0,
      duration: 0,
      queue: [],
      currentIndex: -1,
    });
  },

  clearSession: () => {
    // Clear legacy non-scoped storage keys and reset store state
    try {
      localStorage.removeItem(HISTORY_KEY_PREFIX);
      localStorage.removeItem(LAST_SESSION_PREFIX);
      localStorage.removeItem(GUEST_PLAYBACK_KEY);
    } catch {}

    set({
      currentUserId: null,
      currentTrack: null,
      isPlaying: false,
      progress: 0,
      currentTime: 0,
      duration: 0,
      queue: [],
      currentIndex: -1,
      history: {},
      lastSession: null,
    });
  },

  setTrack: (track, initialTime) => {
    const queue = get().queue;
    const index = queue.findIndex((t) => t.id === track.id);
    let newQueue = [...queue];
    let newIndex = index;
    if (index === -1) {
      newQueue.push(track);
      newIndex = newQueue.length - 1;
    }

    // Check if we have a saved resume position for this mix
    const saved = get().getPlaybackPosition(track.id);
    const startPos = typeof initialTime === 'number' ? initialTime : (saved?.currentTime || 0);
    const trackDur = track.duration || saved?.duration || 0;
    const initialProg = trackDur > 0 ? startPos / trackDur : 0;

    set({
      currentTrack: track,
      queue: newQueue,
      currentIndex: newIndex,
      progress: initialProg,
      currentTime: startPos,
      duration: trackDur,
    });
    recordMixPlaybackTaste(track);
  },

  play: (track, initialTime) => {
    if (track) {
      get().setTrack(track, initialTime);
    }
    set({ isPlaying: true });
  },

  pause: () => set({ isPlaying: false }),

  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),

  next: () => {
    const { queue, currentIndex } = get();
    if (queue.length === 0 || currentIndex === -1) return;
    const nextIndex = (currentIndex + 1) % queue.length;
    const nextTrack = queue[nextIndex];
    set({
      currentTrack: nextTrack,
      currentIndex: nextIndex,
      isPlaying: true,
      progress: 0,
      currentTime: 0,
      duration: nextTrack.duration || 0,
    });
  },

  prev: () => {
    const { queue, currentIndex } = get();
    if (queue.length === 0 || currentIndex === -1) return;
    const prevIndex = currentIndex === 0 ? queue.length - 1 : currentIndex - 1;
    const prevTrack = queue[prevIndex];
    set({
      currentTrack: prevTrack,
      currentIndex: prevIndex,
      isPlaying: true,
      progress: 0,
      currentTime: 0,
      duration: prevTrack.duration || 0,
    });
  },

  setVolume: (volume) => set({ volume, isMuted: false }),
  setMuted: (isMuted) => set({ isMuted }),
  setProgress: (progress) => set({ progress }),
  setCurrentTime: (currentTime) => set({ currentTime }),
  setDuration: (duration) => set({ duration }),

  setQueue: (queue) => set({ queue, currentIndex: -1 }),
  addToQueue: (track) =>
    set((state) => {
      if (state.queue.some((t) => t.id === track.id)) return {};
      return { queue: [...state.queue, track] };
    }),

  savePlaybackPosition: (mixId, currentTime, duration) => {
    const userId = get().currentUserId;
    if (!userId) return; // Do not persist audio playback resume state for logged-out guests

    const currentTrack = get().currentTrack;
    if (!currentTrack || currentTrack.id !== mixId || currentTime < 2) return;

    const progress = duration > 0 ? currentTime / duration : 0;
    const savedItem: SavedPosition = {
      mixId,
      currentTime,
      duration,
      progress,
      timestamp: Date.now(),
      track: currentTrack,
    };

    const history = { ...get().history, [mixId]: savedItem };
    try {
      localStorage.setItem(getKey(HISTORY_KEY_PREFIX, userId), JSON.stringify(history));
      localStorage.setItem(getKey(LAST_SESSION_PREFIX, userId), JSON.stringify(savedItem));
    } catch {}

    set({ history, lastSession: savedItem });
  },

  getPlaybackPosition: (mixId) => {
    const userId = get().currentUserId;
    if (!userId) return null; // Logged-out users get no resume playback

    const history = get().history;
    const saved = history[mixId];
    // Return saved position if stored within the last 30 days and not finished
    if (saved && saved.progress < 0.96) {
      return saved;
    }
    return null;
  },

  close: () => set({ currentTrack: null, isPlaying: false, progress: 0, currentTime: 0 }),
}));
