import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ListMusic, Play, Loader2, Music } from 'lucide-react';
import api, { getMediaUrl } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ModeratorBadge } from '@/components/ModeratorBadge';

export function OfficialPlaylists() {
  const [loading, setLoading] = useState(true);
  const [playlists, setPlaylists] = useState<any[]>([]);

  useEffect(() => {
    fetchPlaylists();
  }, []);

  const fetchPlaylists = async () => {
    try {
      setLoading(true);
      const res = await api.get('/official-playlists');
      if (res.data.success) {
        setPlaylists(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load official playlists', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black-base text-text-primary py-8 px-4 sm:px-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-gold/15 via-black-surface to-black-elevated p-6 sm:p-8 rounded-2xl border border-gold/30 space-y-3">
        <div className="flex items-center gap-2">
          <Badge className="bg-gold text-black font-bold text-xs">OFFICIAL SELECTION</Badge>
          <ModeratorBadge showText size="sm" />
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
          Deck Salone Official Playlists
        </h1>
        <p className="text-sm text-text-secondary max-w-2xl">
          Curated by official Deck Salone Moderators featuring Sierra Leone's top DJ mixes, rising talent, and genre anthems.
        </p>
      </div>

      {/* Playlist Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-gold animate-spin" />
        </div>
      ) : playlists.length === 0 ? (
        <Card className="bg-black-elevated border-dark-gray p-12 text-center">
          <ListMusic className="w-12 h-12 text-text-muted mx-auto mb-3" />
          <p className="text-sm font-semibold text-white">No official playlists published yet</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {playlists.map((pl) => (
            <Link key={pl.id} to={`/playlist/${pl.slug}`}>
              <Card className="bg-black-elevated border-dark-gray hover:border-gold/60 p-4 transition-all duration-300 group flex flex-col justify-between h-full">
                <div className="space-y-3">
                  {/* Playlist Cover Art */}
                  <div className="relative aspect-video rounded-xl bg-black-surface border border-dark-gray overflow-hidden">
                    {pl.coverImage ? (
                      <img
                        src={getMediaUrl(pl.coverImage)}
                        alt={pl.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gold/20 via-black-surface to-black-elevated">
                        <ListMusic className="w-10 h-10 text-gold mb-1" />
                        <span className="text-[10px] text-gold font-bold tracking-widest uppercase">
                          Deck Salone Official
                        </span>
                      </div>
                    )}

                    {pl.isFeatured && (
                      <Badge className="absolute top-2 left-2 bg-gold text-black font-bold text-[10px]">
                        ⭐ FEATURED
                      </Badge>
                    )}

                    <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-md text-gold p-2 rounded-full opacity-0 group-hover:opacity-100 transition duration-300">
                      <Play className="w-4 h-4 fill-gold" />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-gold transition">
                      {pl.title}
                    </h3>
                    <p className="text-xs text-text-secondary line-clamp-2 mt-1">
                      {pl.description || 'Official Deck Salone curated playlist.'}
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-dark-gray/60 flex items-center justify-between text-xs text-text-muted mt-4">
                  <span className="flex items-center gap-1">
                    <Music className="w-3.5 h-3.5 text-gold" />
                    {pl._count?.items || pl.items?.length || 0} Mixes
                  </span>
                  <span className="text-gold font-semibold text-[11px] flex items-center gap-1">
                    Official Playlist →
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default OfficialPlaylists;
