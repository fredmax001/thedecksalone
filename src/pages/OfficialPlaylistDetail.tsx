import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import {
  ListMusic,
  Play,
  Pause,
  ArrowLeft,
  Shuffle,
} from 'lucide-react';
import api, { getMediaUrl } from '@/lib/api';
import ShareButton from '@/components/ShareButton';
import { usePlayerStore, type MixTrack } from '@/stores/playerStore';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { formatCompactNumber } from '@/lib/formatting';
import { ListSkeleton } from '@/components/ui/page-skeletons';
import { useDelayedLoading } from '@/hooks/use-delayed-loading';

function formatDuration(seconds: number): string {
  if (!seconds) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function PlayingWaveIndicator() {
  return (
    <div className="flex items-end gap-[3px] h-3.5">
      <motion.div
        className="w-[2.5px] bg-[#f4e059] rounded-full"
        animate={{ height: ['4px', '14px', '6px', '12px', '4px'] }}
        transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="w-[2.5px] bg-[#f4e059] rounded-full"
        animate={{ height: ['12px', '4px', '14px', '6px', '12px'] }}
        transition={{ duration: 0.7, repeat: Infinity, ease: 'easeInOut', delay: 0.15 }}
      />
      <motion.div
        className="w-[2.5px] bg-[#f4e059] rounded-full"
        animate={{ height: ['6px', '14px', '4px', '10px', '6px'] }}
        transition={{ duration: 0.85, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
      />
    </div>
  );
}

export function OfficialPlaylistDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { data: playlist, isPending } = useQuery({
    queryKey: ['playlistDetail', slug],
    queryFn: async () => {
      // Official (manual) playlists first, then rule-based smart playlists
      try {
        const res = await api.get(`/official-playlists/${slug}`);
        if (res.data?.data) return res.data.data;
      } catch {
        // fall through to smart playlists
      }
      const res = await api.get(`/smart-playlists/${slug}`);
      return res.data?.data ?? null;
    },
    enabled: !!slug,
    retry: false,
  });
  const { play, pause, setQueue, currentTrack, isPlaying } = usePlayerStore();

  const tracks: MixTrack[] = useMemo(() => {
    if (!playlist?.items || playlist.items.length === 0) return [];
    return playlist.items
      .filter((item: any) => item.mix)
      .map((item: any) => {
        const m = item.mix;
        return {
          id: m.id,
          title: m.title,
          dj: m.dj?.stageName || 'DJ',
          duration: typeof m.duration === 'number' ? m.duration : parseInt(m.duration) || 0,
          cover: getMediaUrl(m.coverImage) || '',
          genre: m.genre || '',
          plays: m.plays || 0,
          audioUrl: getMediaUrl(m.audioUrl) || '',
          djTier: m.dj?.subscriptionTier,
        };
      });
  }, [playlist]);

  const totalDuration = useMemo(() => {
    return tracks.reduce((acc, t) => acc + (t.duration || 0), 0);
  }, [tracks]);

  const isPlaylistPlaying = useMemo(() => {
    if (!currentTrack || tracks.length === 0) return false;
    return isPlaying && tracks.some((t) => t.id === currentTrack.id);
  }, [currentTrack, isPlaying, tracks]);

  const handlePlayAll = () => {
    if (tracks.length === 0) return;
    if (isPlaylistPlaying) {
      pause();
    } else {
      setQueue(tracks);
      play(tracks[0]);
    }
  };

  const handleShuffle = () => {
    if (tracks.length === 0) return;
    const shuffled = [...tracks].sort(() => Math.random() - 0.5);
    setQueue(shuffled);
    play(shuffled[0]);
  };

  const handleTrackClick = (targetTrack: MixTrack) => {
    if (currentTrack?.id === targetTrack.id) {
      if (isPlaying) pause();
      else play();
      return;
    }
    setQueue(tracks);
    play(targetTrack);
  };

  const showSkeleton = useDelayedLoading(isPending);

  if (isPending) {
    return showSkeleton ? (
      <div className="min-h-screen bg-[#080808] py-8 px-4 sm:px-6 max-w-7xl mx-auto">
        <ListSkeleton rows={10} />
      </div>
    ) : null;
  }

  if (!playlist) {
    return (
      <div className="min-h-screen bg-[#080808] max-w-4xl mx-auto py-20 px-4 text-center">
        <h2 className="text-xl font-bold text-white mb-2">Playlist Not Found</h2>
        <Link to="/playlists">
          <button className="px-6 py-2.5 rounded-full bg-[#f4e059] text-black font-bold text-xs uppercase mt-4">
            Back to Playlists
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080808] text-text-primary py-8 px-4 sm:px-6 max-w-7xl mx-auto space-y-8 pb-32">
      {/* Back Button */}
      <Link
        to="/playlists"
        className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-muted hover:text-[#f4e059] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Playlists
      </Link>

      {/* ─── 🎧 APPLE MUSIC / SPOTIFY ALBUM HERO ─── */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#1c1c1c] via-[#121212] to-[#0A0A0A] border border-white/[0.08] p-6 sm:p-10 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#f4e059]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-8">
          {/* Big Artwork */}
          <div className="w-44 h-44 sm:w-56 sm:h-56 rounded-2xl bg-black border border-white/[0.1] overflow-hidden shrink-0 shadow-2xl">
            {playlist.coverImage ? (
              <img
                src={getMediaUrl(playlist.coverImage)}
                alt={playlist.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#f4e059]/20 via-[#111] to-black">
                <ListMusic className="w-16 h-16 text-[#f4e059] mb-2" />
                <span className="text-xs text-[#f4e059] font-bold uppercase tracking-widest">
                  Official Playlist
                </span>
              </div>
            )}
          </div>

          {/* Details & Action Controls */}
          <div className="space-y-4 flex-1">
            {playlist.isFeatured && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold">
                  ★ Highlight
                </span>
              </div>
            )}

            {playlist.isSmart && (
              <span className="px-2.5 py-1 rounded-full bg-[#f4e059]/15 text-[#f4e059] border border-[#f4e059]/30 text-xs font-bold uppercase tracking-wide">
                Smart Playlist
              </span>
            )}

            <h1 className="font-display text-3xl sm:text-5xl font-black uppercase tracking-tight text-white leading-none">
              {playlist.title}
            </h1>

            {playlist.description && (
              <p className="text-sm text-text-secondary max-w-2xl leading-relaxed">
                {playlist.description}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-text-muted pt-1">
              <span className="text-white font-bold">{tracks.length} Mixes</span>
              <span>•</span>
              <span>{formatDuration(totalDuration)} Total Runtime</span>
              <span>•</span>
              <span className="text-[#f4e059]">
                {playlist.isSmart ? 'Auto-curated • Updates as new mixes drop' : 'Deck Salone Official Editorial'}
              </span>
            </div>

            {/* Play All & Shuffle Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-3">
              {tracks.length > 0 && (
                <button
                  onClick={handlePlayAll}
                  className="inline-flex items-center gap-2.5 px-6 py-3 rounded-full bg-[#f4e059] text-black font-black text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all shadow-xl shadow-[#f4e059]/20"
                >
                  {isPlaylistPlaying ? (
                    <>
                      <Pause className="w-4 h-4 fill-current" /> Pause Playlist
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current ml-0.5" /> Play All Mixes
                    </>
                  )}
                </button>
              )}

              {tracks.length > 1 && (
                <button
                  onClick={handleShuffle}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-white font-bold text-xs uppercase tracking-wider transition-all"
                >
                  <Shuffle className="w-4 h-4 text-[#f4e059]" /> Shuffle
                </button>
              )}

              <ShareButton
                url={window.location.href}
                title={playlist.title}
                size="md"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ─── 🎼 SPOTIFY / APPLE MUSIC TRACKLIST TABLE ─── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h2 className="font-display text-xl font-bold uppercase tracking-tight text-white">
            Playlist Tracklist ({tracks.length})
          </h2>
        </div>

        {tracks.length === 0 ? (
          <div className="rounded-3xl border border-white/[0.06] bg-[#101010] p-12 text-center text-xs text-text-muted">
            No active mixes in this playlist currently.
          </div>
        ) : (
          <div className="rounded-3xl bg-[#101010] border border-white/[0.06] p-3 sm:p-5 overflow-hidden">
            {/* Table Column Headers */}
            <div className="hidden sm:grid grid-cols-12 gap-4 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-text-muted border-b border-white/[0.06]">
              <span className="col-span-1 text-center">#</span>
              <span className="col-span-6">Track & DJ</span>
              <span className="col-span-2">Genre</span>
              <span className="col-span-2 text-right">Streams</span>
              <span className="col-span-1 text-right">Time</span>
            </div>

            <div className="divide-y divide-white/[0.03] mt-1">
              {tracks.map((track, index) => {
                const isCurrent = currentTrack?.id === track.id;
                const isCurrentPlaying = isCurrent && isPlaying;

                return (
                  <div
                    key={track.id}
                    onClick={() => handleTrackClick(track)}
                    className={cn(
                      'group grid grid-cols-12 gap-3 sm:gap-4 items-center px-3 py-3 rounded-xl transition-all cursor-pointer',
                      isCurrent
                        ? 'bg-[#f4e059]/10 text-white'
                        : 'hover:bg-white/[0.04] text-text-secondary'
                    )}
                  >
                    {/* # Index / Play Trigger */}
                    <div className="col-span-2 sm:col-span-1 flex items-center justify-center">
                      {isCurrentPlaying ? (
                        <PlayingWaveIndicator />
                      ) : (
                        <>
                          <span className="font-mono text-xs text-text-muted group-hover:hidden">
                            {String(index + 1).padStart(2, '0')}
                          </span>
                          <button className="hidden group-hover:flex w-6 h-6 rounded-full bg-[#f4e059] text-black items-center justify-center">
                            <Play className="w-3 h-3 fill-current ml-0.5" />
                          </button>
                        </>
                      )}
                    </div>

                    {/* Track info & thumbnail */}
                    <div className="col-span-8 sm:col-span-6 flex items-center gap-3 min-w-0">
                      <img
                        src={track.cover || '/mix-placeholder.jpg'}
                        alt={track.title}
                        className="w-11 h-11 rounded-lg object-cover bg-black shrink-0 border border-white/[0.06]"
                        loading="lazy"
                      />
                      <div className="min-w-0 flex-1">
                        <Link
                          to={`/mix/${track.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className={cn(
                            'font-display text-xs sm:text-sm font-bold uppercase tracking-tight truncate block hover:text-[#f4e059] transition-colors',
                            isCurrent ? 'text-[#f4e059]' : 'text-text-primary'
                          )}
                        >
                          {track.title}
                        </Link>
                        <p className="text-[11px] text-text-muted truncate mt-0.5 flex items-center gap-1">
                          <span>{track.dj}</span>
                          {track.djTier === 'legend' && (
                            <span className="text-[8px] px-1 rounded bg-[#f4e059]/20 text-[#f4e059] font-bold">PRO+</span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Genre */}
                    <div className="hidden sm:block col-span-2">
                      <span className="text-[10px] font-semibold text-text-secondary px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.06]">
                        {track.genre}
                      </span>
                    </div>

                    {/* Stream Plays */}
                    <div className="hidden sm:block col-span-2 text-right font-mono text-xs text-text-muted">
                      {formatCompactNumber(track.plays || 0)}
                    </div>

                    {/* Duration */}
                    <div className="col-span-2 sm:col-span-1 text-right font-mono text-xs text-text-muted">
                      {formatDuration(track.duration)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default OfficialPlaylistDetail;

