import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface NavItem {
  icon: LucideIcon;
  label: string;
  path: string;
}

interface MobileTabBarProps {
  items: NavItem[];
}

export default function MobileTabBar({ items }: MobileTabBarProps) {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/dashboard' || path === '/user/dashboard') {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="md:hidden fixed bottom-[calc(env(safe-area-inset-bottom,0px)+12px)] left-4 right-4 z-50 rounded-2xl liquid-glass-dock shadow-2xl">
      <div className="flex items-center overflow-x-auto scrollbar-hide h-14 px-2">
        {items.map((item) => {
          const active = isActive(item.path);
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'btn-press-subtle flex flex-col items-center justify-center min-w-[72px] h-full space-y-1 px-2 transition-colors',
                active ? 'text-gold' : 'text-text-muted hover:text-text-primary'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium whitespace-nowrap">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
