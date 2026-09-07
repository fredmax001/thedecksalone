import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users,
  MapPin,
  Calendar,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  ExternalLink,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { formatDate } from '@/lib/dateTime';
import api, { getMediaUrl } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { DashboardSkeleton } from '@/components/ui/page-skeletons';
import { useDelayedLoading } from '@/hooks/use-delayed-loading';

interface Follower {
  id: string;
  name: string;
  username: string;
  email: string;
  avatar: string | null;
  location: string | null;
  followedAt: string;
}

interface FollowersResponse {
  data: Follower[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

type LayoutMode = 'grid' | 'list';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
};

export default function Followers() {
  const { user: _user } = useAuthStore();
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<FollowersResponse['meta'] | null>(null);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(() => {
    try {
      const saved = localStorage.getItem('dj-followers-layout');
      if (saved === 'list' || saved === 'grid') return saved;
    } catch {
      // ignore
    }
    return 'list';
  });

  const ITEMS_PER_PAGE = 20;

  const handleSetLayout = (mode: LayoutMode) => {
    setLayoutMode(mode);
    try {
      localStorage.setItem('dj-followers-layout', mode);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadFollowers(page);
  }, [page]);

  const loadFollowers = async (pageNum: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/djs/me/followers?page=${pageNum}&limit=${ITEMS_PER_PAGE}`);
      if (res.data.success) {
        setFollowers(res.data.data);
        setMeta(res.data.meta);
      } else {
        setError(res.data.error || 'Failed to load followers');
      }
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Could not load followers'));
    } finally {
      setLoading(false);
    }
  };

  const showSkeleton = useDelayedLoading(loading && followers.length === 0);

  if (loading && followers.length === 0) {
    return showSkeleton ? <DashboardSkeleton /> : null;
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header & View Switcher */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-text-primary uppercase tracking-wide">
            Followers
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            {meta?.total ?? 0} fans & listeners are following you
          </p>
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black-surface border border-dark-gray w-fit">
          <button
            type="button"
            onClick={() => handleSetLayout('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              layoutMode === 'list'
                ? 'bg-gold text-black shadow'
                : 'text-text-secondary hover:text-white'
            }`}
            title="List View"
          >
            <List className="w-3.5 h-3.5" />
            <span>List</span>
          </button>
          <button
            type="button"
            onClick={() => handleSetLayout('grid')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              layoutMode === 'grid'
                ? 'bg-gold text-black shadow'
                : 'text-text-secondary hover:text-white'
            }`}
            title="Grid View"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Grid</span>
          </button>
        </div>
      </motion.div>

      {error && (
        <motion.div variants={itemVariants} className="p-4 rounded-xl bg-red/10 border border-red/30 text-red text-sm">
          {error}
        </motion.div>
      )}

      {/* Followers Content */}
      {followers.length === 0 && !loading ? (
        <motion.div variants={itemVariants} className="text-center py-20">
          <div className="w-20 h-20 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Users className="w-10 h-10 text-gold" />
          </div>
          <h3 className="text-xl font-display font-semibold text-text-primary uppercase mb-2">
            No Followers Yet
          </h3>
          <p className="text-text-secondary max-w-md mx-auto mb-6">
            When people follow you, they will appear here. Share your profile and mixes to grow your audience.
          </p>
          <Link
            to="/dashboard/profile"
            className="inline-flex items-center justify-center h-12 px-8 bg-gold-gradient text-black font-semibold text-sm uppercase tracking-wide rounded-full hover:scale-[1.02] transition-transform"
          >
            Promote Your Profile
          </Link>
        </motion.div>
      ) : (
        <>
          {layoutMode === 'grid' ? (
            <motion.div
              variants={itemVariants}
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4"
            >
              {followers.map((follower) => (
                <FollowerCard key={follower.id} follower={follower} />
              ))}
            </motion.div>
          ) : (
            <motion.div variants={itemVariants} className="space-y-2.5">
              {followers.map((follower) => (
                <FollowerListItem key={follower.id} follower={follower} />
              ))}
            </motion.div>
          )}

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <motion.div variants={itemVariants} className="flex items-center justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="border-dark-gray text-text-primary hover:bg-black-elevated"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-text-secondary">
                Page {page} of {meta.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                disabled={page >= meta.totalPages}
                className="border-dark-gray text-text-primary hover:bg-black-elevated"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </motion.div>
          )}
        </>
      )}
    </motion.div>
  );
}

function FollowerListItem({ follower }: { follower: Follower }) {
  const initials = follower.name ? follower.name.slice(0, 2).toUpperCase() : follower.username.slice(0, 2).toUpperCase();

  return (
    <motion.div variants={itemVariants}>
      <Card className="bg-black-surface border-dark-gray hover:border-gold/30 transition-all">
        <CardContent className="p-3.5 sm:p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <Avatar className="w-11 h-11 border border-gold/30 shrink-0">
                <AvatarImage src={getMediaUrl(follower.avatar) || undefined} alt={follower.name || follower.username} />
                <AvatarFallback className="bg-gold/20 text-gold text-xs font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Link
                    to={`/user/${follower.username}`}
                    className="text-sm font-bold text-white hover:text-gold transition-colors truncate"
                  >
                    {follower.name || follower.username}
                  </Link>
                  <span className="text-xs text-text-muted hidden sm:inline truncate">
                    @{follower.username}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted mt-0.5">
                  {follower.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-gold/70" />
                      {follower.location}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-text-muted" />
                    Followed {formatDate(follower.followedAt)}
                  </span>
                </div>
              </div>
            </div>

            <Link
              to={`/user/${follower.username}`}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-gold hover:text-black text-xs font-semibold text-text-secondary transition-colors shrink-0"
            >
              <span>Profile</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function FollowerCard({ follower }: { follower: Follower }) {
  const initials = follower.name ? follower.name.slice(0, 2).toUpperCase() : follower.username.slice(0, 2).toUpperCase();

  return (
    <motion.div variants={itemVariants}>
      <Card className="bg-black-surface border-dark-gray hover:border-gold/30 transition-colors group">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Avatar className="w-12 h-12 border-2 border-gold/30">
              <AvatarImage src={getMediaUrl(follower.avatar) || undefined} alt={follower.name} />
              <AvatarFallback className="bg-gold/20 text-gold text-sm font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <Link to={`/user/${follower.username}`}>
                <h3 className="text-sm font-semibold text-text-primary truncate group-hover:text-gold transition-colors">
                  {follower.name}
                </h3>
              </Link>
              {follower.location && (
                <div className="flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3 text-text-muted" />
                  <span className="text-xs text-text-muted truncate">{follower.location}</span>
                </div>
              )}
              <div className="flex items-center gap-1 mt-1">
                <Calendar className="w-3 h-3 text-text-muted" />
                <span className="text-xs text-text-muted">
                  Followed {formatDate(follower.followedAt)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
