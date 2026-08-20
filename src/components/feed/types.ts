import type { HomeDJ, HomeMix, HomeEvent, HomePlaylist } from '@/components/home/types';

export interface FeedDJ extends HomeDJ {
  _count?: {
    mixes?: number;
    followers?: number;
  };
  followers?: unknown[];
  userId?: string;
  subscriptionTier?: string;
}

export interface FeedMix extends Omit<HomeMix, 'dj'> {
  dj?: {
    id?: string;
    stageName?: string;
    avatar?: string;
    userId?: string;
    subscriptionTier?: string;
  };
  djTier?: string;
  isExclusive?: boolean;
  promotedUntil?: string | null;
  likes?: number;
  downloads?: number;
  createdAt?: string;
}

export interface FeedEvent extends HomeEvent {
  createdAt?: string;
}

export type FeedPlaylist = HomePlaylist;
