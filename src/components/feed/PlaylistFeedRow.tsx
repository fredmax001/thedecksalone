import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ListMusic, Music, ArrowRight } from 'lucide-react';
import { getMediaUrl } from '@/lib/api';
import type { FeedPlaylist } from './types';

interface PlaylistFeedRowProps {
  playlist: FeedPlaylist;
  index?: number;
}

export default function PlaylistFeedRow({ playlist, index = 0 }: PlaylistFeedRowProps) {
  const cover = playlist.coverImage ? getMediaUrl(playlist.coverImage) : null;
  const trackCount = playlist._count?.items || playlist.items?.length || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
    >
      <Link to={`/playlist/${playlist.slug || playlist.id}`} className="block group">
        <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl bg-black-surface hover:bg-[#181818] border border-dark-gray hover:border-gold/40 transition-all">
          <div className="relative w-20 h-14 sm:w-28 sm:h-18 rounded-xl overflow-hidden shrink-0 bg-black border border-white/10">
            {cover ? (
              <img src={cover} alt={playlist.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gold/15 to-black">
                <ListMusic className="w-6 h-6 text-gold" />
              </div>
            )}
            {playlist.isFeatured && (
              <span className="absolute top-1.5 left-1.5 text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-gold text-black">
                ★ Featured
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="font-display text-sm sm:text-base font-bold text-white group-hover:text-gold transition-colors truncate">
              {playlist.title}
            </h3>
            <p className="text-xs text-text-secondary line-clamp-2 mt-0.5">
              {playlist.description || 'Official Deck Salone curated set list.'}
            </p>
          </div>

          <div className="shrink-0 flex flex-col items-end gap-2">
            <span className="text-xs font-mono text-text-muted flex items-center gap-1">
              <Music className="w-3 h-3 text-gold" /> {trackCount} Mixes
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-gold uppercase group-hover:translate-x-0.5 transition-transform">
              Open <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
