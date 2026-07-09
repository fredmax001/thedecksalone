import { create } from 'zustand';

export interface MixTrack {
  id: string;
  title: string;
  dj: string;
  duration: number;
  cover: string;
  genre: string;
  plays?: number;
  audioUrl?: string;
  audioSource?: string;
  originalUrl?: string;
  djTier?: 'free' | 'pro' | 'legend';
}

interface PlayerState {
  currentTrack: MixTrack | null;
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  progress: number;
  currentTime: number;
  duration: number;
  queue: MixTrack[];
  currentIndex: number;
  
  // Actions
  setTrack: (track: MixTrack) => void;
  play: (track?: MixTrack) => void;
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
  close: () => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack: null,
  isPlaying: false,
  volume: 0.8,
  isMuted: false,
  progress: 0,
  currentTime: 0,
  duration: 0,
  queue: [],
  currentIndex: -1,

  setTrack: (track) => {
    const queue = get().queue;
    const index = queue.findIndex((t) => t.id === track.id);
    let newQueue = [...queue];
    let newIndex = index;
    if (index === -1) {
      newQueue.push(track);
      newIndex = newQueue.length - 1;
    }
    set({
      currentTrack: track,
      queue: newQueue,
      currentIndex: newIndex,
      progress: 0,
      currentTime: 0,
      duration: track.duration || 0,
    });
  },

  play: (track) => {
    if (track) {
      get().setTrack(track);
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
  addToQueue: (track) => set((state) => {
    if (state.queue.some(t => t.id === track.id)) return {};
    return { queue: [...state.queue, track] };
  }),

  close: () => set({ currentTrack: null, isPlaying: false, progress: 0, currentTime: 0 }),
}));
