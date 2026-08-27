import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, ArrowRight } from 'lucide-react';
import { getMediaUrl } from '@/lib/api';
import type { FeedDJ } from './types';

interface DjFeedRowProps {
  dj: FeedDJ;
  index?: number;
}

function formatCompact(n = 0) {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
}

export default function DjFeedRow({ dj, index = 0 }: DjFeedRowProps) {
  const avatarUrl = getMediaUrl(dj.avatar) || '/default-avatar.jpg';
  const stageName = dj.stageName || dj.username || 'DJ';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
    >
      <Link to={`/dj/${dj.username || dj.id}`} className="block group">
        <div className="flex items-center justify-between gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl bg-black-surface hover:bg-[#181818] border border-dark-gray hover:border-gold/40 transition-all">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
            <span className="hidden sm:inline font-mono text-xs text-text-muted w-6 text-center shrink-0">
              {String(index + 1).padStart(2, '0')}
            </span>

            <div className="relative w-11 h-11 sm:w-14 sm:h-14 rounded-full overflow-hidden shrink-0 bg-black border border-white/10 group-hover:border-gold/50 transition-colors">
              <img
                src={avatarUrl}
                alt={stageName}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="font-display text-sm sm:text-base font-bold text-white group-hover:text-gold transition-colors truncate">
                  {stageName}
                </h3>
                {dj.verified && <span className="text-gold text-xs">✓</span>}
                {dj.subscriptionTier === 'legend' && (
                  <span className="text-[9px] uppercase font-black px-1.5 py-0.5 rounded bg-gold/20 text-gold border border-gold/30">
                    PRO
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-text-secondary mt-0.5">
                <span className="flex items-center gap-1 truncate text-[11px] sm:text-xs">
                  <MapPin className="w-3 h-3 text-gold shrink-0" />
                  {dj.city ? `${dj.city}, Sierra Leone` : 'Sierra Leone 🇸🇱'}
                </span>
                {dj.genres && dj.genres.length > 0 && (
                  <span className="hidden md:inline-flex text-[10px] px-2 py-0.5 rounded-full bg-white/[0.04] text-text-muted">
                    {dj.genres[0]}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden lg:flex flex-col items-end text-right font-mono text-[11px] text-text-muted">
              <span>{dj._count?.mixes || dj.mixes?.length || 0} Mixes</span>
              <span className="text-text-secondary">{formatCompact(dj._count?.followers || dj.followers?.length || 0)} fans</span>
            </div>

            <span className="inline-flex items-center gap-1 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full bg-gold/10 text-gold border border-gold/30 group-hover:bg-gold group-hover:text-black font-bold text-xs uppercase tracking-wider transition-all shadow-sm">
              View DJ <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
