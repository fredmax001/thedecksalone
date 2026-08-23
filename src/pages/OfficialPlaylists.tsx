import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ListMusic,
  Play,
  Loader2,
  Music,
  Flame,
  Radio,
  Compass,
  PartyPopper,
  Disc3,
} from 'lucide-react';
import api, { getMediaUrl } from '@/lib/api';
import { usePlayerStore, type MixTrack } from '@/stores/playerStore';
import { useForYouPlaylists } from '@/hooks/useRecommendations';
import { motion } from 'framer-motion';
import SEOHead from '@/components/SEOHead';

interface PlaylistRowSectionProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  playlists: any[];
  badge?: string;
  isForYou?: boolean;
}

function CompactPlaylistCard({ playlist, index = 0 }: { playlist: any; index?: number }) {
  const { play, setQueue } = usePlayerStore();

  const trackCount = playlist._count?.items || playlist.items?.length || playlist.trackCount || 0;
  const cover = getMediaUrl(playlist.coverImage) || '/images/genres/salone-mix.jpg';

  const handleQuickPlay = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // If playlist already has items embedded (like for-you smart playlists)
    if (playlist.items && playlist.items.length > 0 && playlist.items[0].id) {
      const tracks: MixTrack[] = playlist.items.map((item: any) => {
        const m = item.mix || item;
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
      });
      if (tracks.length > 0) {
        setQueue(tracks);
        play(tracks[0]);
      }
      return;
    }

    try {
      const res = await api.get(`/official-playlists/${playlist.slug || playlist.id}`);
      if (res.data.success && res.data.data?.items?.length > 0) {
        const tracks: MixTrack[] = res.data.data.items
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
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
      className="group"
    >
      <Link
        to={playlist.slug?.startsWith('for-you') ? `/mixes?search=${encodeURIComponent(playlist.title)}` : `/playlist/${playlist.slug || playlist.id}`}
        className="block"
      >
        <div className="rounded-2xl bg-[#121110] hover:bg-[#181816] border border-white/[0.08] hover:border-gold/40 p-3 transition-all shadow-lg hover:shadow-gold/10 flex flex-col h-full">
          {/* Compact Square Artwork */}
          <div className="relative aspect-square rounded-xl overflow-hidden bg-black shrink-0 shadow-md">
            <img
              src={cover}
              alt={playlist.title}
              className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
              loading="lazy"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/mix-placeholder.jpg';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />

            {/* Badge */}
            {playlist.badge && (
              <span className="absolute top-2 left-2 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-gold text-black shadow-md">
                {playlist.badge}
              </span>
            )}
            {playlist.isFeatured && !playlist.badge && (
              <span className="absolute top-2 left-2 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-gold text-black shadow-md">
                ★ Featured
              </span>
            )}

            {/* Play Button Overlay */}
            <button
              type="button"
              onClick={handleQuickPlay}
              className="absolute bottom-2 right-2 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gold text-black flex items-center justify-center shadow-xl opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all hover:scale-110 active:scale-95 z-10"
              aria-label={`Play ${playlist.title}`}
            >
              <Play className="w-4 h-4 fill-black ml-0.5" />
            </button>
          </div>

          {/* Title & Info */}
          <div className="mt-2.5 min-w-0 flex-1 flex flex-col justify-between">
            <div>
              <h3 className="font-display text-xs sm:text-sm font-bold text-white uppercase tracking-tight truncate group-hover:text-gold transition-colors">
                {playlist.title}
              </h3>
              {playlist.description && (
                <p className="text-[11px] text-text-secondary line-clamp-2 mt-1 leading-relaxed">
                  {playlist.description}
                </p>
              )}
            </div>

            <div className="mt-2.5 pt-2 border-t border-white/[0.06] flex items-center justify-between text-[10px] font-mono text-text-muted">
              <span className="flex items-center gap-1 text-gold">
                <Music className="w-3 h-3" />
                {trackCount} {trackCount === 1 ? 'Mix' : 'Mixes'}
              </span>
              <span className="truncate text-text-muted/80">Deck Salone Official</span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function PlaylistRowSection({
  title,
  subtitle,
  icon,
  playlists,
}: PlaylistRowSectionProps) {
  if (!playlists || playlists.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <div className="text-gold">{icon}</div>
            <h2 className="font-display text-lg sm:text-xl font-bold uppercase tracking-tight text-white">
              {title}
            </h2>
          </div>
          <p className="text-xs text-text-secondary">{subtitle}</p>
        </div>
      </div>

      {/* Responsive Grid with reduced card sizes (2 cols on mobile, 3 on tablet, 4 on desktop, 5 on wide) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {playlists.map((pl, i) => (
          <CompactPlaylistCard key={pl.id || i} playlist={pl} index={i} />
        ))}
      </div>
    </section>
  );
}

export function OfficialPlaylists() {
  const [loading, setLoading] = useState(true);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const { data: forYouPlaylists } = useForYouPlaylists();

  useEffect(() => {
    fetchPlaylists();
  }, []);

  const fetchPlaylists = async () => {
    try {
      setLoading(true);
      const res = await api.get('/official-playlists');
      if (res.data.success) {
        setPlaylists(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load playlists', err);
    } finally {
      setLoading(false);
    }
  };

  // Group Official Playlists into Curated Shelves
  const trendingPlaylists = useMemo(() => {
    return playlists.filter((p) => p.isFeatured || (p.title || '').toLowerCase().includes('top') || (p.title || '').toLowerCase().includes('trending'));
  }, [playlists]);

  const saloneHeritagePlaylists = useMemo(() => {
    return playlists.filter((p) =>
      (p.title || '').toLowerCase().includes('salone') ||
      (p.description || '').toLowerCase().includes('salone') ||
      (p.title || '').toLowerCase().includes('koloqua') ||
      (p.title || '').toLowerCase().includes('freetown') ||
      (p.title || '').toLowerCase().includes('bubu')
    );
  }, [playlists]);

  const genrePlaylists = useMemo(() => {
    return playlists.filter((p) =>
      (p.title || '').toLowerCase().includes('afro') ||
      (p.title || '').toLowerCase().includes('amapiano') ||
      (p.title || '').toLowerCase().includes('reggae') ||
      (p.title || '').toLowerCase().includes('dancehall') ||
      (p.title || '').toLowerCase().includes('hip hop')
    );
  }, [playlists]);

  const partyPlaylists = useMemo(() => {
    return playlists.filter((p) =>
      (p.title || '').toLowerCase().includes('party') ||
      (p.title || '').toLowerCase().includes('club') ||
      (p.title || '').toLowerCase().includes('beach') ||
      (p.title || '').toLowerCase().includes('weekend')
    );
  }, [playlists]);

  const featuredPlaylist = playlists.find((p) => p.isFeatured) || playlists[0];

  return (
    <div className="min-h-screen bg-[#080808] text-text-primary py-8 sm:py-12 px-4 sm:px-6 max-w-7xl mx-auto space-y-12 pb-32">
      <SEOHead
        title="Official Playlists — Deck Salone"
        description="Stream curated DJ mixtapes, chart-topping sounds, cultural heritage, and personalized listening sets across Sierra Leone."
      />

      {/* ─── 🌟 EDITORIAL SPOTLIGHT HERO ─── */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#1c1c1c] via-[#121212] to-[#0A0A0A] border border-white/[0.08] p-6 sm:p-10 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gold/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8 space-y-4">
            <h1 className="font-display text-3xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tight text-white leading-none">
              Curated <span className="text-gradient-gold">Playlists</span>
            </h1>
          </div>

          {featuredPlaylist && (
            <div className="lg:col-span-4">
              <Link to={`/playlist/${featuredPlaylist.slug || featuredPlaylist.id}`} className="block group">
                <div className="relative rounded-2xl overflow-hidden aspect-video bg-black border border-white/[0.1] group-hover:border-gold/50 shadow-xl transition-all">
                  {featuredPlaylist.coverImage ? (
                    <img
                      src={getMediaUrl(featuredPlaylist.coverImage)}
                      alt={featuredPlaylist.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gold/20 via-[#111] to-black">
                      <ListMusic className="w-10 h-10 text-gold mb-1" />
                      <span className="text-[10px] text-gold font-bold uppercase tracking-widest">Featured</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent p-4 flex flex-col justify-between">
                    <span className="self-start text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-gold text-black">
                      ⭐ Highlight
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-white uppercase truncate group-hover:text-gold transition-colors">
                        {featuredPlaylist.title}
                      </h3>
                      <p className="text-[11px] text-text-muted mt-0.5 flex items-center gap-1 font-mono">
                        <Music className="w-3 h-3 text-gold" />
                        {featuredPlaylist._count?.items || featuredPlaylist.items?.length || 0} Tracks
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ─── 🎧 1. MADE FOR YOU (PERSONALIZED AI PLAYLISTS) ─── */}
      {forYouPlaylists && forYouPlaylists.length > 0 && (
        <PlaylistRowSection
          title="Made For You"
          subtitle="Dynamic daily blends tailored to what you listen to and favorite"
          icon={<Compass className="w-5 h-5 text-gold" />}
          playlists={forYouPlaylists}
          isForYou
        />
      )}

      {/* Loading state */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-gold animate-spin" />
        </div>
      ) : playlists.length === 0 ? (
        <div className="rounded-3xl border border-white/[0.06] bg-[#101010] p-12 text-center max-w-md mx-auto">
          <ListMusic className="w-12 h-12 text-text-muted mx-auto mb-3" />
          <h3 className="text-base font-bold text-white uppercase">No Playlists Available</h3>
          <p className="text-xs text-text-muted mt-1">Check back soon for new curated drops.</p>
        </div>
      ) : (
        <div className="space-y-12">
          {/* ─── 🔥 2. TRENDING & FEATURED COLLECTIONS ─── */}
          {trendingPlaylists.length > 0 && (
            <PlaylistRowSection
              title="Trending & Top Charts"
              subtitle="The most streamed weekly mixtape curations in Sierra Leone"
              icon={<Flame className="w-5 h-5 text-amber-400" />}
              playlists={trendingPlaylists}
            />
          )}

          {/* ─── 🌴 3. SIERRA LEONE HERITAGE & SOUNDS ─── */}
          {saloneHeritagePlaylists.length > 0 && (
            <PlaylistRowSection
              title="Salone Heritage & Culture"
              subtitle="Authentic Salone mixes, Koloqua anthems, and Palm Wine rhythms"
              icon={<Disc3 className="w-5 h-5 text-emerald-400" />}
              playlists={saloneHeritagePlaylists}
            />
          )}

          {/* ─── ⚡ 4. GENRE SPOTLIGHTS ─── */}
          {genrePlaylists.length > 0 && (
            <PlaylistRowSection
              title="Genre Spotlights"
              subtitle="Afrobeats, Amapiano 3-Step, Dancehall, and Reggae selections"
              icon={<Radio className="w-5 h-5 text-purple-400" />}
              playlists={genrePlaylists}
            />
          )}

          {/* ─── 🎉 5. CLUB & FESTIVAL STARTERS ─── */}
          {partyPlaylists.length > 0 && (
            <PlaylistRowSection
              title="Party & Club Starters"
              subtitle="High-octane mixes built for Lumley Beach nights and weekend sets"
              icon={<PartyPopper className="w-5 h-5 text-rose-400" />}
              playlists={partyPlaylists}
            />
          )}

          {/* ─── 📁 6. ALL CURATED PLAYLISTS ─── */}
          <PlaylistRowSection
            title="All Official Curations"
            subtitle={`Browse the complete library of ${playlists.length} curated playlist collections`}
            icon={<ListMusic className="w-5 h-5 text-gold" />}
            playlists={playlists}
          />
        </div>
      )}
    </div>
  );
}

export default OfficialPlaylists;
