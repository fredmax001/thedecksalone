import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Compass, Disc3, Trophy, User, Heart, Upload, Radio, ScanLine, X, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/authStore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const baseItems = [
  { label: 'Home', path: '/', icon: Home },
  { label: 'Discover', path: '/discover', icon: Compass },
  { label: 'Mixes', path: '/mixes', icon: Disc3 },
];

export default function BottomNav() {
  const location = useLocation();
  const { user, isAuthenticated } = useAuthStore();
  const [fabOpen, setFabOpen] = useState(false);

  // Close FAB menu on route change
  useEffect(() => {
    setFabOpen(false);
  }, [location.pathname]);

  // Do not show bottom nav on admin routes
  if (location.pathname.startsWith('/admin')) {
    return null;
  }

  const isDj = user?.role === 'DJ';
  const isProPlus = user?.djProfile?.subscriptionTier === 'legend';
  const profilePath = isDj ? '/dashboard/profile' : '/user/profile';

  const mainItems = [
    ...baseItems,
    { label: 'Battles', path: '/battles', icon: Trophy },
  ];
  const displayName = user?.djProfile?.stageName || user?.name || user?.username || user?.email?.split('@')[0] || 'Account';
  const avatarUrl = user?.djProfile?.avatar || user?.avatar || '';
  const initials = displayName.slice(0, 2).toUpperCase();

  const isMainActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const fabActions = [
    { label: 'Profile', path: profilePath, icon: User },
    { label: 'Install App', path: '/install', icon: Smartphone },
    { label: 'Likes', path: isDj ? '/dashboard/mixes' : '/user/activity', icon: Heart },
    { label: 'Sets', path: isDj ? '/dashboard/sets' : '/mixes', icon: Radio },
    { label: 'Uploads', path: isDj ? '/dashboard/mixes' : '/user/activity', icon: Upload },
  ];

  return (
    <>
      {/* FAB Backdrop & Menu Popover */}
      <AnimatePresence>
        {fabOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setFabOpen(false)}
              className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 20 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className="md:hidden fixed bottom-20 right-4 z-50 w-60 bg-black-surface/95 border border-gold/30 rounded-2xl p-3 shadow-[0_12px_40px_rgba(0,0,0,0.8)] backdrop-blur-xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-2 pb-2 mb-2 border-b border-dark-gray/60">
                <span className="text-xs font-semibold uppercase tracking-wider text-gold">Quick Actions</span>
                <span className="text-[10px] text-text-muted">{displayName}</span>
              </div>
              <div className="flex flex-col gap-1">
                {fabActions.map((action, idx) => (
                  <motion.div
                    key={action.label}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.04 }}
                  >
                    <Link
                      to={action.path}
                      onClick={() => setFabOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-text-secondary hover:text-gold hover:bg-gold/10 transition-all text-xs font-medium"
                    >
                      <action.icon className="w-4 h-4 text-gold" />
                      <span>{action.label}</span>
                    </Link>
                  </motion.div>
                ))}

                {isProPlus && (
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: fabActions.length * 0.04 }}
                    className="pt-1 mt-1 border-t border-dark-gray/60"
                  >
                    <Link
                      to="/dashboard/scanner"
                      onClick={() => setFabOpen(false)}
                      className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-gold/15 border border-gold/30 text-gold hover:bg-gold/25 transition-all text-xs font-semibold"
                    >
                      <div className="flex items-center gap-2.5">
                        <ScanLine className="w-4 h-4" />
                        <span>Ticket Scanner</span>
                      </div>
                      <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-gold text-black font-bold">Pro+</span>
                    </Link>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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
                    className="absolute inset-0 bg-gold/15 rounded-full border border-gold/40 shadow-[0_0_12px_rgba(212,162,74,0.3)]"
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
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setFabOpen(!fabOpen)}
              className="relative flex h-full w-full flex-col items-center justify-center space-y-0.5"
            >
              {fabOpen && (
                <div className="absolute inset-0 bg-gold/15 rounded-full border border-gold/40 shadow-[0_0_12px_rgba(212,162,74,0.3)]" />
              )}
              <div className="relative z-10">
                <Avatar className={`h-5 w-5 transition-all duration-200 ${
                  fabOpen ? 'border-2 border-gold shadow-[0_0_12px_rgba(212,162,74,0.6)] scale-110' : 'border border-gold/40'
                }`}>
                  <AvatarImage src={avatarUrl} alt={displayName} />
                  <AvatarFallback className="bg-gold/20 text-[8px] font-bold text-gold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                {fabOpen && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-gold text-black flex items-center justify-center">
                    <X className="w-2 h-2 stroke-[3]" />
                  </div>
                )}
              </div>
              <span className={`text-[9px] font-bold z-10 uppercase tracking-tight transition-colors ${fabOpen ? 'text-gold font-extrabold' : 'text-text-muted'}`}>
                {fabOpen ? 'Close' : 'Me'}
              </span>
            </motion.button>
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
    </>
  );
}
