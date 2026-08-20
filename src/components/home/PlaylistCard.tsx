import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, ListMusic, Music } from 'lucide-react';
import api, { getMediaUrl } from '@/lib/api';
import { usePlayerStore, type MixTrack } from '@/stores/playerStore';
import type { HomePlaylist } from './types';

interface PlaylistMixItem {
  id: string;
  title: string;
  coverImage?: string;
  audioUrl?: string;
  genre?: string;
  duration?: number | string;
  plays?: number;
  dj?: { stageName?: string };
}

interface PlaylistCardProps {
  playlist: HomePlaylist;
  index?: number;
}

export default function PlaylistCard({ playlist, index = 0 }: PlaylistCardProps) {
  const { play, setQueue } = usePlayerStore();

  const trackCount = playlist._count?.items || playlist.items?.length || 0;

  const handleQuickPlay = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await api.get(`/official-playlists/${playlist.slug || playlist.id}`);
      if (res.data.success && res.data.data?.items?.length > 0) {
        const tracks: MixTrack[] = res.data.data.items
          .filter((item: { mix?: PlaylistMixItem }) => !!item.mix)
          .map((item: { mix: PlaylistMixItem }) => {
            const m = item.mix;
            return {
              id: m.id,
              title: m.title,
              dj: m.dj?.stageName || 'DJ',
              duration: typeof m.duration === 'number' ? m.duration : parseInt(m.duration as string) || 0,
              cover: getMediaUrl(m.coverImage) || '',
              genre: m.genre || '',
              plays: m.plays || 0,
              audioUrl: getMediaUrl(m.audioUrl) || '',
            };
          });
        if (tracks.length > 0) {
          setQueue(tracks);
          play(tracks[0]);
        }
      }
    } catch (err) {
      console.error('Failed to quick play playlist', err);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link to={`/playlist/${playlist.slug || playlist.id}`} className="group block h-full">
        <div className="h-full rounded-xl sm:rounded-2xl bg-black-surface border border-dark-gray hover:border-gold/40 p-3 sm:p-4 transition-all hover:bg-[#181818] shadow-card flex flex-col">
          <div className="relative aspect-video rounded-lg sm:rounded-xl overflow-hidden bg-black shrink-0">
            {playlist.coverImage ? (
              <img
                src={getMediaUrl(playlist.coverImage)}
                alt={playlist.title}
                className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/mix-placeholder.jpg';
                }}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gold/20 via-black to-black">
                <ListMusic className="w-10 h-10 text-gold" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

            {playlist.isFeatured && (
              <span className="absolute top-2 left-2 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-gold text-black shadow">
                ★ Featured
              </span>
            )}

            <button
              type="button"
              onClick={handleQuickPlay}
              className="absolute bottom-2 right-2 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gold text-black flex items-center justify-center shadow-2xl opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all hover:scale-110 active:scale-95"
              aria-label={`Play ${playlist.title}`}
            >
              <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-black ml-0.5" />
            </button>
          </div>

          <div className="mt-3 sm:mt-4 flex-1 flex flex-col min-w-0">
            <h3 className="font-display font-bold text-xs sm:text-sm text-white uppercase tracking-tight truncate group-hover:text-gold transition-colors">
              {playlist.title}
            </h3>
            <p className="text-[10px] sm:text-xs text-text-secondary line-clamp-2 mt-1 flex-1">
              {playlist.description || 'Curated mix selections for the sound of Sierra Leone.'}
            </p>
            <div className="pt-3 mt-3 border-t border-white/[0.04] flex items-center gap-1.5 text-[10px] sm:text-xs text-text-muted">
              <Music className="w-3 h-3 text-gold" />
              <span>{trackCount} Mixes</span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
