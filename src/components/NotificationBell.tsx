import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Loader2 } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  useNotifications,
  useUnreadNotificationCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useClearAllNotifications,
  type NotificationItem,
} from '@/hooks/useNotifications';

const notificationConfig: Record<string, { icon: typeof Bell; color: string; label: string }> = {
  BOOKING_CREATED: { icon: Bell, color: 'text-blue', label: 'Booking' },
  BOOKING_STATUS_CHANGED: { icon: Bell, color: 'text-gold', label: 'Booking' },
  COUNTER_OFFER: { icon: Bell, color: 'text-gold', label: 'Offer' },
  NEW_MESSAGE: { icon: Bell, color: 'text-purple', label: 'Message' },
  NEW_FOLLOWER: { icon: Bell, color: 'text-green', label: 'Follow' },
  MIX_LIKED: { icon: Bell, color: 'text-pink', label: 'Like' },
  MIX_REUPPED: { icon: Bell, color: 'text-green', label: 'Reup' },
  NEW_MIX: { icon: Bell, color: 'text-blue', label: 'Mix' },
  EVENT_REMINDER: { icon: Bell, color: 'text-orange', label: 'Event' },
  SYSTEM: { icon: Bell, color: 'text-text-muted', label: 'System' },
  PAYMENT_RECEIVED: { icon: Bell, color: 'text-green', label: 'Payment' },
  PAYMENT_FAILED: { icon: Bell, color: 'text-red', label: 'Payment' },
  REVIEW_RECEIVED: { icon: Bell, color: 'text-gold', label: 'Review' },
  VERIFICATION_STATUS: { icon: Bell, color: 'text-blue', label: 'Verification' },
  SUBSCRIPTION_STATUS: { icon: Bell, color: 'text-purple', label: 'Subscription' },
};

function NotificationRow({ item, onNavigate }: { item: NotificationItem; onNavigate: () => void }) {
  const navigate = useNavigate();
  const markRead = useMarkNotificationRead();

  const config = notificationConfig[item.type] || notificationConfig.SYSTEM;

  const handleClick = () => {
    if (!item.read) {
      markRead.mutate(item.id);
    }
    onNavigate();
    if (item.actionUrl) {
      navigate(item.actionUrl);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors',
        item.read
          ? 'hover:bg-white/5'
          : 'bg-gold/5 hover:bg-gold/10'
      )}
    >
      <div className={cn(
        'w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0',
        item.read ? 'bg-black-surface' : 'bg-gold/10'
      )}>
        <Bell className={cn('w-4 h-4', item.read ? 'text-text-muted' : config.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-sm leading-tight',
          item.read ? 'text-text-secondary' : 'font-medium text-text-primary'
        )}>
          {item.title}
        </p>
        <p className="text-xs text-text-muted mt-0.5 line-clamp-2">{item.body}</p>
        <p className="text-[10px] text-text-muted mt-1">
          {new Date(item.createdAt).toLocaleDateString()} ·{' '}
          {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
      {!item.read && (
        <div className="w-2 h-2 rounded-full bg-gold flex-shrink-0 mt-1.5" />
      )}
    </div>
  );
}

interface NotificationBellProps {
  className?: string;
  variant?: 'ghost' | 'outline';
}

export default function NotificationBell({ className, variant = 'ghost' }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const { data: notificationsData, isLoading } = useNotifications({ limit: 8 });
  const { data: unreadCount = 0 } = useUnreadNotificationCount();
  const markAllRead = useMarkAllNotificationsRead();
  const clearAll = useClearAllNotifications();

  const notifications = notificationsData?.items || [];

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size="icon"
          className={cn('relative text-text-secondary hover:text-text-primary', className)}
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 flex items-center justify-center bg-gold text-black text-[10px] font-bold border-0">
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[360px] max-h-[480px] overflow-hidden bg-black-surface border-dark-gray p-0"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-dark-gray">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-gold" />
            <span className="text-sm font-medium text-text-primary">Notifications</span>
            {unreadCount > 0 && (
              <Badge className="bg-gold/20 text-gold text-[10px] border-0">
                {unreadCount} new
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-text-muted hover:text-text-primary px-2"
                onClick={(e) => {
                  e.stopPropagation();
                  markAllRead.mutate();
                }}
                disabled={markAllRead.isPending}
              >
                {markAllRead.isPending ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <CheckCheck className="w-3 h-3 mr-1" />
                )}
                Mark read
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-red hover:text-red/80 px-2"
                onClick={(e) => {
                  e.stopPropagation();
                  clearAll.mutate();
                }}
                disabled={clearAll.isPending}
              >
                {clearAll.isPending ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <span className="text-xs">Clear all</span>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Notification List */}
        <div className="max-h-[360px] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-gold animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="w-8 h-8 text-text-muted mx-auto mb-2" />
              <p className="text-sm text-text-secondary">No notifications yet</p>
            </div>
          ) : (
            <AnimatePresence>
              <div className="divide-y divide-dark-gray/50">
                {notifications.map((item) => (
                  <NotificationRow
                    key={item.id}
                    item={item}
                    onNavigate={() => setOpen(false)}
                  />
                ))}
              </div>
            </AnimatePresence>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="px-4 py-2 border-t border-dark-gray text-center">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-gold hover:bg-gold/10 w-full"
              onClick={() => {
                setOpen(false);
                window.location.href = '/user/notifications';
              }}
            >
              View all notifications
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
