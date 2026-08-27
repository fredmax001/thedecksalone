import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  X,
  Music2,
  Headphones,
  SlidersHorizontal,
  Loader2,
  Clock,
  Play,
  ChevronDown,
  Grid2X2,
  List,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useMixes, useMixGenres } from '@/hooks/useMixes';
import { useDJs, useDJGenres } from '@/hooks/useDJs';
import { cn } from '@/lib/utils';
import { getMediaUrl } from '@/lib/api';
import type { MixTrack } from '@/stores/playerStore';

type SearchTab = 'mixes' | 'djs';
type ViewMode = 'grid' | 'list';

const MIX_SORTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'plays', label: 'Most Played' },
  { value: 'likes', label: 'Most Liked' },
  { value: 'downloads', label: 'Most Downloaded' },
];

const DJ_SORTS = [
  { value: 'ranking', label: 'Top Ranked' },
  { value: 'newest', label: 'Newest' },
  { value: 'name', label: 'Name' },
];

function formatDuration(seconds: number): string {
  if (!seconds) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function toMixTrack(mix: any): MixTrack {
  return {
    id: mix.id,
    title: mix.title,
    dj: mix.dj?.stageName || 'Unknown DJ',
    djId: mix.dj?.id || mix.djId,
    djAvatar: mix.dj?.avatar,
    djUsername: mix.dj?.user?.username || mix.dj?.username,
    duration: mix.duration || 0,
    cover: mix.coverImage || mix.dj?.avatar || '/mix-placeholder.jpg',
    genre: mix.genre || mix.category || 'Mix',
    audioUrl: mix.audioUrl,
    audioSource: mix.audioSource,
    originalUrl: mix.originalUrl,
    plays: mix.plays || 0,
    downloads: mix.downloads || 0,
    likes: mix.likes || mix._count?.mixLikes || 0,
    reups: mix._count?.reups || 0,
    djTier: mix.dj?.subscriptionTier || 'free',
    isExclusive: mix.isExclusive || false,
    promotedUntil: mix.promotedUntil,
    createdAt: mix.createdAt,
  };
}

interface SearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SearchModal({ open, onOpenChange }: SearchModalProps) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<SearchTab>('mixes');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [genre, setGenre] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [showFilters, setShowFilters] = useState(false);

  const { data: mixGenres = [] } = useMixGenres();
  const { data: djGenres = [] } = useDJGenres();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const mixesQuery = useMixes({
    search: debouncedQuery || undefined,
    genre: tab === 'mixes' && genre !== 'all' ? genre : undefined,
    sortBy: tab === 'mixes' ? sortBy : undefined,
    page: 1,
    limit: 12,
  });

  const djsQuery = useDJs({
    search: debouncedQuery || undefined,
    genre: tab === 'djs' && genre !== 'all' ? genre : undefined,
    sortBy: tab === 'djs' ? sortBy : undefined,
    page: 1,
    limit: 12,
  });

  const genres = useMemo(() => {
    const raw = tab === 'mixes' ? mixGenres : djGenres;
    if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === 'string') {
      return raw as string[];
    }
    return (raw as { name?: string }[]).map((g) => g.name || '').filter(Boolean);
  }, [mixGenres, djGenres, tab]);

  const mixes = useMemo(
    () => ((mixesQuery.data as { data?: any[] } | undefined)?.data || []).map(toMixTrack),
    [mixesQuery.data]
  );

  const djs = useMemo(() => (djsQuery.data as { data?: any[] } | undefined)?.data || [], [djsQuery.data]);

  const isLoading = tab === 'mixes' ? mixesQuery.isLoading : djsQuery.isLoading;

  useEffect(() => {
    if (open) {
      setQuery('');
      setGenre('all');
      setSortBy('newest');
      setTab('mixes');
      setViewMode('list');
    }
  }, [open]);

  const handleMixClick = (mix: MixTrack) => {
    navigate(`/mix/${mix.id}`);
    onOpenChange(false);
  };

  const handleDjClick = (dj: any) => {
    const slug = dj.slug || dj.id;
    navigate(`/dj/${slug}`);
    onOpenChange(false);
  };

  const sortOptions = tab === 'mixes' ? MIX_SORTS : DJ_SORTS;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-[#0a0a0a] border-gold/20 p-0 overflow-hidden max-h-[85vh] flex flex-col">
        <DialogHeader className="sr-only">
          <DialogTitle>Search Deck Salone</DialogTitle>
        </DialogHeader>

        {/* Header */}
        <div className="p-4 border-b border-gold/10 bg-gradient-to-b from-[#161614] to-[#0a0a0a]">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gold" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={tab === 'mixes' ? 'Search mixes by title, DJ, or genre...' : 'Search DJs by name, city, or genre...'}
                className="w-full h-11 pl-10 pr-10 rounded-xl bg-black-surface border border-white/10 text-sm text-white placeholder:text-text-muted focus:outline-none focus:border-gold/50 transition-all"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <button
              onClick={() => setShowFilters((prev) => !prev)}
              className={cn(
                'h-11 px-3 rounded-xl border transition-all flex items-center gap-2 shrink-0',
                showFilters
                  ? 'bg-gold text-black border-gold'
                  : 'bg-white/[0.04] text-text-secondary border-white/10 hover:border-gold/40'
              )}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline text-xs font-bold uppercase">Filters</span>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={() => setTab('mixes')}
              className={cn(
                'flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold uppercase transition-all',
                tab === 'mixes'
                  ? 'bg-gold text-black'
                  : 'bg-white/[0.05] text-text-secondary hover:text-white border border-white/10'
              )}
            >
              <Music2 className="w-3.5 h-3.5" /> Mixes
            </button>
            <button
              onClick={() => setTab('djs')}
              className={cn(
                'flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold uppercase transition-all',
                tab === 'djs'
                  ? 'bg-gold text-black'
                  : 'bg-white/[0.05] text-text-secondary hover:text-white border border-white/10'
              )}
            >
              <Headphones className="w-3.5 h-3.5" /> DJs
            </button>

            <div className="ml-auto flex rounded-lg bg-white/[0.04] border border-white/[0.08] p-0.5 shrink-0">
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'p-1.5 rounded-md transition-all',
                  viewMode === 'list' ? 'bg-gold text-black' : 'text-text-muted hover:text-white'
                )}
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  'p-1.5 rounded-md transition-all',
                  viewMode === 'grid' ? 'bg-gold text-black' : 'text-text-muted hover:text-white'
                )}
              >
                <Grid2X2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Filters Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-3 mt-3 border-t border-white/10 flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <select
                      value={genre}
                      onChange={(e) => setGenre(e.target.value)}
                      className="w-full h-9 rounded-xl bg-black-surface border border-white/10 px-3 text-xs font-bold text-text-primary outline-none focus:border-gold/50 appearance-none"
                    >
                      <option value="all">All Genres</option>
                      {genres.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
                  </div>

                  <div className="relative flex-1">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="w-full h-9 rounded-xl bg-black-surface border border-white/10 px-3 text-xs font-bold text-text-primary outline-none focus:border-gold/50 appearance-none"
                    >
                      {sortOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-gold animate-spin" />
            </div>
          ) : tab === 'mixes' ? (
            <div className={viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 gap-4' : 'space-y-3'}>
              {mixes.length === 0 && (
                <div className="col-span-full text-center py-10 text-text-muted text-sm">
                  No mixes found. Try a different search.
                </div>
              )}
              {mixes.map((mix) =>
                viewMode === 'grid' ? (
                  <button
                    key={mix.id}
                    onClick={() => handleMixClick(mix)}
                    className="group text-left rounded-2xl bg-[#121110] border border-white/[0.08] hover:border-gold/40 overflow-hidden transition-all"
                  >
                    <div className="relative aspect-square">
                      <img src={mix.cover} alt={mix.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Play className="w-8 h-8 text-gold fill-gold" />
                      </div>
                    </div>
                    <div className="p-3">
                      <h4 className="font-display text-xs font-bold uppercase text-white truncate group-hover:text-gold">
                        {mix.title}
                      </h4>
                      <p className="text-[10px] text-text-secondary truncate">{mix.dj}</p>
                    </div>
                  </button>
                ) : (
                  <button
                    key={mix.id}
                    onClick={() => handleMixClick(mix)}
                    className="group flex items-center gap-3 w-full text-left rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-gold/40 p-2.5 transition-all"
                  >
                    <div className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0">
                      <img src={mix.cover} alt={mix.title} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Play className="w-5 h-5 text-gold fill-gold" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-display text-xs font-bold uppercase text-white truncate group-hover:text-gold">
                        {mix.title}
                      </h4>
                      <p className="text-[10px] text-text-secondary truncate">{mix.dj}</p>
                    </div>
                    <div className="text-right shrink-0 hidden sm:block">
                      <span className="text-[10px] font-bold text-gold px-2 py-0.5 rounded-full bg-gold/10 border border-gold/20">
                        {mix.genre}
                      </span>
                      <p className="text-[10px] text-text-muted mt-1 flex items-center justify-end gap-1">
                        <Clock className="w-3 h-3" /> {formatDuration(mix.duration)}
                      </p>
                    </div>
                  </button>
                )
              )}
            </div>
          ) : (
            <div className={viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 gap-4' : 'space-y-3'}>
              {djs.length === 0 && (
                <div className="col-span-full text-center py-10 text-text-muted text-sm">
                  No DJs found. Try a different search.
                </div>
              )}
              {djs.map((dj: any) =>
                viewMode === 'grid' ? (
                  <button
                    key={dj.id}
                    onClick={() => handleDjClick(dj)}
                    className="group text-left rounded-2xl bg-[#121110] border border-white/[0.08] hover:border-gold/40 p-4 transition-all"
                  >
                    <img
                      src={getMediaUrl(dj.avatar) || '/default-avatar.jpg'}
                      alt={dj.stageName}
                      className="w-16 h-16 rounded-full object-cover border-2 border-gold/30 mx-auto mb-3 group-hover:scale-105 transition-transform"
                    />
                    <h4 className="font-display text-xs font-bold uppercase text-white text-center truncate group-hover:text-gold">
                      {dj.stageName}
                    </h4>
                    <p className="text-[10px] text-text-secondary text-center truncate">{dj.city}</p>
                  </button>
                ) : (
                  <button
                    key={dj.id}
                    onClick={() => handleDjClick(dj)}
                    className="group flex items-center gap-3 w-full text-left rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-gold/40 p-2.5 transition-all"
                  >
                    <img
                      src={getMediaUrl(dj.avatar) || '/default-avatar.jpg'}
                      alt={dj.stageName}
                      className="w-12 h-12 rounded-full object-cover border border-gold/30 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-display text-xs font-bold uppercase text-white truncate group-hover:text-gold">
                        {dj.stageName}
                      </h4>
                      <p className="text-[10px] text-text-secondary truncate">
                        {dj.city || 'Sierra Leone'} {dj.genres?.length ? `• ${dj.genres.slice(0, 2).join(', ')}` : ''}
                      </p>
                    </div>
                    <ChevronDown className="w-4 h-4 text-text-muted rotate-[-90deg] shrink-0" />
                  </button>
                )
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gold/10 bg-black-surface flex items-center justify-between">
          <p className="text-[10px] text-text-muted">
            {tab === 'mixes' ? `${mixes.length} mix${mixes.length !== 1 ? 'es' : ''}` : `${djs.length} DJ${djs.length !== 1 ? 's' : ''}`}
          </p>
          <button
            onClick={() => {
              navigate(tab === 'mixes' ? '/mixes' : '/discover');
              onOpenChange(false);
            }}
            className="text-xs font-bold text-gold hover:underline"
          >
            See all {tab === 'mixes' ? 'mixes' : 'DJs'} →
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
