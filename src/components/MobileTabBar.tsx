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
    <nav className="lg:hidden fixed bottom-3 left-4 right-4 z-50 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] bg-black/90">
      <div className="flex items-center overflow-x-auto scrollbar-hide h-14 px-2">
        {items.map((item) => {
          const active = isActive(item.path);
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex flex-col items-center justify-center min-w-[72px] h-full space-y-1 px-2 transition-colors',
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
