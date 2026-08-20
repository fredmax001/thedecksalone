export interface HomeDJ {
  id: string;
  username?: string;
  stageName: string;
  avatar?: string;
  city?: string;
  genres?: string[];
  verified?: boolean;
  subscriptionTier?: string;
  rankingPosition?: number;
  rankingScore?: number;
  trend?: number;
  totalStreams?: number;
  mixes?: HomeMix[];
}

export interface HomeMix {
  id: string;
  title: string;
  coverImage?: string;
  cover?: string;
  audioUrl?: string;
  audioSource?: string;
  originalUrl?: string;
  genre?: string;
  category?: string;
  duration?: number;
  plays?: number;
  dj?: { id?: string; stageName?: string; avatar?: string } | null;
  djName?: string;
}

export interface HomeEvent {
  id: string;
  title: string;
  city?: string;
  venue?: string;
  date?: string;
  coverImage?: string;
  flyerImage?: string;
}

export interface HomeAd {
  id: string;
  badge?: string;
  title?: string;
  campaignName?: string;
  subtitle?: string;
  tagline?: string;
  description?: string;
  bannerImage?: string;
  imageUrl?: string;
  ctaText?: string;
  ctaLink?: string;
  linkUrl?: string;
  dj?: { avatar?: string } | null;
}

export interface HomePlaylist {
  id: string;
  slug?: string;
  title: string;
  description?: string;
  coverImage?: string;
  isFeatured?: boolean;
  _count?: { items?: number };
  items?: { mix?: HomeMix & { dj?: { stageName?: string } } }[];
}
