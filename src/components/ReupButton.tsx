import { useState } from 'react';
import { Repeat, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useReupStatus, useReupMix, useUnreupMix } from '@/hooks/useReups';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { useAuthStore } from '@/stores/authStore';

interface ReupButtonProps {
  mixId: string;
  size?: 'sm' | 'md';
  showCount?: boolean;
  className?: string;
}

export function ReupButton({ mixId, size = 'md', showCount = true, className }: ReupButtonProps) {
  const { user } = useAuthStore();
  const { data: status, isLoading: statusLoading } = useReupStatus(mixId);
  const reup = useReupMix();
  const unreup = useUnreupMix();
  const { canAccessPro, openUpgradeModal } = useFeatureAccess();
  const [isPending, setIsPending] = useState(false);

  const reupped = status?.reupped || false;
  const count = status?.count || 0;
  const isLoading = statusLoading || isPending || reup.isPending || unreup.isPending;

  // Fans (non-DJs) see count but cannot re-up
  const isDj = user?.role === 'DJ' || user?.role === 'ADMIN';
  if (!isDj) {
    if (!showCount) return null;
    return (
      <button
        disabled
        className={cn(
          'inline-flex items-center gap-1.5 text-text-muted opacity-60 cursor-default',
          size === 'sm' ? 'text-xs' : 'text-sm',
          className
        )}
      >
        <Repeat size={size === 'sm' ? 12 : 14} />
        {formatCount(count)}
      </button>
    );
  }

  const handleClick = async () => {
    if (!canAccessPro) {
      openUpgradeModal('Re-ups', 'pro');
      return;
    }

    setIsPending(true);
    try {
      if (reupped) {
        await unreup.mutateAsync(mixId);
      } else {
        await reup.mutateAsync(mixId);
      }
    } finally {
      setIsPending(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={cn(
        'inline-flex items-center gap-1.5 transition-colors disabled:opacity-50',
        reupped ? 'text-gold' : 'text-text-muted hover:text-text-primary',
        size === 'sm' ? 'text-xs' : 'text-sm',
        className
      )}
      title={reupped ? 'Remove re-up' : 'Re-up this mix'}
    >
      {isLoading ? (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : !canAccessPro ? (
        <Lock size={size === 'sm' ? 12 : 14} />
      ) : (
        <Repeat size={size === 'sm' ? 12 : 14} className={cn(reupped && 'fill-current')} />
      )}
      {showCount && <span>{formatCount(count)}</span>}
      {!showCount && !canAccessPro && <span className="hidden sm:inline">Pro</span>}
    </button>
  );
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}
