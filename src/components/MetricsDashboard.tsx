import { motion, type Variants } from 'framer-motion';
import { useDJMetrics, type PlatformMetrics } from '@/hooks/useHearThis';
import { Play, BarChart2, Radio, Disc } from 'lucide-react';

interface MetricsDashboardProps {
  djId: string;
}

export default function MetricsDashboard({ djId }: MetricsDashboardProps) {
  const { data, isLoading, error } = useDJMetrics(djId);

  if (isLoading) {
    return (
      <div className="w-full bg-[#0D0D0D] rounded-2xl p-6 border border-white/5 animate-pulse">
        <div className="h-8 w-48 bg-white/10 rounded mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-white/5 rounded-xl border border-white/5"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !data || !data.data) {
    return (
      <div className="w-full bg-[#0D0D0D] rounded-2xl p-6 border border-white/5 text-center text-text-muted">
        <BarChart2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No platform data linked yet</p>
      </div>
    );
  }

  const metrics: PlatformMetrics = data.data;
  const hasAnyPlatform = metrics.hearthis || metrics.soundcloud || metrics.mixcloud;

  if (!hasAnyPlatform) {
    return (
      <div className="w-full bg-[#0D0D0D] rounded-2xl p-6 border border-white/5 text-center text-text-muted">
        <BarChart2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>Connect your streaming platforms to see combined metrics</p>
      </div>
    );
  }

  const formatStat = (num: number) => {
    if (num === undefined || num === null) return '0';
    return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(num);
  };

  const container: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
  };

  return (
    <div className="w-full bg-[#0D0D0D] rounded-2xl p-6 border border-gold/10">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8">
        <div>
          <h2 className="text-xl font-display font-bold uppercase flex items-center gap-2 mb-1">
            <BarChart2 className="text-gold w-5 h-5" />
            Cross-Platform Metrics
          </h2>
          <p className="text-sm text-text-muted">Combined reach across all linked streaming services</p>
        </div>
        
        <div className="flex items-center gap-6 mt-4 md:mt-0">
          <div className="text-right">
            <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Total Reach</p>
            <p className="text-3xl font-mono font-bold text-white leading-none">
              {formatStat(metrics.totalReach)}
            </p>
          </div>
          <div className="w-px h-10 bg-white/10" />
          <div className="text-right">
            <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Total Plays</p>
            <p className="text-3xl font-mono font-bold text-gold leading-none">
              {formatStat(metrics.totalPlays)}
            </p>
          </div>
        </div>
      </div>

      <motion.div 
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {metrics.hearthis && (
          <motion.div variants={item} className="bg-[#151515] rounded-xl p-5 border border-gold/20 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gold/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
            <div className="flex items-center gap-2 mb-4 relative z-10">
              <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center">
                <Radio className="text-gold w-4 h-4" />
              </div>
              <span className="font-semibold text-white">HearThis.at</span>
            </div>
            <div className="grid grid-cols-2 gap-4 relative z-10">
              <div>
                <p className="text-xs text-text-muted mb-1">Followers</p>
                <p className="text-xl font-mono text-white">{formatStat(metrics.hearthis.followers)}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted mb-1">Plays</p>
                <p className="text-xl font-mono text-white">{formatStat(metrics.hearthis.plays)}</p>
              </div>
            </div>
          </motion.div>
        )}

        {metrics.soundcloud && (
          <motion.div variants={item} className="bg-[#151515] rounded-xl p-5 border border-[#FF5500]/20 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#FF5500]/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
            <div className="flex items-center gap-2 mb-4 relative z-10">
              <div className="w-8 h-8 rounded-full bg-[#FF5500]/10 flex items-center justify-center">
                <Disc className="text-[#FF5500] w-4 h-4" />
              </div>
              <span className="font-semibold text-white">SoundCloud</span>
            </div>
            <div className="grid grid-cols-1 gap-4 relative z-10">
              {/* SoundCloud oEmbed doesn't give followers, only tracks sometimes, we might only have plays if we did scraping, 
                  but for now we just show what we have */}
              <div>
                <p className="text-xs text-text-muted mb-1">Latest Track</p>
                <p className="text-sm font-medium text-white line-clamp-1">{metrics.soundcloud.title}</p>
              </div>
            </div>
          </motion.div>
        )}

        {metrics.mixcloud && (
          <motion.div variants={item} className="bg-[#151515] rounded-xl p-5 border border-[#5000FF]/20 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#5000FF]/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
            <div className="flex items-center gap-2 mb-4 relative z-10">
              <div className="w-8 h-8 rounded-full bg-[#5000FF]/10 flex items-center justify-center">
                <Play className="text-[#6B4FFF] w-4 h-4" />
              </div>
              <span className="font-semibold text-white">MixCloud</span>
            </div>
            <div className="grid grid-cols-2 gap-4 relative z-10">
              <div>
                <p className="text-xs text-text-muted mb-1">Followers</p>
                <p className="text-xl font-mono text-white">{formatStat(metrics.mixcloud.followers)}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted mb-1">Plays</p>
                <p className="text-xl font-mono text-white">{formatStat(metrics.mixcloud.plays)}</p>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
