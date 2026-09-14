import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  ListMusic,
  Users,
  History,
  Play,
  Shuffle,
  Disc3,
  Compass,
  ExternalLink,
  MapPin,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { usePlayerStore, type MixTrack } from '@/stores/playerStore';
import { useLikedMixes, useFollowing, useUserActivity } from '@/hooks/useUserDashboard';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import SEOHead from '@/components/SEOHead';
import MixFeedRow from '@/components/feed/MixFeedRow';
import { getAvatarImageUrl, cn } from '@/lib/utils';
import { formatCompactNumber } from '@/lib/formatting';
import { formatDate } from '@/lib/dateTime';
import PlaylistCoverArt from '@/components/playlists/PlaylistCoverArt';

type LibraryTab = 'likes' | 'playlists' | 'following' | 'activity';

const TABS: { id: LibraryTab; label: string; icon: React.ElementType }[] = [
  { id: 'likes', label: 'Liked Mixes', icon: Heart },
  { id: 'playlists', label: 'Playlists', icon: ListMusic },
  { id: 'following', label: 'Following DJs', icon: Users },
  { id: 'activity', label: 'Recent Activity', icon: History },
];

function toMixTrack(mix: any): MixTrack {
  return {
    id: mix.id,
    title: mix.title,
    dj: mix.dj?.stageName || mix.djName || 'DJ',
    djId: mix.dj?.id || mix.djId,
    djAvatar: mix.dj?.avatar,
    djUsername: mix.dj?.user?.username || mix.dj?.username,
    duration: mix.duration || 0,
    cover: mix.coverImage || mix.dj?.avatar || '/mix-placeholder.jpg',
    genre: mix.genre || 'Mix',
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

export default function Library() {
  const [activeTab, setActiveTab] = useState<LibraryTab>('likes');
  const { isAuthenticated } = useAuthStore();
  const { play, setQueue } = usePlayerStore();

  const { data: likedMixes = [], isLoading: likesLoading } = useLikedMixes();
  const { data: following = [], isLoading: followingLoading } = useFollowing();
  const { data: activity = [], isLoading: activityLoading } = useUserActivity();

  const { data: officialPlaylists = [] } = useQuery({
    queryKey: ['officialPlaylists'],
    queryFn: async () => {
      const res = await api.get('/official-playlists');
      return (res.data?.data || []) as any[];
    },
  });

  const { data: smartPlaylists = [] } = useQuery({
    queryKey: ['smartPlaylists'],
    queryFn: async () => {
      const res = await api.get('/smart-playlists');
      return (res.data?.data || []) as any[];
    },
  });

  const allPlaylists = [...officialPlaylists, ...smartPlaylists];

  const handlePlayAllLikes = () => {
    if (likedMixes.length === 0) return;
    const tracks = likedMixes.map(toMixTrack);
    setQueue(tracks);
    play(tracks[0]);
  };

  const handleShuffleLikes = () => {
    if (likedMixes.length === 0) return;
    const shuffled = [...likedMixes].sort(() => Math.random() - 0.5);
    const tracks = shuffled.map(toMixTrack);
    setQueue(tracks);
    play(tracks[0]);
  };

  return (
    <div className="min-h-[100dvh] bg-bg-page pb-32">
      <SEOHead
        title="My Library — Deck Salone"
        description="Your personal music collection on Deck Salone. Access your liked mixtapes, followed DJs, saved playlists, and streaming activity."
      />

      {/* ════════ Page Header Banner (Standard Unified Layout) ════════ */}
      <section className="border-b border-dark-gray bg-gradient-to-b from-[#161614] via-[#10100f] to-black pt-6 pb-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl sm:text-4xl font-black uppercase tracking-tight text-white">
              MY LIBRARY
            </h1>
          </div>

          {isAuthenticated && activeTab === 'likes' && likedMixes.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={handlePlayAllLikes}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold text-black text-xs font-bold uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all shadow-md shadow-gold/20"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Play All
              </button>
              <button
                onClick={handleShuffleLikes}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-xs font-bold text-white transition-all"
              >
                <Shuffle className="w-3.5 h-3.5 text-gold" />
                Shuffle
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ════════ Sticky Filter / Tab Bar ════════ */}
      <section className="sticky top-14 sm:top-16 lg:top-20 z-30 bg-black/95 backdrop-blur-xl border-b border-dark-gray py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-hide py-1">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              let badgeCount: number | null = null;
              if (tab.id === 'likes' && isAuthenticated) badgeCount = likedMixes.length;
              if (tab.id === 'following' && isAuthenticated) badgeCount = following.length;
              if (tab.id === 'playlists') badgeCount = allPlaylists.length;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'btn-press-subtle px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0 flex items-center gap-2',
                    isActive
                      ? 'bg-gold text-black shadow-md shadow-gold/20 font-black'
                      : 'bg-white/[0.04] text-text-secondary hover:text-white hover:bg-white/[0.08] border border-white/[0.06]'
                  )}
                >
                  <Icon className={cn('w-3.5 h-3.5', isActive ? 'text-black' : 'text-text-muted')} />
                  <span>{tab.label}</span>
                  {typeof badgeCount === 'number' && badgeCount > 0 && (
                    <span
                      className={cn(
                        'px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold',
                        isActive ? 'bg-black/20 text-black' : 'bg-white/10 text-text-muted'
                      )}
                    >
                      {badgeCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ════════ Tab Content ════════ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Unauthenticated Prompt (if not signed in and viewing personalized tabs) */}
        {!isAuthenticated && activeTab !== 'playlists' && (
          <div className="mb-8 rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-[#1c1a12] via-[#12110c] to-[#0A0A0A] border border-gold/30 shadow-2xl text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <span className="text-[10px] uppercase font-black tracking-widest text-gold bg-gold/10 px-2.5 py-1 rounded-full border border-gold/30">
                Sync Your Music
              </span>
              <h2 className="font-display text-2xl sm:text-3xl font-bold uppercase text-white tracking-tight">
                Sign in to save your favorite mixes
              </h2>
              <p className="text-sm text-text-secondary leading-relaxed">
                Keep your liked mixtapes, followed DJs, custom track queues, and listening history saved across all your devices.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Link
                to="/login"
                className="px-6 py-2.5 rounded-full bg-gold text-black font-bold text-xs uppercase tracking-wider hover:brightness-110 transition-all shadow-lg shadow-gold/20"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white font-bold text-xs uppercase tracking-wider transition-all"
              >
                Create Account
              </Link>
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* ─── TAB 1: Liked Mixes ─── */}
          {activeTab === 'likes' && (
            <motion.div
              key="likes"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              {likesLoading ? (
                <div className="space-y-3">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-16 rounded-2xl bg-white/[0.03] animate-pulse" />
                  ))}
                </div>
              ) : likedMixes.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between pb-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
                    <span>{likedMixes.length} Liked {likedMixes.length === 1 ? 'Mix' : 'Mixes'}</span>
                  </div>
                  {likedMixes.map((mix, idx) => (
                    <MixFeedRow key={mix.id || idx} mix={mix} index={idx} />
                  ))}
                </div>
              ) : (
                <div className="rounded-3xl border border-white/[0.06] bg-[#0c0c0b] p-12 text-center space-y-4 max-w-md mx-auto">
                  <div className="w-14 h-14 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center text-gold mx-auto">
                    <Heart className="w-7 h-7" />
                  </div>
                  <h3 className="font-display text-lg font-bold uppercase tracking-wide text-white">
                    No Liked Mixes Yet
                  </h3>
                  <p className="text-xs text-text-muted leading-relaxed">
                    Tap the heart icon on any mix across Deck Salone to add it to your personal library.
                  </p>
                  <Link
                    to="/mixes"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gold text-black text-xs font-bold uppercase tracking-wider hover:brightness-110 transition-all shadow-md"
                  >
                    <Disc3 className="w-4 h-4" />
                    Explore Mixes
                  </Link>
                </div>
              )}
            </motion.div>
          )}

          {/* ─── TAB 2: Playlists ─── */}
          {activeTab === 'playlists' && (
            <motion.div
              key="playlists"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                  Playlists ({allPlaylists.length})
                </span>
                <Link
                  to="/playlists"
                  className="text-xs font-bold uppercase tracking-wider text-gold hover:underline flex items-center gap-1"
                >
                  View All <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {allPlaylists.map((pl) => {
                  const trackCount = pl._count?.items || pl.items?.length || pl.trackCount || 0;
                  return (
                    <Link
                      key={pl.id}
                      to={`/playlist/${pl.slug || pl.id}`}
                      className="group block rounded-2xl bg-[#121110] hover:bg-[#181816] border border-white/[0.08] hover:border-gold/40 p-3 transition-all shadow-lg flex flex-col justify-between"
                    >
                      <PlaylistCoverArt
                        playlist={pl}
                        aspect="square"
                        showPlayButton={false}
                        className="mb-3"
                      />
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <h4 className="font-display text-sm font-bold uppercase text-white truncate group-hover:text-gold transition-colors">
                            {pl.title}
                          </h4>
                          {pl.description && (
                            <p className="text-[11px] text-text-secondary line-clamp-2 mt-0.5 leading-relaxed">
                              {pl.description}
                            </p>
                          )}
                        </div>
                        <div className="mt-2.5 pt-2 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-semibold text-text-muted">
                          <span className="text-gold font-bold">{trackCount} {trackCount === 1 ? 'Mix' : 'Mixes'}</span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ─── TAB 3: Following DJs ─── */}
          {activeTab === 'following' && (
            <motion.div
              key="following"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              {followingLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-28 rounded-2xl bg-white/[0.03] animate-pulse" />
                  ))}
                </div>
              ) : following.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {following.map((dj) => (
                    <div
                      key={dj.id}
                      className="group p-4 rounded-2xl bg-black-elevated border border-white/5 hover:border-gold/30 transition-all flex items-center gap-4"
                    >
                      <Link to={`/dj/${dj.id}`} className="shrink-0">
                        <img
                          src={getAvatarImageUrl(dj.avatar)}
                          alt={dj.stageName}
                          className="w-16 h-16 rounded-2xl object-cover border border-white/10 group-hover:scale-105 transition-transform"
                        />
                      </Link>
                      <div className="flex-1 min-w-0">
                        <Link to={`/dj/${dj.id}`}>
                          <h4 className="font-display text-base font-bold uppercase tracking-tight text-white hover:text-gold transition-colors truncate">
                            {dj.stageName}
                          </h4>
                        </Link>
                        {dj.city && (
                          <p className="text-xs text-text-muted flex items-center gap-1 mt-0.5 truncate">
                            <MapPin className="w-3 h-3 text-gold" />
                            {dj.city}
                          </p>
                        )}
                        <p className="text-xs text-text-muted mt-1 font-medium">
                          {formatCompactNumber(dj.followerCount || 0)} followers
                        </p>
                      </div>
                      <Link
                        to={`/dj/${dj.id}`}
                        className="p-2 rounded-xl bg-white/[0.06] hover:bg-gold hover:text-black text-text-muted transition-colors shrink-0"
                        title="View DJ Profile"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-3xl border border-white/[0.06] bg-[#0c0c0b] p-12 text-center space-y-4 max-w-md mx-auto">
                  <div className="w-14 h-14 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center text-gold mx-auto">
                    <Users className="w-7 h-7" />
                  </div>
                  <h3 className="font-display text-lg font-bold uppercase tracking-wide text-white">
                    Not Following Any DJs
                  </h3>
                  <p className="text-xs text-text-muted leading-relaxed">
                    Follow Sierra Leone's top DJs to get instant updates whenever they drop new mixes or host events.
                  </p>
                  <Link
                    to="/discover"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gold text-black text-xs font-bold uppercase tracking-wider hover:brightness-110 transition-all shadow-md"
                  >
                    <Compass className="w-4 h-4" />
                    Discover DJs
                  </Link>
                </div>
              )}
            </motion.div>
          )}

          {/* ─── TAB 4: Recent Activity ─── */}
          {activeTab === 'activity' && (
            <motion.div
              key="activity"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              {activityLoading ? (
                <div className="space-y-3">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-16 rounded-2xl bg-white/[0.03] animate-pulse" />
                  ))}
                </div>
              ) : activity.length > 0 ? (
                <div className="space-y-2 max-w-3xl">
                  {activity.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="p-3.5 rounded-2xl bg-black-elevated border border-white/5 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {item.thumbnail ? (
                          <img
                            src={getAvatarImageUrl(item.thumbnail)}
                            alt=""
                            className="w-10 h-10 rounded-xl object-cover border border-white/10 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center text-gold shrink-0">
                            <History className="w-4 h-4" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate">
                            {item.title}
                          </p>
                          {item.subtitle && (
                            <p className="text-xs text-text-muted truncate">
                              {item.subtitle}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-text-muted shrink-0">
                        {formatDate(item.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-3xl border border-white/[0.06] bg-[#0c0c0b] p-12 text-center space-y-4 max-w-md mx-auto">
                  <div className="w-14 h-14 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center text-gold mx-auto">
                    <History className="w-7 h-7" />
                  </div>
                  <h3 className="font-display text-lg font-bold uppercase tracking-wide text-white">
                    No Recent Activity
                  </h3>
                  <p className="text-xs text-text-muted leading-relaxed">
                    Your interactions, likes, and ratings will appear here as you browse and stream on Deck Salone.
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
