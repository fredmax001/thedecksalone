import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2,
  Bell,
  CheckCheck,
  Calendar,
  MessageSquare,
  Music,
  AlertCircle,
  DollarSign,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  useUserNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  type NotificationItem,
} from '@/hooks/useUserDashboard';

const notificationConfig: Record<string, { icon: typeof Bell; color: string }> = {
  BOOKING_UPDATE: { icon: Calendar, color: 'text-blue' },
  COUNTER_OFFER: { icon: DollarSign, color: 'text-gold' },
  DJ_MESSAGE: { icon: MessageSquare, color: 'text-purple' },
  NEW_MIX: { icon: Music, color: 'text-green' },
  EVENT_REMINDER: { icon: Calendar, color: 'text-orange' },
  SYSTEM: { icon: AlertCircle, color: 'text-text-muted' },
};

function NotificationRow({ item, index }: { item: NotificationItem; index: number }) {
  const navigate = useNavigate();
  const markRead = useMarkNotificationRead();
  const [isRemoved, setIsRemoved] = useState(false);

  const config = notificationConfig[item.type] || notificationConfig.SYSTEM;
  const Icon = config.icon;

  const handleClick = () => {
    if (!item.read) {
      markRead.mutate(item.id);
    }
    if (item.actionUrl) {
      navigate(item.actionUrl);
    }
  };

  if (isRemoved) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ delay: index * 0.03 }}
    >
      <div
        onClick={handleClick}
        className={cn(
          'flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer group',
          item.read
            ? 'bg-black-elevated border-dark-gray hover:border-gold/10'
            : 'bg-gold/5 border-gold/20 hover:border-gold/40'
        )}
      >
        {/* Icon */}
        <div className={cn(
          'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
          item.read ? 'bg-black-surface' : 'bg-gold/10'
        )}>
          <Icon className={cn('w-5 h-5', item.read ? 'text-text-muted' : config.color)} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className={cn(
              'text-sm',
              item.read ? 'text-text-secondary' : 'font-medium text-text-primary'
            )}>
              {item.title}
            </p>
            {!item.read && (
              <div className="w-2 h-2 rounded-full bg-gold flex-shrink-0 mt-1.5" />
            )}
          </div>
          <p className="text-xs text-text-muted mt-1 line-clamp-2">{item.body}</p>
          <p className="text-[10px] text-text-muted mt-2">
            {new Date(item.createdAt).toLocaleDateString()} ·{' '}
            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        {/* Dismiss button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-text-muted hover:text-red"
          onClick={(e) => {
            e.stopPropagation();
            setIsRemoved(true);
          }}
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
    </motion.div>
  );
}

export default function Notifications() {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const { data: notifications = [], isLoading, error } = useUserNotifications();
  const markAllRead = useMarkAllNotificationsRead();

  const filtered = filter === 'unread' ? notifications.filter((n) => !n.read) : notifications;
  const unreadCount = notifications.filter((n) => !n.read).length;

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
        <div className="flex items-center gap-3">
          <div className="relative">
            <Bell className="w-6 h-6 text-gold" />
            {unreadCount > 0 && (
              <Badge className="absolute -top-2 -right-2 w-5 h-5 p-0 flex items-center justify-center bg-gold text-black text-[10px]">
                {unreadCount}
              </Badge>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-text-primary uppercase tracking-wide">
              Notifications
            </h1>
            <p className="text-sm text-text-secondary mt-1">
              Booking updates, DJ replies, and new content.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-black-elevated border border-dark-gray rounded-lg p-1">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'text-xs h-8',
                filter === 'all' ? 'bg-gold/10 text-gold' : 'text-text-muted'
              )}
              onClick={() => setFilter('all')}
            >
              All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'text-xs h-8',
                filter === 'unread' ? 'bg-gold/10 text-gold' : 'text-text-muted'
              )}
              onClick={() => setFilter('unread')}
            >
              Unread {unreadCount > 0 && `(${unreadCount})`}
            </Button>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="border-dark-gray text-text-secondary hover:text-text-primary text-xs h-9"
              onClick={() => markAllRead.mutate()}
            >
              <CheckCheck className="w-3.5 h-3.5 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red/10 border border-red/30 text-red text-sm">
          Failed to load notifications. Please try again.
        </div>
      )}

      {/* Notifications List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Bell className="w-12 h-12 text-text-muted mx-auto mb-4" />
          <p className="text-text-secondary">
            {filter === 'unread' ? 'No unread notifications.' : "You're all caught up!"}
          </p>
        </div>
      ) : (
        <AnimatePresence>
          <div className="space-y-2">
            {filtered.map((item, idx) => (
              <NotificationRow key={item.id} item={item} index={idx} />
            ))}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
}
