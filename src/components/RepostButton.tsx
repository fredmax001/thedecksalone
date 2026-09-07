import { Repeat } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRepostStatus, useRepostMix, useUnrepostMix } from '@/hooks/useReposts';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';
import { formatCompactNumber } from '@/lib/formatting';

interface RepostButtonProps {
  mixId: string;
  size?: 'sm' | 'md';
  showCount?: boolean;
  className?: string;
}

export function RepostButton({ mixId, size = 'md', showCount = true, className }: RepostButtonProps) {
  const { isAuthenticated } = useAuthStore();
  const { data: status, isLoading: statusLoading } = useRepostStatus(mixId);
  const repost = useRepostMix();
  const unrepost = useUnrepostMix();
  const reposted = status?.reposted || false;
  const count = status?.count || 0;
  const isPending = repost.isPending || unrepost.isPending;
  const isLoading = statusLoading || isPending;

  const handleClick = async () => {
    if (!isAuthenticated) {
      toast.info('Sign in to repost mixes');
      return;
    }

    if (reposted) {
      unrepost.mutate(mixId);
    } else {
      repost.mutate(mixId);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={cn(
        'inline-flex items-center gap-1.5 transition-colors disabled:opacity-50',
        reposted ? 'text-gold' : 'text-text-muted hover:text-text-primary',
        size === 'sm' ? 'text-xs' : 'text-sm',
        className
      )}
      title={reposted ? 'Remove repost' : 'Repost this mix'}
    >
      <Repeat size={size === 'sm' ? 12 : 14} className={cn(reposted && 'fill-current')} />
      {showCount && <span>{formatCompactNumber(count)}</span>}
    </button>
  );
}

