import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  CalendarCheck,
  MessageSquare,
  Users,
  Bell,
  User,
  Settings,
  ArrowRight,
  Crown,
  Disc,
  Loader2,
  Heart,
  Star,
  Ticket,
  Music2,
  Headphones,
  Flame,
  Sparkles,
  MapPin,
  Clock,
  Calendar,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import api, { getMediaUrl } from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { ProfileCompletionCard } from '@/components/ProfileCompletionCard';
import SectionHeader from '@/components/home/SectionHeader';
import MixCarousel from '@/components/home/MixCarousel';
import DjCarousel from '@/components/home/DjCarousel';
import PlaylistCard from '@/components/home/PlaylistCard';
import type { HomeDJ, HomeMix, HomePlaylist } from '@/components/home/types';

import {
  useUserBookings,
  useFollowing,
  useUserActivity,
  type ActivityItem,
} from '@/hooks/useUserDashboard';
import { useRecommendedDjs, useForYouPlaylists } from '@/hooks/useRecommendations';
import { useTrendingMixes } from '@/hooks/useMixes';
import { useEvents } from '@/hooks/useEvents';
import { useUnreadNotificationCount } from '@/hooks/useNotifications';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';

const quickLinks = [
  { icon: CalendarCheck, label: 'My Bookings', path: '/user/bookings', desc: 'Event bookings' },
  { icon: MessageSquare, label: 'Messages', path: '/user/messages', desc: 'Chat with DJs' },
  { icon: Ticket, label: 'My Tickets', path: '/user/tickets', desc: 'Event tickets' },
  { icon: User, label: 'Profile', path: '/user/profile', desc: 'Edit profile' },
  { icon: Settings, label: 'Settings', path: '/user/settings', desc: 'Preferences' },
];

