import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Loader2, Play } from 'lucide-react';
import { useHearThisSearch } from '@/hooks/useHearThis';
import HearThisPlayer from '@/components/HearThisPlayer';
import type { HearThisTrack } from '@/hooks/useHearThis';

export default function MixHub() {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('afrobeats');
  const [activePlayerId, setActivePlayerId] = useState<string | null>(null);

  // Simple debounce
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery || 'afrobeats');
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: searchData, isLoading } = useHearThisSearch(debouncedQuery, 20);
  const tracks: HearThisTrack[] = searchData?.data || [];

  return (
    <div className="min-h-[100dvh] bg-black pb-24">
      {/* Hero */}
      <section className="relative w-full pt-32 pb-16 px-6 overflow-hidden">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gold/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="max-w-container mx-auto relative z-10 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="inline-block mb-4 px-3 py-1 rounded-full border border-gold/30 bg-gold/5">
            <span className="text-gold text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
              Powered by HearThis.at
            </span>
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-4xl md:text-6xl font-display font-bold uppercase tracking-tight text-white mb-6">
            Global Mix Hub
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-text-muted text-lg max-w-2xl mx-auto mb-10">
            Stream unlimited DJ mixes with zero copyright restrictions. Search any genre, DJ, or vibe.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="max-w-xl mx-auto relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="text-gold w-5 h-5" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search afrobeats, amapiano, sierra leone..."
              className="w-full bg-[#111] border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-white/30 focus:outline-none focus:border-gold/50 transition-colors shadow-[0_0_30px_rgba(212,162,74,0.05)]"
            />
          </motion.div>
        </div>
      </section>

      {/* Results */}
      <section className="max-w-container mx-auto px-6">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-gold animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {tracks.map((track, i) => {
              const isPlaying = activePlayerId === track.id;

              return (
                <motion.div 
                  key={track.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex flex-col"
                >
                  <div className="relative group rounded-xl overflow-hidden bg-[#111] border border-white/5 aspect-square mb-3 cursor-pointer" onClick={() => setActivePlayerId(track.id)}>
                    <img 
                      src={track.artwork_url || '/placeholder.jpg'} 
                      alt={track.title} 
                      className={`w-full h-full object-cover transition-transform duration-700 ${isPlaying ? 'scale-105' : 'group-hover:scale-105'}`}
                    />
                    <div className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${isPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
                    
                    {!isPlaying && (
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-14 h-14 rounded-full bg-gold/90 text-black flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                          <Play className="w-6 h-6 ml-1" />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {isPlaying ? (
                    <div className="mt-2 w-full animate-in fade-in slide-in-from-top-4 duration-500">
                      <HearThisPlayer track={track} compact />
                    </div>
                  ) : (
                    <div className="px-1">
                      <h3 className="text-white font-display font-semibold line-clamp-1">{track.title}</h3>
                      <p className="text-gold text-sm line-clamp-1">{track.user?.username}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-text-muted">
                        <span>{new Intl.NumberFormat('en-US', { notation: 'compact' }).format(track.playback_count)} plays</span>
                        <span>•</span>
                        <span>{Math.floor(track.duration / 60)}:{String(track.duration % 60).padStart(2, '0')}</span>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
