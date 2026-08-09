import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ListMusic, Play, ArrowLeft, Loader2 } from 'lucide-react';
import api, { getMediaUrl } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ModeratorBadge } from '@/components/ModeratorBadge';
import { usePlayerStore } from '@/stores/playerStore';

export function OfficialPlaylistDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [loading, setLoading] = useState(true);
  const [playlist, setPlaylist] = useState<any | null>(null);
  const { play } = usePlayerStore();

  useEffect(() => {
    if (slug) fetchPlaylistDetail();
  }, [slug]);

  const fetchPlaylistDetail = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/official-playlists/${slug}`);
      if (res.data.success) {
        setPlaylist(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load playlist detail', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayTrack = (mix: any) => {
    if (!mix) return;
    play({
      id: mix.id,
      title: mix.title,
      dj: mix.dj?.stageName || 'DJ',
      duration: mix.duration || 0,
      cover: getMediaUrl(mix.coverImage) || '',
      genre: mix.genre || '',
      audioUrl: getMediaUrl(mix.audioUrl) || '',
    });
  };

  const handlePlayAll = () => {
    if (!playlist?.items || playlist.items.length === 0) return;
    const firstMix = playlist.items[0]?.mix;
    if (firstMix) {
      handlePlayTrack(firstMix);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-gold animate-spin" />
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 text-center">
        <h2 className="text-xl font-bold text-white mb-2">Playlist Not Found</h2>
        <Link to="/playlists">
          <Button variant="outline" className="border-gold text-gold mt-4">
            Back to Playlists
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black-base text-text-primary py-8 px-4 sm:px-6 max-w-6xl mx-auto space-y-6">
      {/* Back Button */}
      <Link to="/playlists" className="inline-flex items-center gap-1.5 text-xs text-gold hover:underline">
        <ArrowLeft className="w-4 h-4" /> Back to Official Playlists
      </Link>

      {/* Playlist Hero */}
      <div className="bg-black-elevated p-6 sm:p-8 rounded-2xl border border-dark-gray flex flex-col md:flex-row items-start md:items-center gap-6">
        <div className="w-32 h-32 sm:w-44 sm:h-44 rounded-xl bg-black-surface border border-dark-gray overflow-hidden shrink-0">
          {playlist.coverImage ? (
            <img src={getMediaUrl(playlist.coverImage)} alt={playlist.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gold/20 via-black-surface to-black-elevated">
              <ListMusic className="w-12 h-12 text-gold mb-1" />
              <span className="text-[10px] text-gold font-bold uppercase tracking-wider">Official Deck Salone</span>
            </div>
          )}
        </div>

        <div className="space-y-3 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-gold text-black font-bold text-xs">OFFICIAL PLAYLIST</Badge>
            <ModeratorBadge showText size="sm" />
            {playlist.isFeatured && (
              <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px]">
                ⭐ Featured Selection
              </Badge>
            )}
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-white">{playlist.title}</h1>

          {playlist.description && (
            <p className="text-sm text-text-secondary">{playlist.description}</p>
          )}

          <div className="flex items-center gap-4 text-xs text-text-muted pt-2">
            <span>{playlist.items?.length || 0} Tracks</span>
            <span>• Curated by Deck Salone Team</span>
          </div>

          {playlist.items?.length > 0 && (
            <Button
              onClick={handlePlayAll}
              className="bg-gold text-black hover:bg-gold-light font-bold text-xs px-6 py-2.5 rounded-full gap-2 mt-2"
            >
              <Play className="w-4 h-4 fill-black" />
              Play All Mixes
            </Button>
          )}
        </div>
      </div>

      {/* Tracklist */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-white px-1">Tracklist ({playlist.items?.length || 0})</h2>

        {playlist.items?.length === 0 ? (
          <Card className="bg-black-elevated border-dark-gray p-8 text-center text-xs text-text-muted">
            No mixes added to this playlist yet.
          </Card>
        ) : (
          playlist.items?.map((item: any, index: number) => {
            const mix = item.mix;
            if (!mix) return null;
            return (
              <Card
                key={item.id}
                onClick={() => handlePlayTrack(mix)}
                className="bg-black-elevated border-dark-gray hover:border-gold/50 p-3.5 sm:p-4 rounded-xl flex items-center justify-between gap-4 cursor-pointer transition group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <span className="text-xs font-bold text-text-muted group-hover:text-gold w-5 text-center shrink-0">
                    #{index + 1}
                  </span>

                  <img
                    src={getMediaUrl(mix.coverImage) || '/placeholder-mix.jpg'}
                    alt={mix.title}
                    className="w-12 h-12 rounded-lg object-cover border border-dark-gray shrink-0"
                  />

                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-white group-hover:text-gold transition truncate">
                      {mix.title}
                    </h3>
                    <p className="text-xs text-text-secondary truncate">
                      by <span className="text-white font-medium">{mix.dj?.stageName}</span> •{' '}
                      <span className="text-gold">{mix.genre}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-text-muted hidden sm:inline">▶ {mix.plays || 0}</span>
                  <div className="w-8 h-8 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center text-gold group-hover:bg-gold group-hover:text-black transition">
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

export default OfficialPlaylistDetail;
