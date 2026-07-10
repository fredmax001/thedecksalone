import { motion } from 'framer-motion';
import { Play, Sparkles } from 'lucide-react';

import { ReupButton } from '@/components/ReupButton';

interface Mix {
  id: string;
  title: string;
  coverImage?: string;
  duration?: string | number;
  plays: number;
  audioUrl?: string;
  dj?: { id: string; stageName: string; avatar?: string; city?: string };
}

interface HighlightItem {
  id: string;
  mix: Mix;
}

interface HighlightsTabProps {
  highlights: HighlightItem[];
}

function formatCompact(num: number): string {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(num);
}

export function HighlightsTab({ highlights }: HighlightsTabProps) {
  if (!highlights || highlights.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center py-20 text-text-muted"
      >
        <Sparkles size={48} className="mx-auto mb-4 opacity-50" />
        <p className="text-lg font-medium">No highlights yet</p>
        <p className="text-sm mt-2">Pro DJs can pin up to 4 mixes here.</p>
      </motion.div>
    );
  }

  const handlePlay = (mix: Mix) => {
    if (mix.audioUrl) {
      window.dispatchEvent(
        new CustomEvent('play-mix', {
          detail: { track: mix, queue: highlights.map((h) => h.mix).filter((m) => m.audioUrl) },
        })
      );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {highlights.map((item, i) => (
          <motion.div
            key={item.mix.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.4 }}
            className="group bg-[#111111] border border-[rgba(255,255,255,0.05)] rounded-2xl overflow-hidden hover:border-gold/30 hover:-translate-y-1 transition-all duration-300"
          >
            <div className="relative aspect-square overflow-hidden">
              <img
                src={item.mix.coverImage || '/mix-placeholder.jpg'}
                alt={item.mix.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-400"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button
                  onClick={() => handlePlay(item.mix)}
                  disabled={!item.mix.audioUrl}
                  className="w-12 h-12 rounded-full bg-gold-gradient flex items-center justify-center hover:scale-110 transition-transform disabled:opacity-50"
                >
                  <Play size={20} className="text-black ml-0.5" fill="black" />
                </button>
              </div>
              {item.mix.duration && (
                <div className="absolute top-3 right-3 px-2 py-1 rounded bg-gold text-black text-xs font-mono-data font-semibold">
                  {item.mix.duration}
                </div>
              )}
            </div>
            <div className="p-4">
              <h4 className="font-display text-sm font-semibold uppercase text-text-primary truncate">
                {item.mix.title}
              </h4>
              {item.mix.dj && item.mix.dj.id !== undefined && (
                <p className="mt-1 text-xs text-text-muted truncate">
                  by {item.mix.dj.stageName}
                </p>
              )}
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-text-muted">
                  <Play size={12} />
                  <span className="font-mono-data">{formatCompact(item.mix.plays)}</span>
                </div>
                <ReupButton mixId={item.mix.id} size="sm" showCount={false} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
