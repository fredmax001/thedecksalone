import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Loader2,
  Music2,
  Headphones,
  Calendar,
  TrendingUp,
  Compass,
  Bell,
  CheckCheck,
  Filter,
  UserCheck,
  UserPlus,
  List,
  SlidersHorizontal,
} from 'lucide-react';
import { useDJs } from '@/hooks/useDJs';
import { useMixes, useTrendingMixes } from '@/hooks/useMixes';
import { useEvents } from '@/hooks/useEvents';
import { useRecommendedDjs, useForYouPlaylists, useFeedStats } from '@/hooks/useRecommendations';
import api, { getMediaUrl } from '@/lib/api';
import SEOHead from '@/components/SEOHead';
import { cn } from '@/lib/utils';
import SectionHeader from '@/components/home/SectionHeader';
import MixFeedRow from '@/components/feed/MixFeedRow';
import DjFeedRow from '@/components/feed/DjFeedRow';
import EventFeedRow from '@/components/feed/EventFeedRow';
import PlaylistFeedRow from '@/components/feed/PlaylistFeedRow';
import EventCarousel from '@/components/feed/EventCarousel';
import FeedHero from '@/components/feed/FeedHero';
import { ReachListenersModal } from '@/components/ReachListenersModal';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';
import type { FeedDJ, FeedMix, FeedEvent, FeedPlaylist } from '@/components/feed/types';

interface FeedTabConfig {
  key: FeedTab;
  label: string;
  icon: React.ElementType;
}

type FeedTab = 'for-you' | 'mixes' | 'playlists' | 'djs' | 'events' | 'trending';

const tabs: FeedTabConfig[] = [
  { key: 'for-you', label: 'For You', icon: Compass },
  { key: 'mixes', label: 'Mixes', icon: Music2 },
  { key: 'playlists', label: 'Playlists', icon: Music2 },
  { key: 'djs', label: 'DJs', icon: Headphones },
  { key: 'events', label: 'Events', icon: Calendar },
  { key: 'trending', label: 'Trending', icon: TrendingUp },
];

function EmptySection({ title, message }: { title: string; message: string }) {
  return (
    <div className="space-y-3">
      <h3 className="font-display text-sm font-bold uppercase tracking-wider text-gold">{title}</h3>
      <div className="rounded-2xl border border-dark-gray bg-black-surface p-8 text-center text-text-secondary text-sm">
        {message}
      </div>
    </div>
  );
}

