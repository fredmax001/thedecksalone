import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Music } from 'lucide-react';
import api, { getMediaUrl } from '@/lib/api';
import { usePlayerStore, type MixTrack } from '@/stores/playerStore';
import PlaylistCoverArt from '@/components/playlists/PlaylistCoverArt';
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
  playlist: HomePlaylist & { isSmart?: boolean; dynamicCover?: string; badge?: string };
  index?: number;
}

export default function PlaylistCard({ playlist, index = 0 }: PlaylistCardProps) {
  const { play, setQueue } = usePlayerStore();

  const trackCount = playlist._count?.items || playlist.items?.length || (playlist as any).trackCount || 0;
  const isSmart = Boolean(playlist.isSmart);

  const handleQuickPlay = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // If tracks are already present
    const items = playlist.items as any[] | undefined;
    if (!isSmart && items && items.length > 0 && items[0]?.mix) {
      const tracks: MixTrack[] = items
        .filter((item: any) => Boolean(item?.mix))
        .map((item: any) => {
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
        return;
      }
    }

    const base = isSmart ? '/smart-playlists' : '/official-playlists';
    try {
      const res = await api.get(`${base}/${playlist.slug || playlist.id}`);
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
          {/* Dynamic Cover Artwork */}
          <PlaylistCoverArt
            playlist={playlist}
            aspect="video"
            onPlay={handleQuickPlay}
            showPlayButton={true}
          />

          <div className="mt-3 sm:mt-4 flex-1 flex flex-col min-w-0">
            <h3 className="font-display font-bold text-xs sm:text-sm text-white uppercase tracking-tight truncate group-hover:text-gold transition-colors">
              {playlist.title}
            </h3>
            <p className="text-[10px] sm:text-xs text-text-secondary line-clamp-2 mt-1 flex-1">
              {playlist.description || 'Curated mix selections for the sound of Sierra Leone.'}
            </p>
            <div className="pt-3 mt-3 border-t border-white/[0.04] flex items-center justify-between text-[11px] font-semibold text-text-muted">
              <span className="flex items-center gap-1.5 text-gold">
                <Music className="w-3.5 h-3.5" />
                <span>{trackCount} {trackCount === 1 ? 'Mix' : 'Mixes'}</span>
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

