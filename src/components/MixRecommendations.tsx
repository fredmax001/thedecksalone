import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, Radio, Disc } from 'lucide-react';
import { usePlayerStore, type MixTrack } from '@/stores/playerStore';
import api from '@/lib/api';

interface RecMixItem {
  id: string;
  title: string;
  genre: string;
  category?: string;
  coverImage?: string;
  audioUrl?: string;
  audioSource?: string;
  originalUrl?: string;
  duration?: number;
  plays: number;
  likes: number;
  dj?: {
    id: string;
    stageName: string;
    avatar?: string;
    verified?: boolean;
    subscriptionTier?: string;
  };
}

export default function MixRecommendations({
  mixId,
  djName,
}: {
  mixId: string;
  djName?: string;
}) {
  const { play, setQueue } = usePlayerStore();
  const [similar, setSimilar] = useState<RecMixItem[]>([]);
  const [moreFromDj, setMoreFromDj] = useState<RecMixItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecs = async () => {
      try {
        const res = await api.get(`/mixes/${mixId}/recommendations`);
        if (res.data.success) {
          setSimilar(res.data.data?.similar || []);
          setMoreFromDj(res.data.data?.moreFromDj || []);
        }
      } catch {
        // Quiet fallback
      } finally {
        setLoading(false);
      }
    };
    if (mixId) {
      fetchRecs();
    }
  }, [mixId]);

  const handlePlayRec = (rec: RecMixItem, list: RecMixItem[]) => {
    const queueTracks: MixTrack[] = list.map((item) => ({
      id: item.id,
      title: item.title,
      dj: item.dj?.stageName || djName || 'DJ',
      duration: item.duration || 0,
      cover: item.coverImage || '/mix-placeholder.jpg',
      genre: item.genre || 'Mix',
      audioUrl: item.audioUrl,
      audioSource: item.audioSource,
      originalUrl: item.originalUrl,
      plays: item.plays || 0,
      djTier: item.dj?.subscriptionTier as any,
    }));

    const activeTrack = queueTracks.find((t) => t.id === rec.id) || queueTracks[0];
    setQueue(queueTracks);
    play(activeTrack);
  };

  if (loading || (similar.length === 0 && moreFromDj.length === 0)) return null;

  return (
    <div className="mt-12 space-y-10 border-t border-white/10 pt-8">
      {/* Section 1: MORE LIKE THIS */}
      {similar.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-lg uppercase text-text-primary flex items-center gap-2">
              <Radio className="w-5 h-5 text-gold" />
              MORE LIKE THIS
            </h3>
            <Link to="/mixes" className="text-xs font-bold text-gold uppercase hover:underline">
              Browse All
            </Link>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-3 snap-x scrollbar-hide">
            {similar.map((item) => (
              <motion.div
                key={item.id}
                whileHover={{ y: -3 }}
                className="flex-shrink-0 w-44 sm:w-52 bg-black-surface border border-white/10 hover:border-gold/40 rounded-2xl overflow-hidden shadow-lg transition-all"
              >
                <div className="relative aspect-square overflow-hidden bg-black-elevated group">
                  <img
                    src={item.coverImage || '/mix-placeholder.jpg'}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div
                    onClick={() => handlePlayRec(item, similar)}
                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-full bg-gold-gradient flex items-center justify-center">
                      <Play className="w-5 h-5 text-black ml-0.5 fill-black" />
                    </div>
                  </div>
                </div>

                <div className="p-3 space-y-1">
                  <Link to={`/mix/${item.id}`} className="block truncate">
                    <h4 className="font-display font-bold text-xs uppercase text-text-primary hover:text-gold transition-colors truncate">
                      {item.title}
                    </h4>
                  </Link>
                  <p className="text-[10px] text-gold font-semibold truncate">{item.dj?.stageName || djName}</p>
                  <div className="flex items-center justify-between text-[9px] text-text-muted pt-1">
                    <span className="bg-gold/10 text-gold px-1.5 py-0.5 rounded uppercase font-bold">
                      {item.genre}
                    </span>
                    <span>{item.plays || 0} plays</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Section 2: MORE FROM THIS DJ */}
      {moreFromDj.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-lg uppercase text-text-primary flex items-center gap-2">
              <Disc className="w-5 h-5 text-gold" />
              MORE FROM {djName?.toUpperCase() || 'THIS DJ'}
            </h3>
            {moreFromDj[0]?.dj && (
              <Link to={`/dj/${moreFromDj[0].dj.id}`} className="text-xs font-bold text-gold uppercase hover:underline">
                View DJ Profile
              </Link>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {moreFromDj.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between bg-black-surface border border-white/10 hover:border-gold/40 rounded-xl p-2.5 transition-all"
              >
                <div className="flex items-center gap-3 truncate">
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-black-elevated group cursor-pointer" onClick={() => handlePlayRec(item, moreFromDj)}>
                    <img src={item.coverImage || '/mix-placeholder.jpg'} alt={item.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Play className="w-4 h-4 text-gold fill-gold" />
                    </div>
                  </div>

                  <div className="truncate">
                    <Link to={`/mix/${item.id}`}>
                      <h4 className="font-display font-bold text-xs uppercase text-text-primary hover:text-gold transition-colors truncate">
                        {item.title}
                      </h4>
                    </Link>
                    <p className="text-[10px] text-text-muted mt-0.5">{item.genre} • {item.plays || 0} plays</p>
                  </div>
                </div>

                <button
                  onClick={() => handlePlayRec(item, moreFromDj)}
                  className="bg-gold/10 hover:bg-gold text-gold hover:text-black p-2 rounded-full transition-colors flex-shrink-0 ml-2"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