interface Conversation {
  userId: string;
  name: string;
  avatar?: string | null;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

function useUnreadMessagesCount() {
  return useQuery({
    queryKey: ['conversations-unread-count'],
    queryFn: async () => {
      const res = await api.get('/messages/conversations');
      const conversations: Conversation[] = res.data?.data || [];
      return conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
    },
    refetchInterval: 30000,
  });
}

export default function UserDashboard() {
  const { user, fetchMe } = useAuthStore();
  const navigate = useNavigate();
  const displayName = user?.name || user?.username || user?.email?.split('@')[0] || 'Fan';
  const userTier = user?.subscriptionTier?.toLowerCase() || 'free';
  const isPro = userTier === 'pro' || userTier === 'legend';
  const isLegend = userTier === 'legend';
  const isFan = user?.role === 'USER';

  const [showDjDialog, setShowDjDialog] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

  // Data hooks
  const { data: bookings, isLoading: bookingsLoading } = useUserBookings();
  const { data: following, isLoading: followingLoading } = useFollowing();
  const { data: unreadNotifications, isLoading: notificationsLoading } = useUnreadNotificationCount();
  const { data: unreadMessages, isLoading: messagesLoading } = useUnreadMessagesCount();
  const { data: recommended, isLoading: recommendedLoading } = useRecommendedDjs(10);
  const { data: trendingMixes, isLoading: trendingLoading } = useTrendingMixes(10);
  const { data: forYouPlaylists, isLoading: playlistsLoading } = useForYouPlaylists();
  const { data: eventsData, isLoading: eventsLoading } = useEvents({ status: 'UPCOMING', limit: 6 });
  const { data: activity, isLoading: activityLoading } = useUserActivity();

  useEffect(() => {
    if (user?.role === 'MODERATOR') {
      navigate('/moderator', { replace: true });
    }
  }, [user, navigate]);

  const handleSwitchToDj = async () => {
    setIsSwitching(true);
    try {
      const res = await api.post('/djs/switch-to-dj');
      if (res.data.success) {
        toast.success('You are now a DJ on Deck Salone!');
        await fetchMe();
        navigate('/dashboard', { replace: true });
      } else {
        toast.error(res.data.error || 'Could not switch to DJ account');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Could not switch to DJ account');
    } finally {
      setIsSwitching(false);
      setShowDjDialog(false);
    }
  };

  // Map data to shared component shapes
  const recommendedDjs: HomeDJ[] = (recommended || []).map((dj) => ({
    id: dj.id,
    username: dj.user?.username,
    stageName: dj.stageName,
    avatar: dj.avatar,
    city: dj.city,
    genres: dj.genres,
    verified: dj.verified,
    subscriptionTier: dj.subscriptionTier,
    totalStreams: dj.totalPlays,
  }));

  const followingDjs: HomeDJ[] = (following || []).map((dj) => ({
    id: dj.id,
    stageName: dj.stageName,
    avatar: dj.avatar,
    city: dj.city,
    genres: dj.genre,
  }));

  const playlists: HomePlaylist[] = (forYouPlaylists || []).map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    description: p.description,
    coverImage: p.coverImage,
    _count: { items: p.trackCount },
    items: p.items,
  }));

  const events = eventsData?.data || [];
  const recentActivity = (activity || []).slice(0, 5);

  return (
    <div className="space-y-10 pb-12">
      {/* Hero Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-2xl bg-[#101010] border border-white/5 p-5 sm:p-6 relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#f4e059]/50 to-transparent" />
        <div className="flex items-center gap-4">
          <Avatar className="w-14 h-14 border-2 border-gold/30 shadow-[0_0_20px_rgba(244,224,89,0.15)]">
            <AvatarImage src={getMediaUrl(user?.avatar) || undefined} alt={displayName} />
            <AvatarFallback className="text-lg">{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-text-primary font-display">
                Welcome back, {displayName}!
              </h1>
              {isLegend ? (
                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded bg-gradient-to-r from-amber-400 to-[#f4e059] text-black shadow">
                  PRO+ VIP
                </span>
              ) : isPro ? (
                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded bg-[#f4e059]/20 text-[#f4e059] border border-[#f4e059]/30">
                  PRO USER
                </span>
              ) : (
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-white/10 text-text-muted">
                  FREE FAN
                </span>
              )}
            </div>
            <p className="mt-0.5 text-sm text-text-muted">
              Here's what's happening in your Deck Salone space today.
            </p>
          </div>
        </div>

        {isFan ? (
          <Link
            to="/discover"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#f4e059] hover:brightness-110 text-black text-xs font-bold uppercase tracking-wider shadow-md shadow-[#f4e059]/20 transition-all shrink-0"
          >
            <Heart className="w-3.5 h-3.5" />
            Discover DJs
          </Link>
        ) : (
          <Link
            to="/pricing"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#f4e059] hover:brightness-110 text-black text-xs font-bold uppercase tracking-wider shadow-md shadow-[#f4e059]/20 transition-all shrink-0"
          >
            <Crown className="w-3.5 h-3.5" />
            {isLegend ? 'VIP Perks Active' : isPro ? 'Upgrade to Pro+' : 'Upgrade to Pro (SLE 100)'}
          </Link>
        )}
      </motion.div>

      {/* Real Stats Row */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4"
      >
        <StatCard
          label="Bookings"
          value={bookings?.length ?? 0}
          icon={CalendarCheck}
          href="/user/bookings"
          isLoading={bookingsLoading}
        />
        <StatCard
          label="Following"
          value={following?.length ?? 0}
          icon={Users}
          href="/user/following"
          isLoading={followingLoading}
        />
        <StatCard
          label="Notifications"
          value={unreadNotifications ?? 0}
          icon={Bell}
          href="/user/notifications"
          isLoading={notificationsLoading}
          pulse={!!unreadNotifications}
        />
        <StatCard
          label="Messages"
          value={unreadMessages ?? 0}
          icon={MessageSquare}
          href="/user/messages"
          isLoading={messagesLoading}
          pulse={!!unreadMessages}
        />
      </motion.div>

      {/* Switch to DJ Account Prompt */}
      {isFan && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="rounded-2xl bg-gradient-to-br from-[#f4e059]/10 to-[#f4e059]/5 border border-[#f4e059]/30 p-5 sm:p-6 relative overflow-hidden"
        >
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#f4e059]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start md:items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#f4e059]/20 flex items-center justify-center shrink-0">
                <Disc className="w-6 h-6 text-[#f4e059]" />
              </div>
              <div>
                <h2 className="text-base font-bold text-text-primary font-display">Are you a DJ?</h2>
                <p className="text-sm text-text-muted mt-0.5 max-w-lg">
                  Switch to a DJ account to upload mixes, list your services, receive bookings, and grow your audience on Deck Salone.
                </p>
              </div>
            </div>
            <Button
              onClick={() => setShowDjDialog(true)}
              className="bg-[#f4e059] hover:bg-[#f4e059]/90 text-black font-extrabold text-xs uppercase tracking-wider px-6 py-2.5 rounded-xl transition-all shrink-0"
            >
              Switch to DJ Account
            </Button>
          </div>
        </motion.div>
      )}

      {/* Profile Completion */}
      <ProfileCompletionCard />

      {/* Discover Section */}
      <section className="space-y-8">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-gold" />
          <h2 className="font-display font-black text-lg uppercase tracking-tight text-white">Discover</h2>
        </div>

        {recommendedLoading || recommendedDjs.length > 0 ? (
          <DjCarousel
            title="Recommended DJs"
            subtitle="Picked for your taste"
            djs={recommendedDjs}
            action={{ label: 'Explore DJs', to: '/discover' }}
          />
        ) : null}

        {trendingLoading || (trendingMixes || []).length > 0 ? (
          <MixCarousel
            title="Trending Mixes"
            subtitle="Hottest DJ sets right now"
            mixes={(trendingMixes || []) as HomeMix[]}
            action={{ label: 'See all', to: '/mixes' }}
          />
        ) : null}

        {(playlistsLoading || playlists.length > 0) && (
          <div className="space-y-1">
            <SectionHeader
              title="Made For You"
              subtitle="Curated playlists based on your favorites"
              action={{ label: 'Browse playlists', to: '/playlists' }}
              icon={<Music2 className="w-4 h-4" />}
            />
            {playlistsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-48 rounded-2xl bg-white/5" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {playlists.slice(0, 4).map((playlist, i) => (
                  <PlaylistCard key={playlist.id} playlist={playlist} index={i} />
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* My Stuff Section */}
      <section className="space-y-8">
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-gold" />
          <h2 className="font-display font-black text-lg uppercase tracking-tight text-white">My Stuff</h2>
        </div>

        {followingLoading || followingDjs.length > 0 ? (
          <DjCarousel
            title="DJs I Follow"
            subtitle="Stay tuned to your favorites"
            djs={followingDjs}
            action={{ label: 'See all', to: '/user/following' }}
          />
        ) : (
          !followingLoading && (
            <EmptyStateCard
              title="You aren't following any DJs yet"
              description="Follow DJs to see their latest mixes and events here."
              action={{ label: 'Discover DJs', to: '/discover' }}
              icon={Headphones}
            />
          )
        )}

        {activityLoading || recentActivity.length > 0 ? (
          <div className="space-y-1">
            <SectionHeader
              title="Liked Mixes"
              subtitle="Mixes you've recently loved"
              action={{ label: 'View activity', to: '/user/activity' }}
              icon={<Heart className="w-4 h-4" />}
            />
            {activityLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-2xl bg-white/5" />
                ))}
              </div>
            ) : (
              <MixCarousel
                title=""
                subtitle=""
                mixes={recentActivity
                  .filter((a) => a.type === 'LIKE_MIX')
                  .slice(0, 10)
                  .map((a) => ({
                    id: a.meta?.mixId || a.id,
                    title: a.title,
                    coverImage: a.thumbnail,
                    plays: a.meta?.plays || 0,
                    dj: { stageName: a.subtitle },
                  }))}
                action={{ label: '', to: '' }}
              />
            )}
          </div>
        ) : null}

        {(eventsLoading || events.length > 0) && (
          <div className="space-y-1">
            <SectionHeader
              title="Upcoming Events"
              subtitle="Don't miss the next vibe"
              action={{ label: 'Browse events', to: '/events' }}
              icon={<Calendar className="w-4 h-4" />}
            />
            {eventsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-40 rounded-2xl bg-white/5" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {events.slice(0, 6).map((event: any) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Activity & Updates */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-gold" />
          <h2 className="font-display font-black text-lg uppercase tracking-tight text-white">Activity & Updates</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2 bg-[#101010] border-white/5 overflow-hidden">
            <CardContent className="p-0">
              <div className="p-4 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Recent Activity</h3>
                <Link
                  to="/user/activity"
                  className="text-xs font-bold uppercase text-gold hover:text-gold-light transition-colors flex items-center gap-1"
                >
                  View all <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              {activityLoading ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 rounded-xl bg-white/5" />
                  ))}
                </div>
              ) : recentActivity.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-14 h-14 rounded-full bg-white/[0.03] flex items-center justify-center mx-auto mb-3 border border-white/5">
                    <Flame className="w-6 h-6 text-text-muted" />
                  </div>
                  <p className="text-sm font-semibold text-white">No recent activity</p>
                  <p className="text-xs text-text-muted mt-1">Like mixes, rate DJs, and vote in battles to see activity here.</p>
                  <Link
                    to="/discover"
                    className="inline-flex items-center gap-2 mt-4 px-5 py-2 bg-[#f4e059] text-black text-xs font-bold uppercase rounded-lg hover:bg-[#f4e059]/90 transition-colors"
                  >
                    Explore Deck Salone
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {recentActivity.map((item) => (
                    <ActivityRow key={item.id} item={item} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-[#101010] border-white/5 overflow-hidden">
            <CardContent className="p-0">
              <div className="p-4 border-b border-white/5">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Quick Actions</h3>
              </div>
              <div className="p-3 grid grid-cols-1 gap-2">
                {quickLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    className="group flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-[#f4e059]/30 hover:bg-[#f4e059]/5 transition-all"
                  >
                    <div className="w-9 h-9 rounded-lg bg-[#f4e059]/10 group-hover:bg-[#f4e059]/20 flex items-center justify-center transition-colors">
                      <link.icon className="w-4 h-4 text-[#f4e059]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-text-primary group-hover:text-gold transition-colors">
                        {link.label}
                      </p>
                      <p className="text-[11px] text-text-muted truncate">{link.desc}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-[#f4e059] transition-colors" />
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Switch to DJ Confirmation Dialog */}
      <Dialog open={showDjDialog} onOpenChange={setShowDjDialog}>
        <DialogContent className="bg-[#101010] border-white/10 text-text-primary sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-display font-bold text-text-primary">
              Switch to DJ Account?
            </DialogTitle>
            <DialogDescription className="text-text-muted text-sm">
              This will create a DJ profile for you and unlock DJ features such as mix uploads, bookings, and analytics. You can update your DJ profile anytime.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDjDialog(false)}
              disabled={isSwitching}
              className="border-white/10 text-text-primary hover:bg-white/5 hover:text-text-primary"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSwitchToDj}
              disabled={isSwitching}
              className="bg-[#f4e059] hover:bg-[#f4e059]/90 text-black font-extrabold"
            >
              {isSwitching ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Switching...
                </>
              ) : (
                'Yes, Switch to DJ'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  href,
  isLoading,
  pulse,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  href: string;
  isLoading?: boolean;
  pulse?: boolean;
}) {
  return (
    <Link to={href} className="group block">
      <Card className="h-full bg-[#101010] border-white/5 hover:border-[#f4e059]/30 transition-all overflow-hidden relative">
        <CardContent className="p-4 sm:p-5 relative z-10">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#f4e059]/10 group-hover:bg-[#f4e059]/20 flex items-center justify-center transition-colors">
              <Icon className="w-5 h-5 text-[#f4e059]" />
            </div>
            {pulse && value > 0 && (
              <span className="w-2 h-2 rounded-full bg-gold animate-pulse" />
            )}
          </div>
          {isLoading ? (
            <Skeleton className="h-7 w-16 bg-white/5 mb-2" />
          ) : (
            <p className="font-mono text-2xl sm:text-3xl font-bold text-text-primary">{value}</p>
          )}
          <p className="text-[10px] uppercase tracking-wider text-text-muted font-semibold mt-1">{label}</p>
        </CardContent>
        <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-[#f4e059]/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </Card>
    </Link>
  );
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const icons: Record<string, React.ElementType> = {
    LIKE_MIX: Heart,
    RATE_DJ: Star,
    BATTLE_VOTE: Flame,
    SAVE_EVENT: Ticket,
    FOLLOW_DJ: Users,
    BOOKING_CREATED: CalendarCheck,
  };
  const Icon = icons[item.type] || Flame;
  const typeLabels: Record<string, string> = {
    LIKE_MIX: 'Liked a mix',
    RATE_DJ: 'Rated a DJ',
    BATTLE_VOTE: 'Voted in battle',
    SAVE_EVENT: 'Saved an event',
    FOLLOW_DJ: 'Followed a DJ',
    BOOKING_CREATED: 'Created a booking',
  };

  return (
    <div className="flex items-center gap-3 p-4 hover:bg-white/[0.02] transition-colors">
      <div className="w-10 h-10 rounded-xl bg-[#f4e059]/10 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-[#f4e059]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text-primary truncate">{item.title}</p>
        <p className="text-xs text-text-muted truncate">
          {typeLabels[item.type]} {item.subtitle ? `• ${item.subtitle}` : ''}
        </p>
      </div>
      <span className="text-[10px] text-text-muted shrink-0">
        {item.createdAt ? formatDistanceToNow(new Date(item.createdAt), { addSuffix: true }) : ''}
      </span>
    </div>
  );
}

function EventCard({ event }: { event: any }) {
  return (
    <Link to={`/events/${event.id}`} className="group block h-full">
      <Card className="h-full bg-[#101010] border-white/5 hover:border-[#f4e059]/30 overflow-hidden transition-all">
        <div className="relative h-36 overflow-hidden">
          <img
            src={event.coverImage || event.flyerImage || '/event-placeholder.jpg'}
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/event-placeholder.jpg';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#101010] via-[#101010]/40 to-transparent" />
        </div>
        <CardContent className="p-4">
          <h3 className="font-display font-bold text-sm text-white uppercase tracking-tight truncate group-hover:text-gold transition-colors">
            {event.title}
          </h3>
          <div className="mt-2 space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] text-text-secondary">
              <MapPin className="w-3 h-3 text-gold" />
              <span className="truncate">{event.city || event.venue || 'Sierra Leone'}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-text-secondary">
              <Clock className="w-3 h-3 text-gold" />
              <span>
                {event.date
                  ? new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  : 'Date TBA'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function EmptyStateCard({
  title,
  description,
  action,
  icon: Icon,
}: {
  title: string;
  description: string;
  action: { label: string; to: string };
  icon: React.ElementType;
}) {
  return (
    <Card className="bg-[#101010] border-white/5 p-6 text-center">
      <div className="w-14 h-14 rounded-full bg-white/[0.03] flex items-center justify-center mx-auto mb-3 border border-white/5">
        <Icon className="w-6 h-6 text-text-muted" />
      </div>
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <p className="text-xs text-text-muted mt-1 max-w-sm mx-auto">{description}</p>
      <Link
        to={action.to}
        className="inline-flex items-center gap-2 mt-4 px-5 py-2 bg-[#f4e059] text-black text-xs font-bold uppercase rounded-lg hover:bg-[#f4e059]/90 transition-colors"
      >
        {action.label}
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </Card>
  );
}