export default function Feed() {
  const [activeTab, setActiveTab] = useState<FeedTab>('for-you');
  const [viewMode, setViewMode] = useState<'waveform' | 'compact'>('waveform');
  const [filterNewOnly, setFilterNewOnly] = useState(false);

  // Promote modal
  const [promoteMix, setPromoteMix] = useState<any | null>(null);

  const { isAuthenticated } = useAuthStore();
  const djsQuery = useDJs({ limit: 20 });
  const mixesQuery = useMixes({ limit: 20 });
  const eventsQuery = useEvents({ limit: 20 });
  const trendingQuery = useTrendingMixes(20);

  // Smart Recommendations & Feed Notification Stats
  const { data: recommendedDjs } = useRecommendedDjs(8);
  const { data: forYouPlaylists } = useForYouPlaylists();
  const { data: feedStats, markFeedAsSeen, isMarkingSeen } = useFeedStats();

  const [playlists, setPlaylists] = useState<FeedPlaylist[]>([]);
  const [playlistsLoading, setPlaylistsLoading] = useState(false);
  const [followedDjIds, setFollowedDjIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchPlaylists = async () => {
      try {
        setPlaylistsLoading(true);
        const res = await api.get('/official-playlists');
        if (res.data.success) {
          setPlaylists(res.data.data || []);
        }
      } catch (err) {
        console.error('Failed to load playlists in Feed', err);
      } finally {
        setPlaylistsLoading(false);
      }
    };
    fetchPlaylists();
  }, []);

  const djs = ((djsQuery.data as { data?: FeedDJ[] } | undefined)?.data) || [];
  const rawMixes = ((mixesQuery.data as { data?: FeedMix[] } | undefined)?.data) || [];
  const rawEvents = ((eventsQuery.data as { data?: FeedEvent[] } | undefined)?.data) || [];
  const trending = (trendingQuery.data as FeedMix[]) || [];

  const lastVisitDate = useMemo(() => {
    return feedStats?.since ? new Date(feedStats.since) : new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  }, [feedStats?.since]);

  // Filter for new drops if filterNewOnly is active
  const mixes = useMemo(() => {
    if (!filterNewOnly) return rawMixes;
    return rawMixes.filter((m) => m.createdAt && new Date(m.createdAt) > lastVisitDate);
  }, [rawMixes, filterNewOnly, lastVisitDate]);

  const events = useMemo(() => {
    if (!filterNewOnly) return rawEvents;
    return rawEvents.filter((e) => e.createdAt && new Date(e.createdAt) > lastVisitDate);
  }, [rawEvents, filterNewOnly, lastVisitDate]);

  const newDropsCount = feedStats?.totalNewDrops || 0;

  const handleFollowDj = async (djId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      toast.error('Please login to follow DJs and customize your feed.');
      return;
    }
    try {
      if (followedDjIds.has(djId)) {
        await api.delete(`/djs/${djId}/follow`);
        setFollowedDjIds((prev) => {
          const next = new Set(prev);
          next.delete(djId);
          return next;
        });
        toast.info('Unfollowed DJ');
      } else {
        await api.post(`/djs/${djId}/follow`);
        setFollowedDjIds((prev) => new Set(prev).add(djId));
        toast.success('Following DJ! Their newest mixes will appear in your feed.');
      }
    } catch {
      toast.error('Could not update follow status.');
    }
  };

  const handleMarkSeen = () => {
    markFeedAsSeen();
    setFilterNewOnly(false);
    toast.success('Feed notifications marked as seen!');
  };

  const isLoading =
    (activeTab === 'djs' && djsQuery.isLoading) ||
    (activeTab === 'mixes' && mixesQuery.isLoading) ||
    (activeTab === 'events' && eventsQuery.isLoading) ||
    (activeTab === 'trending' && trendingQuery.isLoading) ||
    (activeTab === 'playlists' && playlistsLoading) ||
    (activeTab === 'for-you' &&
      (djsQuery.isLoading || mixesQuery.isLoading || eventsQuery.isLoading || playlistsLoading));

  return (
    <div className="min-h-screen bg-black text-text-primary pb-32">
      <SEOHead
        title="Feed — Deck Salone"
        description="Explore the latest mixtape releases, personalized daily blends, recommended DJs, and live events across Sierra Leone."
      />

      {/* ═══════════════ FEED HERO & HEADER ═══════════════ */}
      <section className="border-b border-dark-gray bg-gradient-to-b from-[#161614] via-[#10100f] to-black pt-6 pb-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h1 className="font-display text-2xl sm:text-3xl font-black uppercase tracking-tight text-white">
              FEED
            </h1>
          </div>

          {/* ─── 🔔 NEW DROPS NOTIFICATION TRACKER BANNER ─── */}
          {newDropsCount > 0 && (
            <div className="p-4 sm:p-4.5 rounded-2xl bg-gradient-to-r from-gold/15 via-[#1a180e] to-gold/5 border border-gold/40 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gold/20 border border-gold/40 flex items-center justify-center text-gold shrink-0">
                  <Bell className="w-5 h-5 animate-bounce" />
                </div>
                <div>
                  <div className="font-display font-bold text-sm text-white uppercase tracking-wide flex items-center gap-2">
                    <span>New Drops Alert</span>
                    <span className="px-2 py-0.2 rounded-full bg-gold text-black text-[10px] font-black">
                      +{newDropsCount} NEW
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {feedStats?.newMixesCount || 0} fresh mixes and {feedStats?.newEventsCount || 0} upcoming events added since your last visit.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  onClick={() => setFilterNewOnly((prev) => !prev)}
                  className={cn(
                    'px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-all flex items-center gap-1.5',
                    filterNewOnly
                      ? 'bg-gold text-black shadow-md'
                      : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
                  )}
                >
                  <Filter className="w-3.5 h-3.5" />
                  {filterNewOnly ? 'Showing New Drops' : 'Filter New Only'}
                </button>
                <button
                  onClick={handleMarkSeen}
                  disabled={isMarkingSeen}
                  className="px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-xs font-semibold text-text-muted hover:text-white transition-all flex items-center gap-1.5"
                  title="Clear new notification counter"
                >
                  <CheckCheck className="w-3.5 h-3.5 text-gold" />
                  Mark Seen
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ═══════════════ TABS & VIEW SWITCHER ═══════════════ */}
      <section className="sticky top-16 lg:top-20 z-20 bg-black/95 backdrop-blur-xl border-b border-dark-gray py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-hide py-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={cn(
                      'px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5',
                      isActive
                        ? 'bg-gold text-black shadow-md shadow-gold/20 font-bold'
                        : 'bg-white/[0.04] text-text-secondary hover:text-white hover:bg-white/[0.08] border border-white/[0.06]'
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* View Mode Toggle (Waveform Cards vs Compact List) */}
            <div className="flex rounded-xl bg-white/[0.04] border border-white/[0.08] p-0.5 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('waveform')}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1',
                  viewMode === 'waveform' ? 'bg-gold text-black shadow' : 'text-text-muted hover:text-white'
                )}
                title="Mix Hub Waveform View"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Waveform</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('compact')}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1',
                  viewMode === 'compact' ? 'bg-gold text-black shadow' : 'text-text-muted hover:text-white'
                )}
                title="Compact List View"
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Compact</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ MAIN CONTENT BODY ═══════════════ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-gold animate-spin" />
          </div>
        ) : activeTab === 'for-you' ? (
          /* ─── TAB: FOR YOU / SMART PERSONALIZED FEED ─── */
          <div className="space-y-12">
            <FeedHero mix={mixes[0]} event={events[0]} dj={djs[0]} />

            {/* 🎧 RECOMMENDED DJS TO FOLLOW (BASED ON USER TASTE) */}
            {recommendedDjs && recommendedDjs.length > 0 && (
              <div className="space-y-4">
                <SectionHeader
                  title="Recommended DJs to Follow"
                  action={{ label: 'Explore all DJs', to: '/discover' }}
                  icon={<Headphones className="w-4 h-4 text-gold" />}
                />
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {recommendedDjs.slice(0, 4).map((dj) => {
                    const isFollowed = followedDjIds.has(dj.id);
                    return (
                      <div
                        key={dj.id}
                        className="rounded-2xl bg-[#121110] border border-white/[0.08] hover:border-gold/40 p-4 transition-all flex flex-col items-center text-center shadow-lg group"
                      >
                        <Link to={`/dj/${dj.slug || dj.id}`} className="relative mb-3">
                          <img
                            src={getMediaUrl(dj.avatar) || '/default-avatar.jpg'}
                            alt={dj.stageName}
                            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-2 border-gold/40 group-hover:scale-105 transition-transform"
                          />
                          {dj.verified && (
                            <span className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-gold text-black flex items-center justify-center text-xs font-bold">
                              ✓
                            </span>
                          )}
                        </Link>

                        <Link
                          to={`/dj/${dj.slug || dj.id}`}
                          className="font-display text-sm font-bold text-white uppercase tracking-tight hover:text-gold transition-colors truncate max-w-full"
                        >
                          {dj.stageName}
                        </Link>

                        <p className="text-[10px] text-text-secondary mt-0.5 line-clamp-1">
                          {dj.genres?.slice(0, 2).join(' • ') || 'Afrobeats • Salone Mix'}
                        </p>

                        {dj.recommendationReason && (
                          <div className="mt-2 text-[9px] font-mono px-2 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/20 line-clamp-1">
                            {dj.recommendationReason}
                          </div>
                        )}

                        <button
                          onClick={(e) => handleFollowDj(dj.id, e)}
                          className={cn(
                            'mt-3 w-full py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1',
                            isFollowed
                              ? 'bg-white/10 text-text-secondary hover:bg-red-500/20 hover:text-red-400'
                              : 'bg-gold hover:brightness-110 text-black shadow-md shadow-gold/20'
                          )}
                        >
                          {isFollowed ? (
                            <>
                              <UserCheck className="w-3.5 h-3.5" />
                              Following
                            </>
                          ) : (
                            <>
                              <UserPlus className="w-3.5 h-3.5" />
                              Follow
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 🎵 MADE FOR YOU PLAYLISTS */}
            {forYouPlaylists && forYouPlaylists.length > 0 && (
              <div className="space-y-4">
                <SectionHeader
                  title="Made For You Playlists"
                  action={{ label: 'View all playlists', to: '/playlists' }}
                  icon={<Compass className="w-4 h-4 text-gold" />}
                />
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {forYouPlaylists.map((pl) => (
                    <Link
                      key={pl.id}
                      to={`/mixes?search=${encodeURIComponent(pl.title)}`}
                      className="group rounded-2xl bg-[#121110] border border-white/[0.08] hover:border-gold/40 p-3.5 transition-all flex flex-col"
                    >
                      <div className="relative aspect-square rounded-xl overflow-hidden bg-black mb-2.5">
                        <img
                          src={getMediaUrl(pl.coverImage)}
                          alt={pl.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                        />
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-gold text-black text-[9px] font-black uppercase">
                          {pl.badge}
                        </span>
                      </div>
                      <h4 className="font-display text-xs sm:text-sm font-bold text-white uppercase truncate group-hover:text-gold transition-colors">
                        {pl.title}
                      </h4>
                      <p className="text-[11px] text-text-secondary line-clamp-2 mt-1 leading-relaxed flex-1">
                        {pl.description}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* 🎧 FRESH MIX RELEASES (WAVEFORM STYLE) */}
            {mixes.length > 0 ? (
              <div className="space-y-4">
                <SectionHeader
                  title="Fresh Mix Releases"
                  action={{ label: 'See all mixes', to: '/mixes' }}
                  icon={<Music2 className="w-4 h-4 text-gold" />}
                />
                <div className="space-y-3">
                  {mixes.slice(0, 6).map((mix, i) => (
                    <MixFeedRow
                      key={mix.id}
                      mix={mix}
                      index={i}
                      rank={i + 1}
                      variant={viewMode}
                      onOpenPromote={(m) => setPromoteMix(m)}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <EmptySection title="Fresh Mix Releases" message="No mixes available yet." />
            )}

            {/* 🎟️ UPCOMING EVENTS */}
            <EventCarousel
              title="Upcoming Events & Nightlife"
              events={events.slice(0, 8)}
              action={{ label: 'See all events', to: '/events' }}
            />

            {/* 🔥 TRENDING CHARTS */}
            {trending.length > 0 && (
              <div className="space-y-4">
                <SectionHeader
                  title="Trending Now"
                  action={{ label: 'Full charts', to: '/rankings' }}
                  icon={<TrendingUp className="w-4 h-4 text-gold" />}
                />
                <div className="space-y-2.5">
                  {trending.slice(0, 5).map((mix, i) => (
                    <MixFeedRow
                      key={mix.id}
                      mix={mix}
                      index={i}
                      rank={i + 1}
                      variant={viewMode}
                      onOpenPromote={(m) => setPromoteMix(m)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : activeTab === 'mixes' ? (
          /* ─── TAB: MIXES (FULL WAVEFORM LIST) ─── */
          <div className="space-y-3.5">
            {mixes.length > 0 ? (
              mixes.map((mix, i) => (
                <MixFeedRow
                  key={mix.id}
                  mix={mix}
                  index={i}
                  rank={i + 1}
                  variant={viewMode}
                  onOpenPromote={(m) => setPromoteMix(m)}
                />
              ))
            ) : (
              <div className="rounded-2xl border border-dark-gray bg-black-surface p-8 text-center text-text-secondary text-sm">
                No mixes available.
              </div>
            )}
          </div>
        ) : activeTab === 'trending' ? (
          /* ─── TAB: TRENDING ─── */
          <div className="space-y-3.5">
            {trending.length > 0 ? (
              trending.map((mix, i) => (
                <MixFeedRow
                  key={mix.id}
                  mix={mix}
                  index={i}
                  rank={i + 1}
                  variant={viewMode}
                  onOpenPromote={(m) => setPromoteMix(m)}
                />
              ))
            ) : (
              <div className="rounded-2xl border border-dark-gray bg-black-surface p-8 text-center text-text-secondary text-sm">
                No trending mixes found.
              </div>
            )}
          </div>
        ) : activeTab === 'djs' ? (
          /* ─── TAB: DJS ─── */
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
            {djs.length > 0 ? (
              djs.map((dj, i) => <DjFeedRow key={dj.id} dj={dj} index={i} />)
            ) : (
              <div className="col-span-full rounded-2xl border border-dark-gray bg-black-surface p-8 text-center text-text-secondary text-sm">
                No DJs available yet.
              </div>
            )}
          </div>
        ) : activeTab === 'playlists' ? (
          /* ─── TAB: PLAYLISTS ─── */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {playlists.length > 0 ? (
              playlists.map((pl, i) => <PlaylistFeedRow key={pl.id} playlist={pl} index={i} />)
            ) : (
              <div className="col-span-full rounded-2xl border border-dark-gray bg-black-surface p-8 text-center text-text-secondary text-sm">
                No playlists available yet.
              </div>
            )}
          </div>
        ) : (
          /* ─── TAB: EVENTS ─── */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {events.length > 0 ? (
              events.map((ev, i) => <EventFeedRow key={ev.id} event={ev} index={i} />)
            ) : (
              <div className="col-span-full rounded-2xl border border-dark-gray bg-black-surface p-8 text-center text-text-secondary text-sm">
                No events available yet.
              </div>
            )}
          </div>
        )}
      </section>

      {/* ─── PROMOTE MODAL ─── */}
      {promoteMix && (
        <ReachListenersModal
          isOpen={!!promoteMix}
          onClose={() => setPromoteMix(null)}
          mix={promoteMix}
          onPromoted={() => {
            setPromoteMix(null);
            mixesQuery.refetch();
          }}
        />
      )}
    </div>
  );
}
