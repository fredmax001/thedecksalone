import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play } from 'lucide-react';
import { getMediaUrl } from '@/lib/api';
import { usePlayerStore } from '@/stores/playerStore';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { OptimizedImage } from '@/components/ui/optimized-image';
import type { HomeDJ } from './types';

interface DjCardProps {
  dj: HomeDJ;
  variant?: 'circle' | 'portrait';
  index?: number;
}

export default function DjCard({ dj, variant = 'portrait', index = 0 }: DjCardProps) {
  const play = usePlayerStore((s) => s.play);

  const handlePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const mix = dj.mixes?.[0];
    if (!mix?.audioUrl) return;
    play(
      {
        id: mix.id,
        title: mix.title,
        dj: dj.stageName,
        audioUrl: mix.audioUrl,
        cover: mix.coverImage || dj.avatar || '/mix-placeholder.jpg',
        genre: mix.genre || 'Afrobeats',
        duration: mix.duration || 0,
      },
      0
    );
  };

  const profileLink = `/dj/${dj.username || dj.id}`;

  if (variant === 'circle') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, delay: index * 0.04 }}
      >
        <Link to={profileLink} className="flex flex-col items-center gap-2 group w-[72px] sm:w-24 shrink-0">
          <div className="relative p-[2px] rounded-full border-2 border-gold group-hover:scale-105 transition-transform shadow-[0_0_14px_rgba(244,224,89,0.25)]">
            <div className="w-[64px] h-[64px] sm:w-[84px] sm:h-[84px] rounded-full overflow-hidden bg-black">
              <OptimizedImage
                src={dj.avatar ? getMediaUrl(dj.avatar) : '/default-avatar.jpg'}
                alt={dj.stageName}
                width={128}
                height={128}
                objectFit="cover"
                loading="lazy"
                fallbackSrc="/default-avatar.jpg"
                containerClassName="w-full h-full"
              />
            </div>
            {dj.verified && (
              <span className="absolute bottom-0 right-0 w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-gold border-2 border-black flex items-center justify-center">
                <svg width="10" height="10" viewBox="0 0 16 16" fill="none" className="hidden sm:block">
                  <path d="M4 8L7 11L12 5" stroke="black" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            )}
          </div>
          <span className="text-[10px] sm:text-xs font-bold text-white group-hover:text-gold transition-colors truncate w-full text-center leading-tight">
            {dj.stageName}
          </span>
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link to={profileLink} className="group block">
        <div className="relative aspect-[3/4] rounded-xl sm:rounded-2xl overflow-hidden bg-black-surface border border-dark-gray group-hover:border-gold/50 transition-all duration-300 shadow-card">
          <OptimizedImage
            src={dj.avatar ? getMediaUrl(dj.avatar) : '/default-avatar.jpg'}
            alt={dj.stageName}
            width={400}
            height={533}
            objectFit="cover"
            loading="lazy"
            fallbackSrc="/default-avatar.jpg"
            containerClassName="w-full h-full"
            className="group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

          <div className="absolute top-2 left-2">
            {dj.verified && <VerifiedBadge dj={dj} className="scale-90 origin-top-left" />}
          </div>

          <div className="absolute bottom-0 inset-x-0 p-3 sm:p-4 flex items-end justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-display font-black text-xs sm:text-sm text-white uppercase tracking-tight truncate group-hover:text-gold transition-colors">
                {dj.stageName}
              </h3>
              <p className="text-[10px] sm:text-xs text-text-secondary truncate mt-0.5">
                {dj.genres?.[0] || dj.city || 'Afrobeats'}
              </p>
            </div>
            {dj.mixes && dj.mixes.length > 0 && (
              <button
                type="button"
                onClick={handlePlay}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gold text-black flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-transform shrink-0"
                aria-label={`Play ${dj.stageName}`}
              >
                <Play className="w-3.5 h-3.5 fill-black ml-0.5" />
              </button>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
