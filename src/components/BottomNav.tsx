import { Link, useLocation } from 'react-router-dom';
import { Home, Compass, Disc3, Trophy, Menu, LogOut, User, LayoutDashboard, Settings, Crown, Calendar, BarChart } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet';

const mainItems = [
  { label: 'Home', path: '/', icon: Home },
  { label: 'Discover', path: '/discover', icon: Compass },
  { label: 'Mixes', path: '/mixes', icon: Disc3 },
  { label: 'Battles', path: '/battles', icon: Trophy },
];

export default function BottomNav() {
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [open, setOpen] = useState(false);

  // Do not show bottom nav on admin routes
  if (location.pathname.startsWith('/admin')) {
    return null;
  }

  const isDj = user?.role === 'DJ';
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MODERATOR';
  const dashboardPath = isDj ? '/dashboard' : '/user/dashboard';
  const profilePath = isDj ? '/dashboard/profile' : '/user/profile';
  const settingsPath = isDj ? '/dashboard/settings' : '/user/settings';

  const moreLinks = [
    { label: 'Rankings', path: '/rankings', icon: BarChart },
    { label: 'Events', path: '/events', icon: Calendar },
  ];

  if (isAuthenticated && user) {
    moreLinks.push(
      { label: 'Dashboard', path: dashboardPath, icon: LayoutDashboard },
      { label: 'Profile', path: profilePath, icon: User },
      { label: 'Settings', path: settingsPath, icon: Settings }
    );
    if (isAdmin) {
      moreLinks.push({ label: 'Admin', path: '/admin', icon: Crown });
    }
  }

  const isMainActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 backdrop-blur-md border-t theme-border-card pb-safe" style={{ background: 'var(--bg-glass)' }}>
        <div className="flex items-center justify-around h-16 px-2">
          {mainItems.map((item) => {
            const isActive = isMainActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className="relative flex flex-col items-center justify-center w-full h-full space-y-1"
              >
                <item.icon
                  className={`w-5 h-5 transition-colors duration-200 ${
                    isActive ? 'text-gold' : 'text-text-muted'
                  }`}
                />
                <span
                  className={`text-[10px] font-medium transition-colors duration-200 ${
                    isActive ? 'text-gold' : 'text-text-muted'
                  }`}
                >
                  {item.label}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="bottomNavIndicator"
                    className="absolute top-0 w-8 h-0.5 bg-gold rounded-b-full"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button className="relative flex flex-col items-center justify-center w-full h-full space-y-1">
                <Menu className="w-5 h-5 text-text-muted" />
                <span className="text-[10px] font-medium text-text-muted">More</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="bg-black-surface border-t border-dark-gray px-4 pb-8">
              <SheetHeader className="pb-2">
                <SheetTitle className="text-text-primary text-sm font-semibold uppercase tracking-wider">Menu</SheetTitle>
              </SheetHeader>

              <div className="grid grid-cols-3 gap-3 pt-4">
                {moreLinks.map((link) => (
                  <SheetClose key={link.path} asChild>
                    <Link
                      to={link.path}
                      className="flex flex-col items-center justify-center gap-2 rounded-xl bg-black-elevated p-4 text-text-secondary hover:text-gold hover:bg-black-surface transition-colors"
                    >
                      <link.icon className="w-6 h-6" />
                      <span className="text-xs font-medium">{link.label}</span>
                    </Link>
                  </SheetClose>
                ))}

                {isAuthenticated && (
                  <button
                    onClick={() => {
                      setOpen(false);
                      logout();
                    }}
                    className="flex flex-col items-center justify-center gap-2 rounded-xl bg-black-elevated p-4 text-red hover:bg-red/10 transition-colors"
                  >
                    <LogOut className="w-6 h-6" />
                    <span className="text-xs font-medium">Logout</span>
                  </button>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </>
  );
}
