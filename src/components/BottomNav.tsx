import { Link, useLocation } from 'react-router-dom';
import { Home, Compass, Disc3, Rss, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/stores/authStore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getMediaUrl } from '@/lib/api';

const baseItems = [
  { label: 'Home', path: '/', icon: Home },
  { label: 'Discover', path: '/discover', icon: Compass },
  { label: 'Mixes', path: '/mixes', icon: Disc3 },
];

export default function BottomNav() {
  const location = useLocation();
  const { user, isAuthenticated } = useAuthStore();
  const isDj = user?.role === 'DJ';
  const isAdmin =
    user?.role === 'ADMIN' ||
    user?.role === 'SUPER_ADMIN' ||
    user?.role === 'FINANCE_ADMIN' ||
    user?.role === 'VERIFICATION_ADMIN' ||
    user?.role === 'SUPPORT_ADMIN';
  const isModerator = user?.role === 'MODERATOR';
  const dashboardPath =
    isAdmin || isModerator
      ? isModerator
        ? '/moderator'
        : user?.role === 'FINANCE_ADMIN'
        ? '/finance'
        : user?.role === 'SUPPORT_ADMIN'
        ? '/support'
        : user?.role === 'VERIFICATION_ADMIN'
        ? '/verification'
        : '/admin'
      : isDj
      ? '/dashboard'
      : '/user/dashboard';
  const profilePath = isAdmin || isModerator ? dashboardPath : isDj ? '/dashboard/profile' : '/user/profile';

  // Do not show bottom nav on admin routes
  if (location.pathname.startsWith('/admin')) {
    return null;
  }

  const mainItems = [
    ...baseItems,
    { label: 'Feed', path: '/feed', icon: Rss },
  ];
  const displayName = user?.djProfile?.stageName || user?.name || user?.username || user?.email?.split('@')[0] || 'Account';
  const avatarUrl = getMediaUrl(user?.djProfile?.avatar || user?.avatar) || '/default-avatar.jpg';
  const initials = displayName.slice(0, 2).toUpperCase();

  const isMainActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const isProfileActive = location.pathname === profilePath;

  return (
    <nav className="md:hidden fixed bottom-[calc(env(safe-area-inset-bottom,0px)+10px)] left-4 right-4 z-50 backdrop-blur-2xl border border-gold/25 rounded-full shadow-[0_12px_40px_rgba(0,0,0,0.85)] bg-black/90 px-2 py-1">
      <div className="flex items-center justify-around h-12">
        {mainItems.map((item) => {
          const isActive = isMainActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className="relative flex flex-col items-center justify-center w-full h-full space-y-0.5 group"
            >
              {isActive && (
                <motion.div
                  layoutId="bottomNavPill"
                  className="absolute inset-0 bg-gold/15 rounded-full border border-gold/40 shadow-[0_0_12px_rgba(244,224,89,0.3)]"
                  transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                />
              )}
              <item.icon
                className={`w-4 h-4 z-10 transition-transform duration-200 group-active:scale-90 ${
                  isActive ? 'text-gold scale-110' : 'text-text-muted group-hover:text-text-secondary'
                }`}
              />
              <span
                className={`text-[9px] font-bold z-10 uppercase tracking-tight transition-colors duration-200 ${
                  isActive ? 'text-gold' : 'text-text-muted'
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}

        {isAuthenticated && user ? (
          <Link
            to={profilePath}
            className="relative flex h-full w-full flex-col items-center justify-center space-y-0.5"
          >
            {isProfileActive && (
              <div className="absolute inset-0 bg-gold/15 rounded-full border border-gold/40 shadow-[0_0_12px_rgba(244,224,89,0.3)]" />
            )}
            <div className="relative z-10">
              <Avatar className={`h-5 w-5 transition-all duration-200 ${
                isProfileActive ? 'border-2 border-gold shadow-[0_0_12px_rgba(244,224,89,0.6)] scale-110' : 'border border-gold/40'
              }`}>
                <AvatarImage src={avatarUrl} alt={displayName} />
                <AvatarFallback className="bg-gold/20 text-[8px] font-bold text-gold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>
            <span className={`text-[9px] font-bold z-10 uppercase tracking-tight transition-colors ${isProfileActive ? 'text-gold font-extrabold' : 'text-text-muted'}`}>
              Me
            </span>
          </Link>
        ) : (
          <Link
            to="/register"
            className="relative flex h-full w-full flex-col items-center justify-center space-y-0.5"
          >
            <User className="w-4 h-4 text-text-muted" />
            <span className="text-[9px] font-bold uppercase tracking-tight text-text-muted">Sign Up</span>
          </Link>
        )}
      </div>
    </nav>
  );
}
