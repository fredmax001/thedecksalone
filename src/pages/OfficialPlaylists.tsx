import { useMemo, useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ListMusic, Music, Compass, X, ChevronDown } from 'lucide-react';
import api, { getMediaUrl } from '@/lib/api';
import { usePlayerStore, type MixTrack } from '@/stores/playerStore';
import { useForYouPlaylists } from '@/hooks/useRecommendations';
import { motion } from 'framer-motion';
import SEOHead from '@/components/SEOHead';
import { FeedSectionSkeleton } from '@/components/ui/page-skeletons';
import { useDelayedLoading } from '@/hooks/use-delayed-loading';
import { GENRES } from '@/constants/genres';
import { MOODS, ENERGIES } from '@/constants/moods';
import PlaylistCoverArt from '@/components/playlists/PlaylistCoverArt';

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */

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

/** Facets used for filtering. Smart playlists expose their rule values;
    official (manual) playlists have no facets and only show unfiltered. */
function facetsOf(p: any) {
  return {
    moods: p.moods || [],
    energies: p.energies || [],
    genres: p.genres || [],
  };
}

/* ─────────────────────────────────────────────
   Card
───────────────────────────────────────────── */

function PlaylistCard({ playlist, index = 0 }: { playlist: any; index?: number }) {
  const { play, setQueue } = usePlayerStore();

  const trackCount = playlist._count?.items || playlist.items?.length || playlist.trackCount || 0;
  const isSmart = Boolean(playlist.isSmart);

  const handleQuickPlay = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Smart playlists embed only a preview — fetch the full generated tracklist.
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
          {/* Dynamic DJ Cover Artwork */}
          <PlaylistCoverArt
            playlist={playlist}
            aspect="square"
            onPlay={handleQuickPlay}
            showPlayButton={true}
          />

          {/* Simple Clean Title & Mix Count */}
          <div className="mt-2.5 px-0.5 flex items-center justify-between gap-2">
            <h3 className="font-display text-xs sm:text-sm font-bold text-white uppercase tracking-tight truncate group-hover:text-gold transition-colors">
              {playlist.title}
            </h3>
            <span className="text-[11px] font-bold text-text-muted shrink-0 flex items-center gap-1">
              <Music className="w-3 h-3 text-gold/80" />
              <span>{trackCount}</span>
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   Filter Dropdown
───────────────────────────────────────────── */

function FilterDropdown({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  const active = Boolean(value);
  const activeLabel = options.find((o) => o.value === value)?.label;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide px-3.5 py-2 rounded-full border transition-all whitespace-nowrap ${
          active
            ? 'bg-gold text-black border-gold shadow-md'
            : 'bg-white/[0.04] text-text-secondary border-white/10 hover:border-gold/40 hover:text-white'
        }`}
      >
        <span className="text-text-muted/70 normal-case tracking-normal font-semibold">{label}</span>
        <span className={active ? 'truncate max-w-28' : ''}>{active ? activeLabel : 'All'}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 z-30 min-w-44 max-h-72 overflow-y-auto rounded-xl bg-[#161514] border border-white/10 shadow-2xl p-1.5 space-y-0.5">
          <button
            type="button"
            onClick={() => {
              onChange('');
              setOpen(false);
            }}
            className={`w-full text-left text-[11px] font-bold uppercase tracking-wide px-3 py-2 rounded-lg transition ${
              !active ? 'bg-gold/15 text-gold' : 'text-text-secondary hover:bg-white/[0.06] hover:text-white'
            }`}
          >
            All
          </button>
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className={`w-full text-left text-[11px] font-bold uppercase tracking-wide px-3 py-2 rounded-lg transition ${
                value === o.value
                  ? 'bg-gold/15 text-gold'
                  : 'text-text-secondary hover:bg-white/[0.06] hover:text-white'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Page
───────────────────────────────────────────── */

export function OfficialPlaylists() {
  const { data: official = [], isPending: officialPending } = useQuery({
    queryKey: ['officialPlaylists'],
    queryFn: async () => {
      const res = await api.get('/official-playlists');
      return (res.data?.data || []) as any[];
    },
  });

  const { data: smart = [], isPending: smartPending } = useQuery({
    queryKey: ['smartPlaylists'],
    queryFn: async () => {
      const res = await api.get('/smart-playlists');
      return (res.data?.data || []) as any[];
    },
  });

  const showSkeleton = useDelayedLoading(officialPending || smartPending);
  const { data: forYouPlaylists } = useForYouPlaylists();

  const [selectedMood, setSelectedMood] = useState('');
  const [selectedEnergy, setSelectedEnergy] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');

  const hasFilters = Boolean(selectedMood || selectedEnergy || selectedGenre);

  const allPlaylists = useMemo(() => {
    // Featured first, then smart (fresh auto-curations), then the rest by recency
    const merged = [...official, ...smart];
    return merged.sort((a, b) => {
      if (Boolean(a.isFeatured) !== Boolean(b.isFeatured)) return a.isFeatured ? -1 : 1;
      if (Boolean(a.isSmart) !== Boolean(b.isSmart)) return a.isSmart ? -1 : 1;
      return 0;
    });
  }, [official, smart]);

  const filtered = useMemo(() => {
    if (!hasFilters) return allPlaylists;
    return allPlaylists.filter((p) => {
      const f = facetsOf(p);
      if (selectedMood && !f.moods.includes(selectedMood)) return false;
      if (selectedEnergy && !f.energies.includes(selectedEnergy)) return false;
      if (selectedGenre && !f.genres.includes(selectedGenre)) return false;
      return true;
    });
  }, [allPlaylists, hasFilters, selectedMood, selectedEnergy, selectedGenre]);

  const clearFilters = () => {
    setSelectedMood('');
    setSelectedEnergy('');
    setSelectedGenre('');
  };

  const genreOptions = GENRES.map((g) => ({ value: g, label: g }));

  return (
    <div className="min-h-[100dvh] bg-bg-page pb-32">
      <SEOHead
        title="Playlists — Deck Salone"
        description="Stream curated DJ mixtapes and smart mood, genre & energy playlists from Sierra Leone."
      />

      {/* ════════ Page Header Banner ════════ */}
      <section className="border-b border-dark-gray bg-gradient-to-b from-[#161614] via-[#10100f] to-black pt-6 pb-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <h1 className="font-display text-3xl sm:text-4xl font-black uppercase tracking-tight text-white">
            PLAYLISTS
          </h1>
        </div>
      </section>

      {/* ════════ Sticky Filter Bar ════════ */}
      <section className="sticky top-14 sm:top-16 lg:top-20 z-30 bg-black/95 backdrop-blur-xl border-b border-dark-gray py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <FilterDropdown label="Mood" options={[...MOODS]} value={selectedMood} onChange={setSelectedMood} />
            <FilterDropdown label="Energy" options={[...ENERGIES]} value={selectedEnergy} onChange={setSelectedEnergy} />
            <FilterDropdown label="Genre" options={genreOptions} value={selectedGenre} onChange={setSelectedGenre} />

            <span className="text-[11px] font-semibold text-text-muted/70 ml-auto">
              {filtered.length} {filtered.length === 1 ? 'playlist' : 'playlists'}
            </span>
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-gold hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Clear
              </button>
            )}
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">

      {/* ─── UNIFIED GRID ─── */}
      {officialPending || smartPending ? (
        showSkeleton ? <FeedSectionSkeleton /> : null
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-white/[0.06] bg-[#101010] p-12 text-center max-w-md mx-auto">
          <ListMusic className="w-12 h-12 text-text-muted mx-auto mb-3" />
          <h3 className="text-base font-bold text-white uppercase">
            {hasFilters ? 'No playlists match' : 'No Playlists Available'}
          </h3>
          <p className="text-xs text-text-muted mt-1">
            {hasFilters
              ? 'Try removing a filter or two — new smart playlists are added regularly.'
              : 'Check back soon for new curated drops.'}
          </p>
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-4 text-[11px] font-bold uppercase tracking-wide text-gold hover:text-white transition-colors"
            >
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4">
          {filtered.map((pl, i) => (
            <PlaylistCard key={pl.id || i} playlist={pl} index={i} />
          ))}
        </div>
      )}

      {/* ─── MADE FOR YOU ─── */}
      {forYouPlaylists && forYouPlaylists.length > 0 && !hasFilters && (
        <section className="space-y-4 pt-6 border-t border-white/[0.06]">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Compass className="w-5 h-5 text-gold" />
              <h2 className="font-display text-lg sm:text-xl font-bold uppercase tracking-tight text-white">
                Made For You
              </h2>
            </div>
            <p className="text-xs text-text-secondary">
              Dynamic daily blends tailored to what you listen to and favorite
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4">
            {forYouPlaylists.map((pl: any, i: number) => (
              <PlaylistCard key={pl.id || i} playlist={pl} index={i} />
            ))}
          </div>
        </section>
      )}
      </main>
    </div>
  );
}

export default OfficialPlaylists;
