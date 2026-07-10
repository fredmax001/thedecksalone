import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Loader2,
  Heart,
  Star,
  Trophy,
  Bookmark,
  UserPlus,
  Calendar,
  Music,
  Clock,
  Filter,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUserActivity, type ActivityItem } from '@/hooks/useUserDashboard';
import { imageFallback } from '@/lib/utils';

const activityConfig: Record<string, { icon: typeof Heart; color: string; label: string }> = {
  LIKE_MIX: { icon: Heart, color: 'text-red', label: 'Liked a mix' },
  RATE_DJ: { icon: Star, color: 'text-gold', label: 'Rated a DJ' },
  BATTLE_VOTE: { icon: Trophy, color: 'text-purple', label: 'Voted in a battle' },
  SAVE_EVENT: { icon: Bookmark, color: 'text-blue', label: 'Saved an event' },
  FOLLOW_DJ: { icon: UserPlus, color: 'text-green', label: 'Followed a DJ' },
  BOOKING_CREATED: { icon: Calendar, color: 'text-orange', label: 'Created a booking' },
};

function ActivityRow({ item, index }: { item: ActivityItem; index: number }) {
  const config = activityConfig[item.type] || { icon: Music, color: 'text-text-muted', label: 'Activity' };
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
    >
      <div className="flex items-start gap-4 p-4 rounded-xl bg-black-elevated border border-dark-gray hover:border-gold/10 transition-colors">
        {/* Icon */}
        <div className={`w-10 h-10 rounded-lg bg-black-surface flex items-center justify-center flex-shrink-0 ${config.color}`}>
          <Icon className="w-5 h-5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-text-primary">{item.title}</p>
            <Badge className="bg-black-surface text-text-muted border-dark-gray text-[10px]">
              {config.label}
            </Badge>
          </div>
          {item.subtitle && (
            <p className="text-xs text-text-secondary mt-1">{item.subtitle}</p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <Clock className="w-3 h-3 text-text-muted" />
            <span className="text-[11px] text-text-muted">
              {new Date(item.createdAt).toLocaleDateString()} at{' '}
              {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>

        {/* Thumbnail */}
        {item.thumbnail && (
          <div className="w-14 h-14 rounded-lg bg-black-surface flex-shrink-0 overflow-hidden">
            <img src={item.thumbnail || '/placeholder.jpg'} alt="" onError={imageFallback} className="w-full h-full object-cover" />
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function Activity() {
  const [filter, setFilter] = useState('ALL');
  const { data: activities = [], isLoading, error } = useUserActivity();

  const filteredActivities = filter === 'ALL'
    ? activities
    : activities.filter((a) => a.type === filter);

  const groupedByDate = filteredActivities.reduce((acc, item) => {
    const date = new Date(item.createdAt).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    if (!acc[date]) acc[date] = [];
    acc[date].push(item);
    return acc;
  }, {} as Record<string, ActivityItem[]>);

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
            My Activity
          </h1>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[180px] bg-black-elevated border-dark-gray text-text-primary">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter activity" />
          </SelectTrigger>
          <SelectContent className="bg-black-surface border-dark-gray">
            <SelectItem value="ALL">All Activity</SelectItem>
            <SelectItem value="LIKE_MIX">Liked Mixes</SelectItem>
            <SelectItem value="RATE_DJ">Ratings</SelectItem>
            <SelectItem value="BATTLE_VOTE">Battle Votes</SelectItem>
            <SelectItem value="SAVE_EVENT">Saved Events</SelectItem>
            <SelectItem value="FOLLOW_DJ">Follows</SelectItem>
            <SelectItem value="BOOKING_CREATED">Bookings</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red/10 border border-red/30 text-red text-sm">
          Failed to load activity. Please try again.
        </div>
      )}

      {/* Activity Feed */}
      {filteredActivities.length === 0 ? (
        <div className="text-center py-16">
          <Clock className="w-12 h-12 text-text-muted mx-auto mb-4" />
          <p className="text-text-secondary">
            {filter === 'ALL' ? "No activity yet. Start exploring!" : 'No activity of this type yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByDate).map(([date, items]) => (
            <div key={date}>
              <p className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3 sticky top-0 bg-black/90 backdrop-blur-sm py-2 z-10">
                {date === new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
                  ? 'Today'
                  : date}
              </p>
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <ActivityRow key={item.id} item={item} index={idx} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
