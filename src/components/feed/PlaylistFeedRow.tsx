import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Music } from 'lucide-react';
import PlaylistCoverArt from '@/components/playlists/PlaylistCoverArt';
import { usePlayerStore, type MixTrack } from '@/stores/playerStore';
import api, { getMediaUrl } from '@/lib/api';
import type { FeedPlaylist } from './types';

function toTrack(m: any): MixTrack {
  return {
    id: m.id,
    title: m.title,
    dj: m.dj?.stageName || m.dj || 'DJ',
    duration: typeof m.duration === 'number' ? m.duration : parseInt(m.duration) || 0,
    cover: getMediaUrl(m.coverImage || m.cover) || '',
    genre: m.genre || '',
    plays: m.plays || 0,
    audioUrl: getMediaUrl(m.audioUrl) || '',
  };
}

interface PlaylistFeedRowProps {
  playlist: FeedPlaylist | any;
  index?: number;
}

export default function PlaylistFeedRow({ playlist, index = 0 }: PlaylistFeedRowProps) {
  const { play, setQueue } = usePlayerStore();
  const trackCount = playlist._count?.items || playlist.items?.length || playlist.trackCount || 0;
  const isSmart = Boolean(playlist.isSmart);

  const handleQuickPlay = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isSmart && playlist.items?.length > 0 && playlist.items[0].id) {
      const tracks: MixTrack[] = playlist.items.map((item: any) => toTrack(item.mix || item));
      if (tracks.length > 0) {
        setQueue(tracks);
        play(tracks[0]);
      }
      return;
    }

    const base = isSmart ? '/smart-playlists' : '/official-playlists';
    try {
      const res = await api.get(`${base}/${playlist.slug || playlist.id}`);
      if (res.data.success && res.data.data?.items?.length > 0) {
        const tracks: MixTrack[] = res.data.data.items
          .filter((item: any) => item.mix)
          .map((item: any) => toTrack(item.mix));
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
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index, 10) * 0.04 }}
      className="group"
    >
      <Link to={`/playlist/${playlist.slug || playlist.id}`} className="block">
        <div className="rounded-2xl bg-[#121110] hover:bg-[#181816] border border-white/[0.08] hover:border-gold/40 p-2.5 sm:p-3 transition-all shadow-lg hover:shadow-gold/10 flex flex-col">
          <PlaylistCoverArt
            playlist={playlist}
            aspect="square"
            onPlay={handleQuickPlay}
            showPlayButton={true}
          />
          <div className="mt-2.5 px-0.5 flex items-center justify-between gap-2">
            <h3 className="font-display text-xs sm:text-sm font-bold text-white uppercase tracking-tight truncate group-hover:text-gold transition-colors">
              {playlist.title}
            </h3>
            <span className="text-[11px] font-mono text-text-muted shrink-0 flex items-center gap-1">
              <Music className="w-3 h-3 text-gold/80" />
              <span>{trackCount}</span>
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
