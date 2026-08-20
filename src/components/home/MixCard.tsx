import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play } from 'lucide-react';
import { getMediaUrl } from '@/lib/api';
import { usePlayerStore } from '@/stores/playerStore';
import type { HomeMix } from './types';

interface MixCardProps {
  mix: HomeMix;
  index?: number;
}

function formatCompact(n = 0) {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
}

export default function MixCard({ mix, index = 0 }: MixCardProps) {
  const play = usePlayerStore((s) => s.play);

  const handlePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!mix.audioUrl) return;
    play(
      {
        id: mix.id,
        title: mix.title,
        dj: mix.dj?.stageName || 'Deck Salone',
        audioUrl: mix.audioUrl,
        cover: mix.coverImage || '/mix-placeholder.jpg',
        genre: mix.genre || 'Afrobeats',
        duration: mix.duration || 0,
      },
      0
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link to={`/mixes/${mix.id}`} className="group block">
        <div className="relative aspect-square rounded-xl sm:rounded-2xl overflow-hidden bg-black-surface border border-dark-gray group-hover:border-gold/50 transition-all duration-300 shadow-card">
          <img
            src={mix.coverImage ? getMediaUrl(mix.coverImage) : '/mix-placeholder.jpg'}
            alt={mix.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/mix-placeholder.jpg';
            }}
          />
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors" />

          <button
            type="button"
            onClick={handlePlay}
            className="absolute bottom-2 right-2 sm:bottom-3 sm:right-3 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gold text-black flex items-center justify-center shadow-2xl opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 hover:scale-110 active:scale-95"
            aria-label={`Play ${mix.title}`}
          >
            <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-black ml-0.5" />
          </button>
        </div>

        <div className="mt-2.5 sm:mt-3 min-w-0">
          <h3 className="font-display font-bold text-xs sm:text-sm text-white uppercase tracking-tight truncate group-hover:text-gold transition-colors">
            {mix.title}
          </h3>
          <p className="text-[10px] sm:text-xs text-text-secondary truncate mt-0.5">
            {mix.dj?.stageName || 'Deck Salone'} • {formatCompact(mix.plays || 0)} plays
          </p>
        </div>
      </Link>
    </motion.div>
  );
}
