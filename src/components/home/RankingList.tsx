import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trophy, TrendingUp, TrendingDown, MapPin, ChevronUp, ChevronDown } from 'lucide-react';
import { getMediaUrl } from '@/lib/api';
import SectionHeader from './SectionHeader';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import type { HomeDJ } from './types';

interface RankingListProps {
  djs: HomeDJ[];
}

function getRankColor(rank: number) {
  if (rank === 1) return 'text-gold';
  if (rank === 2) return 'text-[#C0C0C0]';
  if (rank === 3) return 'text-[#CD7F32]';
  return 'text-text-muted';
}

function getRankBorder(rank: number) {
  if (rank <= 3) return 'border-gold';
  return 'border-white/10';
}

function formatCompact(n = 0) {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
}

export default function RankingList({ djs }: RankingListProps) {
  if (!djs || djs.length === 0) {
    return (
      <section className="space-y-1">
        <SectionHeader
          title="Top Rankings"
          subtitle="This week's highest rated DJs"
          action={{ label: 'Full list', to: '/rankings' }}
          icon={<Trophy className="w-4 h-4" />}
        />
        <div className="rounded-2xl border border-dark-gray bg-black-surface p-8 text-center text-text-secondary text-sm">
          No rankings available yet.
        </div>
      </section>
    );
  }

  const topDjs = djs.slice(0, 5);

  return (
    <section className="space-y-1">
      <SectionHeader
        title="Top Rankings"
        subtitle="This week's highest rated DJs"
        action={{ label: 'Full list', to: '/rankings' }}
        icon={<Trophy className="w-4 h-4" />}
      />

      <div className="rounded-2xl border border-dark-gray bg-black-surface overflow-hidden shadow-card">
        {topDjs.map((dj, i) => {
          const trend = dj.trend || 0;
          return (
            <motion.div
              key={dj.id}
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
            >
              <Link
                to={`/dj/${dj.username || dj.id}`}
                className="group flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-3 hover:bg-[#1a1a1a] transition-colors border-b border-white/[0.04] last:border-b-0"
              >
                <div className="w-8 sm:w-10 text-center shrink-0">
                  <span className={`font-mono text-sm sm:text-base font-bold ${getRankColor(dj.rankingPosition || i + 1)}`}>
                    {dj.rankingPosition || i + 1}
                  </span>
                </div>

                <div className="shrink-0">
                  <img
                    src={dj.avatar ? getMediaUrl(dj.avatar) : '/default-avatar.jpg'}
                    alt={dj.stageName}
                    className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border-2 ${getRankBorder(dj.rankingPosition || i + 1)}`}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/default-avatar.jpg';
                    }}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-display text-xs sm:text-sm font-semibold uppercase tracking-tight text-white truncate">
                      {dj.stageName}
                    </span>
                    {dj.verified && <VerifiedBadge dj={dj} size={14} />}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] sm:text-xs text-text-muted flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {dj.city || 'Freetown'}
                    </span>
                    <span className="text-[10px] sm:text-xs text-text-muted">
                      {formatCompact(dj.totalStreams || 0)} streams
                    </span>
                  </div>
                </div>

                <div className="hidden sm:flex flex-col items-end w-20 shrink-0">
                  <span className="font-mono text-sm font-bold text-gold">{dj.rankingScore?.toFixed(1) || '0.0'}</span>
                  <div className="flex items-center gap-1 text-[10px]">
                    {trend >= 0 ? (
                      <>
                        <ChevronUp className="w-3 h-3 text-green" />
                        <span className="text-green">+{trend}%</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3 h-3 text-red" />
                        <span className="text-red">{trend}%</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="sm:hidden shrink-0 text-right">
                  <span className="font-mono text-xs font-bold text-gold block">{dj.rankingScore?.toFixed(1) || '0.0'}</span>
                  {trend >= 0 ? (
                    <TrendingUp className="w-3.5 h-3.5 text-green inline" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5 text-red inline" />
                  )}
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
