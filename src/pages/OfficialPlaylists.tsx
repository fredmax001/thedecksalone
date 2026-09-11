import { useMemo, useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ListMusic, Play, Music, Compass, X, Sparkles, ChevronDown } from 'lucide-react';
import api, { getMediaUrl } from '@/lib/api';
import { usePlayerStore, type MixTrack } from '@/stores/playerStore';
import { useForYouPlaylists } from '@/hooks/useRecommendations';
import { motion } from 'framer-motion';
import SEOHead from '@/components/SEOHead';
import { FeedSectionSkeleton } from '@/components/ui/page-skeletons';
import { useDelayedLoading } from '@/hooks/use-delayed-loading';
import { GENRES } from '@/constants/genres';
import { MOODS, ENERGIES, MOOD_LABELS, ENERGY_LABELS } from '@/constants/moods';

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
  const cover = getMediaUrl(playlist.coverImage) || '/images/genres/salone-mix.jpg';
  const isSmart = Boolean(playlist.isSmart);

  const ruleChips = useMemo(() => {
    if (!isSmart) return [];
    const chips: string[] = [];
    (playlist.moods || []).forEach((m: string) => chips.push(MOOD_LABELS[m] || m));
    (playlist.energies || []).forEach((e: string) => chips.push(`${ENERGY_LABELS[e] || e} Energy`));
    return chips.slice(0, 2);
  }, [isSmart, playlist.moods, playlist.energies]);

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
        <div className="rounded-2xl bg-[#121110] hover:bg-[#181816] border border-white/[0.08] hover:border-gold/40 p-3 transition-all shadow-lg hover:shadow-gold/10 flex flex-col h-full">
          {/* Square Artwork */}
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

            {/* Badges */}
            <div className="absolute top-2 left-2 flex flex-col items-start gap-1 z-10">
              {playlist.badge && (
                <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-gold text-black shadow-md">
                  {playlist.badge}
                </span>
              )}
              {isSmart && !playlist.badge && (
                <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-gold text-black shadow-md">
                  Smart
                </span>
              )}
              {playlist.isFeatured && (
                <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/70 text-gold border border-gold/40 shadow-md">
                  ★ Featured
                </span>
              )}
            </div>

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
              {ruleChips.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {ruleChips.map((c) => (
                    <span
                      key={c}
                      className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-white/[0.06] border border-white/10 text-text-secondary"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              )}
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
              <span className="truncate text-text-muted/80">
                {isSmart ? 'Auto-curated' : 'Deck Salone Official'}
              </span>
            </div>
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
    <div className="min-h-screen bg-[#080808] text-text-primary py-8 sm:py-12 px-4 sm:px-6 max-w-7xl mx-auto space-y-8 pb-32">
      <SEOHead
        title="Playlists — Deck Salone"
        description="Stream curated DJ mixtapes and smart mood, genre & energy playlists from Sierra Leone."
      />

      {/* ─── HEADER (minimal editorial) ─── */}
      <header className="space-y-3">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gold flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5" />
          Playlists
        </p>
        <h1 className="font-display text-3xl sm:text-5xl font-black uppercase tracking-tight text-white leading-none">
          Find your <span className="text-gradient-gold">vibe</span>
        </h1>
        <p className="text-sm text-text-secondary max-w-xl leading-relaxed">
          Hand-curated collections and smart playlists built from mood, genre and energy — filter below or press play.
        </p>
      </header>

      {/* ─── FILTER BAR ─── */}
      <div className="sticky top-16 z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-[#080808]/90 backdrop-blur-md border-b border-white/[0.06]">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-text-muted flex items-center gap-2 mr-1">
            <span className="w-1.5 h-1.5 rounded-full bg-gold" />
            Filter
          </span>
          <FilterDropdown label="Mood" options={[...MOODS]} value={selectedMood} onChange={setSelectedMood} />
          <FilterDropdown label="Energy" options={[...ENERGIES]} value={selectedEnergy} onChange={setSelectedEnergy} />
          <FilterDropdown label="Genre" options={genreOptions} value={selectedGenre} onChange={setSelectedGenre} />

          <span className="text-[11px] font-mono text-text-muted/70 ml-auto">
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
    </div>
  );
}

export default OfficialPlaylists;
