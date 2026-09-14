import { useState } from 'react';
import { Play, Disc3, CheckCircle2 } from 'lucide-react';
import { getMediaUrl } from '@/lib/api';

export interface PlaylistCoverArtProps {
  playlist: {
    id?: string;
    title?: string;
    slug?: string;
    coverImage?: string | null;
    dynamicCover?: string | null;
    badge?: string | null;
    accentColor?: string | null;
    isFeatured?: boolean;
    isSmart?: boolean;
    topDjName?: string | null;
    topDjAvatar?: string | null;
    topDj?: { stageName?: string; avatar?: string; verified?: boolean } | null;
    items?: Array<{ mix?: { coverImage?: string; dj?: { stageName?: string; avatar?: string; verified?: boolean } } }>;
  };
  aspect?: 'square' | 'video';
  className?: string;
  showOverlayText?: boolean;
  showBadge?: boolean;
  showPlayButton?: boolean;
  onPlay?: (e: React.MouseEvent) => void;
}

export default function PlaylistCoverArt({
  playlist,
  aspect = 'square',
  className = '',
  showOverlayText = true,
  showBadge = true,
  showPlayButton = true,
  onPlay,
}: PlaylistCoverArtProps) {
  const [imgError, setImgError] = useState(false);

  // Extract top DJ info for attribution and dynamic face cover
  const topDj =
    playlist.topDj ||
    playlist.items?.[0]?.mix?.dj ||
    (playlist.topDjName ? { stageName: playlist.topDjName, avatar: playlist.topDjAvatar, verified: true } : null);

  const topDjAvatar = playlist.topDjAvatar || topDj?.avatar;
  const topMixCover = playlist.items?.[0]?.mix?.coverImage;

  // Resolve cover image prioritizing top DJ avatar, then playlist cover, then top mix cover
  const resolvedCover = imgError
    ? '/images/genres/salone-mix.jpg'
    : getMediaUrl(
        topDjAvatar ||
        playlist.coverImage ||
        playlist.dynamicCover ||
        topMixCover ||
        '/images/genres/salone-mix.jpg'
      );

  const title = playlist.title || 'Playlist';
  const badge =
    playlist.badge ||
    (playlist.isFeatured ? '★ Featured' : null);
  const accentColor = playlist.accentColor || '#f4e059';

  const aspectClass = aspect === 'video' ? 'aspect-video' : 'aspect-square';

  return (
    <div
      className={`relative ${aspectClass} rounded-xl sm:rounded-2xl overflow-hidden bg-black select-none border border-white/[0.08] group ${className}`}
    >
      {/* Background Cover Artwork (with subtle zoom on hover) */}
      <img
        src={resolvedCover}
        alt={title}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
        loading="lazy"
        onError={() => setImgError(true)}
      />

      {/* Vignette & Contrast Gradients */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-black/20" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-transparent opacity-80" />

      {/* Top Bar: Badge & Deck Salone Emblem */}
      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2 z-10">
        {showBadge && badge && (
          <span
            style={{
              backgroundColor: badge.includes('★') ? '#f4e059' : undefined,
              borderColor: accentColor,
            }}
            className={`text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow-lg ${
              badge.includes('★')
                ? 'bg-gold text-black font-black'
                : 'bg-black/75 backdrop-blur-md text-white border border-white/20'
            }`}
          >
            {badge}
          </span>
        )}

        <div className="ml-auto flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-md text-[8px] font-bold uppercase tracking-wider text-gold/90 border border-gold/20">
          <Disc3 className="w-2.5 h-2.5 animate-spin text-gold" style={{ animationDuration: '6s' }} />
          <span>DS</span>
        </div>
      </div>

      {/* Bottom Artwork Typography & DJ Attribution */}
      {showOverlayText && (
        <div className="absolute bottom-2.5 left-2.5 right-2.5 z-10 flex flex-col justify-end">
          <div className="space-y-0.5">
            <h4 className="font-display text-xs sm:text-sm font-black uppercase tracking-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] line-clamp-1 group-hover:text-gold transition-colors">
              {title}
            </h4>

            {topDj?.stageName ? (
              <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold text-text-secondary line-clamp-1 drop-shadow">
                <span className="text-gold font-bold">Ft.</span>
                <span className="text-white/90 truncate">{topDj.stageName}</span>
                {topDj.verified && (
                  <CheckCircle2 className="w-3 h-3 text-gold fill-gold/20 shrink-0 inline" />
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Hover Floating Quick Play Button */}
      {showPlayButton && onPlay && (
        <button
          type="button"
          onClick={onPlay}
          className="absolute bottom-3 right-3 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gold text-black flex items-center justify-center shadow-2xl opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all hover:scale-110 active:scale-95 z-20"
          aria-label={`Play ${title}`}
        >
          <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-black ml-0.5" />
        </button>
      )}
    </div>
  );
}
