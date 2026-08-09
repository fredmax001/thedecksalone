import { Settings } from 'lucide-react';

export interface ModeratorBadgeProps {
  user?: {
    role?: string;
    [key: string]: any;
  } | null;
  showText?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function ModeratorBadge({
  user,
  showText = true,
  className = '',
  size = 'md',
}: ModeratorBadgeProps) {
  // If user object provided and role is not MODERATOR, do not render
  if (user && user.role !== 'MODERATOR' && user.role !== 'ADMIN') {
    return null;
  }

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  const textSizes = {
    sm: 'text-[10px] px-1.5 py-0.5',
    md: 'text-xs px-2 py-0.5',
    lg: 'text-xs px-2.5 py-1',
  };

  return (
    <span
      title="Official Deck Salone Moderator"
      className={`inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-500/20 via-gold/20 to-amber-500/20 text-gold border border-gold/40 rounded-full font-semibold ${textSizes[size]} ${className}`}
    >
      <Settings className={`${iconSizes[size]} text-gold animate-spin-slow shrink-0`} />
      {showText && <span>⚙️ Moderator</span>}
    </span>
  );
}

export default ModeratorBadge;
