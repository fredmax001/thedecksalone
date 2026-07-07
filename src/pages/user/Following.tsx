import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Loader2,
  Heart,
  Music,
  Calendar,
  MapPin,
  Users,
  Headphones,
  ExternalLink,
  Search,
  LayoutGrid,
  List,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useFollowing, type FollowingDJ } from '@/hooks/useUserDashboard';
import { useFollowDj } from '@/hooks/useDJs';

type LayoutMode = 'grid' | 'list';

const LAYOUT_STORAGE_KEY = 'following-layout';

function getSavedLayout(): LayoutMode {
  try {
    const saved = localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (saved === 'list' || saved === 'grid') return saved;
  } catch {
    // ignore localStorage errors
  }
  return 'grid';
}

function saveLayout(layout: LayoutMode) {
  try {
    localStorage.setItem(LAYOUT_STORAGE_KEY, layout);
  } catch {
    // ignore localStorage errors
  }
}

/* ─────────────────── Grid Card ─────────────────── */

function DJCard({ dj, index }: { dj: FollowingDJ; index: number }) {
  const navigate = useNavigate();
  const { unfollow } = useFollowDj(dj.id);
  const [isUnfollowed, setIsUnfollowed] = useState(false);

  if (isUnfollowed) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
    >
      <Card className="bg-black-elevated border-dark-gray hover:border-gold/20 transition-all group">
        <CardContent className="p-4">
          {/* DJ Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="w-12 h-12 border-2 border-gold/30">
                <AvatarImage src={dj.avatar} />
                <AvatarFallback className="bg-gold/10 text-gold">
                  <Music className="w-5 h-5" />
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-text-primary">{dj.stageName}</p>
                <div className="flex items-center gap-2 text-xs text-text-muted mt-0.5">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {dj.city || 'Unknown location'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {dj.followerCount.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-text-muted hover:text-gold"
                onClick={() => navigate(`/dj/${dj.id}`)}
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-text-muted hover:text-red"
                onClick={() => {
                  unfollow.mutate();
                  setIsUnfollowed(true);
                }}
              >
                <Heart className="w-4 h-4 fill-current" />
              </Button>
            </div>
          </div>

          {/* Genres */}
          {dj.genre && dj.genre.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {dj.genre.slice(0, 4).map((g) => (
                <Badge key={g} className="bg-black-surface text-text-secondary border-dark-gray text-[10px]">
                  {g}
                </Badge>
              ))}
            </div>
          )}

          {/* Latest Content */}
          <div className="mt-4 space-y-2">
            {dj.latestMix && (
              <div
                className="flex items-center gap-3 p-2 rounded-lg bg-black-surface/50 hover:bg-black-surface cursor-pointer transition-colors"
                onClick={() => navigate(`/mixes?id=${dj.latestMix!.id}`)}
              >
                <div className="w-10 h-10 rounded bg-gold/10 flex items-center justify-center flex-shrink-0">
                  <Headphones className="w-4 h-4 text-gold" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-text-primary truncate">{dj.latestMix.title}</p>
                  <p className="text-[10px] text-text-muted">New mix</p>
                </div>
              </div>
            )}
            {dj.latestEvent && (
              <div
                className="flex items-center gap-3 p-2 rounded-lg bg-black-surface/50 hover:bg-black-surface cursor-pointer transition-colors"
                onClick={() => navigate(`/events/${dj.latestEvent?.id}`)}
              >
                <div className="w-10 h-10 rounded bg-purple/10 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-4 h-4 text-purple" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-text-primary truncate">{dj.latestEvent.title}</p>
                  <p className="text-[10px] text-text-muted">
                    {new Date(dj.latestEvent.eventDate).toLocaleDateString()} · {dj.latestEvent.city}
                  </p>
                </div>
              </div>
            )}
            {!dj.latestMix && !dj.latestEvent && (
              <p className="text-xs text-text-muted text-center py-2">No recent activity</p>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ─────────────────── List Row ─────────────────── */

function DJListRow({ dj, index }: { dj: FollowingDJ; index: number }) {
  const navigate = useNavigate();
  const { unfollow } = useFollowDj(dj.id);
  const [isUnfollowed, setIsUnfollowed] = useState(false);

  if (isUnfollowed) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
    >
      <Card className="bg-black-elevated border-dark-gray hover:border-gold/20 transition-all group">
        <CardContent className="p-3">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <Avatar
              className="w-10 h-10 border-2 border-gold/30 cursor-pointer shrink-0"
              onClick={() => navigate(`/dj/${dj.id}`)}
            >
              <AvatarImage src={dj.avatar} />
              <AvatarFallback className="bg-gold/10 text-gold">
                <Music className="w-4 h-4" />
              </AvatarFallback>
            </Avatar>

            {/* Name & Meta */}
            <div className="flex-1 min-w-0">
              <p
                className="font-medium text-text-primary text-sm cursor-pointer hover:text-gold transition-colors truncate"
                onClick={() => navigate(`/dj/${dj.id}`)}
              >
                {dj.stageName}
              </p>
              <div className="flex items-center gap-3 text-xs text-text-muted mt-0.5">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {dj.city || 'Unknown'}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {dj.followerCount.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Genres (hidden on mobile) */}
            {dj.genre && dj.genre.length > 0 && (
              <div className="hidden sm:flex flex-wrap gap-1 max-w-[180px]">
                {dj.genre.slice(0, 2).map((g) => (
                  <Badge key={g} className="bg-black-surface text-text-secondary border-dark-gray text-[10px]">
                    {g}
                  </Badge>
                ))}
              </div>
            )}

            {/* Latest Content (hidden on smaller screens) */}
            <div className="hidden md:flex items-center gap-2 min-w-0 flex-1 max-w-xs">
              {dj.latestMix ? (
                <div
                  className="flex items-center gap-2 min-w-0 cursor-pointer"
                  onClick={() => navigate(`/mixes?id=${dj.latestMix!.id}`)}
                >
                  <div className="w-7 h-7 rounded bg-gold/10 flex items-center justify-center shrink-0">
                    <Headphones className="w-3 h-3 text-gold" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-text-primary truncate">{dj.latestMix.title}</p>
                    <p className="text-[10px] text-text-muted">Mix</p>
                  </div>
                </div>
              ) : dj.latestEvent ? (
                <div
                  className="flex items-center gap-2 min-w-0 cursor-pointer"
                  onClick={() => navigate(`/events/${dj.latestEvent?.id}`)}
                >
                  <div className="w-7 h-7 rounded bg-purple/10 flex items-center justify-center shrink-0">
                    <Calendar className="w-3 h-3 text-purple" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-text-primary truncate">{dj.latestEvent.title}</p>
                    <p className="text-[10px] text-text-muted">Event</p>
                  </div>
                </div>
              ) : (
                <span className="text-xs text-text-muted">No recent activity</span>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-text-muted hover:text-gold"
                onClick={() => navigate(`/dj/${dj.id}`)}
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-text-muted hover:text-red"
                onClick={() => {
                  unfollow.mutate();
                  setIsUnfollowed(true);
                }}
              >
                <Heart className="w-4 h-4 fill-current" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ─────────────────── Main Component ─────────────────── */

export default function Following() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [layout, setLayout] = useState<LayoutMode>(getSavedLayout);
  const { data: following = [], isLoading, error } = useFollowing();

  useEffect(() => {
    saveLayout(layout);
  }, [layout]);

  const filtered = following.filter((dj) =>
    dj.stageName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    dj.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    dj.genre?.some((g) => g.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-10 h-10 text-gold animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-text-primary uppercase tracking-wide">
            Following
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            DJs you follow and their latest uploads & events.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <p className="text-sm text-text-muted">
            {following.length} DJ{following.length !== 1 ? 's' : ''}
          </p>
          <ToggleGroup
            type="single"
            value={layout}
            onValueChange={(value: string) => {
              if (value === 'grid' || value === 'list') setLayout(value);
            }}
            spacing={0}
            variant="outline"
            className="border border-dark-gray rounded-md overflow-hidden"
          >
            <ToggleGroupItem value="grid" aria-label="Grid view" className="data-[state=on]:bg-gold/10 data-[state=on]:text-gold data-[state=on]:border-gold/30 border-0 rounded-none h-9 px-3">
              <LayoutGrid className="w-4 h-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="list" aria-label="List view" className="data-[state=on]:bg-gold/10 data-[state=on]:text-gold data-[state=on]:border-gold/30 border-0 border-l border-dark-gray rounded-none h-9 px-3">
              <List className="w-4 h-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red/10 border border-red/30 text-red text-sm">
          Failed to load followed DJs. Please try again.
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <Input
          placeholder="Search by name, city, or genre..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-black-elevated border-dark-gray text-text-primary placeholder:text-text-muted"
        />
      </div>

      {/* Following Content */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Heart className="w-12 h-12 text-text-muted mx-auto mb-4" />
          <p className="text-text-secondary">
            {searchQuery ? 'No DJs match your search.' : "You haven't followed any DJs yet."}
          </p>
          {!searchQuery && (
            <Button
              variant="outline"
              className="mt-4 border-gold/30 text-gold hover:bg-gold/10"
              onClick={() => navigate('/discover')}
            >
              Discover DJs
            </Button>
          )}
        </div>
      ) : layout === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((dj, idx) => (
            <DJCard key={dj.id} dj={dj} index={idx} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((dj, idx) => (
            <DJListRow key={dj.id} dj={dj} index={idx} />
          ))}
        </div>
      )}
    </div>
  );
}
